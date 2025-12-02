import { useState, useEffect, useRef, useCallback } from 'react';
import { MEMORY_SIZE, INSTRUCTION_DELAY, SCREEN_ROWS, SCREEN_COLS, PRESET_PROGRAMS, VIDEO_MEMORY_SIZE } from '../constants';
import { parseCode } from '../utils/assembler';
import { executeCpuInstruction } from '../utils/cpu';
import { evaluateCondition } from '../utils/conditionEvaluator';
import { handleDosInterrupt, handleBiosInterrupt, handleKeyboardInterrupt, handleTimeInterrupt } from '../utils/interrupts';
import { clearVideoMemory, writeCharToVideoMemory, scrollUp } from '../utils/displayUtils';

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
  const [memory, setMemory] = useState(new Uint8Array(MEMORY_SIZE));
  const [symbolTable, setSymbolTable] = useState({});
  const [labelMap, setLabelMap] = useState({});
  const [instructionAddresses, setInstructionAddresses] = useState([]);
  const [videoMemory, setVideoMemory] = useState(new Uint8Array(VIDEO_MEMORY_SIZE));
  const [screenCols, setScreenCols] = useState(SCREEN_COLS);
  const [cursor, setCursor] = useState({ r: 0, c: 0 });
  const [speed, setSpeed] = useState(INSTRUCTION_DELAY);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  // Breakpoints: Object { [lineIndex]: { type: 'NORMAL'|'CONDITIONAL', condition: string, enabled: boolean } }
  const [breakpoints, setBreakpoints] = useState(() => {
    try {
      const saved = localStorage.getItem('asm_breakpoints');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  }); 
  // Data Breakpoints: Array { address: number, type: 'WRITE'|'READ'|'ACCESS', enabled: boolean }
  const [dataBreakpoints, setDataBreakpoints] = useState(() => {
    try {
      const saved = localStorage.getItem('asm_dataBreakpoints');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [watchVariables, setWatchVariables] = useState(() => {
    try {
      const saved = localStorage.getItem('asm_watchVariables');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [callStack, setCallStack] = useState([]);
  const [keyBuffer, setKeyBuffer] = useState([]);
  const keyBufferRef = useRef([]); // Ref for immediate access in loop
  const [lastKeyPressed, setLastKeyPressed] = useState(null);
  
  // History for Undo
  const historyRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const MAX_HISTORY = 100;

  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [parsedInstructions, setParsedInstructions] = useState([]);
  const [segmentTable, setSegmentTable] = useState({});

  const intervalRef = useRef(null);
  const initialCodeRef = useRef(code);
  const breakpointsRef = useRef({});
  const dataBreakpointsRef = useRef([]);

  useEffect(() => {
    breakpointsRef.current = breakpoints;
  }, [breakpoints]);

  useEffect(() => {
    dataBreakpointsRef.current = dataBreakpoints;
  }, [dataBreakpoints]);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('asm_code', code);
    }, 1000);
    return () => clearTimeout(timer);
  }, [code]);

  useEffect(() => {
    localStorage.setItem('asm_breakpoints', JSON.stringify(breakpoints));
  }, [breakpoints]);

  useEffect(() => {
    localStorage.setItem('asm_dataBreakpoints', JSON.stringify(dataBreakpoints));
  }, [dataBreakpoints]);

  useEffect(() => {
    localStorage.setItem('asm_watchVariables', JSON.stringify(watchVariables));
  }, [watchVariables]);

  // Sync keyBuffer state to ref (though we mainly push to ref directly)
  useEffect(() => {
      keyBufferRef.current = keyBuffer;
  }, [keyBuffer]);

  // 初始化内存和显存
  useEffect(() => {
    const { newMemory, dataMap, labelMap: lMap, instructions, dataSize, instructionAddresses, instructionOffsets, segmentNames } = parseCode(code);
    
    // Initialize Video Memory in Main Memory
    const VIDEO_MEMORY_START = 0xB8000;
    const videoRam = newMemory.subarray(VIDEO_MEMORY_START, VIDEO_MEMORY_START + VIDEO_MEMORY_SIZE);
    clearVideoMemory(videoRam, 0x07);
    
    setMemory(newMemory);
    setVideoMemory(new Uint8Array(videoRam));
    
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
    let newMemory = new Uint8Array(memory);
    let newFlags = { ...flags };
    let newCursor = { ...cursor };
    // Map video memory to physical memory 0xB8000
    const VIDEO_MEMORY_START = 0xB8000;
    let videoRamView = newMemory.subarray(VIDEO_MEMORY_START, VIDEO_MEMORY_START + VIDEO_MEMORY_SIZE);
    
    let newCallStack = [...callStack];
    let interruptOccurred = false;
    // Use Ref for key buffer to get latest keys during long batch execution
    let localKeyBuffer = keyBufferRef.current; 
    let currentScreenCols = screenCols; // Local copy of screenCols for batch execution

    // 光速模式：运行到程序结束，但减小批处理大小以提高响应性和显示准确性
    const isLightSpeed = (speed === 0 && isPlaying);
    
    // Determine Batch Size
    // Fix: Ensure manual step (isPlaying=false) and slow play (speed >= 10) run 1 instruction at a time
    let BATCH_SIZE = 1;
    if (isPlaying) {
        if (speed === 0) BATCH_SIZE = 50000;
        else if (speed < 10) BATCH_SIZE = 500; // Fast mode
        else BATCH_SIZE = 1; // Normal/Slow mode
    }

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
        
        // Record History (Only in single step or slow mode)
        if (BATCH_SIZE === 1) {
            if (historyRef.current.length >= MAX_HISTORY) {
                historyRef.current.shift();
            }
            historyRef.current.push({
                registers: { ...newRegisters },
                flags: { ...newFlags },
                memory: new Uint8Array(newMemory), // Snapshot
                pc: currentPc,
                callStack: [...newCallStack],
                cursor: { ...newCursor },
                screenCols: currentScreenCols,
                keyBuffer: [...keyBufferRef.current]
            });
            setCanUndo(true);
        }
        
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
                        // Check if we have keys in buffer first
                        // Re-read from ref to ensure we catch keys pressed during batch execution
                        if (keyBufferRef.current.length > 0) {
                            const key = keyBufferRef.current[0]; // Peek
                            // Remove from ref
                            keyBufferRef.current = keyBufferRef.current.slice(1);
                            // Update local variable just in case (though we use ref directly)
                            localKeyBuffer = keyBufferRef.current;
                            
                            // Set AL = char
                            newRegisters.AX = (newRegisters.AX & 0xFF00) | (key.ascii & 0xFF);
                            
                            // Echo to screen
                            if (key.ascii === 8) { // Backspace
                                if (newCursor.c > 0) {
                                    newCursor.c--;
                                    writeCharToVideoMemory(videoRamView, newCursor.r, newCursor.c, 0x20, 0x07, currentScreenCols); // Erase
                                } else if (newCursor.r > 0) {
                                    newCursor.r--;
                                    newCursor.c = currentScreenCols - 1;
                                    writeCharToVideoMemory(videoRamView, newCursor.r, newCursor.c, 0x20, 0x07, currentScreenCols);
                                }
                            } else if (key.ascii === 13) { // CR
                                newCursor.c = 0;
                            } else {
                                writeCharToVideoMemory(videoRamView, newCursor.r, newCursor.c, key.ascii, 0x07, currentScreenCols);
                                newCursor.c++;
                                if (newCursor.c >= currentScreenCols) {
                                    newCursor.c = 0;
                                    newCursor.r++;
                                    if (newCursor.r >= SCREEN_ROWS) {
                                        scrollUp(videoRamView, 1, 0x07, currentScreenCols);
                                        newCursor.r = SCREEN_ROWS - 1;
                                    }
                                }
                            }
                        } else {
                            setIsWaitingForInput(true);
                            setIsPlaying(false);
                            interruptOccurred = true;
                            if (isLightSpeed) {
                                clearInterval(intervalRef.current);
                                throw new Error("__BREAK__");
                            }
                        }
                    } else {
                        const dosResult = handleDosInterrupt(newRegisters, newMemory, newCursor, videoRamView, { setIsPlaying }, currentScreenCols);
                        newCursor = dosResult.newCursor;
                        if (dosResult.newRegs) newRegisters = dosResult.newRegs;
                        if (dosResult.shouldStop) {
                            if (isLightSpeed) clearInterval(intervalRef.current);
                            nextPc = parsedInstructions.length;
                        }
                    }
                }
                else if (val1 === '10H') {
                    const biosResult = handleBiosInterrupt(newRegisters, newMemory, newCursor, videoRamView, currentScreenCols);
                    newCursor = biosResult.newCursor;
                    if (biosResult.newRegs) newRegisters = biosResult.newRegs;
                    if (biosResult.newCols) {
                        setScreenCols(biosResult.newCols);
                        currentScreenCols = biosResult.newCols; // Update local copy immediately
                    }
                }
                else if (val1 === '16H') {
                    // 键盘中断
                    // Use ref for keyboard interrupt too
                    const ah = (newRegisters.AX & 0xFF00) >> 8;
                    if (ah === 0x00 && keyBufferRef.current.length === 0) {
                        // Blocking read: if no key, wait
                        setIsWaitingForInput(true);
                        setIsPlaying(false);
                        interruptOccurred = true;
                        if (isLightSpeed) {
                            clearInterval(intervalRef.current);
                            throw new Error("__BREAK__");
                        }
                    } else {
                        const kbResult = handleKeyboardInterrupt(newRegisters, keyBufferRef.current);
                        if (kbResult.newRegs) newRegisters = kbResult.newRegs;
                        if (kbResult.newFlags) {
                            Object.assign(newFlags, kbResult.newFlags);
                        }
                        if (kbResult.shouldConsume) {
                            keyBufferRef.current = keyBufferRef.current.slice(1);
                        }
                    }
                }
                else if (val1 === '1AH') {
                    // 时钟中断
                    const timeResult = handleTimeInterrupt(newRegisters);
                    if (timeResult.newRegs) newRegisters = timeResult.newRegs;
                    if (timeResult.newFlags) {
                        Object.assign(newFlags, timeResult.newFlags);
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

            // 检查数据断点
            const currentDataBreakpoints = dataBreakpointsRef.current;
            if (result.memoryWrites && result.memoryWrites.length > 0 && currentDataBreakpoints.length > 0) {
                let dataBreakTriggered = false;
                for (const write of result.memoryWrites) {
                    for (const dbp of currentDataBreakpoints) {
                        // 简单匹配：如果写入地址等于断点地址
                        // 未来可以扩展为范围匹配或读写类型匹配
                        if (dbp.enabled && dbp.address === write.address) {
                             dataBreakTriggered = true;
                             break;
                        }
                    }
                    if (dataBreakTriggered) break;
                }
                if (dataBreakTriggered) {
                    setIsPlaying(false);
                    if (isLightSpeed) clearInterval(intervalRef.current);
                    break;
                }
            }

            // 检查代码断点
            if (tempNext < parsedInstructions.length) {
                const nextLineIndex = parsedInstructions[tempNext].originalIndex;
                const bp = breakpointsRef.current[nextLineIndex];
                if (bp && bp.enabled) {
                    let shouldBreak = false;
                    if (bp.type === 'NORMAL') {
                        shouldBreak = true;
                    } else if (bp.type === 'CONDITIONAL') {
                        shouldBreak = evaluateCondition(bp.condition, newRegisters, newFlags);
                    }
                    
                    if (shouldBreak) {
                        setIsPlaying(false);
                        if (isLightSpeed) clearInterval(intervalRef.current);
                        break;
                    }
                }
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

    // 批量更新状态以减少重渲染，提高性能
    setRegisters(newRegisters);
    setMemory(newMemory);
    setFlags(newFlags);
    setPc(currentPc);
    // 确保视频内存正确同步
    setVideoMemory(new Uint8Array(videoRamView));
    setCursor(newCursor);
    setCallStack(newCallStack);
    // Sync ref back to state for UI consistency
    setKeyBuffer([...keyBufferRef.current]);

  }, [pc, parsedInstructions, registers, memory, flags, cursor, videoMemory, symbolTable, labelMap, segmentTable, speed, isWaitingForInput, isPlaying, callStack, keyBuffer, breakpoints]);

  const stepBack = useCallback(() => {
    if (historyRef.current.length === 0) return;

    const lastState = historyRef.current.pop();
    setCanUndo(historyRef.current.length > 0);

    setRegisters(lastState.registers);
    setFlags(lastState.flags);
    setMemory(lastState.memory);
    setPc(lastState.pc);
    setCallStack(lastState.callStack);
    setCursor(lastState.cursor);
    
    // Restore Video Memory View
    const VIDEO_MEMORY_START = 0xB8000;
    const videoRam = lastState.memory.subarray(VIDEO_MEMORY_START, VIDEO_MEMORY_START + VIDEO_MEMORY_SIZE);
    setVideoMemory(new Uint8Array(videoRam));

    // Also restore screenCols if we saved it, or just keep current?
    // Ideally we should save screenCols too.
    if (lastState.screenCols) setScreenCols(lastState.screenCols);
    
    if (lastState.keyBuffer) {
        setKeyBuffer(lastState.keyBuffer);
        keyBufferRef.current = lastState.keyBuffer;
    }

  }, []);

  const reload = useCallback((newCode) => {
    setCode(newCode);
    initialCodeRef.current = newCode;

    // Clear history
    historyRef.current = [];
    setCanUndo(false);

    // 强制重新解析以重置内存（即使代码未变）
    const { newMemory, dataMap, labelMap: lMap, instructions, instructionAddresses: iAddrs, segmentNames } = parseCode(newCode);
    
    // Initialize Video Memory in Main Memory
    const VIDEO_MEMORY_START = 0xB8000;
    const videoRam = newMemory.subarray(VIDEO_MEMORY_START, VIDEO_MEMORY_START + VIDEO_MEMORY_SIZE);
    clearVideoMemory(videoRam, 0x07);
    
    setMemory(newMemory);
    setVideoMemory(new Uint8Array(videoRam));
    
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
    setCursor({ r: 0, c: 0 });
    setCallStack([]);
    setIsPlaying(false);
    setError(null);
    setBreakpoints({});
    setDataBreakpoints([]);
    setKeyBuffer([]);
    keyBufferRef.current = []; // Reset ref
    setLastKeyPressed(null);
    setIsWaitingForInput(false);
  }, []);

  const handleInput = useCallback((char) => {
      if (isWaitingForInput) {
          // Allow all characters that are passed from App.jsx
          // App.jsx handles filtering/mapping (e.g. Enter -> \r)
          const charCode = char.charCodeAt(0);
          
          // Push to buffer directly so the INT 21H instruction can pick it up upon re-execution
          const now = Date.now();
          keyBufferRef.current = [...keyBufferRef.current, { ascii: charCode, scanCode: charCode, timestamp: now }];
          setKeyBuffer([...keyBufferRef.current]);
          
          setIsWaitingForInput(false);
          setIsPlaying(true);
      }
  }, [isWaitingForInput]);

  // 模拟按键事件（供外部调用）
  const simulateKeyPress = useCallback((char) => {
      const charCode = char.charCodeAt(0);
      const scanCode = charCode; // 简化：扫描码=ASCII码
      
      const now = Date.now();
      // 防止重复添加相同的按键（检查最后一个按键和时间戳）
      // Check ref directly
      if (keyBufferRef.current.length > 0) {
          const lastKey = keyBufferRef.current[keyBufferRef.current.length - 1];
          if (lastKey.ascii === charCode && lastKey.timestamp && (now - lastKey.timestamp) < 50) {
            return; // Ignore duplicate
          }
      }
      
      const newKey = { ascii: charCode, scanCode, timestamp: now };
      keyBufferRef.current = [...keyBufferRef.current, newKey];
      setKeyBuffer([...keyBufferRef.current]); // Update state for UI
      
      setLastKeyPressed({ ascii: charCode, scanCode, timestamp: Date.now() });
  }, []);

  // 清空按键缓冲区（按键被读取后）
  const consumeKey = useCallback(() => {
      keyBufferRef.current = keyBufferRef.current.slice(1);
      setKeyBuffer([...keyBufferRef.current]);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(executeStep, speed);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, executeStep, speed]);

  const toggleBreakpoint = useCallback((lineIndex, options = {}) => {
    setBreakpoints(prev => {
      const newBreakpoints = { ...prev };
      if (newBreakpoints[lineIndex]) {
        delete newBreakpoints[lineIndex];
      } else {
        newBreakpoints[lineIndex] = {
            type: options.type || 'NORMAL',
            condition: options.condition || '',
            enabled: true,
            line: lineIndex
        };
      }
      return newBreakpoints;
    });
  }, []);

  const addBreakpoint = useCallback((lineIndex, type = 'NORMAL', condition = '') => {
      setBreakpoints(prev => ({
          ...prev,
          [lineIndex]: { type, condition, enabled: true, line: lineIndex }
      }));
  }, []);

  const removeBreakpoint = useCallback((lineIndex) => {
      setBreakpoints(prev => {
          const next = { ...prev };
          delete next[lineIndex];
          return next;
      });
  }, []);

  const updateBreakpoint = useCallback((lineIndex, updates) => {
      setBreakpoints(prev => {
          if (!prev[lineIndex]) return prev;
          return {
              ...prev,
              [lineIndex]: { ...prev[lineIndex], ...updates }
          };
      });
  }, []);

  const addDataBreakpoint = useCallback((address, type = 'WRITE') => {
      setDataBreakpoints(prev => [...prev, { address, type, enabled: true }]);
  }, []);

  const removeDataBreakpoint = useCallback((index) => {
      setDataBreakpoints(prev => prev.filter((_, i) => i !== index));
  }, []);

  const toggleDataBreakpoint = useCallback((index) => {
      setDataBreakpoints(prev => prev.map((bp, i) => 
          i === index ? { ...bp, enabled: !bp.enabled } : bp
      ));
  }, []);

  const addWatchVariable = useCallback((varName) => {
    if (!watchVariables.includes(varName)) {
      setWatchVariables(prev => [...prev, varName]);
    }
  }, [watchVariables]);

  const removeWatchVariable = useCallback((varName) => {
    setWatchVariables(prev => prev.filter(v => v !== varName));
  }, []);

  const exportProject = useCallback(() => {
      const project = {
          version: '1.0',
          timestamp: Date.now(),
          code,
          breakpoints,
          dataBreakpoints,
          watchVariables
      };
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `asmplay_project_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
  }, [code, breakpoints, dataBreakpoints, watchVariables]);

  const importProject = useCallback((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const project = JSON.parse(e.target.result);
              if (project.code) {
                  setCode(project.code);
                  initialCodeRef.current = project.code;
              }
              if (project.breakpoints) setBreakpoints(project.breakpoints);
              if (project.dataBreakpoints) setDataBreakpoints(project.dataBreakpoints);
              if (project.watchVariables) setWatchVariables(project.watchVariables);
              
              // Reset execution state
              setPc(0);
              setRegisters({ 
                AX: 0, BX: 0, CX: 0, DX: 0, 
                SP: 0x0800, BP: 0, SI: 0, DI: 0,
                CS: 0x04B0, DS: 0x04E0, SS: 0x0500, ES: 0x04E0, IP: 0
              });
              setFlags({ ZF: 0, SF: 0, CF: 0, OF: 0, PF: 0, AF: 0, TF: 0, IF: 1, DF: 0 });
              setCallStack([]);
              setIsPlaying(false);
              setError(null);
              historyRef.current = [];
              setCanUndo(false);
              
          } catch (err) {
              console.error("Import failed", err);
              setError("导入失败: 文件格式错误");
          }
      };
      reader.readAsText(file);
  }, []);

  return {
    code, setCode,
    exportProject,
    importProject,
    pc,
    registers,
    flags,
    memory, setMemory,
    symbolTable,
    videoMemory,
    screenCols,
    cursor,
    isPlaying, setIsPlaying,
    speed, setSpeed,
    error, setError,
    parsedInstructions,
    instructionAddresses,
    executeStep,
    stepBack,
    canUndo,
    reload,
    handleInput,
    isWaitingForInput,
    breakpoints,
    dataBreakpoints,
    toggleBreakpoint,
    addBreakpoint,
    removeBreakpoint,
    updateBreakpoint,
    addDataBreakpoint,
    removeDataBreakpoint,
    toggleDataBreakpoint,
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
