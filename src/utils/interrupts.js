import { SCREEN_ROWS, SCREEN_COLS } from '../constants';
import { safeReadMemory } from './memoryUtils';
import { getCharFromCode, printToConsole, writeCharToVideoMemory } from './displayUtils';

export const handleDosInterrupt = (regs, currentMemory, currentCursor, videoMemory, callbacks = {}, currentCols = SCREEN_COLS) => {
  const ah = (regs.AX & 0xFF00) >> 8;
  const al = regs.AX & 0xFF;
  let newCursor = currentCursor;
  let shouldStop = false;
  let newRegs = null;
  
  try {
    if (ah === 0x02) {
      // 输出单个字符到屏幕（DL = 字符）
      const charCode = regs.DX & 0xFF;
      const result = printToConsole(charCode, newCursor, videoMemory, null, currentCols);
      newCursor = result;
    } else if (ah === 0x06) {
      // 直接控制台 I/O
      const dl = regs.DX & 0xFF;
      if (dl === 0xFF) {
        // 输入：设置 ZF=1 表示无字符，这里简化处理
      } else {
        // 输出
        const result = printToConsole(dl, newCursor, videoMemory, null, currentCols);
        newCursor = result;
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
          if (charCode === 0x24) break; // '$'
          output += String.fromCharCode(charCode); // 暂存为字符串以便 printToConsole 处理换行等
          offset++;
          steps++;
        }
      } catch (err) {
        console.error(`INT 21H AH=09H 读取字符串错误: ${err.message}`);
      }
      const result = printToConsole(output, newCursor, videoMemory, null, currentCols);
      newCursor = result;
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
  
  return { newCursor, shouldStop, newRegs };
};

export const handleTimeInterrupt = (regs) => {
  const ah = (regs.AX & 0xFF00) >> 8;
  let newRegs = { ...regs };
  let newFlags = null;

  try {
    if (ah === 0x00) {
      // GET SYSTEM TIME
      // Returns: CX:DX = number of clock ticks since midnight
      // AL = midnight flag (0 if not passed midnight, 1 if passed)
      // 18.2065 ticks per second
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(0, 0, 0, 0);
      const msSinceMidnight = now - midnight;
      const ticks = Math.floor(msSinceMidnight * 18.2065 / 1000);
      
      newRegs.CX = (ticks >> 16) & 0xFFFF;
      newRegs.DX = ticks & 0xFFFF;
      newRegs.AX = (newRegs.AX & 0xFF00); // AL = 0 (simplified)
    } else if (ah === 0x02) {
      // GET REAL-TIME CLOCK TIME (BCD)
      // Returns: CH = Hours (BCD), CL = Minutes (BCD), DH = Seconds (BCD)
      const now = new Date();
      const toBCD = (val) => ((Math.floor(val / 10) << 4) | (val % 10));
      
      newRegs.CX = (toBCD(now.getHours()) << 8) | toBCD(now.getMinutes());
      newRegs.DX = (toBCD(now.getSeconds()) << 8) | (newRegs.DX & 0x00FF);
      newFlags = { CF: 0 };
    }
  } catch (err) {
    console.error(`INT 1A 错误: ${err.message}`);
  }

  return { newRegs, newFlags };
};

export const handleBiosInterrupt = (regs, currentMemory, currentCursor, videoMemory, currentCols = SCREEN_COLS) => {
  const ah = (regs.AX & 0xFF00) >> 8;
  const al = regs.AX & 0xFF;
  let newCursor = currentCursor;
  let newRegs = null;
  let newCols = null;
  
  try {
    if (ah === 0x00) {
      // Set video mode
      let cols = 80;
      if (al === 0x00 || al === 0x01) cols = 40;
      else if (al === 0x02 || al === 0x03) cols = 80;
      
      newCols = cols;
      // 清屏
      for (let i = 0; i < videoMemory.length; i += 2) {
        videoMemory[i] = 0x20;
        videoMemory[i + 1] = 0x07;
      }
      newCursor = { r: 0, c: 0 };
      return { newCursor, newRegs, newCols };
    } else if (ah === 0x13) {
      // Write string to screen from ES:BP (注意：INT 10H AH=13H 使用 ES 而非 DS)
      // CX = 字符串长度，DH:DL = 行:列，BL = 属性
      const cx = regs.CX & 0xFFFF;
      const bp = regs.BP & 0xFFFF;
      let row = (regs.DX & 0xFF00) >> 8;
      let col = regs.DX & 0x00FF;
      const bl = regs.BX & 0xFF;

      try {
        for (let i = 0; i < cx; i++) {
          // 使用 ES:BP 读取字符（INT 10H AH=13H 约定使用 ES 段）
          const charCode = safeReadMemory(bp + i, 1, currentMemory, true, regs.ES);
          
          if (row >= SCREEN_ROWS) break;
          if (col >= currentCols) {
            col = 0;
            row++;
            if (row >= SCREEN_ROWS) break;
          }
          
          writeCharToVideoMemory(videoMemory, row, col, charCode, bl, currentCols);
          col++;
        }
      } catch (err) {
        console.error(`INT 10H AH=13H 读取字符串错误: ${err.message}`);
      }
      
      // Update cursor if AL & 1
      if ((al & 1) === 1) {
           newCursor = { r: row, c: col };
      }
      
      return { newCursor, newRegs };
    }
    if (ah === 0x00) {
      // Fallback for other modes if not handled above (though handled above now)
      // ...
    }
    if (ah === 0x02) {
      // 设置光标位置
      const row = (regs.DX & 0xFF00) >> 8;
      const col = regs.DX & 0x00FF;
      if (row < SCREEN_ROWS && col < currentCols) {
        newCursor = { r: row, c: col };
      } else {
        // 光标位置越界
      }
    } else if (ah === 0x06 || ah === 0x07) {
      // AH=06H: Scroll Up, AH=07H: Scroll Down
      // AL = Number of lines to scroll (0 = Clear)
      // BH = Attribute for blank lines
      // CX = Top-Left (CH:CL), DX = Bottom-Right (DH:DL)
      const al = regs.AX & 0x00FF;
      const bh = (regs.BX & 0xFF00) >> 8;
      const startRow = (regs.CX & 0xFF00) >> 8;
      const startCol = regs.CX & 0x00FF;
      const endRow = (regs.DX & 0xFF00) >> 8;
      const endCol = regs.DX & 0x00FF;

      if (al === 0) {
         // Clear window - ensure we don't exceed boundaries
         for (let r = startRow; r <= endRow && r < SCREEN_ROWS; r++) {
           for (let c = startCol; c <= endCol && c < currentCols; c++) {
             // Make sure we don't write beyond video memory
             writeCharToVideoMemory(videoMemory, r, c, 0x20, bh, currentCols);
           }
         }
      } else {
          // Scroll logic
          const lines = al;
          
          if (ah === 0x06) { // Scroll Up
              // Process from top to bottom to avoid overwriting data we need
              for (let r = startRow; r <= endRow && r < SCREEN_ROWS; r++) {
                  for (let c = startCol; c <= endCol && c < currentCols; c++) {
                      let srcRow = r + lines;
                      let charCode = 0x20;
                      let attr = bh;
                      
                      if (srcRow <= endRow && srcRow < SCREEN_ROWS) {
                          // Copy from lower line
                          const srcIdx = (srcRow * currentCols + c) * 2;
                          if (srcIdx + 1 < videoMemory.length) {
                              charCode = videoMemory[srcIdx];
                              attr = videoMemory[srcIdx + 1];
                          }
                      }
                      writeCharToVideoMemory(videoMemory, r, c, charCode, attr, currentCols);
                  }
              }
          } else { // Scroll Down (AH=07H)
              // Process from bottom to top to avoid overwriting data we need
              for (let r = Math.min(endRow, SCREEN_ROWS - 1); r >= startRow; r--) {
                  for (let c = startCol; c <= endCol && c < currentCols; c++) {
                      let srcRow = r - lines;
                      let charCode = 0x20;
                      let attr = bh;
                      
                      if (srcRow >= startRow && srcRow >= 0) {
                          // Copy from upper line
                          const srcIdx = (srcRow * currentCols + c) * 2;
                          if (srcIdx + 1 < videoMemory.length) {
                              charCode = videoMemory[srcIdx];
                              attr = videoMemory[srcIdx + 1];
                          }
                      }
                      writeCharToVideoMemory(videoMemory, r, c, charCode, attr, currentCols);
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
  
  return { newCursor, newRegs, newCols };
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
