export const evaluateExpression = (expr, registers, memory, symbolTable, ds = registers.DS) => {
  if (!expr || !expr.trim()) return { value: 0, error: 'Empty expression' };

  try {
    let processedExpr = expr.toUpperCase().trim();

    // 1. 预处理：替换 1234H 格式为 0x1234
    processedExpr = processedExpr.replace(/\b([0-9A-F]+)H\b/g, '0x$1');

    // 2. 替换符号表中的变量 (替换为偏移地址)
    // 按长度降序排序，防止前缀匹配问题 (e.g. VAR1 vs VAR)
    const sortedSymbols = Object.keys(symbolTable).sort((a, b) => b.length - a.length);
    for (const sym of sortedSymbols) {
        // 使用正则确保全字匹配
        const regex = new RegExp(`\\b${sym}\\b`, 'g');
        if (regex.test(processedExpr)) {
            processedExpr = processedExpr.replace(regex, symbolTable[sym]);
        }
    }

    // 3. 替换寄存器值
    const regNames = ['AX', 'BX', 'CX', 'DX', 'SI', 'DI', 'SP', 'BP', 'IP', 'CS', 'DS', 'SS', 'ES'];
    const reg8Names = ['AH', 'AL', 'BH', 'BL', 'CH', 'CL', 'DH', 'DL'];

    reg8Names.forEach(reg => {
        const parent = reg[0] + 'X';
        const parentVal = registers[parent] || 0;
        const val = reg[1] === 'H' ? (parentVal >> 8) & 0xFF : parentVal & 0xFF;
        processedExpr = processedExpr.replace(new RegExp(`\\b${reg}\\b`, 'g'), val);
    });

    regNames.forEach(reg => {
        const val = registers[reg] !== undefined ? registers[reg] : 0;
        processedExpr = processedExpr.replace(new RegExp(`\\b${reg}\\b`, 'g'), val);
    });

    // 4. 处理内存访问 [...]
    // 循环处理直到没有方括号
    while (processedExpr.includes('[')) {
        // 匹配最内层的方括号
        const match = processedExpr.match(/\[([^\[\]]+)\]/);
        if (!match) break;

        const innerExpr = match[1];
        // 计算地址
        // eslint-disable-next-line no-new-func
        const addrVal = new Function(`return (${innerExpr})`)();
        
        // 读取内存 (默认读取 Word)
        const offset = addrVal & 0xFFFF;
        const physAddr = ((ds << 4) + offset) & 0xFFFFF;
        
        let memVal = 0;
        if (physAddr < memory.length - 1) {
            memVal = memory[physAddr] | (memory[physAddr + 1] << 8);
        }
        
        // 替换
        processedExpr = processedExpr.replace(match[0], memVal);
    }

    // 5. 最终计算
    // 安全检查：只允许数字、运算符、括号
    if (!/^[0-9xX\s+\-*/%&|^()~]+$/.test(processedExpr)) {
         return { value: 0, error: 'Invalid characters' };
    }

    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${processedExpr})`)();
    
    // 强制转换为 16 位整数 (模拟 Word 运算结果)
    // 但如果是地址计算，可能需要保留
    // 这里我们返回原始结果，由 UI 决定如何显示
    return { value: Math.floor(result), error: null };

  } catch (e) {
    return { value: 0, error: e.message };
  }
};
