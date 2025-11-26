import React from 'react';

const RegisterCard = ({ name, val }) => {
  const h = (val >> 8) & 0xFF;
  const l = val & 0xFF;
  return (
    <div className="bg-gradient-to-br from-neutral-900/90 to-neutral-800/80 border border-neutral-700 rounded-lg p-2 flex flex-col gap-1.5 shadow-lg hover:border-yellow-500/50 transition-all duration-300 group hover:shadow-yellow-500/20 hover:shadow-xl card-hover backdrop-blur-sm">
      <div className="flex justify-between items-center">
        <span className="text-yellow-400 font-bold font-mono text-sm tracking-wide group-hover:text-yellow-300 transition-colors">{name}</span>
        <span className="text-neutral-400 text-[9px] font-mono bg-neutral-950/50 px-1.5 py-0.5 rounded-full">{val}</span>
      </div>
      <div className="flex gap-1.5 font-mono text-xs">
        <div className="flex-1 bg-black/60 rounded px-1.5 py-1 text-center text-yellow-100 group-hover:text-yellow-200 transition-all border border-neutral-800 group-hover:border-yellow-700/50" title="High Byte">
          {h.toString(16).toUpperCase().padStart(2,'0')}
        </div>
        <div className="flex-1 bg-black/60 rounded px-1.5 py-1 text-center text-yellow-100 group-hover:text-yellow-200 transition-all border border-neutral-800 group-hover:border-yellow-700/50" title="Low Byte">
          {l.toString(16).toUpperCase().padStart(2,'0')}
        </div>
      </div>
      <div className="text-[8px] text-neutral-500 font-mono tracking-tight text-center pt-1 border-t border-neutral-800/50 group-hover:text-neutral-400 transition-colors">
         {val.toString(2).padStart(16, '0').match(/.{1,8}/g).join(' ')}
      </div>
    </div>
  );
};

export default RegisterCard;
