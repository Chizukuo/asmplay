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
  return String.fromCharCode(code); // Fallback
};

export const printToConsole = (str, currentCursor, currentBuffer) => {
  const newBuffer = currentBuffer.map(row => [...row]);
  let { r, c } = currentCursor;
  const currentCols = currentBuffer[0] ? currentBuffer[0].length : SCREEN_COLS;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '\r') {
        c = 0;
        continue;
    }
    if (char === '\n') {
        r++;
        continue;
    }

    if (r >= SCREEN_ROWS) break;
    // 保持现有样式并写入字符
    if (newBuffer[r] && newBuffer[r][c]) {
      newBuffer[r][c] = { ...newBuffer[r][c], char: char };
    }
    c++;
    if (c >= currentCols) { c = 0; r++; }
  }
  return { newBuffer, newCursor: { r, c } };
};
