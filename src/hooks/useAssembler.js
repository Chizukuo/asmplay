import { useState, useEffect, useRef, useCallback } from 'react';
import { MEMORY_SIZE, INSTRUCTION_DELAY, SCREEN_ROWS, SCREEN_COLS, PRESET_PROGRAMS } from '../constants';
import { parseCode } from '../utils/assembler';
import { executeCpuInstruction } from '../utils/cpu';
import { handleDosInterrupt, handleBiosInterrupt, handleKeyboardInterrupt } from '../utils/interrupts';

// CP437 to Unicode mapping for box drawing characters (0x80 - 0xFF)


export const useAssembler = () => {
  const [code, setCode] = useState(() => {
    const saved = localStorage.getItem('asm_code');
    return saved || PRESET_PROGRAMS.default;
  });
  const [pc, setPc] = useState(0); 
  // 寄存器初始值（采用简化的 DOS 风格段布局）
  // 段基址示例：CS=0x04B0, DS=0x04E0, SS=0x0500
  const [registers, setRegisters] = useState({ 
    AX: 0, BX: 0, CX: 0, DX: 0,
    SP: 0x0800, BP: 0, SI: 0, DI: 0,
    CS: 0x04B0, DS: 0x04E0, SS: 0x0500, ES: 0x04E0, IP: 0
  });
  const [flags, setFlags] = useState({ 
    ZF: 0, SF: 0, CF: 0, OF: 0, PF: 0, 
    AF: 0, TF: 0, IF: 0, DF: 0 
  });
  const [memory, setMemory] = useState(Array(MEMORY_SIZE).fill(0));
  const [symbolTable, setSymbolTable] = useState({});
  const [labelMap, setLabelMap] = useState({});
  const [instructionAddresses, setInstructionAddresses] = useState([]);
  const [screenBuffer, setScreenBuffer] = useState([]);
  const [screenCols, setScreenCols] = useState(SCREEN_COLS);
  const [cursor, setCursor] = useState({ r: 0, c: 0 });
  const [speed, setSpeed] = useState(INSTRUCTION_DELAY);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [breakpoints, setBreakpoints] = useState(new Set());
  const [watchVariables, setWatchVariables] = useState([]);
  const [callStack, setCallStack] = useState([]);
  const [keyBuffer, setKeyBuffer] = useState([]);
  const [lastKeyPressed, setLastKeyPressed] = useState(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [parsedInstructions, setParsedInstructions] = useState([]);
  const [segmentTable, setSegmentTable] = useState({});

  const intervalRef = useRef(null);
  const initialCodeRef = useRef(code);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('asm_code', code);
    }, 1000);
    return () => clearTimeout(timer);
  }, [code]);

  const resetScreen = useCallback((bgClass = 'bg-black', fgClass = 'text-yellow-400', blinkClass = '', cols = screenCols) => {
    const rows = [];
    for (let r = 0; r < SCREEN_ROWS; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push({ char: ' ', style: bgClass, fg: fgClass, blink: blinkClass });
      }
      rows.push(row);
    }
    setScreenBuffer(rows);
    setCursor({ r: 0, c: 0 });
  }, [screenCols]);

  useEffect(() => {
    resetScreen();
  }, [resetScreen]);

  useEffect(() => {
    const { newMemory, dataMap, labelMap: lMap, instructions, dataSize, instructionAddresses, instructionOffsets, segmentNames } = parseCode(code);
    setMemory(newMemory);
    setSymbolTable(dataMap);
    setLabelMap(lMap);
    setParsedInstructions(instructions);
    setInstructionAddresses(instructionAddresses || []);
    setSegmentTable(segmentNames || {});
  }, [code]);














  const executeStep = useCallback(() => {
    if (isWaitingForInput) return;

    let currentPc = pc;
    let newRegisters = { ...registers };
    let newMemory = [...memory];
    let newFlags = { ...flags };
    let newCursor = { ...cursor };
    let newBuffer = screenBuffer.map(row => [...row]);
    let newCallStack = [...callStack];
    let interruptOccurred = false;

    // 光速模式：运行到程序结束
    const isLightSpeed = (speed === 0 && isPlaying);
    const BATCH_SIZE = isLightSpeed ? 100000 : 1;

    for (let step = 0; step < BATCH_SIZE; step++) {
        while (currentPc < parsedInstructions.length && parsedInstructions[currentPc].type === 'EMPTY') {
          currentPc++;
        }

        if (currentPc >= parsedInstructions.length) {
          setIsPlaying(false);
          if (isLightSpeed) clearInterval(intervalRef.current);
          break;
        }

        const instruction = parsedInstructions[currentPc];
        
        try {
            // Execute instruction using the new CPU module
            const result = executeCpuInstruction(
                instruction, 
                newRegisters, 
                newMemory, 
                newFlags, 
                symbolTable, 
                segmentTable, 
                labelMap, 
                newCallStack,
                currentPc
            );

            newRegisters = result.newRegisters;
            newMemory = result.newMemory;
            newFlags = result.newFlags;
            newCallStack = result.newCallStack;
            let nextPc = result.nextPc;

            // Handle Interrupts
            if (result.interrupt) {
                const val1 = result.interrupt.val;
                if (val1 === '21H') {
                    const ah = (newRegisters.AX & 0xFF00) >> 8;
                    if (ah === 0x01 || ah === 0x0A) {
                        setIsWaitingForInput(true);
                        setIsPlaying(false);
                        interruptOccurred = true;
                        if (isLightSpeed) {
                            clearInterval(intervalRef.current);
                            throw new Error("__BREAK__");
                        }
                    } else {
                        const dosResult = handleDosInterrupt(newRegisters, newMemory, newCursor, newBuffer, { setIsPlaying });
                        newCursor = dosResult.newCursor;
                        newBuffer = dosResult.newBuffer;
                        if (dosResult.newRegs) newRegisters = dosResult.newRegs;
                        if (dosResult.shouldStop) {
                            if (isLightSpeed) clearInterval(intervalRef.current);
                            nextPc = parsedInstructions.length;
                        }
                    }
                }
                else if (val1 === '10H') {
                    const biosResult = handleBiosInterrupt(newRegisters, newMemory, newCursor, newBuffer);
                    newCursor = biosResult.newCursor;
                    newBuffer = biosResult.newBuffer;
                    if (biosResult.newRegs) newRegisters = biosResult.newRegs;
                    if (biosResult.newCols) setScreenCols(biosResult.newCols);
                }
                else if (val1 === '16H') {
                    // 键盘中断
                    const kbResult = handleKeyboardInterrupt(newRegisters, keyBuffer);
                    if (kbResult.newRegs) newRegisters = kbResult.newRegs;
                    if (kbResult.newFlags) {
                        Object.assign(newFlags, kbResult.newFlags);
                    }
                    if (kbResult.shouldConsume) {
                        setKeyBuffer(prev => prev.slice(1));
                    }
                }
                interruptOccurred = true;
            }

            // Find next valid instruction
            let tempNext = nextPc;
            while (tempNext < parsedInstructions.length && parsedInstructions[tempNext].type === 'EMPTY') {
                tempNext++;
            }
            currentPc = tempNext;
            
            // 更新 IP 为下一条要执行的指令的偏移
            if (instructionAddresses && instructionAddresses.length > currentPc) {
                const codeSegBase = newRegisters.CS << 4;
                const physAddr = instructionAddresses[currentPc];
                newRegisters.IP = (physAddr - codeSegBase) & 0xFFFF;
            } else {
                newRegisters.IP = 0;
            }

            // 检查断点
            if (tempNext < parsedInstructions.length && breakpoints.has(parsedInstructions[tempNext].originalIndex)) {
                setIsPlaying(false);
                if (isLightSpeed) clearInterval(intervalRef.current);
                break;
            }

            if (interruptOccurred && !isLightSpeed) break; 

        } catch (err) {
          if (err.message === "__BREAK__") break;
          console.error(err);
          const lineNum = instruction.originalIndex + 1;
          const errorMsg = `❌ 第 ${lineNum} 行错误: ${err.message}\n指令: ${instruction.raw}`;
          setError(errorMsg);
          setIsPlaying(false);
          if (isLightSpeed) {
              clearInterval(intervalRef.current);
          }
          currentPc = parsedInstructions.length;
          break;
        }
    }

    setRegisters(newRegisters);
    setMemory(newMemory);
    setFlags(newFlags);
    setPc(currentPc);
    setScreenBuffer(newBuffer);
    setCursor(newCursor);
    setCallStack(newCallStack);

  }, [pc, parsedInstructions, registers, memory, flags, cursor, screenBuffer, symbolTable, labelMap, segmentTable, speed, isWaitingForInput, isPlaying, callStack, keyBuffer, breakpoints]);

  const reload = useCallback((newCode) => {
    setCode(newCode);
    initialCodeRef.current = newCode;

    // 强制重新解析以重置内存（即使代码未变）
    const { newMemory, dataMap, labelMap: lMap, instructions, instructionAddresses: iAddrs, segmentNames } = parseCode(newCode);
    setMemory(newMemory);
    setSymbolTable(dataMap);
    setLabelMap(lMap);
    setParsedInstructions(instructions);
    setInstructionAddresses(iAddrs || []);
    setSegmentTable(segmentNames || {});

    setPc(0);
    setRegisters({ 
      AX: 0, BX: 0, CX: 0, DX: 0, 
      SP: 0x0800, BP: 0, SI: 0, DI: 0,
      CS: 0x04B0, DS: 0x04E0, SS: 0x0500, ES: 0x04E0, IP: 0
    });
    setFlags({ ZF: 0, SF: 0, CF: 0, OF: 0, PF: 0, AF: 0, TF: 0, IF: 1, DF: 0 });
    setScreenCols(SCREEN_COLS); // Reset to default 80 columns
    resetScreen('bg-black', 'text-yellow-400', '', SCREEN_COLS);
    setCallStack([]);
    setIsPlaying(false);
    setError(null);
    setBreakpoints(new Set());
    setKeyBuffer([]);
    setLastKeyPressed(null);
    setIsWaitingForInput(false);
  }, [resetScreen]);

  const handleInput = useCallback((char) => {
      if (isWaitingForInput) {
          // 只接受大写英文字母
          const upperChar = char.toUpperCase();
          const charCode = upperChar.charCodeAt(0);
          
          // 检查是否是有效字符（A-Z, 0-9, 空格等）
          if ((charCode >= 65 && charCode <= 90) || // A-Z
              (charCode >= 48 && charCode <= 57) || // 0-9
              charCode === 32 || charCode === 13) { // 空格或回车
              
              setRegisters(prev => {
                  // AL = char
                  const newAX = (prev.AX & 0xFF00) | (charCode & 0xFF);
                  return { ...prev, AX: newAX };
              });
              
              // 回显到屏幕（使用当前屏幕的样式）
              setScreenBuffer(prevBuffer => {
                  const newBuffer = prevBuffer.map(row => [...row]);
                  const { r, c } = cursor;
                  if (r < SCREEN_ROWS && c < screenCols) {
                      newBuffer[r][c] = { 
                          ...newBuffer[r][c], 
                          char: upperChar 
                      };
                  }
                  return newBuffer;
              });
              
              // 移动光标
              setCursor(prev => {
                  let newC = prev.c + 1;
                  let newR = prev.r;
                  if (newC >= screenCols) {
                      newC = 0;
                      newR++;
                      if (newR >= SCREEN_ROWS) newR = 0;
                  }
                  return { r: newR, c: newC };
              });
              
              setIsWaitingForInput(false);
              setIsPlaying(true);
          }
      }
  }, [isWaitingForInput, cursor, screenCols]);

  // 模拟按键事件（供外部调用）
  const simulateKeyPress = useCallback((char) => {
      const charCode = char.charCodeAt(0);
      const scanCode = charCode; // 简化：扫描码=ASCII码
      setKeyBuffer(prev => [...prev, { ascii: charCode, scanCode }]);
      setLastKeyPressed({ ascii: charCode, scanCode, timestamp: Date.now() });
  }, []);

  // 清空按键缓冲区（按键被读取后）
  const consumeKey = useCallback(() => {
      setKeyBuffer(prev => prev.slice(1));
  }, []);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(executeStep, speed);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, executeStep, speed]);

  const toggleBreakpoint = useCallback((lineIndex) => {
    setBreakpoints(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lineIndex)) {
        newSet.delete(lineIndex);
      } else {
        newSet.add(lineIndex);
      }
      return newSet;
    });
  }, []);

  const addWatchVariable = useCallback((varName) => {
    if (!watchVariables.includes(varName)) {
      setWatchVariables(prev => [...prev, varName]);
    }
  }, [watchVariables]);

  const removeWatchVariable = useCallback((varName) => {
    setWatchVariables(prev => prev.filter(v => v !== varName));
  }, []);

  return {
    code, setCode,
    pc,
    registers,
    flags,
    memory,
    symbolTable,
    screenBuffer,
    screenCols,
    cursor,
    isPlaying, setIsPlaying,
    speed, setSpeed,
    error, setError,
    parsedInstructions,
    instructionAddresses,
    executeStep,
    reload,
    handleInput,
    isWaitingForInput,
    breakpoints,
    toggleBreakpoint,
    watchVariables,
    addWatchVariable,
    removeWatchVariable,
    callStack,
    keyBuffer,
    simulateKeyPress,
    consumeKey,
    lastKeyPressed
  };
};
