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
    SP: 0x0800, BP: 0, SI: 0, DI: 0,
    // 真实DOS风格内存布局（参考DEBUG截图 DS=04AE, SS=04AD, CS=04B1）：
    // PSP:     0x04A0:0x0000 - 0x04A0:0x00FF (256字节，程序段前缀)
    // 代码段:  0x04B0:0x0000 开始 (CS, 在PSP后约256字节)
    // 数据段:  0x04E0:0x0000 开始 (DS, 在代码后约3KB)
    // 栈段:    0x0500:0x0000 开始 (SS, 给栈2KB空间，SP从0x0800开始向下)
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
  const [cursor, setCursor] = useState({ r: 0, c: 0 });
  const [speed, setSpeed] = useState(INSTRUCTION_DELAY);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [breakpoints, setBreakpoints] = useState(new Set());
  const [watchVariables, setWatchVariables] = useState([]);
  const [callStack, setCallStack] = useState([]);
  const [keyBuffer, setKeyBuffer] = useState([]); // 按键缓冲区
  const [lastKeyPressed, setLastKeyPressed] = useState(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [parsedInstructions, setParsedInstructions] = useState([]);
  const [segmentTable, setSegmentTable] = useState({}); // 存储段名和段地址

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
    const { newMemory, dataMap, labelMap: lMap, instructions, dataSize, instructionAddresses, instructionOffsets, segmentNames } = parseCode(code);
    setMemory(newMemory);
    setSymbolTable(dataMap);
    setLabelMap(lMap);
    setParsedInstructions(instructions);
    setInstructionAddresses(instructionAddresses || []);
    setSegmentTable(segmentNames || {});
  }, [code]);

  // 物理地址计算工具函数
  const calculatePhysicalAddress = (segment, offset) => {
    // 实模式：物理地址 = (段地址 << 4) + 偏移地址
    // 限制在20位地址空间内（1MB）
    const segBase = (segment << 4) & 0xFFFFF;
    const physAddr = (segBase + offset) & 0xFFFFF;
    return physAddr;
  };

  // 内存边界检查
  const isValidMemoryAddress = (addr, size = 1) => {
    return addr >= 0 && addr + size <= MEMORY_SIZE;
  };

  // 安全读取内存（支持段地址和线性地址）
  const safeReadMemory = (addr, size = 2, memory, useSegment = false, segment = 0) => {
    // 如果使用段地址模型，计算物理地址
    let physAddr = addr;
    if (useSegment) {
      physAddr = calculatePhysicalAddress(segment, addr);
    }
    
    // 增强的边界检查，确保不会访问到 MEMORY_SIZE 或更大的地址
    if (!isValidMemoryAddress(physAddr, size) || physAddr >= MEMORY_SIZE) {
      throw new Error(`内存访问越界: 地址 0x${physAddr.toString(16).toUpperCase()} (size=${size})`);
    }
    if (size === 1) return memory[physAddr];
    if (size === 2) return memory[physAddr] | (memory[physAddr + 1] << 8);
    return 0;
  };

  // 安全写入内存（支持段地址和线性地址）
  const safeWriteMemory = (addr, value, size = 2, memory, useSegment = false, segment = 0) => {
    // 如果使用段地址模型，计算物理地址
    let physAddr = addr;
    if (useSegment) {
      physAddr = calculatePhysicalAddress(segment, addr);
    }
    
    // 增强的边界检查，确保不会访问到 MEMORY_SIZE 或更大的地址
    if (!isValidMemoryAddress(physAddr, size) || physAddr >= MEMORY_SIZE) {
      throw new Error(`内存访问越界: 地址 0x${physAddr.toString(16).toUpperCase()} (size=${size})`);
    }
    if (size === 1) {
      memory[physAddr] = value & 0xFF;
    } else if (size === 2) {
      memory[physAddr] = value & 0xFF;
      memory[physAddr + 1] = (value >> 8) & 0xFF;
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
        // 输出字符串（DS:DX = 字符串地址，$ 结束）
        // DX 存储的是段内偏移量，需要结合 DS 计算物理地址
        let offset = regs.DX & 0xFFFF;
        let output = "";
        let steps = 0;
        try {
          while (steps < 1000) {
            // 使用 DS:offset 读取字符
            const charCode = safeReadMemory(offset, 1, currentMemory, true, regs.DS);
            const char = String.fromCharCode(charCode);
            if (char === '$') break;
            output += char;
            offset++;
            steps++;
          }
        } catch (err) {
          console.error(`INT 21H AH=09H 读取字符串错误: ${err.message}`);
        }
        const result = printToConsole(output, newCursor, newBuffer);
        newBuffer = result.newBuffer;
        newCursor = result.newCursor;
      } else if (ah === 0x2A) {
        // 获取系统日期：填充 CX=年, DH=月, DL=日
        const now = new Date();
        const year = now.getFullYear() & 0xFFFF;
        const month = now.getMonth() + 1;
        const day = now.getDate();

        newRegs = { ...regs };
        newRegs.CX = year;
        newRegs.DX = ((month & 0xFF) << 8) | (day & 0xFF);
      } else if (ah === 0x2C) {
        // 获取系统时间：CH=小时, CL=分钟, DH=秒, DL=百分之一秒
        const now = new Date();
        const hour = now.getHours() & 0xFF;
        const minute = now.getMinutes() & 0xFF;
        const second = now.getSeconds() & 0xFF;
        const centisec = Math.floor(now.getMilliseconds() / 10) & 0xFF;

        newRegs = { ...regs };
        // CX: CH = hour, CL = minute
        newRegs.CX = ((hour & 0xFF) << 8) | (minute & 0xFF);
        // DX: DH = second, DL = centiseconds
        newRegs.DX = ((second & 0xFF) << 8) | (centisec & 0xFF);
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
  }, [printToConsole, symbolTable]);

  const handleBiosInterrupt = useCallback((regs, currentMemory, currentCursor, currentBuffer, keyBufferState, setKeyBufferStateCb) => {
    const ah = (regs.AX & 0xFF00) >> 8;
    const al = regs.AX & 0xFF;
    let newCursor = currentCursor;
    let newBuffer = currentBuffer;
    let newRegs = null;
    
    try {
      if (ah === 0x00 || ah === 0x01) {
        // 设置视频模式 (AH=00H) 或 设置文本模式光标形状 (AH=01H)
        // 忽略AH=01H，清屏处理AH=00H
        if (ah === 0x00) {
          // AL = 视频模式 (00H=40x25黑白, 01H=40x25彩色, 02H=80x25黑白, 03H=80x25彩色等)
          // 简化处理：无论何种模式，都清屏
          const rows = [];
          for (let r = 0; r < SCREEN_ROWS; r++) {
            const row = [];
            for (let c = 0; c < SCREEN_COLS; c++) {
              row.push({ char: ' ', style: 'bg-black', fg: 'text-white', blink: '' });
            }
            rows.push(row);
          }
          newBuffer = rows;
          newCursor = { r: 0, c: 0 };
        }
      } else if (ah === 0x13) {
        // Write string to screen from ES:BP (注意：INT 10H AH=13H 使用 ES 而非 DS)
        // CX = 字符串长度，DH:DL = 行:列，BL = 属性
        const cx = regs.CX & 0xFFFF;
        const bp = regs.BP & 0xFFFF;
        let row = (regs.DX & 0xFF00) >> 8;
        let col = regs.DX & 0x00FF;
        const bl = regs.BX & 0xFF;

        // Attribute mapping
        const colorMap = [
          'black','blue-600','green-600','cyan-600','red-600','purple-600','yellow-700','gray-300',
          'gray-600','blue-400','green-400','cyan-400','red-400','purple-400','yellow-400','white'
        ];
        const bgColor = (bl & 0x70) >> 4;
        const fgColor = bl & 0x0F;
        const blinkClass = (bl & 0x80) !== 0 ? 'text-blink' : '';
        const bg = `bg-${colorMap[bgColor] || 'black'}`;
        const fg = `text-${colorMap[fgColor] || 'white'}`;

        try {
          for (let i = 0; i < cx; i++) {
            // 使用 ES:BP 读取字符（INT 10H AH=13H 约定使用 ES 段）
            const charCode = safeReadMemory(bp + i, 1, currentMemory, true, regs.ES);
            const ch = String.fromCharCode(charCode);
            if (row >= SCREEN_ROWS) break;
            if (col >= SCREEN_COLS) {
              col = 0;
              row++;
              if (row >= SCREEN_ROWS) break;
            }
            newBuffer[row][col] = { ...newBuffer[row][col], char: ch, style: bg, fg: fg, blink: blinkClass };
            col++;
          }
        } catch (err) {
          console.error(`INT 10H AH=13H 读取字符串错误: ${err.message}`);
        }
        return { newCursor, newBuffer };
      }
      if (ah === 0x00) {
        // Set video mode (simplified) - clear screen and reset cursor
        // AL = mode. We'll just clear and keep text mode behavior.
        const rows = [];
        for (let r = 0; r < SCREEN_ROWS; r++) {
          const row = [];
          for (let c = 0; c < SCREEN_COLS; c++) {
            row.push({ char: ' ', style: 'bg-black', fg: 'text-white', blink: '' });
          }
          rows.push(row);
        }
        newBuffer = rows;
        newCursor = { r: 0, c: 0 };
        return { newCursor, newBuffer };
      }
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
    
    return { newCursor, newBuffer, newRegs };
  }, []);

  const handleKeyboardInterrupt = useCallback((regs, keyBufferState, consumeKeyCb) => {
    const ah = (regs.AX & 0xFF00) >> 8;
    let newRegs = { ...regs };
    let newFlags = null;
    let shouldConsume = false;
    
    if (ah === 0x00) {
      // AH=00H: 读取按键（阻塞式）- 暂不实现阻塞，简化处理
      if (keyBufferState.length > 0) {
        const key = keyBufferState[0];
        newRegs.AX = key.scanCode << 8 | key.ascii;
        shouldConsume = true; // 标记需要消费按键
      }
    } else if (ah === 0x01) {
      // AH=01H: 检测按键状态（非阻塞）
      // ZF=1表示无按键，ZF=0表示有按键
      // 如果有按键，AX返回按键码（但不从缓冲区移除）
      if (keyBufferState.length > 0) {
        const key = keyBufferState[0];
        newRegs.AX = key.scanCode << 8 | key.ascii;
        newFlags = { ZF: 0 }; // 有按键
      } else {
        newFlags = { ZF: 1 }; // 无按键
      }
    } else if (ah === 0x02) {
      // AH=02H: 获取键盘状态标志
      // 简化：返回0（无特殊按键按下）
      newRegs.AX = (newRegs.AX & 0xFF00) | 0x00;
    }
    
    return { newRegs, newFlags, shouldConsume };
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

          const getVal = (arg, size = null) => {
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
            
            // Handle segment names (DATA, CODE, STACK, etc.)
            // 当代码中使用 MOV AX, DATA 时，返回数据段的段地址
            if (typeof arg === 'string') {
              const upperArg = arg.toUpperCase();
              // 优先检查段名表
              if (segmentTable[upperArg] !== undefined) {
                return segmentTable[upperArg];
              }
              // 兜底：如果 symbolTable 中没有，检查是否是常见的段名
              if (upperArg === 'DATA') return newRegisters.DS;
              if (upperArg === 'CODE') return newRegisters.CS;
              if (upperArg === 'STACK') return newRegisters.SS;
            }
            
            // Immediate
            // 注意：如果 arg 在 symbolTable 中，说明它是变量，不应作为立即数处理（除非是 OFFSET）
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
                    // getEA 返回的已经是段内偏移量
                    // 统一使用 DS:offset 访问数据段
                    // 如果没有指定size，默认读取2字节
                    const readSize = size !== null ? size : 2;
                    return safeReadMemory(ea, readSize, newMemory, true, newRegisters.DS);
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

          const setVal = (arg, val, size = null) => {
              if (['AX','BX','CX','DX','AH','AL','BH','BL','CH','CL','DH','DL','SP','BP','SI','DI','CS','DS','SS','ES','IP'].includes(arg)) {
                  newRegisters = setReg(arg, val, newRegisters);
              } else {
                  const ea = getEA(arg);
                  if (ea !== null) {
                      try {
                          // getEA 返回的已经是段内偏移量
                          // 统一使用 DS:offset 写入数据段
                          // 如果没有指定size，默认写入2字节
                          const writeSize = size !== null ? size : 2;
                          safeWriteMemory(ea, val, writeSize, newMemory, true, newRegisters.DS);
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
              
              // Auxiliary Carry Flag（低4位进位/借位）
              // 用于BCD运算，检查bit3到bit4的进位
              if (isSub) {
                newFlags.AF = ((operand1 & 0xF) < (operand2 & 0xF)) ? 1 : 0;
              } else {
                newFlags.AF = (((operand1 & 0xF) + (operand2 & 0xF)) > 0xF) ? 1 : 0;
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
          // 判断操作数大小：如果任一操作数是8位寄存器，则操作按8位处理
          // 这解决了 MOV Z, AL 这样的指令（Z是内存变量，AL是8位寄存器）
          const isReg8 = (arg) => typeof arg === 'string' && ['AL','BL','CL','DL','AH','BH','CH','DH'].includes(arg);
          const val2Arg = realArgs.length > 1 ? realArgs[1] : null;
          
          let is8BitOp = false;
          const isShiftOp = ['ROL', 'ROR', 'RCL', 'RCR', 'SHL', 'SHR', 'SAL', 'SAR'].includes(op);

          if (isShiftOp) {
             // For shift/rotate, size is determined ONLY by the destination (first operand)
             // The count operand (CL or imm) is always 8-bit but doesn't affect operation size
             is8BitOp = val1 && isReg8(val1);
             if (!is8BitOp && val1 && typeof val1 === 'string' && val1.toUpperCase().includes('BYTE PTR')) is8BitOp = true;
          } else {
             is8BitOp = (val1 && isReg8(val1)) || (val2Arg && isReg8(val2Arg));
             
             // Check for explicit size directives in memory operands
             if (!is8BitOp) {
               if (val1 && typeof val1 === 'string' && val1.toUpperCase().includes('BYTE PTR')) is8BitOp = true;
               if (val2Arg && typeof val2Arg === 'string' && val2Arg.toUpperCase().includes('BYTE PTR')) is8BitOp = true;
             }
          }

          const operandSize = is8BitOp ? 1 : 2;
          
          // For 2nd arg, if it's a register/memory, get value. If immediate, use it.
          // But getVal handles all.
          const val2 = realArgs.length > 1 ? getVal(realArgs[1], operandSize) : 0;

          switch (op) {
            case 'MOV':
              // 允许所有寄存器赋值，包括段寄存器
              // 注意：8086中段寄存器不能直接用立即数赋值，但可以从通用寄存器赋值
              setVal(val1, val2, operandSize);
              break;
            case 'LEA': {
                const ea = getEA(realArgs[1]);
                if (ea !== null) setVal(val1, ea, operandSize);
                break;
            }
            case 'ADD': {
              const v1 = getVal(val1, operandSize);
              const res = v1 + val2;
              const is8Bit = operandSize === 1;
              setVal(val1, res, operandSize);
              updateFlags(res, false, !is8Bit, v1, val2);
              break;
            }
            case 'SUB': {
              const v1 = getVal(val1, operandSize);
              const res = v1 - val2;
              const is8Bit = operandSize === 1;
              setVal(val1, res, operandSize);
              updateFlags(res, true, !is8Bit, v1, val2);
              break;
            }
            case 'ADC': {
              const v1 = getVal(val1, operandSize);
              const cf = newFlags.CF;
              const res = v1 + val2 + cf;
              const is8Bit = operandSize === 1;
              setVal(val1, res, operandSize);
              updateFlags(res, false, !is8Bit, v1, val2 + cf);
              break;
            }
            case 'SBB': {
              const v1 = getVal(val1, operandSize);
              const cf = newFlags.CF;
              const res = v1 - val2 - cf;
              const is8Bit = operandSize === 1;
              setVal(val1, res, operandSize);
              updateFlags(res, true, !is8Bit, v1, val2 + cf);
              break;
            }
            case 'ROL': {
                const v1 = getVal(val1, operandSize);
                const count = (val2 || 1) & 0x1F;
                const isWord = operandSize === 2;
                const bits = isWord ? 16 : 8;
                const mask = isWord ? 0xFFFF : 0xFF;
                let res = v1;
                for(let k=0; k<count; k++) {
                    const msb = (res >> (bits - 1)) & 1;
                    res = ((res << 1) | msb) & mask;
                    newFlags.CF = msb;
                }
                setVal(val1, res, operandSize);
                // OF is defined only for count=1
                if (count === 1) {
                    const msb = (res >> (bits - 1)) & 1;
                    newFlags.OF = (msb ^ newFlags.CF);
                }
                break;
            }
            case 'ROR': {
                const v1 = getVal(val1, operandSize);
                const count = (val2 || 1) & 0x1F;
                const isWord = operandSize === 2;
                const bits = isWord ? 16 : 8;
                const mask = isWord ? 0xFFFF : 0xFF;
                let res = v1;
                for(let k=0; k<count; k++) {
                    const lsb = res & 1;
                    res = ((res >> 1) | (lsb << (bits - 1))) & mask;
                    newFlags.CF = lsb;
                }
                setVal(val1, res, operandSize);
                if (count === 1) {
                    const msb = (res >> (bits - 1)) & 1;
                    newFlags.OF = (msb ^ (res >> (bits - 2) & 1)); // XOR of two MSBs
                }
                break;
            }
            case 'RCL': {
                const v1 = getVal(val1, operandSize);
                const count = (val2 || 1) & 0x1F;
                const isWord = operandSize === 2;
                const bits = isWord ? 16 : 8;
                const mask = isWord ? 0xFFFF : 0xFF;
                let res = v1;
                for(let k=0; k<count; k++) {
                    const msb = (res >> (bits - 1)) & 1;
                    const oldCF = newFlags.CF;
                    res = ((res << 1) | oldCF) & mask;
                    newFlags.CF = msb;
                }
                setVal(val1, res, operandSize);
                if (count === 1) {
                    const msb = (res >> (bits - 1)) & 1;
                    newFlags.OF = (msb ^ newFlags.CF);
                }
                break;
            }
            case 'RCR': {
                const v1 = getVal(val1, operandSize);
                const count = (val2 || 1) & 0x1F;
                const isWord = operandSize === 2;
                const bits = isWord ? 16 : 8;
                const mask = isWord ? 0xFFFF : 0xFF;
                let res = v1;
                for(let k=0; k<count; k++) {
                    const lsb = res & 1;
                    const oldCF = newFlags.CF;
                    res = ((res >> 1) | (oldCF << (bits - 1))) & mask;
                    newFlags.CF = lsb;
                }
                setVal(val1, res, operandSize);
                if (count === 1) {
                    const msb = (res >> (bits - 1)) & 1;
                    newFlags.OF = (msb ^ (res >> (bits - 2) & 1)); // XOR of two MSBs
                }
                break;
            }
            case 'INC': {
              const v1 = getVal(val1, operandSize);
              const res = v1 + 1;
              setVal(val1, res, operandSize);
              const is8Bit = operandSize === 1;
              updateFlags(res, false, !is8Bit, v1, 1);
              break;
            }
            case 'DEC': {
              const v1 = getVal(val1, operandSize);
              const res = v1 - 1;
              setVal(val1, res, operandSize);
              const is8Bit = operandSize === 1;
              updateFlags(res, true, !is8Bit, v1, 1);
              break;
            }
            case 'MUL': {
                // MUL src. If byte: AX = AL * src. If word: DX:AX = AX * src.
                // Determine size based on operand? Simplified: assume word if reg is 16bit or mem.
                // For simplicity, let's check if val1 is 8-bit reg.
                const is8Bit = operandSize === 1;
                const v1 = getVal(val1, operandSize); // This is the src
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
                const v1 = getVal(val1, operandSize); // divisor (除数)
                if (v1 === 0) throw new Error("Divide by zero");
                
                // 判断是8位还是16位除法：
                // 8位除法：除数是8位寄存器或字节内存，被除数是AX，商->AL，余数->AH
                // 16位除法：除数是16位寄存器或字内存，被除数是DX:AX，商->AX，余数->DX
                const is8Bit = operandSize === 1;
                
                if (is8Bit) {
                    // 8位除法：AX ÷ divisor = AL(商) ... AH(余数)
                    const ax = newRegisters.AX & 0xFFFF;
                    const divisor = v1 & 0xFF;
                    const quot = Math.floor(ax / divisor);
                    const rem = ax % divisor;
                    if (quot > 0xFF) throw new Error("Divide overflow");
                    // AL = 商，AH = 余数
                    newRegisters.AX = ((rem & 0xFF) << 8) | (quot & 0xFF);
                } else {
                    // 16位除法：DX:AX ÷ divisor = AX(商) ... DX(余数)
                    const dxax = ((newRegisters.DX & 0xFFFF) << 16) | (newRegisters.AX & 0xFFFF);
                    const divisor = v1 & 0xFFFF;
                    const quot = Math.floor(dxax / divisor);
                    const rem = dxax % divisor;
                    if (quot > 0xFFFF) throw new Error("Divide overflow");
                    // AX = 商，DX = 余数
                    newRegisters.AX = quot & 0xFFFF;
                    newRegisters.DX = rem & 0xFFFF;
                }
                break;
            }
            case 'CBW': {
                // Convert Byte to Word: 将AL的符号扩展到AH
                const al = newRegisters.AX & 0xFF;
                const sign = (al & 0x80) ? 0xFF : 0x00;
                newRegisters.AX = (sign << 8) | al;
                break;
            }
            case 'CWD': {
                // Convert Word to Doubleword: 将AX的符号扩展到DX
                const ax = newRegisters.AX;
                const sign = (ax & 0x8000) ? 0xFFFF : 0x0000;
                newRegisters.DX = sign;
                break;
            }
            case 'AND': {
              const v1 = getVal(val1, operandSize);
              const res = v1 & val2;
              setVal(val1, res, operandSize);
              updateFlags(res, false, operandSize === 2);
              break;
            }
            case 'OR': {
              const v1 = getVal(val1, operandSize);
              const res = v1 | val2;
              setVal(val1, res, operandSize);
              updateFlags(res, false, operandSize === 2);
              break;
            }
            case 'XOR': {
              const v1 = getVal(val1, operandSize);
              const res = v1 ^ val2;
              setVal(val1, res, operandSize);
              updateFlags(res, false, operandSize === 2);
              break;
            }
            case 'NOT': {
                const v1 = getVal(val1, operandSize);
                setVal(val1, ~v1, operandSize);
                break;
            }
            case 'SHL': {
                const v1 = getVal(val1, operandSize);
                const count = val2 || 1;
                const res = v1 << count;
                setVal(val1, res, operandSize);
                updateFlags(res, false, operandSize === 2);
                break;
            }
            case 'SHR': {
                const v1 = getVal(val1, operandSize);
                const count = val2 || 1;
                const res = v1 >>> count;
                setVal(val1, res, operandSize);
                updateFlags(res, false, operandSize === 2);
                break;
            }
            case 'CMP': {
              const v1 = getVal(val1, operandSize);
              const res = v1 - val2;
              updateFlags(res, true, operandSize === 2, v1, val2);
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
                const v1 = getVal(val1, operandSize);
                const v2 = getVal(val2, operandSize);
                setVal(val1, v2, operandSize);
                setVal(val2, v1, operandSize);
                break;
            }
            case 'NEG': {
                const v1 = getVal(val1, operandSize);
                const res = -v1;
                setVal(val1, res, operandSize);
                updateFlags(res, true);
                break;
            }
            case 'TEST': {
                const v1 = getVal(val1, operandSize);
                const res = v1 & val2;
                updateFlags(res, false, operandSize === 2);
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
                    // 使用 SS:SP 段地址模型写入栈
                    safeWriteMemory(newRegisters.SP, nextPc, 2, newMemory, true, newRegisters.SS);
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
                    // 使用 SS:SP 段地址模型读取栈
                    const retAddr = safeReadMemory(newRegisters.SP, 2, newMemory, true, newRegisters.SS);
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
                    // 使用 SS:SP 段地址模型写入栈
                    safeWriteMemory(newRegisters.SP, v, 2, newMemory, true, newRegisters.SS);
                } catch (err) {
                    throw new Error(`PUSH 栈溢出: ${err.message}`);
                }
                break;
            }
            case 'POP': {
                try {
                    // 使用 SS:SP 段地址模型读取栈
                    const v = safeReadMemory(newRegisters.SP, 2, newMemory, true, newRegisters.SS);
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
                  const biosResult = handleBiosInterrupt(newRegisters, newMemory, newCursor, newBuffer, keyBuffer, setKeyBuffer);
                  newCursor = biosResult.newCursor;
                  newBuffer = biosResult.newBuffer;
                  if (biosResult.newRegs) newRegisters = biosResult.newRegs;
              }
              else if (val1 === '16H') {
                  // 键盘中断
                  const kbResult = handleKeyboardInterrupt(newRegisters, keyBuffer, () => {
                    // 立即更新keyBuffer状态
                    setKeyBuffer(prev => prev.slice(1));
                  });
                  if (kbResult.newRegs) newRegisters = kbResult.newRegs;
                  if (kbResult.newFlags) {
                      // 只更新ZF标志
                      Object.assign(newFlags, kbResult.newFlags);
                  }
                  // 如果需要消费按键，更新本地keyBuffer
                  if (kbResult.shouldConsume && keyBuffer.length > 0) {
                    // 从本地副本中移除
                    // 注意：setKeyBuffer在上面已经调用
                  }
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

  }, [pc, parsedInstructions, registers, memory, flags, cursor, screenBuffer, symbolTable, labelMap, handleDosInterrupt, handleBiosInterrupt, handleKeyboardInterrupt, speed, isWaitingForInput, isPlaying, callStack, keyBuffer, breakpoints]);

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
    resetScreen();
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
                  if (r < SCREEN_ROWS && c < SCREEN_COLS) {
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
      }
  }, [isWaitingForInput, cursor]);

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
