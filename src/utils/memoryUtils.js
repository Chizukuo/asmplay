import { MEMORY_SIZE } from '../constants';

export const calculatePhysicalAddress = (segment, offset) => {
  // 实模式：物理地址 = (段 << 4) + 偏移，限制在20位地址空间
  const segBase = (segment << 4) & 0xFFFFF;
  return (segBase + offset) & 0xFFFFF;
};

export const isValidMemoryAddress = (addr, size = 1) => {
  return addr >= 0 && (addr + size) <= MEMORY_SIZE;
};

export const safeReadMemory = (addr, size = 2, memory, useSegment = false, segment = 0) => {
  // 支持段地址模型或线性地址
  let physAddr = addr;
  if (useSegment) {
    physAddr = calculatePhysicalAddress(segment, addr);
  }
  
  // 边界检查
  if (!isValidMemoryAddress(physAddr, size) || physAddr >= MEMORY_SIZE) {
    throw new Error(`内存读取越界: 地址 0x${physAddr.toString(16).toUpperCase()} (size=${size})`);
  }
  
  if (size === 1) {
    return memory[physAddr];
  } else if (size === 2) {
    return memory[physAddr] | (memory[physAddr + 1] << 8);
  }
  return 0;
};
