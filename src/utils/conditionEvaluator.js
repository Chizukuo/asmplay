export const evaluateCondition = (condition, registers, flags) => {
  if (!condition || !condition.trim()) return false;
  
  try {
    let expr = condition.toUpperCase();
    
    // 1. 预处理：替换 1234H 格式为 0x1234
    expr = expr.replace(/\b([0-9A-F]+)H\b/g, '0x$1');
    
    // 2. 替换寄存器值
    const regNames = ['AX', 'BX', 'CX', 'DX', 'SI', 'DI', 'SP', 'BP', 'IP', 'CS', 'DS', 'SS', 'ES'];
    const reg8Names = ['AH', 'AL', 'BH', 'BL', 'CH', 'CL', 'DH', 'DL'];
    
    // 先替换 8 位寄存器 (避免 AH 匹配 AX 中的 A) - 其实正则 \b 可以解决
    reg8Names.forEach(reg => {
        const parent = reg[0] + 'X';
        const parentVal = registers[parent] || 0;
        const val = reg[1] === 'H' ? (parentVal >> 8) & 0xFF : parentVal & 0xFF;
        expr = expr.replace(new RegExp(`\\b${reg}\\b`, 'g'), val);
    });

    regNames.forEach(reg => {
        const val = registers[reg] !== undefined ? registers[reg] : 0;
        expr = expr.replace(new RegExp(`\\b${reg}\\b`, 'g'), val);
    });
    
    // 3. 替换标志位
    const flagNames = ['ZF', 'SF', 'CF', 'OF', 'PF', 'AF'];
    flagNames.forEach(f => {
        const val = flags[f] !== undefined ? flags[f] : 0;
        expr = expr.replace(new RegExp(`\\b${f}\\b`, 'g'), val);
    });
    
    // 4. 处理单等号 (用户可能输入 CX = 10)
    // 将 = 替换为 ==，但忽略 ==, !=, >=, <=
    // 这是一个简化的处理，可能不完美
    // 策略：先拆分 token，再重组
    // 或者简单地，如果包含 = 且不包含 ==, !=, >=, <=，则替换
    // 让我们使用一个简单的正则替换：把所有 = 变成 ==，然后把 ==== 变 ==，!== 变 != 等等... 不太好
    // 更好的方法：只支持 JS 语法，或者在 UI 提示用户使用 ==
    // 这里尝试做一个简单的替换： (?<![=<>!])=(?![=]) -> ==
    // JS 正则支持后行断言 (Lookbehind) 在现代浏览器中
    try {
        expr = expr.replace(/(?<![=<>!])=(?![=])/g, '==');
    } catch (e) {
        // Fallback for environments without lookbehind support
    }

    // 5. 安全检查：只允许数字、运算符、括号
    if (!/^[0-9xX\s+\-*/%&|^()=<>!]+$/.test(expr)) {
        // console.warn("Invalid characters in condition:", condition);
        return false;
    }
    
    // 6. 执行
    // eslint-disable-next-line no-new-func
    return new Function(`return (${expr})`)();
    
  } catch (e) {
    console.error("Condition evaluation error:", e);
    return false;
  }
};
