import React from 'react';
import { Layers, ArrowUp } from 'lucide-react';

const CallStack = ({ callStack }) => {
  return (
    <div className="call-stack-container">
      <div className="call-stack-header">
        <Layers size={12}/> 调用栈 (Call Stack)
      </div>
      
      <div className="call-stack-list">
        {callStack.length === 0 ? (
          <div className="call-stack-empty">
            <Layers size={20} className="opacity-20"/>
            <div className="text-[10px] text-center">
                栈为空<br/>
                <span className="opacity-50">执行 CALL 指令时显示</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-1">
            {callStack.map((frame, index) => (
              <div key={index} className="call-stack-item">
                <div className="flex items-center gap-2">
                    <div className="call-stack-index">
                        {index}
                    </div>
                    <div>
                        <div className="call-stack-func-name">{frame.name}</div>
                        <div className="call-stack-ret">RET: {frame.retIp.toString(16).toUpperCase().padStart(4,'0')}H</div>
                    </div>
                </div>
                <div className="call-stack-sp">
                    SP: {frame.sp.toString(16).toUpperCase().padStart(4,'0')}H
                </div>
              </div>
            ))}
             <div className="text-center py-1">
                <ArrowUp size={10} className="mx-auto text-gray-400 dark:text-neutral-700 animate-bounce"/>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallStack;
