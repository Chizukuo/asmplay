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
    <div className={`register-card ${highlight ? 'active' : 'inactive'}`}>
      
      <div className="px-3 py-2 flex flex-col items-center justify-center relative z-10">
        <div className="flex items-center justify-between w-full mb-1">
            <span className={`register-card-name ${highlight ? 'active' : 'inactive'}`}>
                {name}
            </span>
            <div className="flex gap-1 text-[9px] font-mono text-gray-400 dark:text-neutral-600">
                <span>{hStr}</span>
                <span className="text-gray-300 dark:text-neutral-700">|</span>
                <span>{lStr}</span>
            </div>
        </div>

        <div className={`register-card-value ${highlight ? 'active' : 'inactive'}`}>
            {val.toString(16).toUpperCase().padStart(4, '0')}
        </div>
      </div>
      
      {/* Highlight Effect */}
      {highlight && (
          <div className="absolute inset-0 bg-blue-400/5 dark:bg-yellow-400/5 animate-pulse pointer-events-none"></div>
      )}
    </div>
  );
};

export default RegisterCard;
