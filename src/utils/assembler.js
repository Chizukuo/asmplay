import { MEMORY_SIZE } from '../constants';

export const getReg = (name, currentRegs) => {
  const regMap = {
    'AX': () => currentRegs.AX, 'BX': () => currentRegs.BX, 'CX': () => currentRegs.CX, 'DX': () => currentRegs.DX,
    'AH': () => (currentRegs.AX & 0xFF00) >> 8, 'AL': () => currentRegs.AX & 0x00FF,
    'BH': () => (currentRegs.BX & 0xFF00) >> 8, 'BL': () => currentRegs.BX & 0x00FF,
    'CH': () => (currentRegs.CX & 0xFF00) >> 8, 'CL': () => currentRegs.CX & 0x00FF,
    'DH': () => (currentRegs.DX & 0xFF00) >> 8, 'DL': () => currentRegs.DX & 0x00FF,
    'SP': () => currentRegs.SP, 'BP': () => currentRegs.BP, 'SI': () => currentRegs.SI, 'DI': () => currentRegs.DI,
    'CS': () => currentRegs.CS, 'DS': () => currentRegs.DS, 'SS': () => currentRegs.SS, 'ES': () => currentRegs.ES,
    'IP': () => currentRegs.IP, // Although IP is usually internal, we can expose it for read
  };
  if (regMap[name]) return regMap[name]();
  throw new Error(`未知寄存器: ${name}`);
};

export const setReg = (name, val, currentRegs) => {
  const newRegs = { ...currentRegs };
  val = val & 0xFFFF; 
  const val8 = val & 0xFF;

  if (['AX', 'BX', 'CX', 'DX', 'SP', 'BP', 'SI', 'DI', 'CS', 'DS', 'SS', 'ES', 'IP'].includes(name)) {
    newRegs[name] = val;
  } else if (name === 'AH') newRegs.AX = (newRegs.AX & 0x00FF) | (val8 << 8);
  else if (name === 'AL') newRegs.AX = (newRegs.AX & 0xFF00) | val8;
  else if (name === 'BH') newRegs.BX = (newRegs.BX & 0x00FF) | (val8 << 8);
  else if (name === 'BL') newRegs.BX = (newRegs.BX & 0xFF00) | val8;
  else if (name === 'CH') newRegs.CX = (newRegs.CX & 0x00FF) | (val8 << 8);
  else if (name === 'CL') newRegs.CX = (newRegs.CX & 0xFF00) | val8;
  else if (name === 'DH') newRegs.DX = (newRegs.DX & 0x00FF) | (val8 << 8);
  else if (name === 'DL') newRegs.DX = (newRegs.DX & 0xFF00) | val8;
  else throw new Error(`无法设置寄存器: ${name}`);
  
  return newRegs;
};

export const parseCode = (code) => {
  const lines = (code || '').split('\n');
  let instructions = [];
  let dataMap = {}; 
  let labelMap = {};
  // 采用简化的 DOS 风格段基址；dataMap 存储相对于 DS:0000 的偏移
  const DS_SEGMENT = 0x04E0;
  const CS_SEGMENT = 0x04B0;
  const SS_SEGMENT = 0x0500;
  const ES_SEGMENT = 0x04E0;
  const DATA_SEGMENT_BASE = DS_SEGMENT << 4; // 0x04E00
  let currentMemIndex = DATA_SEGMENT_BASE;
  let currentDataOffset = 0; // 段内偏移量计数器
  let newMemory = new Uint8Array(MEMORY_SIZE);
  let inDataSegment = false;
  let inCodeSegment = false;
  
  // 存储自定义段名到段地址（如 DATA -> DS_SEGMENT）
  let segmentNames = {};

  // Pass 1: Data Segment Processing
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].split(';')[0].trim().toUpperCase();
    if (!line) continue;

    // 识别段定义并记录段名
    // 支持任意段名，如 DATA1 SEGMENT
    const segmentMatch = line.match(/^(\w+)\s+SEGMENT/i);
    if (segmentMatch) {
      const segName = segmentMatch[1];
      
      // 记录段地址映射
      if (segName.includes('CODE')) segmentNames[segName] = CS_SEGMENT;
      else if (segName.includes('STACK')) segmentNames[segName] = SS_SEGMENT;
      else segmentNames[segName] = DS_SEGMENT; // 默认其他段为数据段

      // 判断是否进入数据段处理模式
      // 只要段名不包含 CODE，我们就认为它是数据段，允许定义数据
      if (!segName.includes('CODE')) {
          inDataSegment = true;
          inCodeSegment = false;
      } else {
          inDataSegment = false;
          inCodeSegment = true;
      }
      continue;
    }

    if (line.endsWith('ENDS')) {
        inDataSegment = false;
        inCodeSegment = false;
        continue;
    }
    
    if (inDataSegment) {
      const parts = line.split(/\s+/);
      let type = parts[1]; // Default: Label Type Value
      let varName = parts[0];
      let valueStartIndex = 0;

      // Check if the first part is the type (no label)
      if (['DB', 'DW', 'DD'].includes(parts[0])) {
          type = parts[0];
          varName = null; // No label
          // Reconstruct the line without the type to find values
          // But we need to be careful about parsing.
          // valueStr logic below uses indexOf(type).
      } else if (!['DB', 'DW', 'DD'].includes(type)) {
          // Not a data definition we recognize, or maybe a label on a separate line?
          // For now, ignore if not DB/DW/DD
          continue;
      }
      
      if (['DB', 'DW', 'DD'].includes(type)) {
          if (varName) {
              // 存储相对于DS:0000的偏移量，而非物理地址
              dataMap[varName] = currentDataOffset;
          }
          
          // Extract the value part: everything after the type
          // We need to find the type in the line to split correctly
          // Use regex to find type surrounded by spaces or at start/end
          const typeIndex = line.search(new RegExp(`\\b${type}\\b`));
          let valueStr = line.substring(typeIndex + type.length).trim();
          
          let values = [];
          
          // Helper to parse a single value item (number, string, or ?)
          const parseItem = (item) => {
              item = item.trim();
              if (item === '?') return [0];
              if (item.startsWith("'") && item.endsWith("'")) {
                  const str = item.slice(1, -1);
                  return str.split('').map(x => x.charCodeAt(0));
              }
              const num = item.endsWith('H') ? parseInt(item.slice(0, -1), 16) : parseInt(item);
              return isNaN(num) ? [0] : [num];
          };

          // Smart split by comma, ignoring commas inside quotes or parentheses
          let valueParts = [];
          let currentPart = '';
          let inQuote = false;
          let parenDepth = 0;
          
          for (let k = 0; k < valueStr.length; k++) {
              const char = valueStr[k];
              if (char === "'" && !inQuote) inQuote = true;
              else if (char === "'" && inQuote) inQuote = false;
              else if (char === '(' && !inQuote) parenDepth++;
              else if (char === ')' && !inQuote) parenDepth--;
              
              if (char === ',' && !inQuote && parenDepth === 0) {
                  valueParts.push(currentPart.trim());
                  currentPart = '';
              } else {
                  currentPart += char;
              }
          }
          if (currentPart.trim()) valueParts.push(currentPart.trim());

          // Process each part
          valueParts.forEach(part => {
              if (part.includes('DUP')) {
                  // Handle DUP: count DUP (val)
                  const dupIdx = part.indexOf('DUP');
                  const countStr = part.substring(0, dupIdx).trim();
                  let valContent = part.substring(dupIdx + 3).trim();
                  
                  const count = parseInt(countStr);
                  if (isNaN(count)) return;

                  // Remove outer parens if present
                  if (valContent.startsWith('(') && valContent.endsWith(')')) {
                      valContent = valContent.slice(1, -1);
                  }
                  
                  const itemValues = parseItem(valContent);
                  for (let c = 0; c < count; c++) {
                      values.push(...itemValues);
                  }
              } else {
                  values.push(...parseItem(part));
              }
          });

          // Write to memory
          values.forEach(val => {
              if (currentMemIndex < MEMORY_SIZE) {
                  if (type === 'DB') {
                      newMemory[currentMemIndex++] = val & 0xFF;
                      currentDataOffset++;
                  } else if (type === 'DW') {
                      newMemory[currentMemIndex++] = val & 0xFF;
                      newMemory[currentMemIndex++] = (val >> 8) & 0xFF;
                      currentDataOffset += 2;
                  } else if (type === 'DD') {
                      newMemory[currentMemIndex++] = val & 0xFF;
                      newMemory[currentMemIndex++] = (val >> 8) & 0xFF;
                      newMemory[currentMemIndex++] = (val >> 16) & 0xFF;
                      newMemory[currentMemIndex++] = (val >> 24) & 0xFF;
                      currentDataOffset += 4;
                  }
              }
          });
      }
    }
  }

  const dataSize = currentMemIndex - DATA_SEGMENT_BASE;

  // 不要将段名添加到 dataMap，而是单独返回，以免与变量混淆
  // Object.assign(dataMap, segmentNames);

  // Pass 2: Code Generation & Label Collection
  inCodeSegment = false;
  inDataSegment = false;
  
  // 代码段基址（简化示例）
  const CODE_SEGMENT_BASE = 0x04B00;
  let codeMemIndex = CODE_SEGMENT_BASE;
  const instructionAddresses = []; // 存储每条指令的物理地址
  const instructionOffsets = []; // 存储每条指令相对于CS的偏移
  
  for (let i = 0; i < lines.length; i++) {
    let rawLine = lines[i];
    // 分离注释
    let line = rawLine.split(';')[0].trim().toUpperCase();
    
    // 忽略段定义、结束标记、ASSUME等伪指令
    if (!line || line.includes('SEGMENT') || line.endsWith('ENDS') || line.includes('END START') || line.includes('ASSUME')) {
      instructions.push({ type: 'EMPTY', originalIndex: i, raw: rawLine });
      continue;
    }

    // 忽略数据定义（已经在 Pass 1 处理过）
    // 注意：MOV AX, DB 这样的指令不应该被忽略，但 DB 定义应该被忽略
    // 简单的检查：如果行以 DB/DW/DD 开头（前面可能有标签），或者是 "VAR DB ..." 格式
    // 这里我们假设数据定义包含 DB/DW/DD 且不包含 MOV/ADD 等指令
    if ((line.includes(' DB ') || line.includes(' DW ') || line.includes(' DD ')) && !line.includes('MOV')) {
        instructions.push({ type: 'EMPTY', originalIndex: i, raw: rawLine });
        continue;
    }
    
    // 处理 PROC 定义（过程标签）
    if (line.includes('PROC')) {
        const procIdx = line.indexOf('PROC');
        const labelName = line.substring(0, procIdx).trim();
        if (labelName) {
            labelMap[labelName] = instructions.length;
        }
        instructions.push({ type: 'EMPTY', originalIndex: i, raw: rawLine });
        continue;
    }
    
    // 处理 ENDP（过程结束）
    if (line.includes('ENDP')) {
        instructions.push({ type: 'EMPTY', originalIndex: i, raw: rawLine });
        continue;
    }
    
    // 处理标签（标签后可能有指令）
    if (line.includes(':')) {
        const colonIdx = line.indexOf(':');
        const labelName = line.substring(0, colonIdx).trim();
        // 标签指向当前在 instructions 数组中的位置（包含空行的索引）
        labelMap[labelName] = instructions.length;
        
        const remaining = line.substring(colonIdx + 1).trim();
        if (!remaining) {
            instructions.push({ type: 'EMPTY', originalIndex: i, raw: rawLine });
            continue;
        }
        line = remaining; // 处理标签后的指令部分
    }

    // 改进的指令解析
    const firstSpaceIdx = line.indexOf(' ');
    let op, argsStr;
    if (firstSpaceIdx === -1) {
        op = line;
        argsStr = "";
    } else {
        op = line.substring(0, firstSpaceIdx).trim();
        argsStr = line.substring(firstSpaceIdx).trim();
    }
    
    // 分割参数：处理方括号内的逗号
    let args = [];
    if (argsStr) {
        let bracketDepth = 0;
        let currentArg = '';
        for (let j = 0; j < argsStr.length; j++) {
            const char = argsStr[j];
            if (char === '[') bracketDepth++;
            else if (char === ']') bracketDepth--;
            else if (char === ',' && bracketDepth === 0) {
                args.push(currentArg.trim());
                currentArg = '';
                continue;
            }
            currentArg += char;
        }
        if (currentArg.trim()) args.push(currentArg.trim());
    }
    
    instructions.push({ type: 'CMD', op, args, originalIndex: i, raw: rawLine });
  }

  // Pass 3: 生成伪机器码并写入 CS 段
  for (let i = 0; i < instructions.length; i++) {
    const inst = instructions[i];
    if (inst.type === 'CMD' && codeMemIndex < MEMORY_SIZE) {
      // 记录指令物理地址和CS段内偏移
      instructionAddresses[i] = codeMemIndex;
      instructionOffsets[i] = codeMemIndex - CODE_SEGMENT_BASE;
      
      // 生成伪机器码（简化版）
      const pseudoCode = generatePseudoMachineCode(inst.op, inst.args);
      
      // 写入内存
      for (let j = 0; j < pseudoCode.length && codeMemIndex < MEMORY_SIZE; j++) {
        newMemory[codeMemIndex++] = pseudoCode[j];
      }
    } else {
      instructionAddresses[i] = codeMemIndex;
      instructionOffsets[i] = codeMemIndex - CODE_SEGMENT_BASE;
    }
  }

  return { newMemory, dataMap, labelMap, instructions, dataSize, instructionAddresses, instructionOffsets, segmentNames };
};

// 生成伪机器码（用于内存视图显示）
function generatePseudoMachineCode(op, args) {
  const bytes = [];
  
  // 操作码映射（简化版，用于视觉识别）
  const opcodeMap = {
    'MOV': 0x8B, 'ADD': 0x03, 'SUB': 0x2B, 'MUL': 0xF7, 'DIV': 0xF7,
    'INC': 0xFF, 'DEC': 0xFF, 'AND': 0x23, 'OR': 0x0B, 'XOR': 0x33,
    'CMP': 0x3B, 'TEST': 0x85, 'NOT': 0xF7, 'NEG': 0xF7,
    'JMP': 0xEB, 'JZ': 0x74, 'JNZ': 0x75, 'JE': 0x74, 'JNE': 0x75,
    'JG': 0x7F, 'JL': 0x7C, 'JGE': 0x7D, 'JLE': 0x7E,
    'JA': 0x77, 'JB': 0x72, 'JAE': 0x73, 'JBE': 0x76,
    'JC': 0x72, 'JNC': 0x73, 'JS': 0x78, 'JNS': 0x79,
    'JO': 0x70, 'JNO': 0x71, 'JP': 0x7A, 'JNP': 0x7B,
    'CALL': 0xE8, 'RET': 0xC3, 'PUSH': 0x50, 'POP': 0x58,
    'INT': 0xCD, 'NOP': 0x90, 'LOOP': 0xE2,
    'SHL': 0xD3, 'SHR': 0xD3, 'ROL': 0xD3, 'ROR': 0xD3,
    'RCL': 0xD3, 'RCR': 0xD3, 'LEA': 0x8D, 'XCHG': 0x87,
    'CLC': 0xF8, 'STC': 0xF9, 'CMC': 0xF5, 'CLD': 0xFC, 'STD': 0xFD,
    'ADC': 0x13, 'SBB': 0x1B
  };
  
  // 操作码
  const opcode = opcodeMap[op] || 0x90; // 默认 NOP
  bytes.push(opcode);
  
  // ModR/M 字节（如果有操作数）
  if (args && args.length > 0) {
    // 简化：为有操作数的指令添加 ModR/M 字节
    bytes.push(0xC0); // 假设寄存器到寄存器模式
    
    // 对于有立即数或地址的指令，添加额外字节
    const arg0 = args[0] || '';
    const arg1 = args[1] || '';
    
    // 检查是否有立即数
    const hasImmediate = arg1.match(/[0-9A-F]+H?$/i) || 
                         arg1.includes('OFFSET') ||
                         (args.length === 1 && (op === 'PUSH' || op === 'POP'));
    
    if (hasImmediate || op === 'MOV' || op === 'ADD' || op === 'SUB') {
      // 添加立即数或地址（2字节，小端序）
      bytes.push(0x00);
      bytes.push(0x00);
    }
    
    // INT 指令需要中断向量
    if (op === 'INT') {
      bytes[1] = parseInt(arg0.replace('H', ''), 16) || 0x21;
    }
    
    // CALL/JMP 等需要地址
    if (['CALL', 'JMP', 'JZ', 'JNZ', 'JE', 'JNE', 'LOOP'].includes(op)) {
      bytes.push(0x00); // 偏移量低字节
      if (op === 'CALL' || op === 'JMP') {
        bytes.push(0x00); // 偏移量高字节
      }
    }
  }
  
  return bytes;
}
