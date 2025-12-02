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
        <div className="flex flex-col h-full bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden text-xs">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700">
                <div className="flex items-center gap-2 font-medium text-gray-700 dark:text-zinc-200">
                    <Circle size={12} className="text-red-500 fill-current" /> 断点管理
                </div>
                <button 
                    onClick={() => setShowAddData(!showAddData)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-500 dark:text-zinc-400"
                    title="添加数据断点"
                >
                    <Plus size={12}/>
                </button>
            </div>

            {showAddData && (
                <div className="p-2 bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700 flex gap-2">
                    <input 
                        type="text" 
                        value={newDataAddr}
                        onChange={e => setNewDataAddr(e.target.value)}
                        placeholder="内存地址 (e.g. 100H)"
                        className="flex-1 px-2 py-1 text-xs border rounded dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
                    />
                    <button onClick={handleAddData} className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">添加</button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {/* Code Breakpoints */}
                {Object.values(breakpoints).length > 0 && (
                    <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1 px-1">代码断点</div>
                        {Object.values(breakpoints).map(bp => (
                            <div key={bp.line} className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-zinc-700/50 rounded group">
                                <button 
                                    onClick={() => onUpdateBreakpoint(bp.line, { enabled: !bp.enabled })}
                                    className={`${bp.enabled ? 'text-red-500' : 'text-gray-400'}`}
                                >
                                    <Circle size={10} className={bp.enabled ? 'fill-current' : ''} />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-blue-600 dark:text-blue-400">Line {parseInt(bp.line) + 1}</span>
                                        {bp.type === 'CONDITIONAL' && <span className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-[10px] rounded">条件</span>}
                                    </div>
                                    {editingId === bp.line ? (
                                        <div className="flex items-center gap-1 mt-1">
                                            <input 
                                                type="text" 
                                                value={editCondition}
                                                onChange={e => setEditCondition(e.target.value)}
                                                className="flex-1 px-1 py-0.5 text-[10px] border rounded dark:bg-zinc-800 dark:border-zinc-600"
                                                placeholder="条件 (e.g. AX==0)"
                                                autoFocus
                                            />
                                            <button onClick={() => saveEditing(bp.line)} className="text-green-500"><Check size={10}/></button>
                                            <button onClick={() => setEditingId(null)} className="text-red-500"><X size={10}/></button>
                                        </div>
                                    ) : (
                                        <div className="text-gray-500 dark:text-zinc-400 truncate cursor-pointer hover:text-gray-700 dark:hover:text-zinc-200" onClick={() => startEditing(bp.line, bp.condition)}>
                                            {bp.condition || "无条件 (点击编辑)"}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => onRemoveBreakpoint(bp.line)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Data Breakpoints */}
                {dataBreakpoints.length > 0 && (
                    <div className="mt-2">
                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1 px-1">数据断点</div>
                        {dataBreakpoints.map((bp, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-zinc-700/50 rounded group">
                                <button 
                                    onClick={() => onToggleDataBreakpoint(idx)}
                                    className={`${bp.enabled ? 'text-purple-500' : 'text-gray-400'}`}
                                >
                                    <AlertCircle size={10} className={bp.enabled ? 'fill-current' : ''} />
                                </button>
                                <div className="flex-1 font-mono text-gray-700 dark:text-zinc-200">
                                    Mem[{bp.address.toString(16).toUpperCase().padStart(4, '0')}H] (Write)
                                </div>
                                <button onClick={() => onRemoveDataBreakpoint(idx)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                
                {Object.keys(breakpoints).length === 0 && dataBreakpoints.length === 0 && (
                    <div className="text-center text-gray-400 py-4 italic">
                        无断点
                    </div>
                )}
            </div>
        </div>
    );
};

export default BreakpointsPanel;
