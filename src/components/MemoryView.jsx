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
      <div className="flex flex-col h-full bg-black rounded-lg border border-neutral-800 overflow-hidden font-mono">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 p-2 border-b border-neutral-800 bg-neutral-900 items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                  <div className="flex items-center bg-neutral-800 rounded px-2 py-1 border border-neutral-700 w-32">
                    <input 
                        value={jumpAddr}
                        onChange={(e) => setJumpAddr(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleJump()}
                        placeholder={`${segment.toString(16).toUpperCase().padStart(4, '0')}:${offset.toString(16).toUpperCase().padStart(4, '0')}`}
                        className="bg-transparent border-none outline-none text-yellow-400 font-mono text-xs w-full placeholder-neutral-600 text-center"
                    />
                    <button onClick={handleJump} className="text-neutral-400 hover:text-yellow-400 ml-1">
                        <Search size={12} />
                    </button>
                  </div>
                  
                  <div className="flex gap-1">
                    <button onClick={() => setOffset(Math.max(0, offset - bytesPerRow * rowCount))} className="p-1 hover:bg-neutral-700 rounded text-neutral-400 text-xs" title="Page Up">&lt;</button>
                    <button onClick={() => setOffset((offset + bytesPerRow * rowCount) & 0xFFFF)} className="p-1 hover:bg-neutral-700 rounded text-neutral-400 text-xs" title="Page Down">&gt;</button>
                  </div>
              </div>

              <div className="flex gap-1">
                  {['DS', 'CS', 'SS', 'SP', 'IP'].map(reg => (
                      <button 
                        key={reg}
                        onClick={() => jumpToRegister(reg)}
                        className="px-1.5 py-0.5 text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-yellow-400 rounded border border-neutral-700 transition-colors"
                        title={`Jump to ${reg}`}
                      >
                        {reg}
                      </button>
                  ))}
              </div>

              <div className="flex bg-neutral-800 rounded p-0.5 border border-neutral-700">
                  <button 
                    onClick={() => setViewType('byte')} 
                    className={`text-[9px] px-2 py-0.5 rounded ${viewType === 'byte' ? 'bg-neutral-700 text-yellow-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    BYTE
                  </button>
                  <button 
                    onClick={() => setViewType('word')} 
                    className={`text-[9px] px-2 py-0.5 rounded ${viewType === 'word' ? 'bg-neutral-700 text-yellow-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    WORD
                  </button>
              </div>
          </div>

          {/* Grid */}
          <div ref={gridRef} className="flex-1 overflow-hidden p-2 font-mono text-[12px] bg-black text-neutral-300 selection:bg-neutral-700">
              {rows.map(row => (
                  <div key={row.addr} className="flex hover:bg-neutral-900 transition-colors group leading-relaxed h-[24px]">
                      {/* Address: SEGMENT:OFFSET */}
                      <div className="w-24 text-yellow-600/90 shrink-0 select-all cursor-text">
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
                                        
                                        let style = "text-neutral-400";
                                        let bgStyle = "";
                                        
                                        if (isSP) {
                                            style = "text-red-400 font-bold";
                                            bgStyle = "bg-red-900/30";
                                        } else if (isIP) {
                                            style = "text-green-400 font-bold";
                                            bgStyle = "bg-green-900/30";
                                        } else if (b === 0) {
                                            style = "text-neutral-700";
                                        }
                                        
                                        return (
                                            <div key={idx} className={`w-5 text-center ${style} ${bgStyle}`} title={`Phys: 0x${(row.physBase + idx).toString(16).toUpperCase()}`}>
                                                {b !== null ? b.toString(16).padStart(2, '0').toUpperCase() : '..'}
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {/* Separator */}
                                <div className="text-neutral-700">-</div>

                                {/* Second 8 bytes */}
                                <div className="flex gap-1.5">
                                    {row.bytes.slice(8, 16).map((b, idx) => {
                                        const currOffset = row.addr + 8 + idx;
                                        const isSP = segment === registers.SS && (currOffset === registers.SP || currOffset === registers.SP + 1);
                                        const isIP = segment === registers.CS && currOffset === registers.IP;
                                        
                                        let style = "text-neutral-400";
                                        let bgStyle = "";
                                        
                                        if (isSP) {
                                            style = "text-red-400 font-bold";
                                            bgStyle = "bg-red-900/30";
                                        } else if (isIP) {
                                            style = "text-green-400 font-bold";
                                            bgStyle = "bg-green-900/30";
                                        } else if (b === 0) {
                                            style = "text-neutral-700";
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
                                      
                                      let style = "text-neutral-400";
                                      let bgStyle = "";

                                      if (isSP) {
                                          style = "text-red-400 font-bold";
                                          bgStyle = "bg-red-900/30";
                                      } else if ((b1 === 0 && b2 === 0)) {
                                          style = "text-neutral-700";
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
                      <div className="w-32 text-neutral-500 tracking-widest border-l border-neutral-800 pl-3 font-sans opacity-80 group-hover:opacity-100 group-hover:text-neutral-300">
                          {row.chars.join('')}
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );
});

export default MemoryView;
