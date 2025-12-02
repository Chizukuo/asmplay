import { SCREEN_ROWS, SCREEN_COLS } from '../constants';

// CP437 to Unicode mapping for box drawing characters (0x80 - 0xFF)
export const CP437_MAP = {
  0xC9: '╔', 0xBB: '╗', 0xC8: '╚', 0xBC: '╝', 0xBA: '║', 0xCD: '═',
  0xDA: '┌', 0xBF: '┐', 0xC0: '└', 0xD9: '┘', 0xC4: '─', 0xB3: '│',
  0xC3: '├', 0xB4: '┤', 0xC2: '┬', 0xC1: '┴', 0xC5: '┼',
  0xB0: '░', 0xB1: '▒', 0xB2: '▓', 0xDB: '█', 0xDC: '▄', 0xDD: '▌', 0xDE: '▐', 0xDF: '▀',
  0xFE: '■', 0x00: ' '
};

export const getCharFromCode = (code) => {
  if (CP437_MAP[code]) return CP437_MAP[code];
  // Basic ASCII
  if (code >= 32 && code <= 126) return String.fromCharCode(code);
  // Extended ASCII fallback (Latin-1) or control chars
  return String.fromCharCode(code); 
};

// 默认属性：白字黑底 (0x07)
const DEFAULT_ATTR = 0x07;

export const writeCharToVideoMemory = (videoMemory, row, col, charCode, attr = null, cols = SCREEN_COLS) => {
  if (row < 0 || row >= SCREEN_ROWS || col < 0 || col >= cols) return;
  const offset = (row * cols + col) * 2;
  if (offset + 1 >= videoMemory.length) return;
  
  videoMemory[offset] = charCode & 0xFF;
  if (attr !== null) {
    videoMemory[offset + 1] = attr;
  }
};

export const clearVideoMemory = (videoMemory, attr = DEFAULT_ATTR) => {
  for (let i = 0; i < videoMemory.length; i += 2) {
    videoMemory[i] = 0x20; // Space
    videoMemory[i + 1] = attr;
  }
};

export const scrollUp = (videoMemory, lines = 1, fillAttr = DEFAULT_ATTR, cols = SCREEN_COLS) => {
  const bytesPerLine = cols * 2;
  // 移动数据
  const moveSize = (SCREEN_ROWS - lines) * bytesPerLine;
  if (moveSize > 0) {
      videoMemory.copyWithin(0, lines * bytesPerLine, lines * bytesPerLine + moveSize);
  }
  // 填充底部
  const startFill = (SCREEN_ROWS - lines) * bytesPerLine;
  for (let i = startFill; i < videoMemory.length; i += 2) {
      videoMemory[i] = 0x20;
      videoMemory[i + 1] = fillAttr;
  }
};

export const printToConsole = (input, currentCursor, videoMemory, attr = null, cols = SCREEN_COLS) => {
  let { r, c } = currentCursor;
  
  // 如果输入是数字，当作单个字符码处理
  const str = typeof input === 'number' ? String.fromCharCode(input) : input;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    // 如果输入是数字，直接用该数字；否则取 charCode
    const code = typeof input === 'number' ? input : str.charCodeAt(i);

    if (char === '\r') {
        c = 0;
        continue;
    }
    if (char === '\n') {
        r++;
        if (r >= SCREEN_ROWS) {
            scrollUp(videoMemory, 1, attr || DEFAULT_ATTR, cols);
            r = SCREEN_ROWS - 1;
        }
        continue;
    }
    
    // Backspace (0x08)
    if (code === 8) {
        if (c > 0) c--;
        writeCharToVideoMemory(videoMemory, r, c, 0x20, attr, cols);
        continue;
    }

    if (r < SCREEN_ROWS && c < cols) {
        writeCharToVideoMemory(videoMemory, r, c, code, attr, cols);
        c++;
        if (c >= cols) {
            c = 0;
            r++;
            if (r >= SCREEN_ROWS) {
                scrollUp(videoMemory, 1, attr || DEFAULT_ATTR, cols);
                r = SCREEN_ROWS - 1;
            }
        }
    }
  }
  return { r, c };
};
