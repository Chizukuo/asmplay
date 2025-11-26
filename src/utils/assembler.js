import { MEMORY_SIZE } from '../constants';

export const getReg = (name, currentRegs) => {
  const regMap = {
    'AX': () => currentRegs.AX, 'BX': () => currentRegs.BX, 'CX': () => currentRegs.CX, 'DX': () => currentRegs.DX,
    'AH': () => (currentRegs.AX & 0xFF00) >> 8, 'AL': () => currentRegs.AX & 0x00FF,
    'BH': () => (currentRegs.BX & 0xFF00) >> 8, 'BL': () => currentRegs.BX & 0x00FF,
    'CH': () => (currentRegs.CX & 0xFF00) >> 8, 'CL': () => currentRegs.CX & 0x00FF,
    'DH': () => (currentRegs.DX & 0xFF00) >> 8, 'DL': () => currentRegs.DX & 0x00FF,
    'SP': () => currentRegs.SP, 'BP': () => currentRegs.BP, 'SI': () => currentRegs.SI, 'DI': () => currentRegs.DI,
  };
  if (regMap[name]) return regMap[name]();
  throw new Error(`未知寄存器: ${name}`);
};

export const setReg = (name, val, currentRegs) => {
  const newRegs = { ...currentRegs };
  val = val & 0xFFFF; 
  const val8 = val & 0xFF;

  if (['AX', 'BX', 'CX', 'DX', 'SP', 'BP', 'SI', 'DI'].includes(name)) {
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
  let currentMemIndex = 0;
  let newMemory = Array(MEMORY_SIZE).fill(0);
  let inDataSegment = false;
  let inCodeSegment = false;

  // Pass 1: Data Segment Processing
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].split(';')[0].trim().toUpperCase();
    if (!line) continue;

    if (line.includes('DATA SEGMENT')) { inDataSegment = true; inCodeSegment = false; continue; }
    if (line.includes('DATA ENDS')) { inDataSegment = false; continue; }
    if (line.includes('CODE SEGMENT')) { inCodeSegment = true; inDataSegment = false; continue; }
    if (line.includes('CODE ENDS')) { inCodeSegment = false; continue; }
    
    if (inDataSegment) {
      const parts = line.split(/\s+/);
      const type = parts[1]; // DB, DW, DD
      
      if (['DB', 'DW', 'DD'].includes(type)) {
          const varName = parts[0];
          dataMap[varName] = currentMemIndex;
          
          // Extract the value part: everything after the type
          let valueStr = line.substring(line.indexOf(type) + type.length).trim();
          
          // Handle DUP (e.g., 10 DUP(0))
          let count = 1;
          let values = [];
          
          if (valueStr.includes('DUP')) {
             const dupParts = valueStr.split('DUP');
             count = parseInt(dupParts[0].trim());
             let valContent = dupParts[1].trim();
             // Remove parens ( )
             if (valContent.startsWith('(') && valContent.endsWith(')')) {
                 valContent = valContent.slice(1, -1);
             }
             // Check if string or number
             if (valContent.startsWith("'") && valContent.endsWith("'")) {
                 const str = valContent.slice(1, -1);
                 for(let c=0; c<count; c++) values.push(...str.split('').map(x => x.charCodeAt(0)));
             } else {
                 const num = valContent === '?' ? 0 : (valContent.endsWith('H') ? parseInt(valContent.slice(0, -1), 16) : parseInt(valContent));
                 for(let c=0; c<count; c++) values.push(num);
             }
          } else {
              const rawStrMatch = line.match(/'([^']*)'/);
              if (rawStrMatch) {
                  const str = rawStrMatch[1];
                  for (let k = 0; k < str.length; k++) {
                      values.push(str.charCodeAt(k));
                  }
              } else {
                  const valParts = valueStr.split(',');
                  valParts.forEach(v => {
                      v = v.trim();
                      const num = v.endsWith('H') ? parseInt(v.slice(0, -1), 16) : parseInt(v);
                      if (!isNaN(num)) values.push(num);
                  });
              }
          }

          // Write to memory
          values.forEach(val => {
              if (currentMemIndex < MEMORY_SIZE) {
                  if (type === 'DB') {
                      newMemory[currentMemIndex++] = val & 0xFF;
                  } else if (type === 'DW') {
                      newMemory[currentMemIndex++] = val & 0xFF;
                      newMemory[currentMemIndex++] = (val >> 8) & 0xFF;
                  } else if (type === 'DD') {
                      newMemory[currentMemIndex++] = val & 0xFF;
                      newMemory[currentMemIndex++] = (val >> 8) & 0xFF;
                      newMemory[currentMemIndex++] = (val >> 16) & 0xFF;
                      newMemory[currentMemIndex++] = (val >> 24) & 0xFF;
                  }
              }
          });
      }
    }
  }

  // Pass 2: Code Generation & Label Collection
  inCodeSegment = false;
  inDataSegment = false;
  
  for (let i = 0; i < lines.length; i++) {
    let rawLine = lines[i];
    // 分离注释
    let line = rawLine.split(';')[0].trim().toUpperCase();
    
    if (!line || line.includes('DATA SEGMENT') || line.includes('DATA ENDS') || line.includes('CODE SEGMENT') || line.includes('CODE ENDS') || line.includes('END START') || line.includes('ASSUME')) {
      instructions.push({ type: 'EMPTY', originalIndex: i, raw: rawLine });
      continue;
    }

    if (line.includes('DB') && !line.includes('MOV')) {
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

  return { newMemory, dataMap, labelMap, instructions };
};
