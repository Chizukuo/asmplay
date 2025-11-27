import React, { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { ArrowRight, Search } from 'lucide-react';

const MemoryView = React.memo(({ memory, registers, sp, ds = 0 }) => {
  const [segment, setSegment] = useState(ds);
  const [offset, setOffset] = useState(0);
  const [viewType, setViewType] = useState('byte'); // 'byte' or 'word'
  const [jumpAddr, setJumpAddr] = useState('');
  const [autoFollow, setAutoFollow] = useState(false); // 自动跟随模式
  
  const gridRef = useRef(null);
  const [rowCount, setRowCount] = useState(16);
  const bytesPerRow = 16;
  
  // 统一的物理地址计算函数
  const calculatePhysicalAddress = (seg, off) => {
    // 实模式：物理地址 = (段地址 << 4) + 偏移地址
    const segBase = (seg << 4) & 0xFFFFF;
    const physAddr = (segBase + off) & 0xFFFFF;
    return physAddr;
  };

  // 自动跟随 DS 段的变化（如果启用）
  useEffect(() => {
      if (autoFollow && ds !== undefined) {
          setSegment(ds);
      }
  }, [ds, autoFollow]);

  // 动态计算行数以填满容器且不出现滚动条
  useLayoutEffect(() => {
      const updateRows = () => {
          if (gridRef.current) {
              const height = gridRef.current.clientHeight;
              // 行高约 24px (text-xs + padding)
              const rowHeight = 24; 
              const count = Math.floor(height / rowHeight);
              setRowCount(Math.max(1, count));
          }
      };
      
      updateRows();
      const observer = new ResizeObserver(updateRows);
      if (gridRef.current) {
          observer.observe(gridRef.current);
      }
      return () => observer.disconnect();
  }, []);

  // 鼠标滚轮翻页支持
  useEffect(() => {
      const handleWheel = (e) => {
          if (!gridRef.current) return;
          
          // 检查鼠标是否在内存视图区域内
          const rect = gridRef.current.getBoundingClientRect();
          const isInside = e.clientX >= rect.left && e.clientX <= rect.right &&
                          e.clientY >= rect.top && e.clientY <= rect.bottom;
          
          if (isInside) {
              e.preventDefault();
              const delta = Math.sign(e.deltaY); // 1 或 -1
              const scrollAmount = bytesPerRow * 3; // 每次滚动3行
              
              if (delta > 0) {
                  // 向下滚动
                  setOffset((prev) => Math.min(0xFFFF - bytesPerRow * rowCount, prev + scrollAmount));
              } else {
                  // 向上滚动
                  setOffset((prev) => Math.max(0, prev - scrollAmount));
              }
          }
      };
      
      const element = gridRef.current;
      if (element) {
          element.addEventListener('wheel', handleWheel, { passive: false });
          return () => element.removeEventListener('wheel', handleWheel);
      }
  }, [rowCount, bytesPerRow]);

  const rows = useMemo(() => {
    const r = [];

    for (let i = 0; i < rowCount; i++) { 
        const currentOffset = (offset + i * bytesPerRow) & 0xFFFF; // 偏移量回绕
        // 使用统一的物理地址计算函数
        const physBase = calculatePhysicalAddress(segment, currentOffset);
        
        if (physBase >= memory.length) break;
        
        const bytes = [];
        const chars = [];
        for (let j = 0; j < bytesPerRow; j++) {
            const physAddr = physBase + j;
            if (physAddr < memory.length) {
                bytes.push(memory[physAddr]);
                const c = memory[physAddr];
                chars.push(c >= 32 && c <= 126 ? String.fromCharCode(c) : '.');
            } else {
                bytes.push(null);
                chars.push(' ');
            }
        }
        r.push({ addr: currentOffset, physBase, bytes, chars });
    }
    return r;
  }, [segment, offset, memory, rowCount]);

  const handleJump = () => {
    // 支持 SEG:OFF 或 OFF 格式
    const parts = jumpAddr.split(':');
    if (parts.length === 2) {
        const newSeg = parseInt(parts[0], 16);
        const newOff = parseInt(parts[1], 16);
        if (!isNaN(newSeg)) setSegment(newSeg);
        if (!isNaN(newOff)) setOffset(newOff & 0xFFF0);
    } else {
        const val = parseInt(jumpAddr, 16);
        if (!isNaN(val)) {
            setOffset(val & 0xFFF0);
        }
    }
    setJumpAddr('');
  };

  const jumpToRegister = (regName) => {
      // IP: 跳转到 CS:IP（代码段的指令指针）
      if (regName === 'IP') {
          setSegment(registers.CS);
          setOffset(registers.IP & 0xFFF0);
      } 
      // SP: 跳转到 SS:SP（栈段的栈指针）
      else if (regName === 'SP') {
          setSegment(registers.SS);
          setOffset(registers.SP & 0xFFF0);
      } 
      // 段寄存器 (DS/ES/SS/CS): 跳转到该段的起始位置
      else if (regName === 'DS') {
          setSegment(registers.DS);
          setOffset(0);
      }
      else if (regName === 'ES') {
          setSegment(registers.ES);
          setOffset(0);
      }
      else if (regName === 'SS') {
          setSegment(registers.SS);
          setOffset(0);
      }
      else if (regName === 'CS') {
          setSegment(registers.CS);
          setOffset(0);
      }
      // 其他通用寄存器: 使用当前segment，只改变offset
      else {
          const val = registers[regName];
          if (val !== undefined) {
              setOffset(val & 0xFFF0);
          }
      }
  };

  return (
      <div className="memory-container">
          {/* Toolbar */}
          <div className="memory-toolbar">
              <div className="flex items-center gap-2">
                  <div className="text-[10px] font-semibold text-gray-600 dark:text-neutral-400 whitespace-nowrap">
                    当前: {segment.toString(16).toUpperCase().padStart(4, '0')}:{offset.toString(16).toUpperCase().padStart(4, '0')}
                  </div>
                  <div className="memory-addr-group">
                    <input 
                        value={jumpAddr}
                        onChange={(e) => setJumpAddr(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleJump()}
                        placeholder="跳转到..."
                        className="memory-input"
                    />
                    <button onClick={handleJump} className="text-gray-400 dark:text-neutral-600 hover:text-blue-600 dark:hover:text-yellow-500 ml-1">
                        <Search size={10} />
                    </button>
                  </div>
                  
                  <div className="flex gap-0.5">
                    <button 
                      onClick={() => setOffset(Math.max(0, offset - bytesPerRow * rowCount))} 
                      className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-800 rounded text-gray-500 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-300 transition-colors" 
                      title="向上翻页 (Page Up)"
                    >
                        <ArrowRight size={10} className="rotate-180"/>
                    </button>
                    <button 
                      onClick={() => setOffset((offset + bytesPerRow * rowCount) & 0xFFFF)} 
                      className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-800 rounded text-gray-500 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-300 transition-colors" 
                      title="向下翻页 (Page Down)"
                    >
                        <ArrowRight size={10}/>
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => setAutoFollow(!autoFollow)}
                    className={`p-1 hover:bg-gray-200 dark:hover:bg-neutral-800 rounded text-xs transition-colors ${autoFollow ? 'text-blue-600 dark:text-yellow-500 bg-blue-50 dark:bg-yellow-500/10' : 'text-gray-500 dark:text-neutral-500'}`}
                    title={autoFollow ? "关闭自动跟随DS" : "开启自动跟随DS"}
                  >
                    {autoFollow ? '🔒' : '🔓'}
                  </button>
              </div>

              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                  <div className="text-[9px] text-gray-500 dark:text-neutral-600 px-1 py-0.5 whitespace-nowrap">快捷跳转:</div>
                  {['DS', 'CS', 'SS', 'ES'].map(reg => (
                      <button 
                        key={reg}
                        onClick={() => jumpToRegister(reg)}
                        className={`px-1.5 py-0.5 text-[9px] hover:bg-gray-100 dark:hover:bg-neutral-800 rounded border transition-colors font-medium ${
                          segment === registers[reg] 
                            ? 'bg-blue-100 dark:bg-yellow-500/20 text-blue-600 dark:text-yellow-500 border-blue-300 dark:border-yellow-600' 
                            : 'bg-white dark:bg-neutral-900 text-gray-500 dark:text-neutral-500 hover:text-blue-600 dark:hover:text-yellow-500 border-gray-200 dark:border-neutral-800'
                        }`}
                        title={`跳转到 ${reg}:0000 (段基址 0x${(registers[reg] << 4).toString(16).toUpperCase()})`}
                      >
                        {reg}
                      </button>
                  ))}
                  <div className="w-px h-4 bg-gray-200 dark:bg-neutral-800 mx-0.5"></div>
                  {['IP', 'SP'].map(reg => (
                      <button 
                        key={reg}
                        onClick={() => jumpToRegister(reg)}
                        className="px-1.5 py-0.5 text-[9px] bg-white dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-neutral-500 hover:text-blue-600 dark:hover:text-yellow-500 rounded border border-gray-200 dark:border-neutral-800 transition-colors font-medium"
                        title={reg === 'IP' ? `跳转到 CS:IP (代码指针)` : `跳转到 SS:SP (栈指针)`}
                      >
                        {reg}
                      </button>
                  ))}
              </div>

              <div className="flex bg-white dark:bg-neutral-900 rounded p-0.5 border border-gray-200 dark:border-neutral-800">
                  <button 
                    onClick={() => setViewType('byte')} 
                    className={`text-[9px] px-2 py-0.5 rounded transition-all ${viewType === 'byte' ? 'bg-gray-100 dark:bg-neutral-800 text-blue-600 dark:text-yellow-500 shadow-sm' : 'text-gray-500 dark:text-neutral-600 hover:text-gray-700 dark:hover:text-neutral-400'}`}
                  >
                    BYTE
                  </button>
                  <button 
                    onClick={() => setViewType('word')} 
                    className={`text-[9px] px-2 py-0.5 rounded transition-all ${viewType === 'word' ? 'bg-gray-100 dark:bg-neutral-800 text-blue-600 dark:text-yellow-500 shadow-sm' : 'text-gray-500 dark:text-neutral-600 hover:text-gray-700 dark:hover:text-neutral-400'}`}
                  >
                    WORD
                  </button>
              </div>
          </div>

          {/* Grid */}
          <div ref={gridRef} className="memory-grid-area">
              {rows.map(row => (
                  <div key={row.addr} className="memory-row-item group">
                      {/* Address: SEGMENT:OFFSET */}
                      <div className="memory-addr-label">
                          {segment.toString(16).padStart(4, '0').toUpperCase()}:{row.addr.toString(16).padStart(4, '0').toUpperCase()}
                      </div>
                      
                      <div className="flex-1 flex gap-3 px-2">
                          {viewType === 'byte' ? (
                              <>
                                {/* First 8 bytes */}
                                <div className="flex gap-1.5">
                                    {row.bytes.slice(0, 8).map((b, idx) => {
                                        const currOffset = row.addr + idx;
                                        const currPhysAddr = row.physBase + idx;
                                        // 使用统一的地址计算函数
                                        const spPhysAddr = calculatePhysicalAddress(registers.SS, registers.SP);
                                        const ipPhysAddr = calculatePhysicalAddress(registers.CS, registers.IP);
                                        // Check SP (SS:SP) - 检查当前物理地址是否在栈顶位置
                                        // SP指向栈顶，栈是向下增长的，所以只高亮sp所指向的字（2字节）
                                        const isSP = (currPhysAddr === spPhysAddr || currPhysAddr === spPhysAddr + 1);
                                        // Check IP (CS:IP) - 检查当前物理地址是否是指令指针位置
                                        const isIP = (currPhysAddr === ipPhysAddr);
                                        
                                        let style = "text-gray-400 dark:text-neutral-500";
                                        let bgStyle = "";
                                        
                                        if (isSP) {
                                            style = "text-red-600 dark:text-red-400 font-bold";
                                            bgStyle = "bg-red-100 dark:bg-red-500/10 rounded-sm";
                                        } else if (isIP) {
                                            style = "text-green-600 dark:text-green-400 font-bold";
                                            bgStyle = "bg-green-100 dark:bg-green-500/10 rounded-sm";
                                        } else if (b === 0) {
                                            style = "text-gray-300 dark:text-neutral-800";
                                        } else {
                                            style = "text-gray-800 dark:text-neutral-300";
                                        }
                                        
                                        return (
                                            <div key={idx} className={`w-5 text-center ${style} ${bgStyle}`} title={`Phys: 0x${(row.physBase + idx).toString(16).toUpperCase()}`}>
                                                {b !== null ? b.toString(16).padStart(2, '0').toUpperCase() : '..'}
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {/* Separator */}
                                <div className="text-gray-200 dark:text-neutral-800">-</div>

                                {/* Second 8 bytes */}
                                <div className="flex gap-1.5">
                                    {row.bytes.slice(8, 16).map((b, idx) => {
                                        const currOffset = row.addr + 8 + idx;
                                        const currPhysAddr = row.physBase + 8 + idx;
                                        // 使用统一的地址计算函数
                                        const spPhysAddr = calculatePhysicalAddress(registers.SS, registers.SP);
                                        const ipPhysAddr = calculatePhysicalAddress(registers.CS, registers.IP);
                                        // SP指向栈顶，只高亮sp所指向的字（2字节）
                                        const isSP = (currPhysAddr === spPhysAddr || currPhysAddr === spPhysAddr + 1);
                                        const isIP = (currPhysAddr === ipPhysAddr);
                                        
                                        let style = "text-gray-400 dark:text-neutral-500";
                                        let bgStyle = "";
                                        
                                        if (isSP) {
                                            style = "text-red-600 dark:text-red-400 font-bold";
                                            bgStyle = "bg-red-100 dark:bg-red-500/10 rounded-sm";
                                        } else if (isIP) {
                                            style = "text-green-600 dark:text-green-400 font-bold";
                                            bgStyle = "bg-green-100 dark:bg-green-500/10 rounded-sm";
                                        } else if (b === 0) {
                                            style = "text-gray-300 dark:text-neutral-800";
                                        } else {
                                            style = "text-gray-800 dark:text-neutral-300";
                                        }
                                        
                                        return (
                                            <div key={idx} className={`w-5 text-center ${style} ${bgStyle}`} title={`Phys: 0x${(row.physBase + 8 + idx).toString(16).toUpperCase()}`}>
                                                {b !== null ? b.toString(16).padStart(2, '0').toUpperCase() : '..'}
                                            </div>
                                        );
                                    })}
                                </div>
                              </>
                          ) : (
                              // Word View
                              <div className="flex gap-2 w-full">
                                  {Array.from({length: 8}).map((_, i) => {
                                      const idx = i * 2;
                                      const b1 = row.bytes[idx];
                                      const b2 = row.bytes[idx+1];
                                      const currOffset = row.addr + idx;
                                      const currPhysAddr = row.physBase + idx;
                                      // 使用统一的地址计算函数
                                      const spPhysAddr = calculatePhysicalAddress(registers.SS, registers.SP);
                                      // SP指向栈顶，只高亮sp所指向的字（2字节）
                                      const isSP = (currPhysAddr === spPhysAddr);
                                      
                                      let style = "text-gray-400 dark:text-neutral-500";
                                      let bgStyle = "";

                                      if (isSP) {
                                          style = "text-red-600 dark:text-red-400 font-bold";
                                          bgStyle = "bg-red-100 dark:bg-red-500/10 rounded-sm";
                                      } else if ((b1 === 0 && b2 === 0)) {
                                          style = "text-gray-300 dark:text-neutral-800";
                                      } else {
                                          style = "text-gray-800 dark:text-neutral-300";
                                      }

                                      const val = (b1 !== null && b2 !== null) ? (b2 << 8 | b1) : null;

                                      return (
                                          <div key={i} className={`w-10 text-center ${style} ${bgStyle}`}>
                                              {val !== null ? val.toString(16).padStart(4, '0').toUpperCase() : '....'}
                                          </div>
                                      );
                                  })}
                              </div>
                          )}
                      </div>
                      <div className="memory-ascii-col">
                          {row.chars.join('')}
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );
});

export default MemoryView;
