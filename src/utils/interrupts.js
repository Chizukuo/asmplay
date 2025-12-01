import { SCREEN_ROWS, SCREEN_COLS } from '../constants';
import { safeReadMemory } from './memoryUtils';
import { getCharFromCode, printToConsole } from './displayUtils';

export const handleDosInterrupt = (regs, currentMemory, currentCursor, currentBuffer, callbacks = {}) => {
  const ah = (regs.AX & 0xFF00) >> 8;
  const al = regs.AX & 0xFF;
  let newCursor = currentCursor;
  let newBuffer = currentBuffer;
  let shouldStop = false;
  let newRegs = null;
  
  try {
    if (ah === 0x02) {
      // 输出单个字符到屏幕（DL = 字符）
      const char = getCharFromCode(regs.DX & 0xFF);
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
        const char = getCharFromCode(dl);
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
          const char = getCharFromCode(charCode);
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
      if (callbacks.setIsPlaying) callbacks.setIsPlaying(false);
      shouldStop = true;
    } else {
      // 未实现的功能
    }
  } catch (err) {
    console.error(`INT 21H 错误: ${err.message}`);
  }
  
  return { newCursor, newBuffer, shouldStop, newRegs };
};

export const handleBiosInterrupt = (regs, currentMemory, currentCursor, currentBuffer) => {
  const ah = (regs.AX & 0xFF00) >> 8;
  const al = regs.AX & 0xFF;
  let newCursor = currentCursor;
  let newBuffer = currentBuffer;
  let newRegs = null;
  let newCols = null;
  
  try {
    if (ah === 0x00) {
      // Set video mode
      let cols = 80;
      if (al === 0x00 || al === 0x01) cols = 40;
      else if (al === 0x02 || al === 0x03) cols = 80;
      
      newCols = cols;
      const rows = [];
      for (let r = 0; r < SCREEN_ROWS; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
          row.push({ char: ' ', style: 'bg-black', fg: 'text-white', blink: '' });
        }
        rows.push(row);
      }
      newBuffer = rows;
      newCursor = { r: 0, c: 0 };
      return { newCursor, newBuffer, newRegs, newCols };
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
      
      const currentCols = currentBuffer[0] ? currentBuffer[0].length : SCREEN_COLS;

      try {
        for (let i = 0; i < cx; i++) {
          // 使用 ES:BP 读取字符（INT 10H AH=13H 约定使用 ES 段）
          const charCode = safeReadMemory(bp + i, 1, currentMemory, true, regs.ES);
          const ch = getCharFromCode(charCode);
          if (row >= SCREEN_ROWS) break;
          if (col >= currentCols) {
            col = 0;
            row++;
            if (row >= SCREEN_ROWS) break;
          }
          if (newBuffer[row] && newBuffer[row][col]) {
              newBuffer[row][col] = { ...newBuffer[row][col], char: ch, style: bg, fg: fg, blink: blinkClass };
          }
          col++;
        }
      } catch (err) {
        console.error(`INT 10H AH=13H 读取字符串错误: ${err.message}`);
      }
      
      // Update cursor if AL & 1
      if ((al & 1) === 1) {
           newCursor = { r: row, c: col };
      }
      
      return { newCursor, newBuffer, newRegs };
    }
    if (ah === 0x00) {
      // Fallback for other modes if not handled above (though handled above now)
      // ...
    }
    if (ah === 0x02) {
      // 设置光标位置
      const row = (regs.DX & 0xFF00) >> 8;
      const col = regs.DX & 0x00FF;
      const currentCols = currentBuffer[0] ? currentBuffer[0].length : SCREEN_COLS;
      if (row < SCREEN_ROWS && col < currentCols) {
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
           'yellow-400', // 0xE: 亮黄色
           'white'       // 0xF: 亮白色
         ];
         
         const bg = `bg-${colorMap[bgColor] || 'black'}`;
         const fg = `text-${colorMap[fgColor] || 'white'}`;
         const blinkClass = blink ? 'text-blink' : '';
         
         // CX = 左上角 (CH:CL = 行:列)
         // DX = 右下角 (DH:DL = 行:列)
         const startRow = (regs.CX & 0xFF00) >> 8;
         const startCol = regs.CX & 0x00FF;
         const endRow = (regs.DX & 0xFF00) >> 8;
         const endCol = regs.DX & 0x00FF;
         
         for (let r = startRow; r <= endRow && r < SCREEN_ROWS; r++) {
           for (let c = startCol; c <= endCol && c < currentBuffer[0].length; c++) {
             if (newBuffer[r] && newBuffer[r][c]) {
               newBuffer[r][c] = { ...newBuffer[r][c], char: ' ', style: bg, fg: fg, blink: blinkClass };
             }
           }
         }
      }
    } else {
      // 未实现的功能
    }
  } catch (err) {
    console.error(`INT 10H 错误: ${err.message}`);
  }
  
  return { newCursor, newBuffer, newRegs, newCols };
};

export const handleKeyboardInterrupt = (regs, keyBufferState) => {
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
};
