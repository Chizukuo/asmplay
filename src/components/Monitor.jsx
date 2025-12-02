import React, { useRef, useEffect, useState } from 'react';
import { SCREEN_ROWS, SCREEN_COLS, DOS_PALETTE } from '../constants';
import { getCharFromCode } from '../utils/displayUtils';

const CHAR_WIDTH = 12;  // 字符宽
const CHAR_HEIGHT = 24; // 字符高
const DEFAULT_CANVAS_HEIGHT = SCREEN_ROWS * CHAR_HEIGHT; // 400

const Monitor = ({ videoMemory, cursor, isWaitingForInput, screenCols = SCREEN_COLS }) => {
  const canvasRef = useRef(null);
  const [mousePos, setMousePos] = useState(null);
  const blinkRef = useRef(false);
  const requestRef = useRef();
  const lastTimeRef = useRef(0);

  // Ensure screenCols is valid
  const validScreenCols = Number.isFinite(screenCols) && screenCols > 0 ? screenCols : SCREEN_COLS;
  const canvasWidth = validScreenCols * CHAR_WIDTH;
  const canvasHeight = DEFAULT_CANVAS_HEIGHT;

  // 引入字体
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const render = (time) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    
    // 500ms 闪烁周期
    if (time - lastTimeRef.current > 500) {
      blinkRef.current = !blinkRef.current;
      lastTimeRef.current = time;
    }

    try {
      // 绘制背景
      ctx.fillStyle = '#0c0c0c'; // 更现代的深色背景
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // 设置字体 - 使用稍微小一点的字号以留出呼吸空间
      const fontSize = CHAR_HEIGHT - 4;
      ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
      ctx.textBaseline = 'middle'; // 改为 middle 对齐更容易垂直居中

      if (videoMemory && videoMemory.length > 0) {
        for (let r = 0; r < SCREEN_ROWS; r++) {
          for (let c = 0; c < validScreenCols; c++) {
            const offset = (r * validScreenCols + c) * 2;
            // Boundary check
            if (offset + 1 >= videoMemory.length) continue;

            const charCode = videoMemory[offset];
            const attr = videoMemory[offset + 1];

            // 使用 CP437 字符映射
            const char = getCharFromCode(charCode);
            
            // 解析属性
            const isBlink = (attr & 0x80) !== 0;
            const bgIndex = (attr & 0x70) >> 4;
            const fgIndex = (attr & 0x0F); 

            let fgColor = DOS_PALETTE[fgIndex] || DOS_PALETTE[7];
            let bgColor = DOS_PALETTE[bgIndex] || DOS_PALETTE[0];

            // 绘制背景块
            // 如果背景是黑色(索引0)，使用我们自定义的深色背景，否则使用调色板颜色
            if (bgIndex !== 0) {
                ctx.fillStyle = `rgb(${bgColor[0]}, ${bgColor[1]}, ${bgColor[2]})`;
                ctx.fillRect(c * CHAR_WIDTH, r * CHAR_HEIGHT, CHAR_WIDTH, CHAR_HEIGHT);
            }

            // 绘制字符
            if (!isBlink || blinkRef.current) {
              const colorStr = `rgb(${fgColor[0]}, ${fgColor[1]}, ${fgColor[2]})`;
              ctx.fillStyle = colorStr;
              
              // 添加发光效果
              ctx.shadowBlur = 4;
              ctx.shadowColor = colorStr;
              
              // 垂直居中绘制
              ctx.fillText(char, c * CHAR_WIDTH + (CHAR_WIDTH - ctx.measureText(char).width) / 2, r * CHAR_HEIGHT + CHAR_HEIGHT / 2);
              
              // 重置阴影以避免影响背景绘制（虽然这里是循环末尾，但为了保险）
              ctx.shadowBlur = 0;
            }
          }
        }
      }

      // 绘制光标 (块状光标，半透明)
      if (cursor && (!isWaitingForInput || blinkRef.current)) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; 
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(cursor.c * CHAR_WIDTH, cursor.r * CHAR_HEIGHT + CHAR_HEIGHT - 4, CHAR_WIDTH, 3); 
        ctx.shadowBlur = 0;
      }
    } catch (e) {
      console.error("Monitor render error:", e);
    }

    requestRef.current = requestAnimationFrame(render);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, [videoMemory, cursor, isWaitingForInput, validScreenCols]);

  const handleMouseMove = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const c = Math.floor(x / CHAR_WIDTH);
    const r = Math.floor(y / CHAR_HEIGHT);
    
    if (c >= 0 && c < validScreenCols && r >= 0 && r < SCREEN_ROWS) {
      setMousePos({ r, c });
    } else {
      setMousePos(null);
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto select-none flex flex-col gap-2">
      {/* Modern Screen Container */}
      <div className="relative bg-[#0c0c0c] rounded-xl overflow-hidden shadow-2xl border border-gray-800 ring-1 ring-white/10">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/5 to-transparent opacity-50"></div>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="w-full h-auto block relative z-10"
          style={{ 
            aspectRatio: `${canvasWidth}/${canvasHeight}`,
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setMousePos(null)}
        />
      </div>

      {/* Modern Status Bar */}
      <div className="flex justify-between items-center px-3 py-2 bg-white dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${isWaitingForInput ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {isWaitingForInput ? 'Waiting for Input' : 'Running'}
            </span>
          </div>
          
          <div className="h-3 w-[1px] bg-gray-300 dark:bg-gray-700"></div>

          <span className="text-xs text-gray-500 dark:text-gray-500 font-mono">{validScreenCols}x25 TEXT</span>
        </div>

        <div className="text-xs font-mono text-gray-500 dark:text-gray-500">
           {mousePos ? `Ln ${mousePos.r}, Col ${mousePos.c}` : 'Ready'}
        </div>
      </div>
    </div>
  );
};

export default Monitor;
