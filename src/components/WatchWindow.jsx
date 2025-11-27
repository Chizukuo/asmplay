import React, { useState } from 'react';
import { Eye, AlertCircle, Plus, Trash2, Hash, Binary, Type } from 'lucide-react';

const WatchWindow = ({ watchVariables, symbolTable, memory, onRemove, onAdd }) => {
  const [newVar, setNewVar] = useState('');
  const [showAddPanel, setShowAddPanel] = useState(false);
  
  const handleAdd = (varName) => {
    if (varName && symbolTable.hasOwnProperty(varName)) {
      onAdd(varName);
      setNewVar('');
      setShowAddPanel(false);
    }
  };

  const availableVars = Object.keys(symbolTable).filter(v => !watchVariables.includes(v));

  return (
    <div className="flex flex-col h-full bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b border-neutral-800 bg-neutral-900/80">
        <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs">
            <Eye size={14}/> 变量监视
        </div>
        <button 
            onClick={() => setShowAddPanel(!showAddPanel)}
            className={`p-1 rounded hover:bg-neutral-700 transition-colors ${showAddPanel ? 'text-yellow-400 bg-neutral-800' : 'text-neutral-400'}`}
            title="添加变量"
        >
            <Plus size={14}/>
        </button>
      </div>
      
      {/* Add Variable Panel */}
      {showAddPanel && (
          <div className="p-2 bg-neutral-800/50 border-b border-neutral-800 animate-in slide-in-from-top-2 duration-200">
            <div className="flex gap-2 mb-2">
                <input 
                type="text"
                value={newVar}
                onChange={(e) => setNewVar(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleAdd(newVar)}
                placeholder="输入变量名..."
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-yellow-400 outline-none focus:border-yellow-500"
                autoFocus
                />
                <button 
                onClick={() => handleAdd(newVar)}
                disabled={!newVar || !symbolTable.hasOwnProperty(newVar)}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black text-xs font-bold rounded transition-colors"
                >
                添加
                </button>
            </div>
            
            {availableVars.length > 0 && (
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                    {availableVars.map(v => (
                        <button
                            key={v}
                            onClick={() => handleAdd(v)}
                            className="px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 text-[10px] rounded border border-neutral-600 transition-colors"
                        >
                            {v}
                        </button>
                    ))}
                </div>
            )}
          </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {watchVariables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-2">
            <Eye size={24} className="opacity-20"/>
            <div className="text-xs text-center">
                暂无监视变量<br/>
                <span className="text-[10px] opacity-70">点击右上角 + 添加</span>
            </div>
          </div>
        ) : (
          watchVariables.map(varName => {
            const addr = symbolTable[varName];
            // Try to read as word first
            const valLow = memory[addr];
            const valHigh = memory[addr + 1];
            const valWord = (valHigh << 8) | valLow;
            
            return (
              <div key={varName} className="bg-neutral-800/40 border border-neutral-700/50 rounded p-2 hover:border-yellow-500/30 transition-colors group">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <div className="text-yellow-400 font-bold text-xs flex items-center gap-2">
                        {varName}
                        <span className="text-[9px] font-normal text-neutral-500 bg-neutral-900 px-1 rounded">
                            0x{addr.toString(16).toUpperCase().padStart(4,'0')}
                        </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => onRemove(varName)} 
                    className="text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12}/>
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-black/40 rounded p-1.5 border border-neutral-800">
                        <div className="text-[9px] text-neutral-500 mb-0.5 flex items-center gap-1">
                            <Hash size={8}/> DEC / HEX
                        </div>
                        <div className="font-mono text-xs text-neutral-300">
                            {valWord} <span className="text-neutral-500">/</span> 0x{valWord.toString(16).toUpperCase()}
                        </div>
                    </div>
                    <div className="bg-black/40 rounded p-1.5 border border-neutral-800">
                        <div className="text-[9px] text-neutral-500 mb-0.5 flex items-center gap-1">
                            <Binary size={8}/> BINARY
                        </div>
                        <div className="font-mono text-[10px] text-neutral-400 tracking-tight">
                            {valWord.toString(2).padStart(16, '0').match(/.{1,8}/g).join(' ')}
                        </div>
                    </div>
                </div>
                
                {/* ASCII Preview if it looks like char */}
                {(valLow >= 32 && valLow <= 126) && (
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-500">
                        <Type size={10}/> 
                        <span>ASCII: '{String.fromCharCode(valLow)}'</span>
                        {valHigh >= 32 && valHigh <= 126 && <span>'{String.fromCharCode(valHigh)}'</span>}
                    </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default WatchWindow;
