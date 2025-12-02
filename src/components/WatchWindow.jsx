import React, { useState } from 'react';
import { Eye, AlertCircle, Plus, Trash2, Hash, Binary, Type, AlertTriangle } from 'lucide-react';
import { evaluateExpression } from '../utils/expressionEvaluator';

const WatchWindow = ({ watchVariables, symbolTable, memory, registers, ds, onRemove, onAdd }) => {
  const [newVar, setNewVar] = useState('');
  const [showAddPanel, setShowAddPanel] = useState(false);
  
  const handleAdd = (varName) => {
    if (varName && varName.trim()) {
      onAdd(varName.trim());
      setNewVar('');
      setShowAddPanel(false);
    }
  };

  const availableVars = Object.keys(symbolTable).filter(v => !watchVariables.includes(v));

  return (
    <div className="glass-panel flex flex-col h-full overflow-hidden text-xs">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/50 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2 font-medium text-gray-700 dark:text-zinc-200">
            <div className="p-1 bg-emerald-100 dark:bg-emerald-500/20 rounded-md">
                <Eye size={12} className="text-emerald-500 fill-current"/>
            </div>
            <span>监视窗口</span>
        </div>
        <button 
            onClick={() => setShowAddPanel(!showAddPanel)}
            className={`p-1.5 rounded-md transition-all duration-200 ${showAddPanel ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 rotate-45' : 'hover:bg-gray-200/50 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400'}`}
            title="添加监视表达式"
        >
            <Plus size={12}/>
        </button>
      </div>
      
      {/* Add Variable Panel */}
      {showAddPanel && (
          <div className="p-3 bg-gray-50/50 dark:bg-zinc-900/50 border-b border-gray-200/50 dark:border-white/10 animate-in slide-in-from-top-2 duration-200">
            <div className="flex gap-2 mb-2">
                <input 
                type="text"
                value={newVar}
                onChange={(e) => setNewVar(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleAdd(newVar)}
                placeholder="输入变量名或表达式 (如 [BX]+10)..."
                className="flex-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm"
                autoFocus
                />
                <button 
                onClick={() => handleAdd(newVar)}
                disabled={!newVar || !newVar.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                添加
                </button>
            </div>
            
            {availableVars.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-1">
                    {availableVars.map(v => (
                        <button
                            key={v}
                            onClick={() => handleAdd(v)}
                            className="px-2 py-1 bg-white dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 text-gray-600 dark:text-zinc-400 text-[10px] rounded border border-gray-200 dark:border-zinc-700 transition-all shadow-sm"
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
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-zinc-600 gap-2">
            <Eye size={24} className="opacity-20"/>
            <div className="text-[10px] text-center italic">
                暂无监视项<br/>
                <span className="opacity-50">点击右上角 + 添加变量或表达式</span>
            </div>
          </div>
        ) : (
          watchVariables.map(expression => {
            let valWord = 0;
            let error = null;
            let addressInfo = null;

            // Check if it's a simple variable first to show address info
            let exprToEval = expression;
            if (symbolTable.hasOwnProperty(expression)) {
                const offset = symbolTable[expression];
                addressInfo = `${(ds || 0).toString(16).toUpperCase().padStart(4,'0')}:${offset.toString(16).toUpperCase().padStart(4,'0')}`;
                // For simple variable names, we want to show the value, not the address
                // So we wrap it in brackets to trigger memory lookup in evaluateExpression
                exprToEval = `[${expression}]`;
            }

            try {
                // If registers are not ready (e.g. initial load), pass empty object or handle gracefully
                // But registers should be passed from App.jsx
                const result = evaluateExpression(exprToEval, registers || {}, memory, symbolTable);
                if (result.error) {
                    error = result.error;
                } else {
                    valWord = result.value & 0xFFFF;
                }
            } catch (e) {
                error = "Invalid Expression";
            }
            
            const valLow = valWord & 0xFF;
            const valHigh = (valWord >> 8) & 0xFF;

            return (
              <div key={expression} className="p-2 bg-white/50 dark:bg-zinc-800/50 border border-gray-200/50 dark:border-zinc-700/50 rounded-md shadow-sm group hover:bg-white dark:hover:bg-zinc-800 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-blue-600 dark:text-amber-500 font-bold text-xs flex items-center gap-2 flex-wrap">
                        <span className="break-all">{expression}</span>
                        {addressInfo && (
                            <span className="text-[9px] font-normal text-gray-500 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-800 whitespace-nowrap font-mono">
                                {addressInfo}
                            </span>
                        )}
                    </div>
                  </div>
                  <button 
                    onClick={() => onRemove(expression)} 
                    className="p-1 text-gray-400 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12}/>
                  </button>
                </div>
                
                {error ? (
                    <div className="text-red-500 text-[10px] flex items-center gap-1.5 mt-1 bg-red-50 dark:bg-red-900/10 p-1.5 rounded border border-red-100 dark:border-red-900/20">
                        <AlertTriangle size={12} /> {error}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="bg-white dark:bg-black/20 rounded p-2 border border-gray-200 dark:border-zinc-700/50">
                                <div className="text-[9px] text-gray-400 dark:text-zinc-500 mb-1 flex items-center gap-1 font-medium">
                                    <Hash size={10}/> DEC / HEX
                                </div>
                                <div className="font-mono text-xs text-gray-800 dark:text-zinc-300">
                                    {valWord} <span className="text-gray-300 dark:text-zinc-600 mx-1">/</span> <span className="text-amber-600 dark:text-amber-500">0x{valWord.toString(16).toUpperCase()}</span>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-black/20 rounded p-2 border border-gray-200 dark:border-zinc-700/50">
                                <div className="text-[9px] text-gray-400 dark:text-zinc-500 mb-1 flex items-center gap-1 font-medium">
                                    <Binary size={10}/> BINARY
                                </div>
                                <div className="font-mono text-[10px] text-gray-500 dark:text-zinc-400 tracking-tight">
                                    {valWord.toString(2).padStart(16, '0').match(/.{1,8}/g).join(' ')}
                                </div>
                            </div>
                        </div>
                        
                        {/* ASCII Preview if it looks like char */}
                        {(valLow >= 32 && valLow <= 126) && (
                            <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-900/30 px-2 py-1 rounded">
                                <Type size={10}/> 
                                <span>ASCII: <span className="font-mono text-blue-600 dark:text-blue-400">'{String.fromCharCode(valLow)}'</span></span>
                                {valHigh >= 32 && valHigh <= 126 && <span><span className="font-mono text-blue-600 dark:text-blue-400">'{String.fromCharCode(valHigh)}'</span></span>}
                            </div>
                        )}
                    </>
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
