import React, { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { ArrowRight, Search } from 'lucide-react';

const MemoryView = React.memo(({ memory, registers, sp, ds = 0 }) => {
  const [segment, setSegment] = useState(ds);
  const [offset, setOffset] = useState(0);
  const [viewType, setViewType] = useState('byte'); // 'byte' or 'word'
  const [jumpAddr, setJumpAddr] = useState('');
  
  const gridRef = useRef(null);
  const [rowCount, setRowCount] = useState(16);
  const bytesPerRow = 16;

  // 监听外部 DS 变化，如果用户未手动锁定段，可选择同步（此处简单处理为初始化同步，后续允许自由修改）
  useEffect(() => {
      // 仅在初始化或重置时同步，避免干扰用户查看其他段
      // 这里我们选择不强制同步，除非是第一次加载
  }, []);

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

  const rows = useMemo(() => {
    const r = [];

    for (let i = 0; i < rowCount; i++) { 
        const currentOffset = (offset + i * bytesPerRow) & 0xFFFF; // 偏移量回绕
        // 物理地址 = (Segment << 4) + Offset
        const physBase = (segment << 4) + currentOffset;
        
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
      if (regName === 'IP') {
          setSegment(registers.CS);
          setOffset(registers.IP & 0xFFF0);
      } else if (regName === 'SP') {
          setSegment(registers.SS);
          setOffset(registers.SP & 0xFFF0);
      } else if (['DS', 'ES', 'SS', 'CS'].includes(regName)) {
          setSegment(registers[regName]);
          setOffset(0);
      } else {
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
                  <div className="memory-addr-group">
                    <input 
                        value={jumpAddr}
                        onChange={(e) => setJumpAddr(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleJump()}
                        placeholder={`${segment.toString(16).toUpperCase().padStart(4, '0')}:${offset.toString(16).toUpperCase().padStart(4, '0')}`}
                        className="memory-input"
                    />
                    <button onClick={handleJump} className="text-gray-400 dark:text-neutral-600 hover:text-blue-600 dark:hover:text-yellow-500 ml-1">
                        <Search size={10} />
                    </button>
                  </div>
                  
                  <div className="flex gap-0.5">
                    <button onClick={() => setOffset(Math.max(0, offset - bytesPerRow * rowCount))} className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-800 rounded text-gray-500 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-300" title="Page Up">
                        <ArrowRight size={10} className="rotate-180"/>
                    </button>
                    <button onClick={() => setOffset((offset + bytesPerRow * rowCount) & 0xFFFF)} className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-800 rounded text-gray-500 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-300" title="Page Down">
                        <ArrowRight size={10}/>
                    </button>
                  </div>
              </div>

              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                  {['DS', 'CS', 'SS', 'SP', 'IP'].map(reg => (
                      <button 
                        key={reg}
                        onClick={() => jumpToRegister(reg)}
                        className="px-1.5 py-0.5 text-[9px] bg-white dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-neutral-500 hover:text-blue-600 dark:hover:text-yellow-500 rounded border border-gray-200 dark:border-neutral-800 transition-colors font-medium"
                        title={`Jump to ${reg}`}
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
                                        // Check SP (SS:SP)
                                        const isSP = segment === registers.SS && (currOffset === registers.SP || currOffset === registers.SP + 1);
                                        // Check IP (CS:IP)
                                        const isIP = segment === registers.CS && currOffset === registers.IP;
                                        
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
                                        const isSP = segment === registers.SS && (currOffset === registers.SP || currOffset === registers.SP + 1);
                                        const isIP = segment === registers.CS && currOffset === registers.IP;
                                        
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
                                      
                                      const isSP = segment === registers.SS && (currOffset === registers.SP || currOffset === registers.SP + 1);
                                      
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
