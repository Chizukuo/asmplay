import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, StepForward, RotateCcw, Cpu, Terminal, FileCode, Activity, Save, Plus, FolderOpen, Zap, Flag, Download, Upload, Circle, Eye, AlertCircle, List, Layout, Monitor as MonitorIcon, Layers, Sun, Moon, Undo, Search, Replace, X, ArrowUp, ArrowDown, Check, Hash, ChevronDown, ChevronUp, Maximize, Minimize, Menu } from 'lucide-react';
import { PRESET_PROGRAMS, SCREEN_ROWS, SCREEN_COLS, SPEED_OPTIONS } from './constants';
import { useAssembler } from './hooks/useAssembler';
import RegisterCard from './components/RegisterCard';
import MemoryView from './components/MemoryView';
import WatchWindow from './components/WatchWindow';
import CallStack from './components/CallStack';
import AutoResizingContainer from './components/AutoResizingContainer';
import Monitor from './components/Monitor';
import ExamplesModal from './components/ExamplesModal';
import BreakpointsPanel from './components/BreakpointsPanel';
import { highlightLine } from './utils/highlightLine';


export default function AssemblyVisualizer() {
  const {
    code, setCode,
    pc,
    registers,
    flags,
    videoMemory,
    screenCols,
    cursor,
    isPlaying, setIsPlaying,
    speed, setSpeed,
    parsedInstructions,
    executeStep,
    stepBack,
    canUndo,
    reload,
    handleInput,
    isWaitingForInput,
    memory, setMemory, // Need memory for MemoryView
    breakpoints,
    dataBreakpoints,
    toggleBreakpoint,
    addBreakpoint,
    removeBreakpoint,
    updateBreakpoint,
    addDataBreakpoint,
    removeDataBreakpoint,
    toggleDataBreakpoint,
    watchVariables,
    addWatchVariable,
    removeWatchVariable,
    symbolTable,
    error,
    setError,
    callStack,
    keyBuffer,
    simulateKeyPress,
    consumeKey,
    lastKeyPressed
  } = useAssembler();



  const [theme, setTheme] = useState('light');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMonitorCollapsed, setIsMonitorCollapsed] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    // 监听 F11 键 - 浏览器原生全屏不会触发 fullscreenchange
    const handleKeyDown = (e) => {
      if (e.key === 'F11') {
        // 检测窗口是否接近全屏尺寸
        setTimeout(() => {
          const isFullscreenNow = window.innerHeight === screen.height || 
                                   window.outerHeight === screen.height ||
                                   !!document.fullscreenElement;
          setIsFullscreen(isFullscreenNow);
        }, 100);
      }
    };

    // 监听窗口大小变化来检测全屏
    const handleResize = () => {
      const isFullscreenNow = (window.innerHeight >= screen.height - 100 && window.innerWidth >= screen.width - 100) ||
                               !!document.fullscreenElement;
      setIsFullscreen(isFullscreenNow);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    // 初始检测
    handleResize();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 全局键盘监听 - 当程序运行时捕获按键
  useEffect(() => {
    const handleGlobalKeyPress = (e) => {
      // 忽略修饰键单独按下
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      
      if (isWaitingForInput) {
        // 等待输入模式：直接处理输入
        e.preventDefault();
        if (e.key === 'Backspace') {
            handleInput('\b');
        } else if (e.key === 'Enter') {
            handleInput('\r');
        } else if (e.key === ' ') {
            handleInput(' ');
        } else if (e.key.length === 1) {
            handleInput(e.key.toUpperCase());
        }
      } else if (isPlaying) {
        // 程序运行时：将按键放入缓冲区（用于INT 16H检测）
        if (e.key === 'Backspace') {
            e.preventDefault();
            simulateKeyPress('\b');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            simulateKeyPress('\r');
        } else if (e.key === ' ') {
            e.preventDefault();
            simulateKeyPress(' ');
        } else if (e.key.length === 1) {
            e.preventDefault();
            simulateKeyPress(e.key.toUpperCase());
        }
      }
    };

    // 使用 keydown 事件以确保所有按键都能被捕获
    window.addEventListener('keydown', handleGlobalKeyPress);
    return () => window.removeEventListener('keydown', handleGlobalKeyPress);
  }, [isPlaying, isWaitingForInput, simulateKeyPress, handleInput]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const insideTrigger = speedDropdownRef.current && speedDropdownRef.current.contains(event.target);
      const insideMenu = speedMenuRef.current && speedMenuRef.current.contains(event.target);
      if (!insideTrigger && !insideMenu) {
        setSpeedDropdownOpen(false);
      }
      
      // 处理汉堡包菜单的点击外部关闭
      const insideMobileMenuButton = mobileMenuButtonRef.current && mobileMenuButtonRef.current.contains(event.target);
      const insideMobileMenu = mobileMenuRef.current && mobileMenuRef.current.contains(event.target);
      if (!insideMobileMenuButton && !insideMobileMenu) {
        setShowMobileMenu(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setSpeedDropdownOpen(false);
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const [viewMode, setViewMode] = useState('cpu'); // 'cpu', 'memory', 'watch' or 'stack'
  const [showExamples, setShowExamples] = useState(false);
  const [fileName, setFileName] = useState('SOURCE.ASM');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [mobileTab, setMobileTab] = useState('editor'); // 'editor' | 'run'
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ top: 0, left: 0 });
  const [speedDropdownOpen, setSpeedDropdownOpen] = useState(false);
  const [speedDropdownCoords, setSpeedDropdownCoords] = useState(null);

  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const highlightRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const highlightInnerRef = useRef(null);
  const lineNumbersInnerRef = useRef(null);
  const speedDropdownRef = useRef(null);
  const speedMenuRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Editor Search & Replace State
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [searchMode, setSearchMode] = useState('find'); // 'find', 'replace', 'goto'
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [searchMatches, setSearchMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [goToLineNumber, setGoToLineNumber] = useState('');

  const currentSpeedLabel = SPEED_OPTIONS.find(opt => opt.value === speed)?.label || '正常';

  // --- Editor Helper Functions ---

  const performSearch = (text) => {
    if (!text) {
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }
    const matches = [];
    let pos = code.indexOf(text);
    while (pos !== -1) {
      matches.push(pos);
      pos = code.indexOf(text, pos + 1);
    }
    setSearchMatches(matches);
    if (matches.length > 0) {
      // Find the match closest to current cursor or just the first one
      const cursor = editorRef.current ? editorRef.current.selectionStart : 0;
      let nextMatchIdx = matches.findIndex(m => m >= cursor);
      if (nextMatchIdx === -1) nextMatchIdx = 0;
      setCurrentMatchIndex(nextMatchIdx);
      navigateToMatch(matches[nextMatchIdx], text.length);
    } else {
      setCurrentMatchIndex(-1);
    }
  };

  const navigateToMatch = (index, length) => {
    if (editorRef.current && index !== -1) {
      editorRef.current.focus();
      editorRef.current.setSelectionRange(index, index + length);
      
      // Scroll to view
      const textBefore = code.substring(0, index);
      const lineIndex = textBefore.split('\n').length - 1;
      const lineHeight = 24;
      const editorHeight = editorRef.current.clientHeight;
      const scrollTop = lineIndex * lineHeight - editorHeight / 2;
      editorRef.current.scrollTop = Math.max(0, scrollTop);
    }
  };

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIdx);
    navigateToMatch(searchMatches[nextIdx], searchText.length);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prevIdx);
    navigateToMatch(searchMatches[prevIdx], searchText.length);
  };

  const handleReplace = () => {
    if (currentMatchIndex === -1 || searchMatches.length === 0) return;
    const matchPos = searchMatches[currentMatchIndex];
    const newCode = code.substring(0, matchPos) + replaceText + code.substring(matchPos + searchText.length);
    setCode(newCode);
    // Re-search after replace
    // We need to wait for state update or pass newCode
    setTimeout(() => performSearch(searchText), 0);
  };

  const handleReplaceAll = () => {
    if (!searchText) return;
    const newCode = code.split(searchText).join(replaceText);
    setCode(newCode);
    setSearchMatches([]);
    setCurrentMatchIndex(-1);
  };

  const handleGoToLine = () => {
    const line = parseInt(goToLineNumber);
    if (!isNaN(line) && line > 0) {
      const lines = code.split('\n');
      const targetLineIndex = Math.min(line, lines.length) - 1;
      
      // Calculate position
      let pos = 0;
      for (let i = 0; i < targetLineIndex; i++) {
        pos += lines[i].length + 1; // +1 for \n
      }
      
      if (editorRef.current) {
        editorRef.current.focus();
        editorRef.current.setSelectionRange(pos, pos);
        const lineHeight = 24;
        const editorHeight = editorRef.current.clientHeight;
        editorRef.current.scrollTop = Math.max(0, targetLineIndex * lineHeight - editorHeight / 2);
      }
      setShowSearchPanel(false);
    }
  };

  const toggleComment = () => {
    const textarea = editorRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    
    // Find start and end lines
    const startLineIndex = val.substring(0, start).split('\n').length - 1;
    const endLineIndex = val.substring(0, end).split('\n').length - 1;
    
    const lines = val.split('\n');
    const selectedLines = lines.slice(startLineIndex, endLineIndex + 1);
    
    // Check if all selected lines are commented
    const allCommented = selectedLines.every(line => line.trim().startsWith(';'));
    
    const newLines = lines.map((line, idx) => {
      if (idx >= startLineIndex && idx <= endLineIndex) {
        if (allCommented) {
          // Uncomment: remove first ;
          return line.replace(';', '').replace(/^ /, ''); // Remove optional space after ;
        } else {
          // Comment: add ;
          return '; ' + line;
        }
      }
      return line;
    });
    
    const newCode = newLines.join('\n');
    setCode(newCode);
    
    // Restore selection (approximate)
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, end); // Selection might drift, but good enough for now
    }, 0);
  };

  // 自动补全逻辑
  const handleEditorKeyDown = (e) => {
    // 快捷键
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'f') {
            e.preventDefault();
            setShowSearchPanel(true);
            setSearchMode('find');
            // Use current selection as search text if any
            const selection = window.getSelection().toString();
            if (selection && !selection.includes('\n')) {
                setSearchText(selection);
                performSearch(selection);
            }
            return;
        } else if (e.key === 'h') {
            e.preventDefault();
            setShowSearchPanel(true);
            setSearchMode('replace');
            return;
        } else if (e.key === 'g') {
            e.preventDefault();
            setShowSearchPanel(true);
            setSearchMode('goto');
            return;
        } else if (e.key === '/') {
            e.preventDefault();
            toggleComment();
            return;
        }
    }

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
    <div className={`app-container ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".asm,.txt"
      />

      {/* Header - 全屏时隐藏 */}
      <header className={`app-header glass-panel border-b-0 mb-2 rounded-xl mx-2 mt-2 transition-all duration-300 ${isFullscreen ? 'fullscreen-hidden' : ''}`}>
        {/* Logo区域 */}
        <div className="header-brand flex items-center gap-3">
          <div className="logo-container">
            <Terminal className="logo-icon" size={22} />
          </div>
          <div className="brand-text">
            <h1 className="app-title">
              Asmplay
              <span className="app-badge">SIM</span>
            </h1>
            <span className="app-subtitle hidden sm:block">8086 Assembly Simulator</span>
          </div>
        </div>
        
        {/* Desktop buttons - 按功能分组 */}
        <nav className="header-nav hidden md:flex items-center">
          {/* 文件操作组 */}
          <div className="header-btn-group">
            <button onClick={() => reload('')} className="header-btn header-btn-icon" title="新建文件">
              <Plus size={16} />
            </button>
            <button onClick={() => fileInputRef.current.click()} className="header-btn header-btn-icon" title="导入文件">
              <Download size={16} />
            </button>
            <button onClick={handleFileDownload} className="header-btn header-btn-icon" title="导出文件">
              <Upload size={16} />
            </button>
          </div>

          <div className="header-divider"></div>

          {/* 功能操作组 */}
          <div className="header-btn-group">
            <button onClick={() => setShowExamples(!showExamples)} className="header-btn header-btn-purple">
              <List size={16} /> 
              <span>示例</span>
            </button>
            <button onClick={() => reload(PRESET_PROGRAMS.default)} className="header-btn header-btn-red">
              <RotateCcw size={16} /> 
              <span>重置</span>
            </button>
          </div>

          <div className="header-divider"></div>

          {/* 主题切换 */}
          <button onClick={toggleTheme} className="header-btn header-btn-theme" title={theme === 'light' ? "切换到暗黑模式" : "切换到白天模式"}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </nav>

        {/* Mobile hamburger menu button */}
        <div className="flex md:hidden items-center gap-2">
          <button onClick={toggleTheme} className="header-btn header-btn-theme" title={theme === 'light' ? "切换到暗黑模式" : "切换到白天模式"}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button 
            ref={mobileMenuButtonRef}
            onClick={() => setShowMobileMenu(!showMobileMenu)} 
            className="header-btn header-btn-menu"
            title="菜单"
          >
            {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile sidebar menu - 移到 header 外面 */}
      {showMobileMenu && (
        <>
          {/* 遮罩层 */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] md:hidden animate-fade-in"
            onClick={() => setShowMobileMenu(false)}
          />
          {/* 侧边栏 */}
          <div 
            ref={mobileMenuRef} 
            className="fixed top-0 right-0 h-full w-64 glass-panel shadow-2xl border-l border-slate-200 dark:border-zinc-700 z-[10000] md:hidden animate-slide-in-right"
          >
            <div className="flex flex-col h-full">
              {/* 侧边栏头部 */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-zinc-100">菜单</h3>
                <button 
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X size={18} className="text-slate-600 dark:text-zinc-400"/>
                </button>
              </div>
              
              {/* 菜单项 */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => { setShowExamples(true); setShowMobileMenu(false); }} 
                    className="mobile-menu-item"
                  >
                    <List size={16} className="text-purple-500 dark:text-purple-400"/> 
                    <span>示例程序</span>
                  </button>
                  <button 
                    onClick={() => { reload(PRESET_PROGRAMS.default); setShowMobileMenu(false); }} 
                    className="mobile-menu-item"
                  >
                    <RotateCcw size={16} className="text-red-500 dark:text-red-400"/> 
                    <span>重置代码</span>
                  </button>
                  <div className="w-full h-px bg-slate-200 dark:bg-zinc-700 my-1"></div>
                  <button 
                    onClick={() => { reload(''); setShowMobileMenu(false); }} 
                    className="mobile-menu-item"
                  >
                    <Plus size={16} className="text-yellow-500 dark:text-yellow-400"/> 
                    <span>新建文件</span>
                  </button>
                  <button 
                    onClick={() => { fileInputRef.current.click(); setShowMobileMenu(false); }} 
                    className="mobile-menu-item"
                  >
                    <Download size={16} className="text-orange-500 dark:text-orange-400"/> 
                    <span>导入文件</span>
                  </button>
                  <button 
                    onClick={() => { handleFileDownload(); setShowMobileMenu(false); }} 
                    className="mobile-menu-item"
                  >
                    <Upload size={16} className="text-blue-500 dark:text-blue-400"/> 
                    <span>导出文件</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left: Code Editor */}
        <div className={`panel-left ${mobileTab === 'editor' ? 'h-full absolute inset-0 z-10 lg:relative lg:h-auto' : 'hidden lg:flex'} flex flex-col gap-2 p-2`}>
           <div className="editor-header-bar glass-panel rounded-lg px-4 py-2 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <div className="p-1.5 bg-yellow-500/10 rounded-md">
                  <FileCode size={16} className="text-yellow-500"/> 
                </div>
                {isEditingFileName ? (
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value.toUpperCase())}
                    onBlur={() => setIsEditingFileName(false)}
                    onKeyPress={(e) => e.key === 'Enter' && setIsEditingFileName(false)}
                    autoFocus
                    className="font-mono bg-slate-50 dark:bg-zinc-900 border border-blue-500 dark:border-yellow-500 px-2 py-1 rounded text-blue-600 dark:text-yellow-400 outline-none w-40 text-sm"
                  />
                ) : (
                  <span 
                    className="font-mono font-medium text-slate-700 dark:text-zinc-200 cursor-pointer hover:text-blue-600 dark:hover:text-yellow-400 transition-colors px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800"
                    onClick={() => setIsEditingFileName(true)}
                    title="点击编辑文件名"
                  >
                    {fileName}
                  </span>
                )}
              </span>
              <span className={`
                px-3 py-1 rounded-full text-xs font-bold tracking-wider flex items-center gap-1.5 transition-all duration-300
                ${isPlaying 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800 animate-pulse' 
                  : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'}
              `}>
                <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500' : 'bg-slate-400 dark:bg-zinc-500'}`}></div>
                {isPlaying ? 'EXECUTING' : 'IDLE'}
              </span>
           </div>
           
           {/* Search/Replace/GoTo Panel */}
           {showSearchPanel && (
             <div className="absolute top-14 right-6 z-50 w-80 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl shadow-2xl border border-slate-200 dark:border-zinc-700 rounded-xl p-4 animate-scale-in">
               <div className="flex justify-between items-center mb-2">
                 <div className="flex gap-2 text-xs font-bold text-slate-500 dark:text-zinc-400">
                   <button onClick={() => setSearchMode('find')} className={`px-2 py-1 rounded ${searchMode === 'find' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400'}`}>查找</button>
                   <button onClick={() => setSearchMode('replace')} className={`px-2 py-1 rounded ${searchMode === 'replace' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400'}`}>替换</button>
                   <button onClick={() => setSearchMode('goto')} className={`px-2 py-1 rounded ${searchMode === 'goto' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400'}`}>跳转</button>
                 </div>
                 <button onClick={() => setShowSearchPanel(false)} className="text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300">
                   <X size={14} />
                 </button>
               </div>

               {searchMode === 'goto' ? (
                 <div className="flex gap-2">
                   <input 
                     type="number" 
                     value={goToLineNumber}
                     onChange={(e) => setGoToLineNumber(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleGoToLine()}
                     placeholder="行号..."
                     className="flex-1 px-2 py-1 text-sm border border-slate-300 dark:border-zinc-600 rounded bg-transparent text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-blue-500 dark:focus:border-yellow-500"
                     autoFocus
                   />
                   <button onClick={handleGoToLine} className="px-3 py-1 bg-blue-600 dark:bg-yellow-500 text-white dark:text-black text-sm rounded hover:bg-blue-700 dark:hover:bg-yellow-400">
                     跳转
                   </button>
                 </div>
               ) : (
                 <div className="flex flex-col gap-2">
                   <div className="relative">
                     <input 
                       type="text" 
                       value={searchText}
                       onChange={(e) => {
                         setSearchText(e.target.value);
                         performSearch(e.target.value);
                       }}
                       onKeyDown={(e) => {
                         if (e.key === 'Enter') {
                           if (e.shiftKey) handlePrevMatch();
                           else handleNextMatch();
                         }
                       }}
                       placeholder="查找..."
                       className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-zinc-600 rounded bg-transparent text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-blue-500 dark:focus:border-yellow-500 pr-16"
                       autoFocus
                     />
                     <div className="absolute right-1 top-1 flex items-center gap-1">
                       <span className="text-xs text-slate-400 dark:text-zinc-500">
                         {searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : '0/0'}
                       </span>
                       <button onClick={handlePrevMatch} className="p-0.5 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-500 dark:text-zinc-400">
                         <ArrowUp size={12} />
                       </button>
                       <button onClick={handleNextMatch} className="p-0.5 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-500 dark:text-zinc-400">
                         <ArrowDown size={12} />
                       </button>
                     </div>
                   </div>
                   
                   {searchMode === 'replace' && (
                     <div className="flex gap-2">
                       <input 
                         type="text" 
                         value={replaceText}
                         onChange={(e) => setReplaceText(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && handleReplace()}
                         placeholder="替换为..."
                         className="flex-1 px-2 py-1 text-sm border border-slate-300 dark:border-zinc-600 rounded bg-transparent text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-blue-500 dark:focus:border-yellow-500"
                       />
                       <button onClick={handleReplace} className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 rounded hover:bg-slate-200 dark:hover:bg-zinc-600" title="替换当前">
                         <Check size={14} />
                       </button>
                       <button onClick={handleReplaceAll} className="p-1.5 bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 rounded hover:bg-slate-200 dark:hover:bg-zinc-600" title="全部替换">
                         <Replace size={14} />
                       </button>
                     </div>
                   )}
                 </div>
               )}
             </div>
           )}

           <div className="flex-1 relative overflow-hidden flex">
                {/* Line Numbers with Breakpoints */}
                  <div ref={lineNumbersRef} className="line-numbers-col">
                   <div ref={lineNumbersInnerRef}>
                    {code.split('\n').map((_, i) => {
                      const bp = breakpoints[i];
                      const hasBreakpoint = !!bp;
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
                            <Circle size={10} className={`fill-current animate-pulse ${bp.type === 'CONDITIONAL' ? 'text-yellow-500' : 'text-red-500'}`} />
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
                      className="absolute z-50 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded shadow-xl overflow-hidden min-w-[120px]"
                      style={{ top: cursorPosition.top, left: cursorPosition.left }}
                    >
                      {suggestions.map((s, i) => (
                        <div 
                          key={s}
                          className={`px-2 py-1 text-xs font-mono cursor-pointer ${i === suggestionIndex ? 'bg-blue-600 dark:bg-yellow-500 text-white dark:text-black' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
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
           <div className="editor-toolbar glass-panel rounded-lg px-2 sm:px-4 py-2 mt-2 flex justify-between items-center gap-2">
              <div className="flex gap-1.5 sm:gap-3 items-center flex-1">
                <button 
                  onClick={handlePlayPause}
                  className={`
                    flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg font-bold transition-all duration-200 shadow-sm text-sm
                    ${isPlaying 
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30' 
                      : 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/30 hover:-translate-y-0.5'}
                  `}
                  title="F5"
                >
                   {isPlaying ? <><Pause size={16}/> <span className="hidden xl:inline">停止</span></> : <><Play size={16}/> <span className="hidden xl:inline">执行</span></>}
                </button>
                <button 
                  onClick={executeStep} 
                  disabled={isPlaying} 
                  className="p-1.5 sm:p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                  title="单步执行 (F10)"
                >
                   <StepForward size={18} />
                </button>
                <button 
                  onClick={stepBack} 
                  disabled={isPlaying || !canUndo} 
                  className="p-1.5 sm:p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                  title="回退一步"
                >
                   <Undo size={18} />
                </button>
                <button 
                  onClick={() => reload(code)} 
                  className="p-1.5 sm:p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors" 
                  title="重置"
                >
                   <RotateCcw size={18} />
                </button>
              </div>
              
              {/* 速度控制 - 小屏下拉框，大屏按钮组 */}
              <div className="shrink-0">
                {/* 大屏幕：按钮组 */}
                <div className="hidden xl:flex items-center gap-2 bg-slate-100 dark:bg-zinc-800/50 px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700">
                  <div className="px-2 text-slate-400 dark:text-zinc-500 shrink-0">
                    <Zap size={12} className="text-yellow-500"/>
                  </div>
                  <div className="flex gap-1">
                    {SPEED_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSpeed(opt.value)}
                        className={`speed-btn shrink-0 ${speed === opt.value ? 'active' : ''}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 小屏幕：自定义下拉选择框 */}
                <div className="flex xl:hidden items-center gap-1.5 bg-slate-100 dark:bg-zinc-800/50 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700">
                  <Zap size={14} className="text-yellow-500 shrink-0"/>
                  <div className="relative min-w-[6rem]" ref={speedDropdownRef}>
                    <button
                      type="button"
                      className={`speed-dropdown-trigger ${speedDropdownOpen ? 'open' : ''}`}
                      onClick={() => {
                        // compute position when opening so menu can be rendered fixed and avoid clipping
                        if (!speedDropdownOpen && speedDropdownRef.current) {
                          const rect = speedDropdownRef.current.getBoundingClientRect();
                          const left = Math.max(8, rect.left); // keep some margin
                          const width = rect.width;
                          const bottom = Math.max(8, window.innerHeight - rect.top + 8);
                          setSpeedDropdownCoords({ left, width, bottom });
                        }
                        setSpeedDropdownOpen(prev => !prev);
                      }}
                      aria-haspopup="listbox"
                      aria-expanded={speedDropdownOpen}
                    >
                      <span className="speed-dropdown-value">{currentSpeedLabel}</span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="transition-transform duration-200"
                      >
                        <path
                          d="M5 7.5L10 12.5L15 7.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    {speedDropdownOpen && (
                      speedDropdownCoords ? (
                        // Render menu into document.body using a portal to avoid clipping issues
                        createPortal(
                          <div
                            className="speed-dropdown-menu"
                            role="listbox"
                            ref={speedMenuRef}
                            style={{
                              position: 'fixed',
                              left: `${speedDropdownCoords.left}px`,
                              bottom: `${speedDropdownCoords.bottom}px`,
                              width: `${speedDropdownCoords.width}px`,
                              zIndex: 9999,
                              pointerEvents: 'auto'
                            }}
                          >
                            {SPEED_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                className={`speed-dropdown-option ${speed === opt.value ? 'active' : ''}`}
                                onClick={() => {
                                  setSpeed(opt.value);
                                  setSpeedDropdownOpen(false);
                                }}
                              >
                                <span>{opt.label}</span>
                                {speed === opt.value && <Check size={12} className="text-teal-500 dark:text-yellow-400"/>}
                              </button>
                            ))}
                          </div>,
                          document.body
                        )
                      ) : (
                        // Fallback: render inline if coords not ready
                        <div className="speed-dropdown-menu" role="listbox" ref={speedMenuRef}>
                          {SPEED_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              className={`speed-dropdown-option ${speed === opt.value ? 'active' : ''}`}
                              onClick={() => {
                                setSpeed(opt.value);
                                setSpeedDropdownOpen(false);
                              }}
                            >
                              <span>{opt.label}</span>
                              {speed === opt.value && <Check size={12} className="text-teal-500 dark:text-yellow-400"/>}
                            </button>
                          ))}
                        </div>
                      )
                    )}
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
                <div className="mobile-status-indicator"></div>
                <span className="mobile-status-text">当前指令 (IP: {pc.toString(16).padStart(4,'0').toUpperCase()}H)</span>
              </div>
              <div className="mobile-instruction-display">
                 {(() => {
                    const currentInst = parsedInstructions[pc];
                    if (currentInst && currentInst.type !== 'EMPTY' && currentInst.originalIndex !== undefined) {
                      const line = code.split('\n')[currentInst.originalIndex];
                      return highlightLine(line);
                    }
                    return <span className="text-slate-400 dark:text-zinc-600 italic">等待执行...</span>;
                 })()}
              </div>

              {/* Mobile Control Buttons */}
              <div className="flex gap-2 mt-1">
                <button 
                  onClick={handlePlayPause}
                  className={`mobile-btn-play ${isPlaying ? 'active' : 'inactive'}`}
                >
                   {isPlaying ? <><Pause size={14}/> 暂停</> : <><Play size={14}/> 运行</>}
                </button>
                <button 
                  onClick={executeStep} 
                  disabled={isPlaying} 
                  className="mobile-btn-secondary"
                >
                   <StepForward size={14} /> 单步
                </button>
                <button 
                  onClick={stepBack} 
                  disabled={isPlaying || !canUndo} 
                  className="mobile-btn-secondary"
                >
                   <Undo size={14} />
                </button>
                <button 
                  onClick={() => reload(code)} 
                  className="mobile-btn-icon"
                >
                   <RotateCcw size={14} />
                </button>
              </div>
           </div>

           {/* Top: Registers & State */}
           <div className={`registers-panel glass-panel rounded-lg p-4 flex flex-col gap-4 ${isMonitorCollapsed ? 'flex-1' : ''}`}>
              <div className="view-mode-toolbar flex justify-between items-center border-b border-slate-200 dark:border-zinc-700 pb-2">
                 <div className="flex gap-1 bg-slate-100 dark:bg-zinc-800/50 p-1 rounded-lg">
                    {[
                      { id: 'cpu', icon: Cpu, label: 'CPU' },
                      { id: 'memory', icon: Activity, label: 'MEM' },
                      { id: 'watch', icon: Eye, label: 'WATCH' },
                      { id: 'stack', icon: Layers, label: 'STACK' },
                      { id: 'breakpoints', icon: Circle, label: 'BREAK' }
                    ].map(mode => (
                      <button 
                          key={mode.id}
                          onClick={() => setViewMode(mode.id)}
                          className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all
                            ${viewMode === mode.id 
                              ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-yellow-400 shadow-sm' 
                              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-700/50'}
                          `}
                      >
                          <mode.icon size={14}/> <span className="hidden sm:inline">{mode.label}</span>
                      </button>
                    ))}
                 </div>
                 <div className="ip-badge font-mono text-xs font-bold bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                    IP: <span className="text-blue-600 dark:text-yellow-400">{pc.toString(16).padStart(4,'0').toUpperCase()}H</span>
                 </div>
              </div>
              
              {viewMode === 'cpu' ? (
                  <div className="space-y-5 pb-2 overflow-y-auto custom-scrollbar pr-1">
                    {/* General Purpose Registers */}
                    <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                        <div className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2 pl-1 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> 通用寄存器
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {['AX', 'BX', 'CX', 'DX'].map(reg => <RegisterCard key={reg} name={reg} val={registers[reg]} />)}
                        </div>
                    </div>

                    {/* Pointers & Index Registers */}
                    <div className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                        <div className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2 pl-1 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> 指针与变址
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {['SP', 'BP', 'SI', 'DI'].map(reg => <RegisterCard key={reg} name={reg} val={registers[reg]} />)}
                        </div>
                    </div>

                    {/* Segment Registers */}
                    <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <div className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2 pl-1 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div> 段寄存器
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {['CS', 'DS', 'SS', 'ES'].map(reg => <RegisterCard key={reg} name={reg} val={registers[reg]} />)}
                        </div>
                    </div>

                    {/* Flags Display */}
                    <div className="bg-slate-50/50 dark:bg-zinc-900/30 rounded-xl p-4 border border-slate-200 dark:border-zinc-800 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                        <div className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                           <Flag size={14}/> 标志寄存器 (FLAGS)
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
                                <div key={name} className="flex-1 min-w-[60px] bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-2 flex flex-col items-center gap-1 hover:border-blue-300 dark:hover:border-yellow-600/50 transition-all group shadow-sm" title={`${desc} Flag: ${flags[name]}`}>
                                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold">{name}</span>
                                    <span className={`text-xs font-mono font-bold ${flags[name] ? 'text-blue-600 dark:text-yellow-400' : 'text-slate-300 dark:text-zinc-600'}`}>
                                        {labels[flags[name] || 0]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                  </div>
              ) : viewMode === 'memory' ? (
                  <MemoryView memory={memory} setMemory={setMemory} sp={registers.SP} registers={registers} ds={registers.DS} />
              ) : viewMode === 'watch' ? (
                  <WatchWindow 
                    watchVariables={watchVariables} 
                    symbolTable={symbolTable} 
                    memory={memory} 
                    registers={registers}
                    ds={registers.DS}
                    onRemove={removeWatchVariable}
                    onAdd={addWatchVariable}
                  />
              ) : viewMode === 'breakpoints' ? (
                  <BreakpointsPanel 
                      breakpoints={breakpoints}
                      dataBreakpoints={dataBreakpoints}
                      onRemoveBreakpoint={removeBreakpoint}
                      onUpdateBreakpoint={updateBreakpoint}
                      onAddDataBreakpoint={addDataBreakpoint}
                      onRemoveDataBreakpoint={removeDataBreakpoint}
                      onToggleDataBreakpoint={toggleDataBreakpoint}
                  />
              ) : (
                  <CallStack callStack={callStack} />
              )}
           </div>

           {/* Bottom: Monitor - 可折叠 */}
           <div className={`monitor-section ${isMonitorCollapsed ? 'collapsed' : ''}`}>
              {/* Monitor 折叠控制栏 */}
              <div 
                className="monitor-collapse-bar"
                onClick={() => setIsMonitorCollapsed(!isMonitorCollapsed)}
              >
                <div className="flex items-center gap-2">
                  <MonitorIcon size={14} className="text-slate-500 dark:text-zinc-400" />
                  <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">显示器</span>
                  {isWaitingForInput && (
                    <span className="px-2 py-0.5 text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full animate-pulse">
                      等待输入
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 hidden sm:inline">
                    {isMonitorCollapsed ? '展开' : '折叠'} 显示器
                  </span>
                  {isMonitorCollapsed ? (
                    <ChevronUp size={16} className="text-slate-400 dark:text-zinc-500" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-400 dark:text-zinc-500" />
                  )}
                </div>
              </div>
              
              {/* Monitor 内容 */}
              <div className={`monitor-content ${isMonitorCollapsed ? 'hidden' : ''}`}>
                <AutoResizingContainer>
                  <Monitor 
                      videoMemory={videoMemory}
                      cursor={cursor}
                      isWaitingForInput={isWaitingForInput}
                      screenCols={screenCols}
                  />
                </AutoResizingContainer>
              </div>
           </div>

        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-nav-bar">
        <button 
          onClick={() => setMobileTab('editor')}
          className={`mobile-nav-btn ${mobileTab === 'editor' ? 'active' : 'inactive'}`}
        >
          <FileCode size={18} />
          <span className="text-[9px] font-medium">代码</span>
        </button>
        <button 
          onClick={() => setMobileTab('run')}
          className={`mobile-nav-btn ${mobileTab === 'run' ? 'active' : 'inactive'}`}
        >
          <MonitorIcon size={18} />
          <span className="text-[9px] font-medium">运行</span>
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
      
      {/* Input Indicator - 等待输入时显示提示 */}
      {isWaitingForInput && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-pulse">
              <Terminal size={20} className="animate-bounce" />
              <div className="flex flex-col">
                <span className="text-sm font-bold">等待输入</span>
                <span className="text-xs opacity-90">请输入大写字母 (A-Z)</span>
              </div>
          </div>
      )}
    </div>
  );
}