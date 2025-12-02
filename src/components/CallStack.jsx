import React from 'react';
import { Layers, ArrowUp } from 'lucide-react';

const CallStack = ({ callStack }) => {
  return (
    <div className="glass-panel flex flex-col h-full overflow-hidden text-xs">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200/50 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm font-medium text-gray-700 dark:text-zinc-200">
        <div className="p-1 bg-indigo-100 dark:bg-indigo-500/20 rounded-md">
            <Layers size={12} className="text-indigo-500 fill-current"/> 
        </div>
        <span>调用栈 (Call Stack)</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {callStack.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-zinc-600 gap-2">
            <Layers size={24} className="opacity-20"/>
            <div className="text-[10px] text-center italic">
                栈为空<br/>
                <span className="opacity-50">执行 CALL 指令时显示</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-2">
            {callStack.map((frame, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white/50 dark:bg-zinc-800/50 border border-gray-200/50 dark:border-zinc-700/50 rounded-md shadow-sm animate-in slide-in-from-bottom-2 fade-in duration-300">
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold">
                        {index}
                    </div>
                    <div>
                        <div className="font-mono font-bold text-gray-700 dark:text-zinc-200">{frame.name}</div>
                        <div className="text-[10px] text-gray-500 dark:text-zinc-400 font-mono">
                            RET: <span className="text-amber-600 dark:text-amber-500">{frame.retIp.toString(16).toUpperCase().padStart(4,'0')}H</span>
                        </div>
                    </div>
                </div>
                <div className="text-[10px] font-mono text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-900/50 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-800">
                    SP: {frame.sp.toString(16).toUpperCase().padStart(4,'0')}H
                </div>
              </div>
            ))}
             <div className="text-center py-1">
                <ArrowUp size={10} className="mx-auto text-gray-300 dark:text-zinc-700 animate-bounce"/>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallStack;
