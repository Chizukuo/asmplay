import React, { useState, useEffect } from 'react';

const RegisterCard = ({ name, val }) => {
  const [highlight, setHighlight] = useState(false);
  
  useEffect(() => {
    setHighlight(true);
    const timer = setTimeout(() => setHighlight(false), 300);
    return () => clearTimeout(timer);
  }, [val]);

  // 只有 AX, BX, CX, DX 才显示高低字节分解
  const isGeneralPurpose = ['AX', 'BX', 'CX', 'DX'].includes(name);
  const hStr = ((val >> 8) & 0xFF).toString(16).toUpperCase().padStart(2,'0');
  const lStr = (val & 0xFF).toString(16).toUpperCase().padStart(2,'0');
  
  return (
    <div className={`
      relative overflow-hidden rounded-lg border transition-all duration-300
      ${highlight 
        ? 'bg-blue-50 dark:bg-amber-900/20 border-blue-400 dark:border-amber-500 shadow-glow dark:shadow-glow-amber z-10' 
        : 'bg-white dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600'
      }
    `}>
      
      <div className="px-2 py-1.5 sm:px-3 sm:py-2 flex flex-col items-center justify-center relative z-10">
        <div className="flex items-center justify-between w-full mb-1 sm:mb-1.5">
            <span className={`
              text-[10px] sm:text-xs font-bold tracking-wider
              ${highlight ? 'text-blue-600 dark:text-amber-400' : 'text-gray-500 dark:text-zinc-400'}
            `}>
                {name}
            </span>
            {isGeneralPurpose && (
              <div className="flex gap-1 text-[10px] font-mono text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-black/20 px-1.5 py-0.5 rounded">
                  <span className={highlight ? 'text-blue-500 dark:text-amber-500/80' : ''}>{hStr}</span>
                  <span className="text-gray-300 dark:text-zinc-700">|</span>
                  <span className={highlight ? 'text-blue-500 dark:text-amber-500/80' : ''}>{lStr}</span>
              </div>
            )}
        </div>

        <div className={`
          font-mono text-base sm:text-lg font-bold tracking-widest transition-colors duration-200
          ${highlight ? 'text-blue-700 dark:text-amber-300' : 'text-gray-800 dark:text-gray-200'}
        `}>
            {val.toString(16).toUpperCase().padStart(4, '0')}
        </div>
      </div>
      
      {/* Background Highlight Effect */}
      {highlight && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/10 dark:via-amber-400/10 to-transparent animate-shimmer pointer-events-none"></div>
      )}
    </div>
  );
};

export default RegisterCard;
