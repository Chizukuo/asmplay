import React, { useState, useEffect } from 'react';

const RegisterCard = ({ name, val }) => {
  const [highlight, setHighlight] = useState(false);
  
  useEffect(() => {
    setHighlight(true);
    const timer = setTimeout(() => setHighlight(false), 300);
    return () => clearTimeout(timer);
  }, [val]);

  const hStr = ((val >> 8) & 0xFF).toString(16).toUpperCase().padStart(2,'0');
  const lStr = (val & 0xFF).toString(16).toUpperCase().padStart(2,'0');
  
  return (
    <div className={`relative overflow-hidden rounded-lg border transition-all duration-200 group hover:shadow-lg ${highlight ? 'bg-yellow-900/30 border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.3)] scale-[1.02] z-10' : 'bg-neutral-900/60 border-neutral-800 hover:border-yellow-500/30 hover:shadow-yellow-500/10'}`}>
      {/* Background Watermark */}
      <div className="absolute -bottom-3 -right-1 opacity-[0.04] pointer-events-none select-none">
        <span className="text-6xl font-black font-mono text-white">{name}</span>
      </div>
      
      <div className="px-3 py-2 flex items-center justify-between relative z-10">
        {/* Left: Name & High/Low small */}
        <div className="flex flex-col gap-0.5">
            <span className={`text-sm font-black tracking-wider ${highlight ? 'text-yellow-300' : 'text-neutral-500 group-hover:text-yellow-500/80'}`}>
                {name}
            </span>
            {/* Compact High/Low */}
            <div className="flex gap-2 text-[10px] font-mono text-neutral-600 group-hover:text-neutral-400 transition-colors">
                <span>H:<span className={highlight ? 'text-yellow-100' : ''}>{hStr}</span></span>
                <span>L:<span className={highlight ? 'text-yellow-100' : ''}>{lStr}</span></span>
            </div>
        </div>

        {/* Right: Main Value */}
        <div className="flex items-baseline gap-0.5">
            <span className={`font-mono text-2xl font-bold tracking-tight transition-all ${highlight ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-neutral-200 group-hover:text-white'}`}>
                {val.toString(16).toUpperCase().padStart(4, '0')}
            </span>
            <span className="text-[10px] text-neutral-700 font-medium">H</span>
        </div>
      </div>
      
      {/* Binary on Hover (Absolute bottom) */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-[8px] font-mono text-neutral-400 text-center py-0.5 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
         {val.toString(2).padStart(16, '0').match(/.{1,8}/g).join(' ')}
      </div>
      
      {/* Highlight Effect */}
      {highlight && (
          <div className="absolute inset-0 bg-yellow-400/5 animate-pulse pointer-events-none"></div>
      )}
    </div>
  );
};

export default RegisterCard;
