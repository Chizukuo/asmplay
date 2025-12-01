import React, { useState } from 'react';
import { Eye, AlertCircle, Plus, Trash2, Hash, Binary, Type } from 'lucide-react';

const WatchWindow = ({ watchVariables, symbolTable, memory, ds, onRemove, onAdd }) => {
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
    <div className="watch-window-container">
      <div className="watch-window-header">
        <div className="watch-window-title">
            <Eye size={12}/> 变量监视
        </div>
        <button 
            onClick={() => setShowAddPanel(!showAddPanel)}
            className={`watch-add-toggle ${showAddPanel ? 'active' : 'inactive'}`}
            title="添加变量"
        >
            <Plus size={12}/>
        </button>
      </div>
      
      {/* Add Variable Panel */}
      {showAddPanel && (
          <div className="watch-add-panel animate-in slide-in-from-top-2 duration-200">
            <div className="flex gap-2 mb-2">
                <input 
                type="text"
                value={newVar}
                onChange={(e) => setNewVar(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleAdd(newVar)}
                placeholder="输入变量名..."
                className="watch-add-input"
                autoFocus
                />
                <button 
                onClick={() => handleAdd(newVar)}
                disabled={!newVar || !symbolTable.hasOwnProperty(newVar)}
                className="watch-add-confirm disabled:opacity-50 disabled:cursor-not-allowed"
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
                            className="px-2 py-0.5 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-600 dark:text-neutral-400 text-[10px] rounded border border-gray-200 dark:border-neutral-700 transition-colors"
                        >
                            {v}
                        </button>
                    ))}
                </div>
            )}
          </div>
      )}
      
      <div className="watch-list-container">
        {watchVariables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-neutral-700 gap-2">
            <Eye size={20} className="opacity-20"/>
            <div className="text-[10px] text-center">
                暂无监视变量<br/>
                <span className="opacity-50">点击右上角 + 添加</span>
            </div>
          </div>
        ) : (
          watchVariables.map(varName => {
            const offset = symbolTable[varName];
            if (offset === undefined) return null;
            
            const addr = ((ds || 0) << 4) + offset;
            // Try to read as word first
            const valLow = memory[addr];
            const valHigh = memory[addr + 1];
            const valWord = (valHigh << 8) | valLow;
            
            return (
              <div key={varName} className="watch-list-item group">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <div className="text-blue-600 dark:text-yellow-500 font-bold text-xs flex items-center gap-2">
                        {varName}
                        <span className="text-[9px] font-normal text-gray-500 dark:text-neutral-500 bg-white dark:bg-black px-1 rounded border border-gray-200 dark:border-neutral-800">
                            {(ds || 0).toString(16).toUpperCase().padStart(4,'0')}:{offset.toString(16).toUpperCase().padStart(4,'0')}
                        </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => onRemove(varName)} 
                    className="text-gray-400 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={10}/>
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-white dark:bg-black/40 rounded p-1.5 border border-gray-200 dark:border-neutral-800">
                        <div className="text-[9px] text-gray-400 dark:text-neutral-600 mb-0.5 flex items-center gap-1">
                            <Hash size={8}/> DEC / HEX
                        </div>
                        <div className="font-mono text-xs text-gray-800 dark:text-neutral-300">
                            {valWord} <span className="text-gray-400 dark:text-neutral-600">/</span> 0x{valWord.toString(16).toUpperCase()}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-black/40 rounded p-1.5 border border-gray-200 dark:border-neutral-800">
                        <div className="text-[9px] text-gray-400 dark:text-neutral-600 mb-0.5 flex items-center gap-1">
                            <Binary size={8}/> BINARY
                        </div>
                        <div className="font-mono text-[10px] text-gray-500 dark:text-neutral-400 tracking-tight">
                            {valWord.toString(2).padStart(16, '0').match(/.{1,8}/g).join(' ')}
                        </div>
                    </div>
                </div>
                
                {/* ASCII Preview if it looks like char */}
                {(valLow >= 32 && valLow <= 126) && (
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400 dark:text-neutral-500">
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
