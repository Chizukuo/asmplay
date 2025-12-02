export const MEMORY_SIZE = 1024 * 1024; // 1MB
export const INSTRUCTION_DELAY = 100;
export const SCREEN_ROWS = 25;
export const SCREEN_COLS = 80;
export const VIDEO_MEMORY_SIZE = SCREEN_ROWS * SCREEN_COLS * 2; // 4000 bytes

// DOS 16色调色板 (R, G, B)
export const DOS_PALETTE = [
  [0, 0, 0],       // 0: Black
  [0, 0, 170],     // 1: Blue
  [0, 170, 0],     // 2: Green
  [0, 170, 170],   // 3: Cyan
  [170, 0, 0],     // 4: Red
  [170, 0, 170],   // 5: Magenta
  [170, 85, 0],    // 6: Brown
  [170, 170, 170], // 7: Light Gray
  [85, 85, 85],    // 8: Dark Gray
  [85, 85, 255],   // 9: Light Blue
  [85, 255, 85],   // 10: Light Green
  [85, 255, 255],  // 11: Light Cyan
  [255, 85, 85],   // 12: Light Red
  [255, 85, 255],  // 13: Light Magenta
  [255, 255, 85],  // 14: Yellow
  [255, 255, 255]  // 15: White
];

export const SPEED_OPTIONS = [
  { label: '极慢', value: 500 },
  { label: '慢速', value: 300 },
  { label: '正常', value: 100 },
  { label: '快速', value: 30 },
  { label: '极快', value: 5 },
  { label: '光速', value: 0 } // 0 means batch execution
];

// Load examples from the examples directory
const modules = import.meta.glob('../../examples/*.asm', { as: 'raw', eager: true });

export const PRESET_PROGRAMS = {
  default: modules['../../examples/default.asm'],
  clock_demo: modules['../../examples/clock_demo.asm'],
  loop_test: modules['../../examples/loop_test.asm'],
  bubble_sort: modules['../../examples/bubble_sort.asm'],
  fibonacci: modules['../../examples/fibonacci.asm'],
  string_demo: modules['../../examples/string_demo.asm'],
  calculator: modules['../../examples/calculator.asm'],
};

