import { getReg, setReg } from './assembler';

// 标志位更新辅助函数
const updateFlags = (res, isSub, isWord, v1, v2, currentFlags) => {
  const bits = isWord ? 16 : 8;
  const max = isWord ? 0xFFFF : 0xFF;
  const signBit = isWord ? 0x8000 : 0x80;
  
  const newFlags = { ...currentFlags };
  
  // ZF: Zero Flag
  newFlags.ZF = (res & max) === 0 ? 1 : 0;
  
  // SF: Sign Flag
  newFlags.SF = (res & signBit) !== 0 ? 1 : 0;
  
  // CF: Carry Flag (简化版，主要用于加减法)
  if (v1 !== undefined && v2 !== undefined) {
      if (isSub) {
          // 减法借位: v1 - v2
          newFlags.CF = v1 < v2 ? 1 : 0;
          // OF: Overflow (有符号溢出)
          // 减法溢出：正-负=负 或 负-正=正
          const s1 = (v1 & signBit) !== 0;
          const s2 = (v2 & signBit) !== 0;
          const sr = (res & signBit) !== 0;
          newFlags.OF = (s1 !== s2 && s1 !== sr) ? 1 : 0;
          
          // AF: Auxiliary Carry (Bit 3 borrow)
          newFlags.AF = ((v1 & 0xF) < (v2 & 0xF)) ? 1 : 0;
      } else {
          // 加法进位
          newFlags.CF = res > max ? 1 : 0;
          // OF: Overflow
          // 加法溢出：正+正=负 或 负+负=正
          const s1 = (v1 & signBit) !== 0;
          const s2 = (v2 & signBit) !== 0;
          const sr = (res & signBit) !== 0;
          newFlags.OF = (s1 === s2 && s1 !== sr) ? 1 : 0;
          
          // AF: Auxiliary Carry (Bit 3 carry)
          newFlags.AF = (((v1 & 0xF) + (v2 & 0xF)) > 0xF) ? 1 : 0;
      }
  } else {
      // 逻辑运算清空 CF/OF
      newFlags.CF = 0;
      newFlags.OF = 0;
  }
  
  // PF: Parity Flag (低8位中1的个数为偶数)
  let ones = 0;
  let val = res & 0xFF;
  while(val > 0) {
      if(val & 1) ones++;
      val >>= 1;
  }
  newFlags.PF = (ones % 2 === 0) ? 1 : 0;

  return newFlags;
};

// 地址解析与值获取上下文
class CpuContext {
    constructor(registers, memory, symbolTable, segmentTable, labelMap, flags, callStack = []) {
        this.registers = { ...registers };
        this.memory = [...memory]; // 注意：这里是浅拷贝，如果需要高性能可能需要优化
        this.flags = { ...flags };
        this.callStack = [...callStack];
        this.symbolTable = symbolTable;
        this.segmentTable = segmentTable;
        this.labelMap = labelMap;
        this.nextPc = null;
        this.interrupt = null; // { type: 'INT', val: '21H' }
        this.error = null;
    }

    // 计算物理地址
    calculatePhysicalAddress(segment, offset) {
        return ((segment << 4) + offset) & 0xFFFFF;
    }

    // 安全读内存
    readMem(addr, size = 2, segment = this.registers.DS) {
        const physAddr = this.calculatePhysicalAddress(segment, addr);
        if (physAddr + size > this.memory.length) throw new Error(`Memory Access Violation: ${physAddr.toString(16)}`);
        
        if (size === 1) return this.memory[physAddr];
        return this.memory[physAddr] | (this.memory[physAddr + 1] << 8);
    }

    // 安全写内存
    writeMem(addr, val, size = 2, segment = this.registers.DS) {
        const physAddr = this.calculatePhysicalAddress(segment, addr);
        if (physAddr + size > this.memory.length) throw new Error(`Memory Access Violation: ${physAddr.toString(16)}`);
        
        if (size === 1) {
            this.memory[physAddr] = val & 0xFF;
        } else {
            this.memory[physAddr] = val & 0xFF;
            this.memory[physAddr + 1] = (val >> 8) & 0xFF;
        }
    }

    // 解析有效地址 [BX+SI] 等
    getEA(arg) {
        // Case 1: [BX+SI] or [100H]
        if (arg.startsWith('[') && arg.endsWith(']')) {
            const expr = arg.slice(1, -1);
            return this.evaluateExpression(expr);
        }
        
        // Case 2: VAR[SI] or VAR[BX]
        const bracketIdx = arg.indexOf('[');
        if (bracketIdx > 0 && arg.endsWith(']')) {
            const varName = arg.substring(0, bracketIdx).trim();
            const indexExpr = arg.substring(bracketIdx + 1, arg.length - 1).trim();
            
            if (this.symbolTable.hasOwnProperty(varName)) {
                const baseOffset = this.symbolTable[varName];
                const indexVal = this.evaluateExpression(indexExpr);
                return (baseOffset + indexVal) & 0xFFFF;
            }
        }

        if (this.symbolTable.hasOwnProperty(arg)) return this.symbolTable[arg];
        return null;
    }

    evaluateExpression(expr) {
        let addr = 0;
        let currentOp = '+';
        let currentNum = '';
        
        const processTerm = () => {
            if (!currentNum) return;
            const val = this.parseAddressPart(currentNum.trim());
            addr = currentOp === '+' ? addr + val : addr - val;
            currentNum = '';
        };

        for (let k = 0; k < expr.length; k++) {
            const ch = expr[k];
            if (ch === '+' || ch === '-') {
                processTerm();
                currentOp = ch;
            } else {
                currentNum += ch;
            }
        }
        processTerm();
        return addr;
    }

    parseAddressPart(part) {
        if (['BX','BP','SI','DI'].includes(part)) return this.registers[part];
        if (this.symbolTable.hasOwnProperty(part)) return this.symbolTable[part];
        if (this.segmentTable.hasOwnProperty(part)) return this.segmentTable[part];
        if (part.endsWith('H')) return parseInt(part.slice(0, -1), 16);
        const num = parseInt(part);
        return isNaN(num) ? 0 : num;
    }

    // 获取操作数的值
    getVal(arg, size = 2) {
        if (!arg) return 0;
        
        // OFFSET VAR
        if (typeof arg === 'string' && arg.startsWith('OFFSET ')) {
            const varName = arg.substring(7).trim();
            return this.symbolTable[varName] || 0;
        }

        // Char literal
        if (typeof arg === 'string' && arg.startsWith("'") && arg.endsWith("'") && arg.length === 3) {
            return arg.charCodeAt(1);
        }

        // Segment names
        if (this.segmentTable[arg]) return this.segmentTable[arg];
        if (arg === 'DATA') return this.registers.DS;
        if (arg === 'CODE') return this.registers.CS;
        if (arg === 'STACK') return this.registers.SS;

        // Immediate
        if (typeof arg === 'number') return arg;
        if (!isNaN(parseInt(arg)) && !arg.startsWith('[') && !this.symbolTable.hasOwnProperty(arg) && !['AX','BX','CX','DX','AH','AL','BH','BL','CH','CL','DH','DL','SP','BP','SI','DI','CS','DS','SS','ES','IP'].includes(arg)) {
             return arg.endsWith('H') ? parseInt(arg.slice(0, -1), 16) : parseInt(arg);
        }
        if (arg.endsWith('H') && !['AH','BH','CH','DH'].includes(arg)) return parseInt(arg.slice(0, -1), 16);

        // Register
        if (['AX','BX','CX','DX','AH','AL','BH','BL','CH','CL','DH','DL','SP','BP','SI','DI','CS','DS','SS','ES','IP'].includes(arg)) {
            return getReg(arg, this.registers);
        }

        // Memory
        const ea = this.getEA(arg);
        if (ea !== null) {
            return this.readMem(ea, size);
        }
        
        return 0;
    }

    // 设置操作数的值
    setVal(arg, val, size = 2) {
        val = size === 1 ? val & 0xFF : val & 0xFFFF;

        // Register
        if (['AX','BX','CX','DX','AH','AL','BH','BL','CH','CL','DH','DL','SP','BP','SI','DI','CS','DS','SS','ES','IP'].includes(arg)) {
            this.registers = setReg(arg, val, this.registers);
            return;
        }

        // Memory
        const ea = this.getEA(arg);
        if (ea !== null) {
            this.writeMem(ea, val, size);
            return;
        }
        
        throw new Error(`Cannot set value to ${arg}`);
    }
    
    updateFlags(res, isSub, isWord, v1, v2) {
        this.flags = updateFlags(res, isSub, isWord, v1, v2, this.flags);
    }

    getOperandSize(arg1, arg2) {
        const isReg8 = (arg) => typeof arg === 'string' && ['AL','BL','CL','DL','AH','BH','CH','DH'].includes(arg);
        
        if (isReg8(arg1) || isReg8(arg2)) return 1;
        if (typeof arg1 === 'string' && arg1.toUpperCase().includes('BYTE PTR')) return 1;
        if (typeof arg2 === 'string' && arg2.toUpperCase().includes('BYTE PTR')) return 1;
        
        return 2;
    }
}

// 指令集定义 (Dispatch Table)
const INSTRUCTION_SET = {
    'MOV': (ctx, args) => {
        const [dest, src] = args;
        const size = ctx.getOperandSize(dest, src);
        const val = ctx.getVal(src, size);
        ctx.setVal(dest, val, size);
    },
    'ADD': (ctx, args) => {
        const [dest, src] = args;
        const size = ctx.getOperandSize(dest, src);
        const v1 = ctx.getVal(dest, size);
        const v2 = ctx.getVal(src, size);
        const res = v1 + v2;
        ctx.setVal(dest, res, size);
        ctx.updateFlags(res, false, size === 2, v1, v2);
    },
    'ADC': (ctx, args) => {
        const [dest, src] = args;
        const size = ctx.getOperandSize(dest, src);
        const v1 = ctx.getVal(dest, size);
        const v2 = ctx.getVal(src, size);
        const cf = ctx.flags.CF;
        const res = v1 + v2 + cf;
        ctx.setVal(dest, res, size);
        ctx.updateFlags(res, false, size === 2, v1, v2 + cf);
    },
    'SUB': (ctx, args) => {
        const [dest, src] = args;
        const size = ctx.getOperandSize(dest, src);
        const v1 = ctx.getVal(dest, size);
        const v2 = ctx.getVal(src, size);
        const res = v1 - v2;
        ctx.setVal(dest, res, size);
        ctx.updateFlags(res, true, size === 2, v1, v2);
    },
    'SBB': (ctx, args) => {
        const [dest, src] = args;
        const size = ctx.getOperandSize(dest, src);
        const v1 = ctx.getVal(dest, size);
        const v2 = ctx.getVal(src, size);
        const cf = ctx.flags.CF;
        const res = v1 - v2 - cf;
        ctx.setVal(dest, res, size);
        ctx.updateFlags(res, true, size === 2, v1, v2 + cf);
    },
    'INC': (ctx, args) => {
        const [dest] = args;
        const size = ctx.getOperandSize(dest, null);
        const v1 = ctx.getVal(dest, size);
        const res = v1 + 1;
        ctx.setVal(dest, res, size);
        ctx.updateFlags(res, false, size === 2, v1, 1);
    },
    'DEC': (ctx, args) => {
        const [dest] = args;
        const size = ctx.getOperandSize(dest, null);
        const v1 = ctx.getVal(dest, size);
        const res = v1 - 1;
        ctx.setVal(dest, res, size);
        ctx.updateFlags(res, true, size === 2, v1, 1);
    },
    'MUL': (ctx, args) => {
        const [src] = args;
        const is8Bit = ctx.getOperandSize(src, null) === 1;
        const v1 = ctx.getVal(src, is8Bit ? 1 : 2);
        
        if (is8Bit) {
            const al = ctx.registers.AX & 0xFF;
            const res = al * v1;
            ctx.registers.AX = res;
            const overflow = (res & 0xFF00) !== 0;
            ctx.flags.CF = overflow ? 1 : 0;
            ctx.flags.OF = overflow ? 1 : 0;
        } else {
            const ax = ctx.registers.AX;
            const res = ax * v1;
            ctx.registers.AX = res & 0xFFFF;
            ctx.registers.DX = (res >> 16) & 0xFFFF;
            const overflow = (res & 0xFFFF0000) !== 0;
            ctx.flags.CF = overflow ? 1 : 0;
            ctx.flags.OF = overflow ? 1 : 0;
        }
    },
    'DIV': (ctx, args) => {
        const [src] = args;
        const is8Bit = ctx.getOperandSize(src, null) === 1;
        const v1 = ctx.getVal(src, is8Bit ? 1 : 2);
        
        if (v1 === 0) throw new Error("Divide by zero");
        
        if (is8Bit) {
            const ax = ctx.registers.AX;
            const quot = Math.floor(ax / v1);
            const rem = ax % v1;
            if (quot > 0xFF) throw new Error("Divide overflow");
            ctx.registers.AX = ((rem & 0xFF) << 8) | (quot & 0xFF);
        } else {
            const dxax = (ctx.registers.DX << 16) | ctx.registers.AX;
            const quot = Math.floor(dxax / v1);
            const rem = dxax % v1;
            if (quot > 0xFFFF) throw new Error("Divide overflow");
            ctx.registers.AX = quot & 0xFFFF;
            ctx.registers.DX = rem & 0xFFFF;
        }
    },
    'CMP': (ctx, args) => {
        const [dest, src] = args;
        const size = ctx.getOperandSize(dest, src);
        const v1 = ctx.getVal(dest, size);
        const v2 = ctx.getVal(src, size);
        const res = v1 - v2;
        ctx.updateFlags(res, true, size === 2, v1, v2);
    },
    'JMP': (ctx, args) => {
        const [target] = args;
        if (ctx.labelMap.hasOwnProperty(target)) ctx.nextPc = ctx.labelMap[target];
    },
    'JE': (ctx, args) => { if (ctx.flags.ZF === 1) INSTRUCTION_SET['JMP'](ctx, args); },
    'JZ': (ctx, args) => { if (ctx.flags.ZF === 1) INSTRUCTION_SET['JMP'](ctx, args); },
    'JNE': (ctx, args) => { if (ctx.flags.ZF === 0) INSTRUCTION_SET['JMP'](ctx, args); },
    'JNZ': (ctx, args) => { if (ctx.flags.ZF === 0) INSTRUCTION_SET['JMP'](ctx, args); },
    'JG': (ctx, args) => { if (ctx.flags.ZF === 0 && ctx.flags.SF === ctx.flags.OF) INSTRUCTION_SET['JMP'](ctx, args); },
    'JGE': (ctx, args) => { if (ctx.flags.SF === ctx.flags.OF) INSTRUCTION_SET['JMP'](ctx, args); },
    'JL': (ctx, args) => { if (ctx.flags.SF !== ctx.flags.OF) INSTRUCTION_SET['JMP'](ctx, args); },
    'JLE': (ctx, args) => { if (ctx.flags.ZF === 1 || ctx.flags.SF !== ctx.flags.OF) INSTRUCTION_SET['JMP'](ctx, args); },
    'JA': (ctx, args) => { if (ctx.flags.CF === 0 && ctx.flags.ZF === 0) INSTRUCTION_SET['JMP'](ctx, args); },
    'JAE': (ctx, args) => { if (ctx.flags.CF === 0) INSTRUCTION_SET['JMP'](ctx, args); },
    'JB': (ctx, args) => { if (ctx.flags.CF === 1) INSTRUCTION_SET['JMP'](ctx, args); },
    'JBE': (ctx, args) => { if (ctx.flags.CF === 1 || ctx.flags.ZF === 1) INSTRUCTION_SET['JMP'](ctx, args); },
    
    'LOOP': (ctx, args) => {
        ctx.registers.CX = (ctx.registers.CX - 1) & 0xFFFF;
        if (ctx.registers.CX !== 0) INSTRUCTION_SET['JMP'](ctx, args);
    },
    
    'CALL': (ctx, args) => {
        const [target] = args;
        ctx.registers.SP = (ctx.registers.SP - 2) & 0xFFFF;
        ctx.writeMem(ctx.registers.SP, ctx.nextPc, 2, ctx.registers.SS);
        
        if (ctx.labelMap.hasOwnProperty(target)) {
            // Update Call Stack for visualization
            ctx.callStack.push({ 
                name: target, 
                retIp: ctx.nextPc,
                sp: ctx.registers.SP 
            });
            ctx.nextPc = ctx.labelMap[target];
        } else {
            throw new Error(`Undefined label: ${target}`);
        }
    },
    
    'RET': (ctx, args) => {
        const retAddr = ctx.readMem(ctx.registers.SP, 2, ctx.registers.SS);
        ctx.registers.SP = (ctx.registers.SP + 2) & 0xFFFF;
        ctx.nextPc = retAddr;
        
        // Pop from Call Stack
        if (ctx.callStack.length > 0) {
            ctx.callStack.pop();
        }
    },
    
    'PUSH': (ctx, args) => {
        const [src] = args;
        const val = ctx.getVal(src, 2);
        ctx.registers.SP = (ctx.registers.SP - 2) & 0xFFFF;
        ctx.writeMem(ctx.registers.SP, val, 2, ctx.registers.SS);
    },
    
    'POP': (ctx, args) => {
        const [dest] = args;
        const val = ctx.readMem(ctx.registers.SP, 2, ctx.registers.SS);
        ctx.registers.SP = (ctx.registers.SP + 2) & 0xFFFF;
        ctx.setVal(dest, val, 2);
    },
    
    'INT': (ctx, args) => {
        const [intNum] = args;
        ctx.interrupt = { type: 'INT', val: intNum };
    },
    
    'LEA': (ctx, args) => {
        const [dest, src] = args;
        const ea = ctx.getEA(src);
        if (ea === null) throw new Error("Invalid LEA operand");
        ctx.setVal(dest, ea, 2);
    },
    
    'AND': (ctx, args) => {
        const [dest, src] = args;
        const size = ctx.getOperandSize(dest, src);
        const v1 = ctx.getVal(dest, size);
        const v2 = ctx.getVal(src, size);
        const res = v1 & v2;
        ctx.setVal(dest, res, size);
        ctx.updateFlags(res, false, size === 2);
    },
    'OR': (ctx, args) => {
        const [dest, src] = args;
        const size = ctx.getOperandSize(dest, src);
        const v1 = ctx.getVal(dest, size);
        const v2 = ctx.getVal(src, size);
        const res = v1 | v2;
        ctx.setVal(dest, res, size);
        ctx.updateFlags(res, false, size === 2);
    },
    'XOR': (ctx, args) => {
        const [dest, src] = args;
        const size = ctx.getOperandSize(dest, src);
        const v1 = ctx.getVal(dest, size);
        const v2 = ctx.getVal(src, size);
        const res = v1 ^ v2;
        ctx.setVal(dest, res, size);
        ctx.updateFlags(res, false, size === 2);
    },
    'NOT': (ctx, args) => {
        const [dest] = args;
        const size = ctx.getOperandSize(dest, null);
        const v1 = ctx.getVal(dest, size);
        ctx.setVal(dest, ~v1, size);
    },
    'NEG': (ctx, args) => {
        const [dest] = args;
        const size = ctx.getOperandSize(dest, null);
        const v1 = ctx.getVal(dest, size);
        const res = -v1;
        ctx.setVal(dest, res, size);
        ctx.updateFlags(res, true, size === 2, 0, v1);
    },
    'TEST': (ctx, args) => {
        const [dest, src] = args;
        const size = ctx.getOperandSize(dest, src);
        const v1 = ctx.getVal(dest, size);
        const v2 = ctx.getVal(src, size);
        const res = v1 & v2;
        ctx.updateFlags(res, false, size === 2);
    },
    'XCHG': (ctx, args) => {
        const [op1, op2] = args;
        const size = ctx.getOperandSize(op1, op2);
        const v1 = ctx.getVal(op1, size);
        const v2 = ctx.getVal(op2, size);
        ctx.setVal(op1, v2, size);
        ctx.setVal(op2, v1, size);
    },
    'SHL': (ctx, args) => {
        const [dest, countArg] = args;
        const size = ctx.getOperandSize(dest, null);
        const v1 = ctx.getVal(dest, size);
        const count = (countArg ? ctx.getVal(countArg, 1) : 1) & 0x1F;
        const bits = size === 2 ? 16 : 8;
        const mask = size === 2 ? 0xFFFF : 0xFF;
        
        let res = v1;
        for(let k=0; k<count; k++) {
            const msb = (res >> (bits - 1)) & 1;
            ctx.flags.CF = msb;
            res = (res << 1) & mask;
        }
        ctx.setVal(dest, res, size);
        if (count === 1) {
            const msb = (res >> (bits - 1)) & 1;
            ctx.flags.OF = (msb ^ ctx.flags.CF);
        }
    },
    'SHR': (ctx, args) => {
        const [dest, countArg] = args;
        const size = ctx.getOperandSize(dest, null);
        const v1 = ctx.getVal(dest, size);
        const count = (countArg ? ctx.getVal(countArg, 1) : 1) & 0x1F;
        const bits = size === 2 ? 16 : 8;
        
        let res = v1;
        for(let k=0; k<count; k++) {
            ctx.flags.CF = res & 1;
            res = res >>> 1;
        }
        ctx.setVal(dest, res, size);
        if (count === 1) {
            const msb = (v1 >> (bits - 1)) & 1;
            ctx.flags.OF = msb; // SHR OF is high-order bit of original operand
        }
    },
    'ROL': (ctx, args) => {
        const [dest, countArg] = args;
        const size = ctx.getOperandSize(dest, null);
        const v1 = ctx.getVal(dest, size);
        const count = (countArg ? ctx.getVal(countArg, 1) : 1) & 0x1F;
        const bits = size === 2 ? 16 : 8;
        const mask = size === 2 ? 0xFFFF : 0xFF;
        
        let res = v1;
        for(let k=0; k<count; k++) {
            const msb = (res >> (bits - 1)) & 1;
            res = ((res << 1) | msb) & mask;
            ctx.flags.CF = msb;
        }
        ctx.setVal(dest, res, size);
        if (count === 1) {
            const msb = (res >> (bits - 1)) & 1;
            ctx.flags.OF = (msb ^ ctx.flags.CF);
        }
    },
    'ROR': (ctx, args) => {
        const [dest, countArg] = args;
        const size = ctx.getOperandSize(dest, null);
        const v1 = ctx.getVal(dest, size);
        const count = (countArg ? ctx.getVal(countArg, 1) : 1) & 0x1F;
        const bits = size === 2 ? 16 : 8;
        const mask = size === 2 ? 0xFFFF : 0xFF;
        
        let res = v1;
        for(let k=0; k<count; k++) {
            const lsb = res & 1;
            res = (res >>> 1) | (lsb << (bits - 1));
            ctx.flags.CF = lsb;
        }
        ctx.setVal(dest, res, size);
        if (count === 1) {
            const msb = (res >> (bits - 1)) & 1;
            const nextMsb = (res >> (bits - 2)) & 1;
            ctx.flags.OF = msb ^ nextMsb;
        }
    },
    'CBW': (ctx) => {
        const al = ctx.registers.AX & 0xFF;
        const sign = (al & 0x80) ? 0xFF : 0x00;
        ctx.registers.AX = (sign << 8) | al;
    },
    'CWD': (ctx) => {
        const ax = ctx.registers.AX;
        const sign = (ax & 0x8000) ? 0xFFFF : 0x0000;
        ctx.registers.DX = sign;
    },
    'NOP': () => {},
    'CLI': (ctx) => { ctx.flags.IF = 0; },
    'STI': (ctx) => { ctx.flags.IF = 1; },
    'CLC': (ctx) => { ctx.flags.CF = 0; },
    'STC': (ctx) => { ctx.flags.CF = 1; },
    'CMC': (ctx) => { ctx.flags.CF = ctx.flags.CF ? 0 : 1; },
    'CLD': (ctx) => { ctx.flags.DF = 0; },
    'STD': (ctx) => { ctx.flags.DF = 1; },
};

// Aliases
INSTRUCTION_SET['SAL'] = INSTRUCTION_SET['SHL'];
INSTRUCTION_SET['JNAE'] = INSTRUCTION_SET['JB'];
INSTRUCTION_SET['JNB'] = INSTRUCTION_SET['JAE'];
INSTRUCTION_SET['JNBE'] = INSTRUCTION_SET['JA'];
INSTRUCTION_SET['JNA'] = INSTRUCTION_SET['JBE'];
INSTRUCTION_SET['JNLE'] = INSTRUCTION_SET['JG'];
INSTRUCTION_SET['JNL'] = INSTRUCTION_SET['JGE'];
INSTRUCTION_SET['JNGE'] = INSTRUCTION_SET['JL'];
INSTRUCTION_SET['JNG'] = INSTRUCTION_SET['JLE'];
INSTRUCTION_SET['JS'] = (ctx, args) => { if (ctx.flags.SF === 1) INSTRUCTION_SET['JMP'](ctx, args); };
INSTRUCTION_SET['JNS'] = (ctx, args) => { if (ctx.flags.SF === 0) INSTRUCTION_SET['JMP'](ctx, args); };
INSTRUCTION_SET['JO'] = (ctx, args) => { if (ctx.flags.OF === 1) INSTRUCTION_SET['JMP'](ctx, args); };
INSTRUCTION_SET['JNO'] = (ctx, args) => { if (ctx.flags.OF === 0) INSTRUCTION_SET['JMP'](ctx, args); };
INSTRUCTION_SET['JP'] = (ctx, args) => { if (ctx.flags.PF === 1) INSTRUCTION_SET['JMP'](ctx, args); };
INSTRUCTION_SET['JPE'] = INSTRUCTION_SET['JP'];
INSTRUCTION_SET['JNP'] = (ctx, args) => { if (ctx.flags.PF === 0) INSTRUCTION_SET['JMP'](ctx, args); };
INSTRUCTION_SET['JPO'] = INSTRUCTION_SET['JNP'];

INSTRUCTION_SET['SAR'] = INSTRUCTION_SET['SHR']; // Simplified SAR to SHR for now (unsigned shift) - wait, SAR is arithmetic
// Fix SAR
INSTRUCTION_SET['SAR'] = (ctx, args) => {
    const [dest, countArg] = args;
    const size = ctx.getOperandSize(dest, null);
    const v1 = ctx.getVal(dest, size);
    const count = (countArg ? ctx.getVal(countArg, 1) : 1) & 0x1F;
    const bits = size === 2 ? 16 : 8;
    const signBit = size === 2 ? 0x8000 : 0x80;
    
    let res = v1;
    for(let k=0; k<count; k++) {
        ctx.flags.CF = res & 1;
        const msb = res & signBit;
        res = (res >>> 1) | msb; // Preserve sign bit
    }
    ctx.setVal(dest, res, size);
    if (count === 1) ctx.flags.OF = 0;
};


export const executeCpuInstruction = (instruction, registers, memory, flags, symbolTable, segmentTable, labelMap, callStack, currentPc) => {
    const ctx = new CpuContext(registers, memory, symbolTable, segmentTable, labelMap, flags, callStack);
    ctx.nextPc = currentPc + 1; // Default next PC

    const { op, args } = instruction;
    
    // Pre-process args to handle OFFSET keyword which might be split
    let realArgs = [];
    for(let k=0; k<args.length; k++) {
        if (args[k] === 'OFFSET' && k+1 < args.length) {
            realArgs.push('OFFSET ' + args[k+1]);
            k++; 
        } else {
            realArgs.push(args[k]);
        }
    }

    if (INSTRUCTION_SET[op]) {
        INSTRUCTION_SET[op](ctx, realArgs);
    } else {
        console.warn(`Unknown opcode: ${op}`);
    }

    return {
        newRegisters: ctx.registers,
        newMemory: ctx.memory,
        newFlags: ctx.flags,
        newCallStack: ctx.callStack,
        nextPc: ctx.nextPc,
        interrupt: ctx.interrupt
    };
};