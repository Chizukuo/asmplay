import React, { useRef, useState, useLayoutEffect } from 'react';

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
          width: '100%',
          maxWidth: '1024px', // Limit max width to prevent excessive stretching on large screens
          height: 'auto'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default AutoResizingContainer;
