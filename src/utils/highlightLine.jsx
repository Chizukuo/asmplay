import React from 'react';

// 简单的语法高亮逻辑
export const highlightLine = (line) => {
  const commentIndex = line.indexOf(';');
  let codePart = line;
  let commentPart = '';
  if (commentIndex !== -1) {
    codePart = line.slice(0, commentIndex);
    commentPart = line.slice(commentIndex);
  }

  // 使用正则分割，保留分隔符
  const tokens = codePart.split(/([,\s:\[\]+]+)/); 
  
  const highlightedTokens = tokens.map((token, i) => {
    if (!token) return null;
    const upper = token.toUpperCase();
    let type = '';
    
    if (/^(MOV|ADD|SUB|MUL|DIV|INC|DEC|JMP|JZ|JNZ|LOOP|CMP|INT|PUSH|POP|CALL|RET|AND|OR|XOR|NOT|LEA|SHL|SHR|ROL|ROR|RCL|RCR|ADC|SBB|TEST|NEG|XCHG|NOP|HLT|CLI|STI|CLC|STC|CMC|CLD|STD|CBW|CWD|PUSHF|POPF|IRET|IN|OUT|LODS|STOS|MOVS|SCAS|CMPS|REP|REPE|REPNE|JE|JNE|JG|JGE|JL|JLE|JA|JAE|JB|JBE|JC|JNC|JO|JNO|JS|JNS|JP|JNP|JCXZ)$/.test(upper)) {
      type = 'token-keyword';
    } else if (/^(DB|DW|DD|DQ|DT|EQU|ORG|END|SEGMENT|ENDS|ASSUME|PROC|ENDP|MACRO|ENDM|PUBLIC|EXTRN|INCLUDE|TITLE|PAGE|OFFSET|PTR|BYTE|WORD|DWORD|NEAR|FAR|SHORT)$/.test(upper)) {
      type = 'token-directive'; // 伪指令使用不同颜色
    } else if (/^(AX|BX|CX|DX|SP|BP|SI|DI|AH|AL|BH|BL|CH|CL|DH|DL|CS|DS|SS|ES|IP|FLAGS)$/.test(upper)) {
      type = 'token-register';
    } else if (/^[0-9]+$/.test(token) || /^0x[0-9A-F]+$/i.test(token) || /^[0-9A-F]+H$/i.test(token)) {
      type = 'token-number';
    } else if (/^".*"$/.test(token) || /^'.*'$/.test(token)) {
      type = 'token-string';
    } else if (token.trim().length > 0 && !/^[,\s:\[\]+]+$/.test(token)) {
        // 可能是标签或变量，简单处理
        type = 'token-default'; 
    }

    return <span key={i} className={type}>{token}</span>;
  });

  return (
    <>
      {highlightedTokens}
      {commentPart && <span className="token-comment">{commentPart}</span>}
    </>
  );
};
