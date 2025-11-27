import { useState, useEffect, useRef, useCallback } from 'react';
import { MEMORY_SIZE, INSTRUCTION_DELAY, SCREEN_ROWS, SCREEN_COLS, PRESET_PROGRAMS } from '../constants';
import { getReg, setReg, parseCode } from '../utils/assembler';

export const useAssembler = () => {
  const [code, setCode] = useState(() => {
    const saved = localStorage.getItem('asm_code');
    return saved || PRESET_PROGRAMS.default;
  });
  const [pc, setPc] = useState(0); 
  const [registers, setRegisters] = useState({ 
    AX: 0, BX: 0, CX: 0, DX: 0,
    SP: 0xFFFE, BP: 0, SI: 0, DI: 0,
    // 修改为 DOSBox 典型值，增加真实感
    CS: 0x04B0, DS: 0x04AE, SS: 0x04AD, ES: 0x049E, IP: 0
  });
  const [flags, setFlags] = useState({ 
    ZF: 0, SF: 0, CF: 0, OF: 0, PF: 0, 
    AF: 0, TF: 0, IF: 0, DF: 0 
  });
  const [memory, setMemory] = useState(Array(MEMORY_SIZE).fill(0));
  const [symbolTable, setSymbolTable] = useState({});
  const [labelMap, setLabelMap] = useState({});
  const [screenBuffer, setScreenBuffer] = useState([]);
  const [cursor, setCursor] = useState({ r: 0, c: 0 });
  const [speed, setSpeed] = useState(INSTRUCTION_DELAY);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [breakpoints, setBreakpoints] = useState(new Set());
  const [watchVariables, setWatchVariables] = useState([]);
  const [callStack, setCallStack] = useState([]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [parsedInstructions, setParsedInstructions] = useState([]);

  const intervalRef = useRef(null);
  const initialCodeRef = useRef(code);

  // 自动保存代码到 localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('asm_code', code);
    }, 1000);
    return () => clearTimeout(timer);
  }, [code]);

  const resetScreen = useCallback((bgClass = 'bg-black', fgClass = 'text-yellow-400', blinkClass = '') => {
    const rows = [];
    for (let r = 0; r < SCREEN_ROWS; r++) {
      const row = [];
      for (let c = 0; c < SCREEN_COLS; c++) {
        row.push({ char: ' ', style: bgClass, fg: fgClass, blink: blinkClass });
      }
      rows.push(row);
    }
    setScreenBuffer(rows);
    setCursor({ r: 0, c: 0 });
  }, []);

  // 初始化屏幕
  useEffect(() => {
    resetScreen();
  }, [resetScreen]);

  // 解析代码
  useEffect(() => {
    const { newMemory, dataMap, labelMap: lMap, instructions, dataSize } = parseCode(code);
    setMemory(newMemory);
    setSymbolTable(dataMap);
    setLabelMap(lMap);
    setParsedInstructions(instructions);

    // 增强：模拟 DOS 行为，CX 寄存器初始化为程序代码大小
    // 1. 计算代码段估算大小 (每条指令约 2-4 字节，取平均 3)
    const codeSize = instructions.filter(i => i.type !== 'EMPTY').length * 3;
    
    // 2. 加上数据段大小 (dataSize)
    // 3. 加上 PSP (Program Segment Prefix) 的 256 字节 (0x100) 
    //    注意：DOSBox 的 CX 通常是加载的 COM 文件大小或 EXE 的镜像大小。
    //    为了让数值看起来更像 "0030" 这种真实感，我们模拟一个文件头或对齐。
    //    这里简单处理：数据 + 代码，并向上取整到 16 字节 (Paragraph Alignment)
    let totalSize = dataSize + codeSize;
    
    // 模拟 DOS 的段对齐 (Paragraph Alignment, 16 bytes)
    if (totalSize > 0) {
        totalSize = Math.ceil(totalSize / 16) * 16;
    }

    // 如果太小，给一个基础值 (比如 DOSBox 最小可能给 0x30)
    // 但为了准确反映代码量，我们还是用计算值，只是做了对齐
    
    setRegisters(prev => ({
      ...prev,
      CX: totalSize & 0xFFFF
    }));
  }, [code]);

  // 内存边界检查
  const isValidMemoryAddress = (addr, size = 1) => {
    return addr >= 0 && addr + size <= MEMORY_SIZE;
  };

  // 安全读取内存
  const safeReadMemory = (addr, size = 2, memory) => {
    if (!isValidMemoryAddress(addr, size)) {
      throw new Error(`内存访问越界: 地址 0x${addr.toString(16).toUpperCase()}`);
    }
    if (size === 1) return memory[addr];
    if (size === 2) return memory[addr] | (memory[addr + 1] << 8);
    return 0;
  };

  // 安全写入内存
  const safeWriteMemory = (addr, value, size = 2, memory) => {
    if (!isValidMemoryAddress(addr, size)) {
      throw new Error(`内存访问越界: 地址 0x${addr.toString(16).toUpperCase()}`);
    }
    if (size === 1) {
      memory[addr] = value & 0xFF;
    } else if (size === 2) {
      memory[addr] = value & 0xFF;
      memory[addr + 1] = (value >> 8) & 0xFF;
    }
  };

  const printToConsole = useCallback((str, currentCursor, currentBuffer) => {
    const newBuffer = currentBuffer.map(row => [...row]);
    let { r, c } = currentCursor;
    for (let i = 0; i < str.length; i++) {
      if (r >= SCREEN_ROWS) break;
      // 保持当前屏幕的背景和前景色
      newBuffer[r][c] = { ...newBuffer[r][c], char: str[i] };
      c++;
      if (c >= SCREEN_COLS) { c = 0; r++; }
    }
    return { newBuffer, newCursor: { r, c } };
  }, []);

  const handleDosInterrupt = useCallback((regs, currentMemory, currentCursor, currentBuffer) => {
    const ah = (regs.AX & 0xFF00) >> 8;
    const al = regs.AX & 0xFF;
    let newCursor = currentCursor;
    let newBuffer = currentBuffer;
    let shouldStop = false;
    let newRegs = null;
    
    try {
      if (ah === 0x02) {
        // 输出单个字符到屏幕（DL = 字符）
        const char = String.fromCharCode(regs.DX & 0xFF);
        const result = printToConsole(char, newCursor, newBuffer);
        newBuffer = result.newBuffer;
        newCursor = result.newCursor;
      } else if (ah === 0x06) {
        // 直接控制台 I/O
        const dl = regs.DX & 0xFF;
        if (dl === 0xFF) {
          // 输入：设置 ZF=1 表示无字符，这里简化处理
        } else {
          // 输出
          const char = String.fromCharCode(dl);
          const result = printToConsole(char, newCursor, newBuffer);
          newBuffer = result.newBuffer;
          newCursor = result.newCursor;
        }
      } else if (ah === 0x09) {
        // 输出字符串（DX = 字符串地址，$ 结束）
        let addr = regs.DX;
        let output = "";
        let steps = 0;
        while (steps < 1000 && addr < MEMORY_SIZE) {
          const charCode = currentMemory[addr];
          const char = String.fromCharCode(charCode);
          if (char === '$') break;
          output += char;
          addr++;
          steps++;
        }
        const result = printToConsole(output, newCursor, newBuffer);
        newBuffer = result.newBuffer;
        newCursor = result.newCursor;
      } else if (ah === 0x0A) {
        // 缓冲区输入（简化：等待单字符输入）
      } else if (ah === 0x4C) {
        // 程序终止
        setIsPlaying(false);
        shouldStop = true;
      } else {
        // 未实现的功能
      }
    } catch (err) {
      console.error(`INT 21H 错误: ${err.message}`);
    }
    
    return { newCursor, newBuffer, shouldStop, newRegs };
  }, [printToConsole]);

  const handleBiosInterrupt = useCallback((regs, currentCursor, currentBuffer) => {
    const ah = (regs.AX & 0xFF00) >> 8;
    const al = regs.AX & 0xFF;
    let newCursor = currentCursor;
    let newBuffer = currentBuffer;
    
    try {
      if (ah === 0x02) {
        // 设置光标位置
        const row = (regs.DX & 0xFF00) >> 8;
        const col = regs.DX & 0x00FF;
        if (row < SCREEN_ROWS && col < SCREEN_COLS) {
          newCursor = { r: row, c: col };
        } else {
          // 光标位置越界
        }
      } else if (ah === 0x06) {
        // 清屏或滚动窗口
      const al = regs.AX & 0x00FF;
      if (al === 0) {
         const bh = (regs.BX & 0xFF00) >> 8;
         
         // 解析属性：Bit 7 为闪烁位
         const blink = (bh & 0x80) !== 0;
         // 背景色只取 Bit 6-4 (0-7)
         const bgColor = (bh & 0x70) >> 4; 
         const fgColor = bh & 0x0F; 
         
         // DOS颜色映射表
         const colorMap = [
           'black',      // 0x0: 黑色
           'blue-600',   // 0x1: 蓝色
           'green-600',  // 0x2: 绿色
           'cyan-600',   // 0x3: 青色
           'red-600',    // 0x4: 红色
           'purple-600', // 0x5: 洋红色
           'yellow-700', // 0x6: 棕色
           'gray-300',   // 0x7: 浅灰色
           'gray-600',   // 0x8: 深灰色
           'blue-400',   // 0x9: 亮蓝色
           'green-400',  // 0xA: 亮绿色
           'cyan-400',   // 0xB: 亮青色
           'red-400',    // 0xC: 亮红色
           'purple-400', // 0xD: 亮洋红色
           'yellow-400', // 0xE: 黄色
           'white'       // 0xF: 亮白色
         ];
         
         const bg = `bg-${colorMap[bgColor] || 'black'}`;
         const fg = `text-${colorMap[fgColor] || 'white'}`;
         const blinkClass = blink ? 'text-blink' : '';
         
         // 创建新的屏幕缓冲区
         const rows = [];
         for (let r = 0; r < SCREEN_ROWS; r++) {
           const row = [];
           for (let c = 0; c < SCREEN_COLS; c++) {
             row.push({ char: ' ', style: bg, fg: fg, blink: blinkClass });
           }
           rows.push(row);
         }
         newBuffer = rows;
         newCursor = { r: 0, c: 0 };
         
      } else {
        // AL != 0: 滚动窗口
      }
    } else if (ah === 0x0E) {
      // 输出字符（电传打字机模式）
      const char = String.fromCharCode(al);
      if (char === '\r') {
        newCursor.c = 0;
      } else if (char === '\n') {
        newCursor.r++;
        if (newCursor.r >= SCREEN_ROWS) newCursor.r = 0;
      } else {
        if (newCursor.r < SCREEN_ROWS && newCursor.c < SCREEN_COLS) {
          newBuffer[newCursor.r][newCursor.c] = { ...newBuffer[newCursor.r][newCursor.c], char };
          newCursor.c++;
          if (newCursor.c >= SCREEN_COLS) {
            newCursor.c = 0;
            newCursor.r++;
            if (newCursor.r >= SCREEN_ROWS) newCursor.r = 0;
          }
        }
      }
    } else {
      // 未实现的功能
    }
    } catch (err) {
      console.error(`INT 10H 错误: ${err.message}`);
    }
    
    return { newCursor, newBuffer };
  }, []);

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
        
        // 模拟 IP (指令指针) 更新
        // 真实汇编中指令长度不一，这里我们模拟每条指令占用 2-3 个字节
        // 简单的指令(如 INC, DEC)算 1-2 字节，复杂的(如 MOV 立即数)算 3 字节
        // 为了视觉上的连贯性，我们使用一个基于行号的估算算法
        const calculateFakeIP = (index) => {
            // 基础偏移 0x0100 (模拟 COM 文件) 或 0x0000 (模拟 EXE)
            // 你的截图是从 0003 开始的，我们用 0000 作为基准
            let fakeIp = 0; 
            for(let i=0; i<index; i++) {
                const inst = parsedInstructions[i];
                if(inst.type === 'EMPTY') continue;
                // 简单启发式：有逗号的通常长一点
                fakeIp += (inst.raw.includes(',') || inst.raw.includes('OFFSET')) ? 3 : 2;
            }
            return fakeIp & 0xFFFF;
        };

        // 更新当前指令的 IP
        newRegisters.IP = calculateFakeIP(currentPc);

        try {
          const { op, args } = instruction;
          let nextPc = currentPc + 1;
          
          // Helper to calculate Effective Address
          const getEA = (arg) => {
              if (arg.startsWith('[') && arg.endsWith(']')) {
                  const expr = arg.slice(1, -1);
                  // 支持加减运算
                  let addr = 0;
                  let currentOp = '+';
                  let currentNum = '';
                  
                  for (let k = 0; k < expr.length; k++) {
                      const ch = expr[k];
                      if (ch === '+' || ch === '-') {
                          if (currentNum) {
                              const val = parseAddressPart(currentNum.trim());
                              addr = currentOp === '+' ? addr + val : addr - val;
                          }
                          currentOp = ch;
                          currentNum = '';
                      } else {
                          currentNum += ch;
                      }
                  }
                  if (currentNum) {
                      const val = parseAddressPart(currentNum.trim());
                      addr = currentOp === '+' ? addr + val : addr - val;
                  }
                  
                  return addr & 0xFFFF;
              }
              if (symbolTable.hasOwnProperty(arg)) return symbolTable[arg];
              return null;
          };
          
          const parseAddressPart = (part) => {
              if (['BX','BP','SI','DI'].includes(part)) return newRegisters[part];
              if (symbolTable.hasOwnProperty(part)) return symbolTable[part];
              if (part.endsWith('H')) return parseInt(part.slice(0, -1), 16);
              const num = parseInt(part);
              return isNaN(num) ? 0 : num;
          };

          const getVal = (arg) => {
            if (!arg) return 0;

            // Handle OFFSET
            if (typeof arg === 'string' && arg.startsWith('OFFSET ')) {
                const varName = arg.substring(7).trim();
                return symbolTable[varName] || 0;
            }

            if (arg === 'OFFSET') return 0;
            
            // Handle character constants ('A', '*', '1', etc.)
            if (typeof arg === 'string' && arg.startsWith("'") && arg.endsWith("'") && arg.length === 3) {
                return arg.charCodeAt(1);
            }
            
            // Immediate
            if (!isNaN(parseInt(arg)) && !arg.startsWith('[') && !Object.keys(symbolTable).includes(arg) && !Object.keys(labelMap).includes(arg) && !['AX','BX','CX','DX','AH','AL','BH','BL','CH','CL','DH','DL','SP','BP','SI','DI','CS','DS','SS','ES','IP'].includes(arg)) {
                 return arg.endsWith('H') ? parseInt(arg.slice(0, -1), 16) : parseInt(arg);
            }
            if (arg.endsWith('H') && !['AH','BH','CH','DH'].includes(arg)) return parseInt(arg.slice(0, -1), 16);

            // Register
            if (['AX','BX','CX','DX','AH','AL','BH','BL','CH','CL','DH','DL','SP','BP','SI','DI','CS','DS','SS','ES','IP'].includes(arg)) {
                return getReg(arg, newRegisters);
            }

            // Memory or Variable
            const ea = getEA(arg);
            if (ea !== null) {
                try {
                    return safeReadMemory(ea, 2, newMemory);
                } catch (err) {
                    throw new Error(`${err.message} (访问 ${arg})`);
                }
            }
            
            if (labelMap.hasOwnProperty(arg)) return labelMap[arg];
            
            // Fallback for simple numbers
            const num = parseInt(arg);
            if (!isNaN(num)) return num;
            return 0;
          };

          const setVal = (arg, val) => {
              if (['AX','BX','CX','DX','AH','AL','BH','BL','CH','CL','DH','DL','SP','BP','SI','DI','CS','DS','SS','ES','IP'].includes(arg)) {
                  newRegisters = setReg(arg, val, newRegisters);
              } else {
                  const ea = getEA(arg);
                  if (ea !== null) {
                      try {
                          safeWriteMemory(ea, val, 2, newMemory);
                      } catch (err) {
                          throw new Error(`${err.message} (写入 ${arg})`);
                      }
                  }
              }
          };

          const updateFlags = (res, isSub = false, isWord = true, operand1 = 0, operand2 = 0) => {
              const max = isWord ? 0xFFFF : 0xFF;
              const signBit = isWord ? 0x8000 : 0x80;
              const val = res & max;
              
              // Zero Flag
              newFlags.ZF = val === 0 ? 1 : 0;
              
              // Sign Flag
              newFlags.SF = (val & signBit) ? 1 : 0;
              
              // Carry Flag（无符号溢出）
              if (isSub) {
                newFlags.CF = res < 0 ? 1 : 0;
              } else {
                newFlags.CF = res > max ? 1 : 0;
              }
              
              // Overflow Flag（有符号溢出）
              const sign1 = (operand1 & signBit) !== 0;
              const sign2 = (operand2 & signBit) !== 0;
              const signRes = (val & signBit) !== 0;
              
              if (isSub) {
                // 减法：符号不同的两数相减，结果符号与被减数不同
                newFlags.OF = (sign1 !== sign2 && sign1 !== signRes) ? 1 : 0;
              } else {
                // 加法：符号相同的两数相加，结果符号不同
                newFlags.OF = (sign1 === sign2 && sign1 !== signRes) ? 1 : 0;
              }
              
              // Parity Flag（低8位中1的个数为偶数）
              let count = 0;
              let temp = val & 0xFF;
              while (temp) {
                count += temp & 1;
                temp >>= 1;
              }
              newFlags.PF = (count % 2 === 0) ? 1 : 0;
          };

          let realArgs = [];
          for(let k=0; k<args.length; k++) {
              if (args[k] === 'OFFSET' && k+1 < args.length) {
                  // OFFSET VAR -> Address of VAR
                  const varName = args[k+1];
                  realArgs.push(symbolTable[varName] || 0);
                  k++; 
              } else {
                  realArgs.push(args[k]);
              }
          }

          const val1 = realArgs[0];
          // For 2nd arg, if it's a register/memory, get value. If immediate, use it.
          // But getVal handles all.
          const val2 = realArgs.length > 1 ? getVal(realArgs[1]) : 0;

          switch (op) {
            case 'MOV':
              if (!['DS', 'ES', 'SS'].includes(val1)) setVal(val1, val2);
              break;
            case 'LEA': {
                const ea = getEA(realArgs[1]);
                if (ea !== null) setVal(val1, ea);
                break;
            }
            case 'ADD': {
              const v1 = getVal(val1);
              const res = v1 + val2;
              setVal(val1, res);
              updateFlags(res, false, true, v1, val2);
              break;
            }
            case 'SUB': {
              const v1 = getVal(val1);
              const res = v1 - val2;
              setVal(val1, res);
              updateFlags(res, true, true, v1, val2);
              break;
            }
            case 'ADC': {
              const v1 = getVal(val1);
              const cf = newFlags.CF;
              const res = v1 + val2 + cf;
              setVal(val1, res);
              updateFlags(res, false, true, v1, val2);
              break;
            }
            case 'SBB': {
              const v1 = getVal(val1);
              const cf = newFlags.CF;
              const res = v1 - val2 - cf;
              setVal(val1, res);
              updateFlags(res, true, true, v1, val2);
              break;
            }
            case 'ROL': {
                const v1 = getVal(val1);
                const count = (val2 || 1) & 0x1F;
                const isWord = true; // Simplified: assume word
                const bits = isWord ? 16 : 8;
                const mask = isWord ? 0xFFFF : 0xFF;
                let res = v1;
                for(let k=0; k<count; k++) {
                    const msb = (res >> (bits - 1)) & 1;
                    res = ((res << 1) | msb) & mask;
                    newFlags.CF = msb;
                }
                setVal(val1, res);
                // OF is defined only for count=1
                if (count === 1) {
                    const msb = (res >> (bits - 1)) & 1;
                    newFlags.OF = (msb ^ newFlags.CF);
                }
                break;
            }
            case 'ROR': {
                const v1 = getVal(val1);
                const count = (val2 || 1) & 0x1F;
                const isWord = true;
                const bits = isWord ? 16 : 8;
                const mask = isWord ? 0xFFFF : 0xFF;
                let res = v1;
                for(let k=0; k<count; k++) {
                    const lsb = res & 1;
                    res = ((res >> 1) | (lsb << (bits - 1))) & mask;
                    newFlags.CF = lsb;
                }
                setVal(val1, res);
                if (count === 1) {
                    const msb = (res >> (bits - 1)) & 1;
                    newFlags.OF = (msb ^ (res >> (bits - 2) & 1)); // XOR of two MSBs
                }
                break;
            }
            case 'RCL': {
                const v1 = getVal(val1);
                const count = (val2 || 1) & 0x1F;
                const isWord = true;
                const bits = isWord ? 16 : 8;
                const mask = isWord ? 0xFFFF : 0xFF;
                let res = v1;
                for(let k=0; k<count; k++) {
                    const msb = (res >> (bits - 1)) & 1;
                    const oldCF = newFlags.CF;
                    res = ((res << 1) | oldCF) & mask;
                    newFlags.CF = msb;
                }
                setVal(val1, res);
                if (count === 1) {
                    const msb = (res >> (bits - 1)) & 1;
                    newFlags.OF = (msb ^ newFlags.CF);
                }
                break;
            }
            case 'RCR': {
                const v1 = getVal(val1);
                const count = (val2 || 1) & 0x1F;
                const isWord = true;
                const bits = isWord ? 16 : 8;
                const mask = isWord ? 0xFFFF : 0xFF;
                let res = v1;
                for(let k=0; k<count; k++) {
                    const lsb = res & 1;
                    const oldCF = newFlags.CF;
                    res = ((res >> 1) | (oldCF << (bits - 1))) & mask;
                    newFlags.CF = lsb;
                }
                setVal(val1, res);
                if (count === 1) {
                    const msb = (res >> (bits - 1)) & 1;
                    newFlags.OF = (msb ^ (res >> (bits - 2) & 1)); // XOR of two MSBs
                }
                break;
            }
            case 'INC': {
              const v1 = getVal(val1);
              const res = v1 + 1;
              setVal(val1, res);
              updateFlags(res, false, true, v1, 1);
              break;
            }
            case 'DEC': {
              const v1 = getVal(val1);
              const res = v1 - 1;
              setVal(val1, res);
              updateFlags(res, true, true, v1, 1);
              break;
            }
            case 'MUL': {
                // MUL src. If byte: AX = AL * src. If word: DX:AX = AX * src.
                // Determine size based on operand? Simplified: assume word if reg is 16bit or mem.
                // For simplicity, let's check if val1 is 8-bit reg.
                const is8Bit = ['AL','BL','CL','DL','AH','BH','CH','DH'].includes(val1);
                const v1 = getVal(val1); // This is the src
                if (is8Bit) {
                    const al = newRegisters.AX & 0xFF;
                    const res = al * v1;
                    newRegisters.AX = res;
                    updateFlags(res, false, false);
                } else {
                    const ax = newRegisters.AX;
                    const res = ax * v1;
                    newRegisters.AX = res & 0xFFFF;
                    newRegisters.DX = (res >> 16) & 0xFFFF;
                    updateFlags(res);
                }
                break;
            }
            case 'DIV': {
                const v1 = getVal(val1); // src
                if (v1 === 0) throw new Error("Divide by zero");
                const is8Bit = ['AL','BL','CL','DL','AH','BH','CH','DH'].includes(val1);
                if (is8Bit) {
                    const ax = newRegisters.AX;
                    const quot = Math.floor(ax / v1);
                    const rem = ax % v1;
                    if (quot > 0xFF) throw new Error("Divide overflow");
                    newRegisters.AX = (rem << 8) | quot;
                } else {
                    const dxax = (newRegisters.DX << 16) | newRegisters.AX;
                    const quot = Math.floor(dxax / v1);
                    const rem = dxax % v1;
                    if (quot > 0xFFFF) throw new Error("Divide overflow");
                    newRegisters.AX = quot;
                    newRegisters.DX = rem;
                }
                break;
            }
            case 'AND': {
              const v1 = getVal(val1);
              const res = v1 & val2;
              setVal(val1, res);
              updateFlags(res);
              break;
            }
            case 'OR': {
              const v1 = getVal(val1);
              const res = v1 | val2;
              setVal(val1, res);
              updateFlags(res);
              break;
            }
            case 'XOR': {
              const v1 = getVal(val1);
              const res = v1 ^ val2;
              setVal(val1, res);
              updateFlags(res);
              break;
            }
            case 'NOT': {
                const v1 = getVal(val1);
                setVal(val1, ~v1);
                break;
            }
            case 'SHL': {
                const v1 = getVal(val1);
                const count = val2 || 1;
                const res = v1 << count;
                setVal(val1, res);
                updateFlags(res);
                break;
            }
            case 'SHR': {
                const v1 = getVal(val1);
                const count = val2 || 1;
                const res = v1 >>> count;
                setVal(val1, res);
                updateFlags(res);
                break;
            }
            case 'CMP': {
              const v1 = getVal(val1);
              const res = v1 - val2;
              updateFlags(res, true);
              break;
            }
            case 'JMP':
              if (labelMap.hasOwnProperty(val1)) nextPc = labelMap[val1];
              break;
            case 'JZ':
            case 'JE':
              if (newFlags.ZF === 1 && labelMap.hasOwnProperty(val1)) nextPc = labelMap[val1];
              break;
            case 'JNZ':
            case 'JNE':
              if (newFlags.ZF === 0 && labelMap.hasOwnProperty(val1)) nextPc = labelMap[val1];
              break;
            case 'JC':
            case 'JB':  // Below (无符号)
            case 'JNAE': // Not Above or Equal
              if (newFlags.CF === 1 && labelMap.hasOwnProperty(val1)) nextPc = labelMap[val1];
              break;
            case 'JNC':
            case 'JAE': // Above or Equal (无符号)
            case 'JNB':  // Not Below
              if (newFlags.CF === 0 && labelMap.hasOwnProperty(val1)) nextPc = labelMap[val1];
              break;
            case 'JA':  // Above (无符号: CF=0 且 ZF=0)
            case 'JNBE': // Not Below or Equal
              if (newFlags.CF === 0 && newFlags.ZF === 0 && labelMap.hasOwnProperty(val1)) nextPc = labelMap[val1];
              break;
            case 'JBE': // Below or Equal (无符号: CF=1 或 ZF=1)
            case 'JNA':  // Not Above
              if ((newFlags.CF === 1 || newFlags.ZF === 1) && labelMap.hasOwnProperty(val1)) nextPc = labelMap[val1];
              break;
            case 'JG':  // Greater (有符号: ZF=0 且 SF=OF)
            case 'JNLE': // Not Less or Equal
              if (newFlags.ZF === 0 && newFlags.SF === newFlags.OF && labelMap.hasOwnProperty(val1)) nextPc = labelMap[val1];
              break;
            case 'JGE': // Greater or Equal (有符号: SF=OF)
            case 'JNL':  // Not Less
              if (newFlags.SF === newFlags.OF && labelMap.hasOwnProperty(val1)) nextPc = labelMap[val1];
              break;
            case 'JL':  // Less (有符号: SF≠OF)
            case 'JNGE': // Not Greater or Equal
              if (newFlags.SF !== newFlags.OF && labelMap.hasOwnProperty(val1)) nextPc = labelMap[val1];
              break;
            case 'JLE': // Less or Equal (有符号: ZF=1 或 SF≠OF)
            case 'JNG':  // Not Greater
              if ((newFlags.ZF === 1 || newFlags.SF !== newFlags.OF) && labelMap.hasOwnProperty(val1)) nextPc = labelMap[val1];
              break;
            case 'JS':  // Sign (SF=1)
              if (newFlags.SF === 1 && labelMap.hasOwnProperty(val1)) nextPc = labelMap[val1];
              break;
            case 'JNS': // Not Sign (SF=0)
              if (newFlags.SF === 0 && labelMap.hasOwnProperty(val1)) nextPc = labelMap[val1];
              break;
            case 'JO':  // Overflow (OF=1)
              if (newFlags.OF === 1 && labelMap.hasOwnProperty(val1)) nextPc = labelMap[val1];
              break;
            case 'JNO': // Not Overflow (OF=0)
              if (newFlags.OF === 0 && labelMap.hasOwnProperty(val1)) nextPc = labelMap[val1];
              break;
            case 'JP':  // Parity (PF=1)
            case 'JPE':  // Parity Even
              if (newFlags.PF === 1 && labelMap.hasOwnProperty(val1)) nextPc = labelMap[val1];
              break;
            case 'JNP': // Not Parity (PF=0)
            case 'JPO':  // Parity Odd
              if (newFlags.PF === 0 && labelMap.hasOwnProperty(val1)) nextPc = labelMap[val1];
              break;
            case 'NOP':
              // No operation
              break;
            case 'XCHG': {
                const v1 = getVal(val1);
                const v2 = getVal(val2);
                setVal(val1, v2);
                setVal(val2, v1);
                break;
            }
            case 'NEG': {
                const v1 = getVal(val1);
                const res = -v1;
                setVal(val1, res);
                updateFlags(res, true);
                break;
            }
            case 'TEST': {
                const v1 = getVal(val1);
                const res = v1 & val2;
                updateFlags(res);
                break;
            }
            case 'CLC':
                newFlags.CF = 0;
                break;
            case 'STC':
                newFlags.CF = 1;
                break;
            case 'CMC':
                newFlags.CF = newFlags.CF ? 0 : 1;
                break;
            case 'CLD':
                // Clear Direction Flag (would affect string operations)
                break;
            case 'STD':
                // Set Direction Flag (would affect string operations)
                break;
            case 'LOOP':
              newRegisters.CX = (newRegisters.CX - 1) & 0xFFFF;
              if (newRegisters.CX !== 0 && labelMap.hasOwnProperty(val1)) {
                  nextPc = labelMap[val1];
              } else if (newRegisters.CX === 0) {
                  // 退出循环
              }
              break;
            case 'CALL': {
                // PUSH IP (nextPc)
                newRegisters.SP = (newRegisters.SP - 2) & 0xFFFF;
                try {
                    safeWriteMemory(newRegisters.SP, nextPc, 2, newMemory);
                } catch (err) {
                    throw new Error(`CALL 栈溢出: ${err.message}`);
                }
                if (labelMap.hasOwnProperty(val1)) {
                    // Push to Call Stack
                    newCallStack.push({ 
                        name: val1, 
                        retIp: nextPc,
                        sp: newRegisters.SP 
                    });
                    nextPc = labelMap[val1];
                } else {
                    throw new Error(`未定义的标签: ${val1}`);
                }
                break;
            }
            case 'RET': {
                // POP IP
                try {
                    const retAddr = safeReadMemory(newRegisters.SP, 2, newMemory);
                    newRegisters.SP = (newRegisters.SP + 2) & 0xFFFF;
                    nextPc = retAddr;
                    // Pop from Call Stack
                    if (newCallStack.length > 0) {
                        newCallStack.pop();
                    }
                } catch (err) {
                    throw new Error(`RET 栈下溢: ${err.message}`);
                }
                break;
            }
            case 'PUSH': {
                const v = getVal(val1);
                newRegisters.SP = (newRegisters.SP - 2) & 0xFFFF;
                try {
                    safeWriteMemory(newRegisters.SP, v, 2, newMemory);
                } catch (err) {
                    throw new Error(`PUSH 栈溢出: ${err.message}`);
                }
                break;
            }
            case 'POP': {
                try {
                    const v = safeReadMemory(newRegisters.SP, 2, newMemory);
                    setVal(val1, v);
                    newRegisters.SP = (newRegisters.SP + 2) & 0xFFFF;
                } catch (err) {
                    throw new Error(`POP 栈下溢: ${err.message}`);
                }
                break;
            }
            case 'INT':
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
                      const dosResult = handleDosInterrupt(newRegisters, newMemory, newCursor, newBuffer);
                      newCursor = dosResult.newCursor;
                      newBuffer = dosResult.newBuffer;
                      if (dosResult.newRegs) newRegisters = dosResult.newRegs;
                      if (dosResult.shouldStop) {
                          setIsPlaying(false);
                          if (isLightSpeed) clearInterval(intervalRef.current);
                          nextPc = parsedInstructions.length;
                      }
                  }
              }
              else if (val1 === '10H') {
                  const biosResult = handleBiosInterrupt(newRegisters, newCursor, newBuffer);
                  newCursor = biosResult.newCursor;
                  newBuffer = biosResult.newBuffer;
              }
              else {
                  // 未实现的中断
              }
              interruptOccurred = true;
              break;
            default: break;
          }

          // Find next valid instruction
          let tempNext = nextPc;
          while (tempNext < parsedInstructions.length && parsedInstructions[tempNext].type === 'EMPTY') {
            tempNext++;
          }
          currentPc = tempNext;

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
          // 标记发生了错误，直接跳到末尾
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

  }, [pc, parsedInstructions, registers, memory, flags, cursor, screenBuffer, symbolTable, labelMap, handleDosInterrupt, handleBiosInterrupt, speed, isWaitingForInput, isPlaying, callStack]);

  const reload = useCallback((newCode) => {
    setCode(newCode);
    initialCodeRef.current = newCode;
    setPc(0);
    setRegisters({ 
      AX: 0, BX: 0, CX: 0, DX: 0, 
      SP: 0xFFFE, BP: 0, SI: 0, DI: 0,
      CS: 0x04B0, DS: 0x04AE, SS: 0x04AD, ES: 0x049E, IP: 0
    });
    setFlags({ ZF: 0, SF: 0, CF: 0, OF: 0, PF: 0, AF: 0, TF: 0, IF: 1, DF: 0 });
    resetScreen();
    setCallStack([]);
    setIsPlaying(false);
    setError(null);
  }, [resetScreen]);

  const handleInput = useCallback((char) => {
      if (isWaitingForInput) {
          const charCode = char.charCodeAt(0);
          setRegisters(prev => {
              // AL = char
              const newAX = (prev.AX & 0xFF00) | (charCode & 0xFF);
              return { ...prev, AX: newAX };
          });
          
          // 回显到屏幕
          setScreenBuffer(prevBuffer => {
              const newBuffer = prevBuffer.map(row => [...row]);
              const { r, c } = cursor;
              if (r < SCREEN_ROWS && c < SCREEN_COLS) {
                  newBuffer[r][c] = { ...newBuffer[r][c], char };
              }
              return newBuffer;
          });
          setCursor(prev => {
              let newC = prev.c + 1;
              let newR = prev.r;
              if (newC >= SCREEN_COLS) {
                  newC = 0;
                  newR++;
                  if (newR >= SCREEN_ROWS) newR = 0;
              }
              return { r: newR, c: newC };
          });
          
          setIsWaitingForInput(false);
          setIsPlaying(true);
      }
  }, [isWaitingForInput, cursor]);

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
    cursor,
    isPlaying, setIsPlaying,
    speed, setSpeed,
    error, setError,
    parsedInstructions,
    executeStep,
    reload,
    handleInput,
    isWaitingForInput,
    breakpoints,
    toggleBreakpoint,
    watchVariables,
    addWatchVariable,
    removeWatchVariable,
    callStack
  };
};
