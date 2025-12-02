import React from 'react';
import { FileCode, Download } from 'lucide-react';
import { PRESET_PROGRAMS } from '../constants';

// 示例程序选择器
const ExamplesModal = ({ show, onClose, onSelect }) => {
  if (!show) return null;
  
  const examples = [
    { key: 'default', name: '综合演示', desc: '展示基础指令和屏幕控制', fileName: 'DEMO.ASM' },
    { key: 'clock_demo', name: '时钟程序', desc: '日期时间显示与键盘检测', fileName: 'CLOCK.ASM' },
    { key: 'loop_test', name: 'LOOP 测试', desc: '循环指令功能测试', fileName: 'LOOP.ASM' },
    { key: 'bubble_sort', name: '冒泡排序', desc: '数组排序算法演示', fileName: 'SORT.ASM' },
    { key: 'fibonacci', name: '斐波那契', desc: '递推数列计算', fileName: 'FIB.ASM' },
    { key: 'string_demo', name: '字符串处理', desc: '字符串反转示例', fileName: 'STRING.ASM' },
    { key: 'calculator', name: '简易计算器', desc: '四则运算演示', fileName: 'CALC.ASM' }
  ];
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-800 rounded-xl shadow-2xl border border-zinc-700 w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-zinc-700 flex justify-between items-center bg-zinc-900/50">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCode size={20} className="text-amber-400" />
            示例程序库
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
          {examples.map((ex) => (
            <button
              key={ex.key}
              onClick={() => { onSelect(PRESET_PROGRAMS[ex.key], ex.fileName); onClose(); }}
              className="flex items-start gap-3 p-3 rounded-lg bg-zinc-700/50 hover:bg-amber-600/20 border border-zinc-600 hover:border-amber-500/50 transition-all group text-left"
            >
              <div className="p-2 rounded-md bg-zinc-800 group-hover:bg-amber-500/20 text-amber-400 transition-colors">
                <FileCode size={20} />
              </div>
              <div>
                <div className="font-medium text-white group-hover:text-amber-300">{ex.name}</div>
                <div className="text-xs text-zinc-400 mt-1">{ex.desc}</div>
                <div className="text-[10px] text-zinc-500 mt-2 font-mono flex items-center gap-1">
                  <Download size={10} />
                  {ex.fileName}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-zinc-700 bg-zinc-900/30 text-xs text-zinc-400 text-center">
          选择一个示例程序以加载到编辑器中
        </div>
      </div>
    </div>
  );
};

export default ExamplesModal;
