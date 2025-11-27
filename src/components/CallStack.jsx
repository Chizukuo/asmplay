import React from 'react';
import { Layers, ArrowUp } from 'lucide-react';

const CallStack = ({ callStack }) => {
  return (
    <div className="flex flex-col h-full bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
      <div className="flex items-center gap-2 p-2 border-b border-neutral-800 bg-neutral-900/80 text-yellow-400 font-bold text-xs">
        <Layers size={14}/> 调用栈 (Call Stack)
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {callStack.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-2">
            <Layers size={24} className="opacity-20"/>
            <div className="text-xs text-center">
                栈为空<br/>
                <span className="text-[10px] opacity-70">执行 CALL 指令时显示</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-1">
            {callStack.map((frame, index) => (
              <div key={index} className="bg-neutral-800/40 border border-neutral-700/50 rounded p-2 flex items-center justify-between group hover:border-yellow-500/30 transition-colors">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-neutral-900 flex items-center justify-center text-[10px] text-neutral-500 font-mono border border-neutral-700">
                        {index}
                    </div>
                    <div>
                        <div className="text-yellow-400 font-bold text-xs font-mono">{frame.name}</div>
                        <div className="text-[10px] text-neutral-500">RET: {frame.retIp.toString(16).toUpperCase().padStart(4,'0')}H</div>
                    </div>
                </div>
                <div className="text-[10px] font-mono text-neutral-600 bg-black/20 px-1.5 py-0.5 rounded">
                    SP: {frame.sp.toString(16).toUpperCase().padStart(4,'0')}H
                </div>
              </div>
            ))}
             <div className="text-center py-1">
                <ArrowUp size={12} className="mx-auto text-neutral-600 animate-bounce"/>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallStack;
