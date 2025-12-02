import React, { useState } from 'react';
import { Circle, AlertCircle, Plus, Trash2, Check, X } from 'lucide-react';

const BreakpointsPanel = ({ 
    breakpoints, 
    dataBreakpoints, 
    onRemoveBreakpoint, 
    onUpdateBreakpoint, 
    onAddDataBreakpoint, 
    onRemoveDataBreakpoint, 
    onToggleDataBreakpoint 
}) => {
    const [newDataAddr, setNewDataAddr] = useState('');
    const [showAddData, setShowAddData] = useState(false);
    const [editingId, setEditingId] = useState(null); // lineIndex
    const [editCondition, setEditCondition] = useState('');

    const handleAddData = () => {
        let addr = newDataAddr.trim().toUpperCase();
        if (addr.endsWith('H')) addr = '0x' + addr.slice(0, -1);
        const addrNum = parseInt(addr);
        if (!isNaN(addrNum)) {
            onAddDataBreakpoint(addrNum);
            setNewDataAddr('');
            setShowAddData(false);
        }
    };

    const startEditing = (line, condition) => {
        setEditingId(line);
        setEditCondition(condition);
    };

    const saveEditing = (line) => {
        onUpdateBreakpoint(line, { 
            condition: editCondition, 
            type: editCondition ? 'CONDITIONAL' : 'NORMAL' 
        });
        setEditingId(null);
    };

    return (
        <div className="glass-panel flex flex-col h-full overflow-hidden text-xs">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/50 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-2 font-medium text-gray-700 dark:text-zinc-200">
                    <div className="p-1 bg-red-100 dark:bg-red-500/20 rounded-md">
                        <Circle size={12} className="text-red-500 fill-current" />
                    </div>
                    <span>断点管理</span>
                </div>
                <button 
                    onClick={() => setShowAddData(!showAddData)}
                    className="p-1.5 hover:bg-gray-200/50 dark:hover:bg-white/10 rounded-md text-gray-500 dark:text-zinc-400 transition-colors"
                    title="添加数据断点"
                >
                    <Plus size={12}/>
                </button>
            </div>

            {showAddData && (
                <div className="p-2 bg-gray-50/50 dark:bg-zinc-900/50 border-b border-gray-200/50 dark:border-white/10 flex gap-2 animate-in slide-in-from-top-2">
                    <input 
                        type="text" 
                        value={newDataAddr}
                        onChange={e => setNewDataAddr(e.target.value)}
                        placeholder="内存地址 (e.g. 100H)"
                        className="flex-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <button onClick={handleAddData} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm transition-colors">添加</button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
                {/* Code Breakpoints */}
                {Object.values(breakpoints).length > 0 && (
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase px-1 tracking-wider">代码断点</div>
                        {Object.values(breakpoints).map(bp => (
                            <div key={bp.line} className="flex items-center gap-2 p-2 bg-white/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 rounded-md group transition-all">
                                <button 
                                    onClick={() => onUpdateBreakpoint(bp.line, { enabled: !bp.enabled })}
                                    className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors ${bp.enabled ? 'text-red-500' : 'text-gray-300 dark:text-zinc-600'}`}
                                >
                                    <Circle size={10} className={bp.enabled ? 'fill-current' : ''} />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-blue-600 dark:text-blue-400 font-medium">Line {parseInt(bp.line) + 1}</span>
                                        {bp.type === 'CONDITIONAL' && <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] rounded border border-amber-200 dark:border-amber-800/50">条件</span>}
                                    </div>
                                    {editingId === bp.line ? (
                                        <div className="flex items-center gap-1 mt-1.5 animate-in fade-in zoom-in-95">
                                            <input 
                                                type="text" 
                                                value={editCondition}
                                                onChange={e => setEditCondition(e.target.value)}
                                                className="flex-1 px-1.5 py-0.5 text-[10px] border border-gray-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 focus:border-blue-500 outline-none"
                                                placeholder="条件 (e.g. AX==0)"
                                                autoFocus
                                            />
                                            <button onClick={() => saveEditing(bp.line)} className="p-0.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"><Check size={12}/></button>
                                            <button onClick={() => setEditingId(null)} className="p-0.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><X size={12}/></button>
                                        </div>
                                    ) : (
                                        <div className="text-gray-500 dark:text-zinc-400 truncate cursor-pointer hover:text-gray-700 dark:hover:text-zinc-200 transition-colors" onClick={() => startEditing(bp.line, bp.condition)}>
                                            {bp.condition || <span className="italic opacity-50">无条件 (点击编辑)</span>}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => onRemoveBreakpoint(bp.line)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Data Breakpoints */}
                {dataBreakpoints.length > 0 && (
                    <div className="mt-3 space-y-1">
                        <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase px-1 tracking-wider">数据断点</div>
                        {dataBreakpoints.map((bp, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-white/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 rounded-md group transition-all">
                                <button 
                                    onClick={() => onToggleDataBreakpoint(idx)}
                                    className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors ${bp.enabled ? 'text-purple-500' : 'text-gray-300 dark:text-zinc-600'}`}
                                >
                                    <AlertCircle size={10} className={bp.enabled ? 'fill-current' : ''} />
                                </button>
                                <div className="flex-1 font-mono text-gray-700 dark:text-zinc-200">
                                    <span className="text-purple-600 dark:text-purple-400">Mem</span>
                                    <span className="text-gray-400 dark:text-zinc-500">[</span>
                                    <span className="text-amber-600 dark:text-amber-400">{bp.address.toString(16).toUpperCase().padStart(4, '0')}H</span>
                                    <span className="text-gray-400 dark:text-zinc-500">]</span>
                                    <span className="ml-2 text-[10px] px-1 py-0.5 bg-gray-100 dark:bg-zinc-700 rounded text-gray-500 dark:text-zinc-400">Write</span>
                                </div>
                                <button onClick={() => onRemoveDataBreakpoint(idx)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                
                {Object.keys(breakpoints).length === 0 && dataBreakpoints.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-zinc-600 gap-2">
                        <Circle size={24} className="opacity-20" />
                        <div className="text-xs italic">暂无断点</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BreakpointsPanel;
