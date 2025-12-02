import React from 'react';
import { FileCode, Download, X, ChevronRight } from 'lucide-react';
import { PRESET_PROGRAMS } from '../constants';

// 示例程序选择器
const ExamplesModal = ({ show, onClose, onSelect }) => {
  if (!show) return null;
  
  const examples = [
    { key: 'default', name: '综合演示', desc: '展示基础指令和屏幕控制', fileName: 'DEMO.ASM', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'group-hover:border-blue-500/50' },
    { key: 'clock_demo', name: '时钟程序', desc: '日期时间显示与键盘检测', fileName: 'CLOCK.ASM', color: 'text-green-400', bg: 'bg-green-500/10', border: 'group-hover:border-green-500/50' },
    { key: 'loop_test', name: 'LOOP 测试', desc: '循环指令功能测试', fileName: 'LOOP.ASM', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'group-hover:border-purple-500/50' },
    { key: 'bubble_sort', name: '冒泡排序', desc: '数组排序算法演示', fileName: 'SORT.ASM', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'group-hover:border-orange-500/50' },
    { key: 'fibonacci', name: '斐波那契', desc: '递推数列计算', fileName: 'FIB.ASM', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'group-hover:border-pink-500/50' },
    { key: 'string_demo', name: '字符串处理', desc: '字符串反转示例', fileName: 'STRING.ASM', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'group-hover:border-cyan-500/50' },
    { key: 'calculator', name: '简易计算器', desc: '四则运算演示', fileName: 'CALC.ASM', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'group-hover:border-yellow-500/50' },
    { key: 'string_instructions_test', name: '串指令测试', desc: 'MOVSB/STOSB等指令测试', fileName: 'STR_TEST.ASM', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'group-hover:border-indigo-500/50' }
  ];
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm transition-opacity duration-300" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 w-full max-w-3xl overflow-hidden animate-scale-in transform transition-all" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50 backdrop-blur-md">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileCode size={24} className="text-blue-500 dark:text-amber-400" />
              示例程序库
            </h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">选择一个预设程序开始学习汇编语言</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {examples.map((ex) => (
            <button
              key={ex.key}
              onClick={() => { onSelect(PRESET_PROGRAMS[ex.key], ex.fileName); onClose(); }}
              className={`flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group text-left ${ex.border}`}
            >
              <div className={`p-3 rounded-lg ${ex.bg} ${ex.color} transition-colors`}>
                <FileCode size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-amber-400 transition-colors truncate">
                    {ex.name}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 dark:text-zinc-600 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="text-sm text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">{ex.desc}</div>
                <div className="text-[10px] text-gray-400 dark:text-zinc-500 mt-3 font-mono flex items-center gap-1.5 bg-gray-200/50 dark:bg-black/20 w-fit px-2 py-1 rounded-md">
                  <Download size={10} />
                  {ex.fileName}
                </div>
              </div>
            </button>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/30 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamplesModal;
