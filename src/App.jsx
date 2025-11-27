import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { Play, Pause, StepForward, RotateCcw, Cpu, Terminal, FileCode, Activity, Save, Plus, FolderOpen, Zap, Flag, Download, Upload, Circle, Eye, AlertCircle, List, Layout, Monitor, Layers } from 'lucide-react';
import { PRESET_PROGRAMS, SCREEN_ROWS, SCREEN_COLS, SPEED_OPTIONS } from './constants';
import { useAssembler } from './hooks/useAssembler';
import RegisterCard from './components/RegisterCard';
import MemoryView from './components/MemoryView';
import WatchWindow from './components/WatchWindow';
import CallStack from './components/CallStack';

// 自适应缩放容器
const AutoResizingContainer = ({ children }) => {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (containerRef.current && contentRef.current) {
        const container = containerRef.current;
        const content = contentRef.current;
        
        // 获取容器尺寸
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        
        // 获取内容原始尺寸 (临时重置 scale 以获取真实尺寸)
        // 这里假设内容是固定大小或者 fit-content
        const ow = content.scrollWidth;
        const oh = content.scrollHeight;
        
        if (ow === 0 || oh === 0) return;

        // 计算缩放比例，保留 5% 的边距
        const scaleX = cw / ow;
        const scaleY = ch / oh;
        const newScale = Math.min(scaleX, scaleY) * 0.95;
        
        setScale(newScale);
      }
    };

    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    // 初始计算
    handleResize();

    return () => observer.disconnect();
  }, [children]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden relative">
      <div 
        ref={contentRef}
        style={{ 
          transform: `scale(${scale})`, 
          transformOrigin: 'center center',
          width: 'max-content',
          height: 'max-content'
        }}
      >
        {children}
      </div>
    </div>
  );
};

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">
          <List size={24}/> 示例程序库
        </h2>
        <div className="modal-grid">
          {examples.map(ex => (
            <button
              key={ex.key}
              onClick={() => { onSelect(PRESET_PROGRAMS[ex.key], ex.fileName); onClose(); }}
              className="example-card group"
            >
              <h3 className="example-title">{ex.name}</h3>
              <p className="example-desc">{ex.desc}</p>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="modal-close-btn">关闭</button>
      </div>
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
    setError,
    callStack
  } = useAssembler();

  const [viewMode, setViewMode] = useState('cpu'); // 'cpu', 'memory', 'watch', or 'stack'
  const [showExamples, setShowExamples] = useState(false);
  const [fileName, setFileName] = useState('SOURCE.ASM');
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [mobileTab, setMobileTab] = useState('editor'); // 'editor' | 'run'
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ top: 0, left: 0 });

  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const highlightRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const highlightInnerRef = useRef(null);
  const lineNumbersInnerRef = useRef(null);

  // 自动补全逻辑
  const handleEditorKeyDown = (e) => {
    // 快捷键
    if (e.key === 'F5') {
      e.preventDefault();
      handlePlayPause();
    } else if (e.key === 'F10') {
      e.preventDefault();
      if (!isPlaying) executeStep();
    } else if (e.key === 'F9') {
      e.preventDefault();
      // 获取当前行号
      const textarea = e.target;
      const value = textarea.value;
      const selectionStart = textarea.selectionStart;
      const lineIndex = value.substr(0, selectionStart).split('\n').length - 1;
      toggleBreakpoint(lineIndex);
    }

    // 补全选择
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(suggestions[suggestionIndex]);
      } else if (e.key === 'Escape') {
        setSuggestions([]);
      }
    }
  };

  const handleEditorChange = (e) => {
    const val = e.target.value;
    setCode(val);
    
    // 简单的补全触发逻辑
    const textarea = e.target;
    const selectionStart = textarea.selectionStart;
    const textBeforeCursor = val.substring(0, selectionStart);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];
    const words = currentLine.split(/[\s,]+/);
    const lastWord = words[words.length - 1].toUpperCase();

    if (lastWord.length >= 1) {
      const keywords = [
        'MOV', 'ADD', 'SUB', 'MUL', 'DIV', 'INC', 'DEC', 'JMP', 'JZ', 'JNZ', 'LOOP', 'CMP', 'INT', 'PUSH', 'POP', 'CALL', 'RET', 
        'AND', 'OR', 'XOR', 'NOT', 'LEA', 'SHL', 'SHR', 'AX', 'BX', 'CX', 'DX', 'SP', 'BP', 'SI', 'DI', 'CS', 'DS', 'SS', 'ES'
      ];
      const matches = keywords.filter(k => k.startsWith(lastWord) && k !== lastWord);
      if (matches.length > 0) {
        setSuggestions(matches);
        setSuggestionIndex(0);
        
        // 计算光标位置用于显示补全框 (简化计算)
        // 这里只是一个近似值，实际需要更复杂的测量
        const lineHeight = 24;
        const charWidth = 8.4; // Consolas 14px approx
        const top = (lines.length) * lineHeight - textarea.scrollTop;
        const left = (currentLine.length) * charWidth - textarea.scrollLeft + 48; // + line numbers width
        setCursorPosition({ top, left });
      } else {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const applySuggestion = (suggestion) => {
    const textarea = editorRef.current;
    const val = textarea.value;
    const selectionStart = textarea.selectionStart;
    const textBeforeCursor = val.substring(0, selectionStart);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];
    const words = currentLine.split(/[\s,]+/);
    const lastWord = words[words.length - 1];
    
    const newVal = val.substring(0, selectionStart - lastWord.length) + suggestion + val.substring(selectionStart);
    setCode(newVal);
    setSuggestions([]);
    
    // 恢复焦点并移动光标
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = selectionStart - lastWord.length + suggestion.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

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
      // 移动端自动切换到运行视图
      if (window.innerWidth < 1024) {
        setMobileTab('run');
      }
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="app-container">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".asm,.txt"
      />

      {/* Header */}
      <header className="app-header">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
           <div className="logo-container" style={{animation: 'float 3s ease-in-out infinite'}}>
             <Terminal className="text-yellow-400" size={20} />
           </div>
           <div className="flex-1 sm:flex-none">
             <h1 className="app-title">
               Asmplay 
               <span className="app-badge">SIMULATOR</span>
             </h1>
             <p className="app-subtitle">8086 Assembly Environment</p>
           </div>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto justify-center sm:justify-end">
          <button onClick={() => setShowExamples(!showExamples)} className="header-btn header-btn-purple">
            <List size={12} className="text-purple-400"/> 
            <span>示例程序</span>
          </button>
          <button onClick={() => reload(PRESET_PROGRAMS.default)} className="header-btn header-btn-red">
            <RotateCcw size={12} className="text-red-400"/> 
            <span>重置演示</span>
          </button>
          <div className="hidden md:block w-px h-5 bg-neutral-700 self-center"></div>
          <button onClick={() => reload('')} className="header-btn header-btn-yellow">
            <Plus size={12} className="text-yellow-400"/> 
            <span>新建</span>
          </button>
          <button onClick={() => fileInputRef.current.click()} className="header-btn header-btn-orange">
            <Download size={12} className="text-orange-400"/> 
            <span>导入</span>
          </button>
          <button onClick={handleFileDownload} className="header-btn header-btn-blue">
            <Upload size={12} className="text-blue-400"/> 
            <span>导出</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left: Code Editor */}
        <div className={`panel-left ${mobileTab === 'editor' ? 'h-full absolute inset-0 z-10 lg:static lg:h-auto' : 'hidden lg:flex'}`}>
           <div className="editor-header-bar">
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
              <span className={`editor-status-badge ${isPlaying ? 'active' : 'idle'}`}>
                {isPlaying ? '▶ EXECUTING' : '⏸ IDLE'}
              </span>
           </div>
           
           <div className="flex-1 relative overflow-hidden flex">
                {/* Line Numbers with Breakpoints */}
                  <div ref={lineNumbersRef} className="line-numbers-col">
                   <div ref={lineNumbersInnerRef}>
                    {code.split('\n').map((_, i) => {
                      const hasBreakpoint = breakpoints.has(i);
                      return (
                        <div 
                          key={i} 
                          className="breakpoint-gutter-item group"
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
              <div className="editor-area">
                 
                 {/* Syntax Highlight Layer (Background) */}
                    <div 
                      ref={highlightRef}
                      className="editor-highlight-layer"
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
                    onChange={handleEditorChange}
                    onKeyDown={handleEditorKeyDown}
                    onScroll={handleScroll}
                    className="editor-textarea"
                    spellCheck="false"
                 />
                 
                 {/* Suggestion Box */}
                 {suggestions.length > 0 && (
                    <div 
                      className="absolute z-50 bg-neutral-800 border border-neutral-700 rounded shadow-xl overflow-hidden min-w-[120px]"
                      style={{ top: cursorPosition.top, left: cursorPosition.left }}
                    >
                      {suggestions.map((s, i) => (
                        <div 
                          key={s}
                          className={`px-2 py-1 text-xs font-mono cursor-pointer ${i === suggestionIndex ? 'bg-yellow-600 text-white' : 'text-neutral-300 hover:bg-neutral-700'}`}
                          onClick={() => applySuggestion(s)}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                 )}
              </div>
           </div>
           
           {/* Toolbar */}
           <div className="editor-toolbar">
              <div className="flex gap-2 items-center justify-center sm:justify-start flex-wrap">
                <button 
                  onClick={handlePlayPause}
                  className={`play-btn ${isPlaying ? 'playing' : 'idle'}`}
                  title="F5"
                >
                   {isPlaying ? <><Pause size={16}/> <span className="hidden xs:inline">暂停 (F5)</span></> : <><Play size={16}/> <span className="hidden xs:inline">运行 (F5)</span></>}
                </button>
                <div className="hidden sm:block h-8 w-px bg-neutral-700/50"></div>
                <button onClick={executeStep} disabled={isPlaying} className="toolbar-btn toolbar-btn-blue" title="单步执行 (F10)">
                   <StepForward size={18} />
                </button>
                <button onClick={() => reload(code)} className="toolbar-btn toolbar-btn-green" title="重置">
                   <RotateCcw size={18} />
                </button>
              </div>
              
              {/* 速度控制 */}
              <div className="flex-1 sm:flex-none">
                <div className="speed-control-panel">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={14} className="text-yellow-400 animate-pulse"/>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">执行速度</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {SPEED_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSpeed(opt.value)}
                        className={`speed-btn ${speed === opt.value ? 'active' : ''}`}
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
        <div className={`panel-right ${mobileTab === 'run' ? 'h-full absolute inset-0 z-10 lg:static lg:h-auto' : 'hidden lg:flex'}`}>
           
           {/* Mobile Execution Controls */}
           <div className="mobile-control-panel">
              {/* Current Instruction Display */}
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">当前指令 (IP: {pc.toString(16).padStart(4,'0').toUpperCase()}H)</span>
              </div>
              <div className="bg-black/60 rounded-lg p-2.5 border border-neutral-800 font-mono text-xs overflow-x-auto whitespace-pre min-h-[38px] flex items-center shadow-inner">
                 {(() => {
                    const currentInst = parsedInstructions[pc];
                    if (currentInst && currentInst.type !== 'EMPTY' && currentInst.originalIndex !== undefined) {
                      const line = code.split('\n')[currentInst.originalIndex];
                      return highlightLine(line);
                    }
                    return <span className="text-neutral-600 italic">等待执行...</span>;
                 })()}
              </div>

              {/* Mobile Control Buttons */}
              <div className="flex gap-2 mt-1">
                <button 
                  onClick={handlePlayPause}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-xs transition-all ${isPlaying ? 'bg-red-900/30 text-red-400 border border-red-800/50' : 'bg-yellow-600 text-black shadow-lg shadow-yellow-900/20'}`}
                >
                   {isPlaying ? <><Pause size={14}/> 暂停</> : <><Play size={14}/> 运行</>}
                </button>
                <button 
                  onClick={executeStep} 
                  disabled={isPlaying} 
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-neutral-800 text-neutral-300 border border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed active:bg-neutral-700"
                >
                   <StepForward size={14} /> 单步
                </button>
                <button 
                  onClick={() => reload(code)} 
                  className="px-3 py-2 rounded-lg bg-neutral-800 text-neutral-300 border border-neutral-700 active:bg-neutral-700"
                >
                   <RotateCcw size={14} />
                </button>
              </div>
           </div>

           {/* Top: Registers & State */}
           <div className="h-[40%] lg:h-[45%] border-b border-neutral-800/50 p-3 sm:p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar bg-neutral-900/30">
              <div className="flex flex-wrap items-center justify-between mb-1 gap-2 sticky top-0 z-10 bg-neutral-900/95 p-2 -mx-2 rounded-lg border border-neutral-800/50 backdrop-blur-md shadow-sm">
                 <div className="flex gap-1.5 sm:gap-2">
                    <button 
                        onClick={() => setViewMode('cpu')}
                        className={`view-mode-btn ${viewMode === 'cpu' ? 'active' : ''}`}
                    >
                        <Cpu size={14}/> <span className="font-bold">CPU</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('memory')}
                        className={`view-mode-btn ${viewMode === 'memory' ? 'active' : ''}`}
                    >
                        <Activity size={14}/> <span className="font-bold">MEM</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('watch')}
                        className={`view-mode-btn ${viewMode === 'watch' ? 'active' : ''}`}
                    >
                        <Eye size={14}/> <span className="font-bold">WATCH</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('stack')}
                        className={`view-mode-btn ${viewMode === 'stack' ? 'active' : ''}`}
                    >
                        <Layers size={14}/> <span className="font-bold">STACK</span>
                    </button>
                 </div>
                 <div className="ip-badge text-sm py-1 px-3 bg-yellow-900/30 border-yellow-700/50 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.1)]">
                    IP: <span className="font-mono text-lg font-bold">{pc.toString(16).padStart(4,'0').toUpperCase()}H</span>
                 </div>
              </div>
              
              {viewMode === 'cpu' ? (
                  <div className="space-y-4 pb-2">
                    {/* General Purpose Registers */}
                    <div>
                        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 pl-1 flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-yellow-500"></div> 通用寄存器
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            {['AX', 'BX', 'CX', 'DX'].map(reg => <RegisterCard key={reg} name={reg} val={registers[reg]} />)}
                        </div>
                    </div>

                    {/* Pointers & Index Registers */}
                    <div>
                        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 pl-1 flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-blue-500"></div> 指针与变址
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            {['SP', 'BP', 'SI', 'DI'].map(reg => <RegisterCard key={reg} name={reg} val={registers[reg]} />)}
                        </div>
                    </div>

                    {/* Segment Registers */}
                    <div>
                        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 pl-1 flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-purple-500"></div> 段寄存器
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            {['CS', 'DS', 'SS', 'ES'].map(reg => <RegisterCard key={reg} name={reg} val={registers[reg]} />)}
                        </div>
                    </div>

                    {/* Flags Display */}
                    <div className="bg-black/40 rounded-xl p-3 border border-neutral-800">
                        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <Flag size={12}/> 标志寄存器 (FLAGS)
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                            { name: 'OF', labels: ['NV', 'OV'], desc: 'Overflow' },
                            { name: 'DF', labels: ['UP', 'DN'], desc: 'Direction' },
                            { name: 'IF', labels: ['DI', 'EI'], desc: 'Interrupt' },
                            { name: 'SF', labels: ['PL', 'NG'], desc: 'Sign' },
                            { name: 'ZF', labels: ['NZ', 'ZR'], desc: 'Zero' },
                            { name: 'AF', labels: ['NA', 'AC'], desc: 'Aux Carry' },
                            { name: 'PF', labels: ['PO', 'PE'], desc: 'Parity' },
                            { name: 'CF', labels: ['NC', 'CY'], desc: 'Carry' }
                            ].map(({ name, labels, desc }) => (
                                <div key={name} className="flex-1 min-w-[60px] bg-neutral-900/80 border border-neutral-700/50 rounded p-1.5 flex flex-col items-center gap-1 hover:border-yellow-500/30 transition-colors group" title={`${desc} Flag: ${flags[name]}`}>
                                    <span className="text-[10px] text-neutral-500 font-bold group-hover:text-yellow-500/70">{name}</span>
                                    <span className={`text-xs font-mono font-bold ${flags[name] ? 'text-yellow-400' : 'text-neutral-400'}`}>
                                        {labels[flags[name] || 0]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                  </div>
              ) : viewMode === 'memory' ? (
                  <MemoryView memory={memory} sp={registers.SP} registers={registers} ds={registers.DS} />
              ) : viewMode === 'watch' ? (
                  <WatchWindow 
                    watchVariables={watchVariables} 
                    symbolTable={symbolTable} 
                    memory={memory} 
                    onRemove={removeWatchVariable}
                    onAdd={addWatchVariable}
                  />
              ) : (
                  <CallStack callStack={callStack} />
              )}
           </div>

           {/* Bottom: Monitor */}
           <div className="flex-1 bg-gradient-to-br from-black via-neutral-950 to-black p-3 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden">
              <AutoResizingContainer>
                {/* Monitor Bezel */}
                <div className="monitor-bezel" style={{animation: 'fade-in-up 0.5s ease-out'}}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-b from-neutral-600 to-neutral-700 rounded-b-lg shadow-lg"></div>
                    
                    {/* Screen Container */}
                    <div className="monitor-screen-container">
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
              </AutoResizingContainer>
           </div>

        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-nav-bar">
        <button 
          onClick={() => setMobileTab('editor')}
          className={`mobile-nav-btn ${mobileTab === 'editor' ? 'active' : 'inactive'}`}
        >
          <FileCode size={20} />
          <span className="text-[10px] font-medium">代码编辑</span>
        </button>
        <div className="w-px h-8 bg-neutral-800"></div>
        <button 
          onClick={() => setMobileTab('run')}
          className={`mobile-nav-btn ${mobileTab === 'run' ? 'active' : 'inactive'}`}
        >
          <Monitor size={20} />
          <span className="text-[10px] font-medium">运行视图</span>
        </button>
      </div>
      
      {/* 错误提示框 */}
      {error && (
        <div className="error-toast-container">
          <div className="error-toast">
              <AlertCircle size={24} className="error-icon"/>
              <div className="error-content">
                <h3 className="error-title">执行错误</h3>
                <pre className="error-message">{error}</pre>
              </div>
              <button onClick={() => setError(null)} className="error-close-btn">
                ✕
              </button>
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
          <div className="input-overlay">
              <div className="input-modal">
                  <div className="input-icon-container">
                    <Terminal className="text-yellow-400" size={24} />
                  </div>
                  <h3 className="input-title">等待输入</h3>
                  <p className="input-desc">
                    程序已暂停执行，正在通过 <code className="input-code-badge">INT 21H</code> 请求字符输入。
                  </p>
                  <div className="relative">
                    <input 
                        autoFocus
                        type="text" 
                        maxLength={1}
                        className="input-field"
                        onChange={(e) => {
                            if(e.target.value) handleInput(e.target.value);
                        }}
                        onBlur={(e) => e.target.focus()}
                    />
                    <div className="input-hint">输入任意字符</div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}