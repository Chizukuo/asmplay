import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, StepForward, RotateCcw, Cpu, Terminal, FileCode, Activity, Save, Plus, FolderOpen, Zap, Flag, Download, Upload, Circle, Eye, AlertCircle, List } from 'lucide-react';
import { PRESET_PROGRAMS, SCREEN_ROWS, SCREEN_COLS, SPEED_OPTIONS } from './constants';
import { useAssembler } from './hooks/useAssembler';

// 简单的语法高亮逻辑
const highlightLine = (line) => {
  const commentIndex = line.indexOf(';');
  let codePart = line;
  let commentPart = '';
  if (commentIndex !== -1) {
    codePart = line.slice(0, commentIndex);
    commentPart = line.slice(commentIndex);
  }

  // 使用正则分割，保留分隔符
  const tokens = codePart.split(/([,\s:\[\]+]+)/); 
  
  const highlightedTokens = tokens.map((token, i) => {
    if (!token) return null;
    const upper = token.toUpperCase();
    let type = '';
    
    if (/^(MOV|ADD|SUB|MUL|DIV|INC|DEC|JMP|JZ|JNZ|LOOP|CMP|INT|PUSH|POP|CALL|RET|AND|OR|XOR|NOT|LEA|SHL|SHR|ROL|ROR|RCL|RCR|ADC|SBB|TEST|NEG|XCHG|NOP|HLT|CLI|STI|CLC|STC|CMC|CLD|STD|CBW|CWD|PUSHF|POPF|IRET|IN|OUT|LODS|STOS|MOVS|SCAS|CMPS|REP|REPE|REPNE|JE|JNE|JG|JGE|JL|JLE|JA|JAE|JB|JBE|JC|JNC|JO|JNO|JS|JNS|JP|JNP|JCXZ)$/.test(upper)) {
      type = 'token-keyword';
    } else if (/^(DB|DW|DD|DQ|DT|EQU|ORG|END|SEGMENT|ENDS|ASSUME|PROC|ENDP|MACRO|ENDM|PUBLIC|EXTRN|INCLUDE|TITLE|PAGE|OFFSET|PTR|BYTE|WORD|DWORD|NEAR|FAR|SHORT)$/.test(upper)) {
      type = 'token-keyword text-purple-400'; // 伪指令使用不同颜色
    } else if (/^(AX|BX|CX|DX|SP|BP|SI|DI|AH|AL|BH|BL|CH|CL|DH|DL|CS|DS|SS|ES|IP|FLAGS)$/.test(upper)) {
      type = 'token-register';
    } else if (/^[0-9]+$/.test(token) || /^0x[0-9A-F]+$/i.test(token) || /^[0-9A-F]+H$/i.test(token)) {
      type = 'token-number';
    } else if (/^".*"$/.test(token) || /^'.*'$/.test(token)) {
      type = 'token-string';
    } else if (token.trim().length > 0 && !/^[,\s:\[\]+]+$/.test(token)) {
        // 可能是标签或变量，简单处理
        type = 'text-neutral-300'; 
    }

    return <span key={i} className={type}>{token}</span>;
  });

  return (
    <>
      {highlightedTokens}
      {commentPart && <span className="token-comment">{commentPart}</span>}
    </>
  );
};

const MonitorCell = ({ cell, row, col }) => {
  const [showCoord, setShowCoord] = useState(false);
  
  return (
    <div 
      className={`monitor-cell ${cell.style} ${cell.fg}`}
      onMouseEnter={() => setShowCoord(true)}
      onMouseLeave={() => setShowCoord(false)}
    >
      <span className={cell.blink ? 'text-blink' : ''}>
        {cell.char}
      </span>
      {showCoord && (
        <div className="monitor-cell-coord">
          [{row}, {col}]
        </div>
      )}
    </div>
  );
};

const RegisterCard = ({ name, val }) => (
  <div className="bg-[#111] p-2 rounded border border-neutral-800 flex flex-col items-center min-w-[60px]">
    <div className="text-[10px] font-bold text-neutral-500 mb-1">{name}</div>
    <div className="font-mono text-sm text-yellow-400 tracking-wider">
      {val !== undefined ? val.toString(16).padStart(4, '0').toUpperCase() : '0000'}
    </div>
  </div>
);

const MemoryView = React.memo(({ memory, sp }) => {
  const [startAddr, setStartAddr] = useState(0);
  
  const rows = [];
  for (let i = 0; i < 16; i++) { // Show 16 rows (256 bytes)
      const rowAddr = startAddr + i * 16;
      if (rowAddr >= memory.length) break;
      const bytes = [];
      const chars = [];
      for (let j = 0; j < 16; j++) {
          const addr = rowAddr + j;
          if (addr < memory.length) {
              bytes.push(memory[addr]);
              const c = memory[addr];
              chars.push(c >= 32 && c <= 126 ? String.fromCharCode(c) : '.');
          } else {
              bytes.push(null);
              chars.push(' ');
          }
      }
      rows.push({ addr: rowAddr, bytes, chars });
  }

  return (
      <div className="flex flex-col h-full font-mono text-[10px]">
          <div className="flex justify-between items-center mb-1.5 px-1">
              <div className="flex gap-1.5 items-center">
                  <button onClick={() => setStartAddr(Math.max(0, startAddr - 256))} className="px-1.5 py-0.5 bg-neutral-800 rounded hover:bg-neutral-700 text-neutral-400 text-xs">&lt;</button>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-neutral-600 text-[9px]">0x</span>
                    <input 
                        value={startAddr.toString(16).toUpperCase()}
                        onChange={(e) => {
                            const val = parseInt(e.target.value, 16);
                            if (!isNaN(val)) setStartAddr(val);
                        }}
                        className="bg-neutral-900 border border-neutral-700 w-16 pl-5 pr-1 py-0.5 text-center rounded focus:border-yellow-500 outline-none text-yellow-400 text-[10px]"
                    />
                  </div>
                  <button onClick={() => setStartAddr(Math.min(memory.length - 256, startAddr + 256))} className="px-1.5 py-0.5 bg-neutral-800 rounded hover:bg-neutral-700 text-neutral-400 text-xs">&gt;</button>
              </div>
              <div className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider">Memory Dump</div>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar bg-[#080808] p-1.5 rounded border border-neutral-800">
              {rows.map(row => (
                  <div key={row.addr} className="flex hover:bg-white/5 group text-[10px]">
                      <div className="w-10 text-neutral-600 select-none group-hover:text-neutral-400 transition-colors">{row.addr.toString(16).padStart(4, '0').toUpperCase()}</div>
                      <div className="flex-1 flex gap-0.5 ml-1.5">
                          {row.bytes.map((b, idx) => {
                              const addr = row.addr + idx;
                              const isSP = addr === sp || addr === sp + 1;
                              let style = "text-neutral-500";
                              if (isSP) style = "text-yellow-400 font-bold bg-yellow-900/20";
                              else if (b !== 0) style = "text-neutral-300";
                              
                              return (
                                  <div key={idx} className={`w-4 text-center ${style}`}>
                                      {b !== null ? b.toString(16).padStart(2, '0').toUpperCase() : '  '}
                                  </div>
                              );
                          })}
                      </div>
                      <div className="w-24 text-neutral-700 tracking-widest border-l border-neutral-800 pl-1.5 ml-1.5 font-sans text-[9px] leading-3 pt-0.5">
                          {row.chars.join('')}
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );
});

// 示例程序选择器
const ExamplesModal = ({ show, onClose, onSelect }) => {
  if (!show) return null;
  
  const examples = [
    { key: 'default', name: '综合演示', desc: '展示基础指令和屏幕控制', fileName: 'DEMO.ASM' },
    { key: 'loop_test', name: 'LOOP 测试', desc: '循环指令功能测试', fileName: 'LOOP.ASM' },
    { key: 'bubble_sort', name: '冒泡排序', desc: '数组排序算法演示', fileName: 'SORT.ASM' },
    { key: 'fibonacci', name: '斐波那契', desc: '递推数列计算', fileName: 'FIB.ASM' },
    { key: 'string_demo', name: '字符串处理', desc: '字符串反转示例', fileName: 'STRING.ASM' },
    { key: 'calculator', name: '简易计算器', desc: '四则运算演示', fileName: 'CALC.ASM' }
  ];
  
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-effect max-w-2xl w-full rounded-2xl border border-neutral-700 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
          <List size={24}/> 示例程序库
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-auto custom-scrollbar">
          {examples.map(ex => (
            <button
              key={ex.key}
              onClick={() => { onSelect(PRESET_PROGRAMS[ex.key], ex.fileName); onClose(); }}
              className="glass-effect p-4 rounded-lg border border-neutral-700 hover:border-yellow-500/50 text-left transition-all duration-300 card-hover group"
            >
              <h3 className="font-bold text-lg text-neutral-200 group-hover:text-yellow-400 mb-1">{ex.name}</h3>
              <p className="text-sm text-neutral-400">{ex.desc}</p>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full btn-primary text-black font-bold py-2 rounded-lg">关闭</button>
      </div>
    </div>
  );
};

// 变量监视窗口
const WatchWindow = ({ watchVariables, symbolTable, memory, onRemove, onAdd }) => {
  const [newVar, setNewVar] = useState('');
  
  const handleAdd = () => {
    if (newVar.trim() && symbolTable.hasOwnProperty(newVar.trim().toUpperCase())) {
      onAdd(newVar.trim().toUpperCase());
      setNewVar('');
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="text-xs font-bold text-yellow-400 mb-2 flex items-center gap-2 uppercase tracking-wider">
        <Eye size={14}/> 变量监视
      </div>
      
      {/* 添加变量输入框 */}
      <div className="flex gap-2 mb-3">
        <input 
          type="text"
          value={newVar}
          onChange={(e) => setNewVar(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="输入变量名..."
          className="flex-1 bg-neutral-900 border border-neutral-700 px-2 py-1 rounded text-xs text-neutral-200 focus:border-yellow-500 outline-none"
        />
        <button 
          onClick={handleAdd}
          className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-black rounded text-xs font-bold transition-colors"
        >
          添加
        </button>
      </div>
      
      {watchVariables.length === 0 ? (
        <div className="text-neutral-600 italic text-xs text-center py-4">
          暂无监视变量<br/>
          <span className="text-[10px]">从数据段定义的变量中添加</span>
        </div>
      ) : (
        <div className="space-y-2 overflow-auto custom-scrollbar flex-1">
          {watchVariables.map(varName => {
            const addr = symbolTable[varName];
            const value = addr !== undefined ? (memory[addr] | (memory[addr + 1] << 8)) : 'N/A';
            return (
              <div key={varName} className="glass-effect p-2 rounded border border-neutral-800 flex justify-between items-center">
                <div>
                  <div className="text-xs font-mono text-yellow-300">{varName}</div>
                  <div className="text-[10px] text-neutral-500">
                    地址: {addr !== undefined ? `0x${addr.toString(16).toUpperCase()}` : 'N/A'}
                  </div>
                  <div className="text-sm font-mono text-green-400">
                    {typeof value === 'number' ? `${value} (0x${value.toString(16).toUpperCase()})` : value}
                  </div>
                </div>
                <button onClick={() => onRemove(varName)} className="text-red-400 hover:text-red-300 transition-colors">
                  <AlertCircle size={16}/>
                </button>
              </div>
            );
          })}
        </div>
      )}
      
      {/* 可用变量列表 */}
      {Object.keys(symbolTable).length > 0 && (
        <div className="mt-3 pt-3 border-t border-neutral-800">
          <div className="text-[10px] text-neutral-500 mb-2">可用变量:</div>
          <div className="flex flex-wrap gap-1">
            {Object.keys(symbolTable).filter(v => !watchVariables.includes(v)).map(varName => (
              <button
                key={varName}
                onClick={() => onAdd(varName)}
                className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[10px] transition-colors"
              >
                {varName}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function AssemblyVisualizer() {
  const {
    code, setCode,
    pc,
    registers,
    flags,
    screenBuffer,
    isPlaying, setIsPlaying,
    speed, setSpeed,
    logs,
    parsedInstructions,
    executeStep,
    reload,
    handleInput,
    isWaitingForInput,
    memory, // Need memory for MemoryView
    breakpoints,
    toggleBreakpoint,
    watchVariables,
    addWatchVariable,
    removeWatchVariable,
    symbolTable,
    error,
    setError
  } = useAssembler();

  const [viewMode, setViewMode] = useState('cpu'); // 'cpu', 'memory', or 'watch'
  const [showExamples, setShowExamples] = useState(false);
  const [fileName, setFileName] = useState('SOURCE.ASM');
  const [isEditingFileName, setIsEditingFileName] = useState(false);

  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const highlightRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const highlightInnerRef = useRef(null);
  const lineNumbersInnerRef = useRef(null);
  const logsEndRef = useRef(null);

  // 自动滚动到最新日志
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // 自动滚动到当前执行的代码行
  useEffect(() => {
    if (editorRef.current && parsedInstructions.length > 0) {
      const currentInst = parsedInstructions[pc];
      if (currentInst && currentInst.type !== 'EMPTY') {
        const lineHeight = 24; // 6 * 4 = 24px (h-6 = 1.5rem = 24px)
        const linePosition = currentInst.originalIndex * lineHeight;
        const editorHeight = editorRef.current.clientHeight;
        const scrollTop = editorRef.current.scrollTop;
        
        // 如果当前执行行不在可视区域内，滚动到该行
        if (linePosition < scrollTop || linePosition > scrollTop + editorHeight - lineHeight * 2) {
          editorRef.current.scrollTop = Math.max(0, linePosition - editorHeight / 2 + lineHeight);
        }
      }
    }
  }, [pc, parsedInstructions]);

  // 同步滚动
  const handleScroll = (e) => {
    const st = e.target.scrollTop;
    const sl = e.target.scrollLeft;
    // translate the inner highlight and line number containers so only textarea shows native scrollbar
    if (highlightInnerRef.current) {
      highlightInnerRef.current.style.transform = `translate3d(${-sl}px, ${-st}px, 0)`;
    }
    if (lineNumbersInnerRef.current) {
      lineNumbersInnerRef.current.style.transform = `translate3d(0px, ${-st}px, 0)`;
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // 设置文件名
    setFileName(file.name.toUpperCase());
    const reader = new FileReader();
    reader.onload = (e) => {
      reload(e.target.result);
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = null;
  };

  const handleFileDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.toLowerCase();
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePlayPause = () => {
    if (!isPlaying) {
      // 如果程序已经运行完毕（pc 到达末尾），先重置
      let currentPc = pc;
      while (currentPc < parsedInstructions.length && parsedInstructions[currentPc].type === 'EMPTY') {
        currentPc++;
      }
      if (currentPc >= parsedInstructions.length) {
        reload(code);
      }
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a] text-neutral-200 font-sans flex flex-col overflow-hidden selection:bg-yellow-900 selection:text-yellow-100">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".asm,.txt"
      />

      {/* Header */}
      <header className="glass-effect border-b border-neutral-800/50 p-3 sm:p-4 flex flex-col sm:flex-row flex-wrap justify-between items-center shrink-0 z-20 backdrop-blur-xl shadow-lg gap-3">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
           <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-900/10 p-2.5 sm:p-3 rounded-xl border border-yellow-900/50 shadow-lg" style={{animation: 'float 3s ease-in-out infinite'}}>
             <Terminal className="text-yellow-400" size={20} />
           </div>
           <div className="flex-1 sm:flex-none">
             <h1 className="font-bold text-lg sm:text-xl text-neutral-100 tracking-tight flex items-center gap-2">
               Asmplay 
               <span className="text-yellow-500 text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border border-yellow-700/50 shadow-inner">SIMULATOR</span>
             </h1>
             <p className="text-[10px] sm:text-xs text-neutral-400 font-medium">8086 Assembly Environment</p>
           </div>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto justify-center sm:justify-end">
          <button onClick={() => setShowExamples(!showExamples)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 border border-neutral-700 hover:border-purple-500/50 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-purple-500/20 card-hover">
            <List size={12} className="text-purple-400"/> 
            <span>示例程序</span>
          </button>
          <button onClick={() => reload(PRESET_PROGRAMS.default)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 border border-neutral-700 hover:border-red-500/50 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-red-500/20 card-hover">
            <RotateCcw size={12} className="text-red-400"/> 
            <span>重置演示</span>
          </button>
          <div className="hidden md:block w-px h-5 bg-neutral-700 self-center"></div>
          <button onClick={() => reload('')} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 border border-neutral-700 hover:border-yellow-500/50 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-yellow-500/20 card-hover">
            <Plus size={12} className="text-yellow-400"/> 
            <span>新建</span>
          </button>
          <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 border border-neutral-700 hover:border-orange-500/50 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-orange-500/20 card-hover">
            <Download size={12} className="text-orange-400"/> 
            <span>导入</span>
          </button>
          <button onClick={handleFileDownload} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 border border-neutral-700 hover:border-blue-500/50 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-blue-500/20 card-hover">
            <Upload size={12} className="text-blue-400"/> 
            <span>导出</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left: Code Editor */}
        <div className="w-full lg:w-5/12 flex flex-col border-b lg:border-b-0 lg:border-r border-neutral-800/50 bg-gradient-to-br from-[#0d0d0d] to-[#111] shadow-2xl">
           <div className="px-4 py-3 glass-effect text-xs font-semibold text-neutral-300 border-b border-neutral-800/50 flex justify-between items-center backdrop-blur-sm">
              <span className="flex items-center gap-2">
                <FileCode size={14} className="text-yellow-400"/> 
                {isEditingFileName ? (
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value.toUpperCase())}
                    onBlur={() => setIsEditingFileName(false)}
                    onKeyPress={(e) => e.key === 'Enter' && setIsEditingFileName(false)}
                    autoFocus
                    className="font-mono bg-neutral-900 border border-yellow-500 px-2 py-1 rounded text-yellow-400 outline-none w-32"
                  />
                ) : (
                  <span 
                    className="font-mono cursor-pointer hover:text-yellow-400 transition-colors"
                    onClick={() => setIsEditingFileName(true)}
                    title="点击编辑文件名"
                  >
                    {fileName}
                  </span>
                )}
              </span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider transition-all duration-300 ${isPlaying ? 'bg-gradient-to-r from-yellow-900/50 to-yellow-800/30 text-yellow-300 animate-pulse border border-yellow-600/50 shadow-lg shadow-yellow-500/20' : 'bg-neutral-800/80 text-neutral-400 border border-neutral-700'}`}>
                {isPlaying ? '▶ EXECUTING' : '⏸ IDLE'}
              </span>
           </div>
           
           <div className="flex-1 relative overflow-hidden flex">
                {/* Line Numbers with Breakpoints */}
                  <div ref={lineNumbersRef} className="w-12 bg-[#0a0a0a] text-yellow-600/50 text-right pr-3 py-4 text-sm font-mono leading-6 select-none border-r border-neutral-800 z-10 overflow-hidden">
                   <div ref={lineNumbersInnerRef}>
                    {code.split('\n').map((_, i) => {
                      const hasBreakpoint = breakpoints.has(i);
                      return (
                        <div 
                          key={i} 
                          className="h-6 flex items-center justify-end gap-1 cursor-pointer hover:bg-white/5 transition-colors group relative"
                          onClick={() => toggleBreakpoint(i)}
                          title={hasBreakpoint ? "移除断点" : "设置断点"}
                        >
                          <span className="opacity-0 group-hover:opacity-100 absolute left-0 text-[8px] text-neutral-500">
                            {hasBreakpoint ? '✖' : '●'}
                          </span>
                          {hasBreakpoint && (
                            <Circle size={10} className="text-red-500 fill-red-500 animate-pulse" />
                          )}
                          <span>{i+1}</span>
                        </div>
                      );
                    })}
                   </div>
                  </div>
              
              {/* Editor Area Container */}
              <div className="flex-1 relative overflow-hidden bg-[#0d0d0d]">
                 
                 {/* Syntax Highlight Layer (Background) */}
                    <div 
                      ref={highlightRef}
                      className="absolute inset-0 w-full h-full pl-3 p-4 text-sm leading-6 font-mono whitespace-pre overflow-hidden pointer-events-none"
                      aria-hidden="true"
                    >
                      <div ref={highlightInnerRef} className="w-full">
                       {code.split('\n').map((line, i) => {
                          // 检查当前行是否是正在执行的指令
                          const isExecuting = parsedInstructions.some((inst, idx) => 
                            inst.originalIndex === i && idx === pc && inst.type !== 'EMPTY'
                          );
                          return (
                            <div key={i} className={`h-6 relative ${isExecuting ? 'code-line-executing' : ''}`}>
                              {highlightLine(line)}
                            </div>
                          );
                       })}
                      </div>
                    </div>

                 {/* Textarea (Foreground) */}
                 <textarea
                    ref={editorRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onScroll={handleScroll}
                    className="absolute inset-0 w-full h-full bg-transparent pl-3 p-4 text-sm leading-6 outline-none resize-none text-transparent caret-white font-mono whitespace-pre z-10 custom-scrollbar"
                    spellCheck="false"
                 />
              </div>
           </div>
           
           {/* Toolbar */}
           <div className="p-3 sm:p-4 glass-effect border-t border-neutral-800/50 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center backdrop-blur-sm">
              <div className="flex gap-2 items-center justify-center sm:justify-start flex-wrap">
                <button 
                  onClick={handlePlayPause}
                  className={`flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 shadow-lg transform hover:scale-105 active:scale-95 flex-1 sm:flex-none justify-center ${isPlaying ? 'bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-red-100 shadow-red-900/50' : 'btn-primary text-black shadow-yellow-900/50'}`}
                >
                   {isPlaying ? <><Pause size={16}/> <span className="hidden xs:inline">暂停</span></> : <><Play size={16}/> <span className="hidden xs:inline">运行</span></>}
                </button>
                <div className="hidden sm:block h-8 w-px bg-neutral-700/50"></div>
                <button onClick={executeStep} disabled={isPlaying} className="p-2.5 rounded-lg bg-gradient-to-br from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 text-neutral-300 border border-neutral-700 hover:border-blue-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 card-hover hover:shadow-lg hover:shadow-blue-500/20" title="单步执行">
                   <StepForward size={18} />
                </button>
                <button onClick={() => reload(code)} className="p-2.5 rounded-lg bg-gradient-to-br from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 text-neutral-300 border border-neutral-700 hover:border-green-500/50 transition-all duration-300 card-hover hover:shadow-lg hover:shadow-green-500/20" title="重置">
                   <RotateCcw size={18} />
                </button>
              </div>
              
              {/* 速度控制 */}
              <div className="flex-1 sm:flex-none">
                <div className="glass-effect bg-gradient-to-br from-neutral-900/80 to-neutral-800/60 px-3 py-2 rounded-lg border border-neutral-700/50 hover:border-yellow-500/50 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-yellow-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={14} className="text-yellow-400 animate-pulse"/>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">执行速度</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {SPEED_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSpeed(opt.value)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-all duration-200 ${
                          speed === opt.value 
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg shadow-yellow-500/30 scale-105' 
                            : 'bg-neutral-800/80 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 border border-neutral-700/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
           </div>
        </div>

        {/* Right: System View */}
        <div className="w-full lg:w-7/12 flex flex-col bg-gradient-to-br from-[#050505] to-[#0a0a0a]">
           
           {/* Top: Registers & State */}
           <div className="h-[45%] border-b border-neutral-800/50 p-3 sm:p-4 flex flex-col gap-2 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
                 <div className="flex gap-1.5 sm:gap-2">
                    <button 
                        onClick={() => setViewMode('cpu')}
                        className={`text-[10px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-300 ${viewMode === 'cpu' ? 'text-yellow-400 bg-yellow-900/20 border border-yellow-700/50 shadow-lg shadow-yellow-500/20' : 'text-neutral-500 hover:text-neutral-300 bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700'}`}
                    >
                        <Cpu size={12}/> <span>CPU</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('memory')}
                        className={`text-[10px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-300 ${viewMode === 'memory' ? 'text-yellow-400 bg-yellow-900/20 border border-yellow-700/50 shadow-lg shadow-yellow-500/20' : 'text-neutral-500 hover:text-neutral-300 bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700'}`}
                    >
                        <Activity size={12}/> <span>MEM</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('watch')}
                        className={`text-[10px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-300 ${viewMode === 'watch' ? 'text-yellow-400 bg-yellow-900/20 border border-yellow-700/50 shadow-lg shadow-yellow-500/20' : 'text-neutral-500 hover:text-neutral-300 bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700'}`}
                    >
                        <Eye size={12}/> <span>WATCH</span>
                    </button>
                 </div>
                 <div className="text-[10px] sm:text-xs font-mono font-semibold text-yellow-400 bg-yellow-900/20 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-yellow-700/50">IP: {pc.toString(16).padStart(4,'0').toUpperCase()}H</div>
              </div>
              
              {viewMode === 'cpu' ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {['AX', 'BX', 'CX', 'DX'].map(reg => <RegisterCard key={reg} name={reg} val={registers[reg]} />)}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {['SP', 'BP', 'SI', 'DI'].map(reg => <RegisterCard key={reg} name={reg} val={registers[reg]} />)}
                    </div>

                    {/* Flags Display */}
                    <div className="flex flex-wrap gap-1.5">
                        <div className="text-xs font-bold text-yellow-400 flex items-center gap-2 mr-2 bg-yellow-900/20 px-3 py-2 rounded-lg border border-yellow-700/50">
                          <Flag size={14}/> FLAGS
                        </div>
                        {Object.entries(flags).map(([name, val]) => (
                            <div key={name} className={`px-3 py-2 rounded-lg text-xs font-mono font-semibold border transition-all duration-300 ${val ? 'bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border-yellow-600 text-yellow-300 shadow-md shadow-yellow-500/20' : 'bg-neutral-900/50 border-neutral-800 text-neutral-600'}`}>
                                {name}={val ? '1' : '0'}
                            </div>
                        ))}
                    </div>
                  </>
              ) : viewMode === 'memory' ? (
                  <MemoryView memory={memory} sp={registers.SP} />
              ) : (
                  <WatchWindow 
                    watchVariables={watchVariables} 
                    symbolTable={symbolTable} 
                    memory={memory} 
                    onRemove={removeWatchVariable}
                    onAdd={addWatchVariable}
                  />
              )}

              <div className="flex-1 glass-effect rounded-lg border border-neutral-800/50 p-3 flex flex-col min-h-0 shadow-xl">
                 <h3 className="text-[10px] font-bold text-yellow-400 mb-2 flex items-center gap-2 uppercase tracking-wider bg-yellow-900/20 px-2 py-1.5 rounded border border-yellow-700/50">
                   <Activity size={12}/> Execution Log
                 </h3>
                 <div className="flex-1 overflow-auto custom-scrollbar font-mono text-[10px] space-y-1 pr-1">
                    {logs.map((log, i) => (
                       <div key={i} className="text-yellow-300/90 border-l-2 border-yellow-600/50 pl-2 py-1 hover:bg-yellow-900/10 transition-all duration-200 rounded-r bg-neutral-900/30 backdrop-blur-sm" style={{animation: 'fade-in-up 0.3s ease-out'}}>
                         {log}
                       </div>
                    ))}
                    <div ref={logsEndRef} />
                    {logs.length === 0 && <div className="text-neutral-600 italic text-center mt-4 text-xs">Ready to execute...</div>}
                 </div>
              </div>
           </div>

           {/* Bottom: Monitor */}
           <div className="flex-1 bg-gradient-to-br from-black via-neutral-950 to-black p-3 sm:p-6 flex flex-col items-center justify-center relative overflow-auto">
              {/* Monitor Bezel */}
              <div className="relative bg-gradient-to-br from-neutral-800 via-neutral-700 to-neutral-800 p-4 sm:p-5 rounded-2xl shadow-2xl border-2 border-neutral-600 max-w-full" style={{animation: 'fade-in-up 0.5s ease-out'}}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-b from-neutral-600 to-neutral-700 rounded-b-lg shadow-lg"></div>
                  
                  {/* Screen Container */}
                  <div className="relative bg-black border-4 border-[#1a1a1a] rounded-lg overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,1)] glow-border">
                      {/* CRT Effects */}
                      <div className="crt-overlay absolute inset-0 z-20 pointer-events-none"></div>
                      <div className="crt-scanline"></div>
                      
                      {/* Screen Content */}
                      <div 
                        className="monitor-grid"
                        style={{ 
                            '--cols': SCREEN_COLS,
                            '--rows': SCREEN_ROWS
                        }}
                      >
                          {screenBuffer.map((row, r) => 
                            row.map((cell, c) => (
                              <MonitorCell 
                                key={`${r}-${c}`}
                                cell={cell}
                                row={r}
                                col={c}
                              />
                            ))
                          )}
                      </div>
                  </div>
                  
                  {/* Monitor Branding */}
                  <div className="mt-2 flex justify-between items-center px-2">
                      <div className="flex gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-900/50 border border-red-800"></div>
                          <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(250,204,21,1)] border border-yellow-400" style={{animation: 'glow-pulse 2s ease-in-out infinite'}}></div>
                      </div>
                      <span className="text-[10px] font-bold text-neutral-500 tracking-widest">SYNCMASTER 8086</span>
                  </div>
              </div>
           </div>

        </div>
      </div>
      
      {/* 错误提示框 */}
      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-full mx-4">
          <div className="glass-effect bg-red-900/80 border-2 border-red-500 rounded-lg p-4 shadow-2xl shadow-red-500/50">
            <div className="flex items-start gap-3">
              <AlertCircle size={24} className="text-red-300 flex-shrink-0 mt-1"/>
              <div className="flex-1">
                <h3 className="font-bold text-red-100 mb-1">执行错误</h3>
                <pre className="text-sm text-red-200 font-mono whitespace-pre-wrap">{error}</pre>
              </div>
              <button onClick={() => setError(null)} className="text-red-300 hover:text-red-100 transition-colors">
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 示例程序选择器 */}
      <ExamplesModal 
        show={showExamples} 
        onClose={() => setShowExamples(false)} 
        onSelect={(code, name) => {
          reload(code);
          setFileName(name);
        }}
      />
      
      {/* Input Overlay */}
      {isWaitingForInput && (
          <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-md p-4" style={{animation: 'fade-in-up 0.3s ease-out'}}>
              <div className="glass-effect p-6 sm:p-10 rounded-2xl border-2 border-yellow-500/40 shadow-[0_0_80px_rgba(250,204,21,0.25)] text-center max-w-lg w-full mx-4" style={{animation: 'float 3s ease-in-out infinite'}}>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 border-2 border-yellow-500/30 shadow-lg shadow-yellow-500/20">
                    <Terminal className="text-yellow-400" size={24} />
                  </div>
                  <h3 className="text-yellow-400 font-bold text-xl sm:text-2xl mb-2 sm:mb-3 tracking-tight glow-text">等待输入</h3>
                  <p className="text-neutral-300 text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed">
                    程序已暂停执行，正在通过 <code className="bg-neutral-800/80 px-2 py-1 rounded text-yellow-300 font-mono text-[10px] sm:text-xs border border-yellow-700/30">INT 21H</code> 请求字符输入。
                  </p>
                  <div className="relative">
                    <input 
                        autoFocus
                        type="text" 
                        maxLength={1}
                        className="bg-black border-3 border-yellow-700 text-yellow-300 text-center text-3xl sm:text-4xl font-mono w-16 h-16 sm:w-20 sm:h-20 rounded-xl focus:outline-none focus:border-yellow-500 focus:shadow-[0_0_30px_rgba(250,204,21,0.5)] transition-all duration-300 uppercase shadow-inner glow-border mx-auto block"
                        onChange={(e) => {
                            if(e.target.value) handleInput(e.target.value);
                        }}
                        onBlur={(e) => e.target.focus()}
                    />
                    <div className="mt-3 sm:mt-5 text-[10px] sm:text-xs text-neutral-500 uppercase tracking-widest font-semibold">输入任意字符</div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}