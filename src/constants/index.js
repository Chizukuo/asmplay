export const MEMORY_SIZE = 1024 * 1024; // 1MB
export const INSTRUCTION_DELAY = 100;
export const SCREEN_ROWS = 25;
export const SCREEN_COLS = 80;
export const VIDEO_MEMORY_SIZE = SCREEN_ROWS * SCREEN_COLS * 2; // 4000 bytes

// DOS 16色调色板 (R, G, B)
export const DOS_PALETTE = [
  [0, 0, 0],       // 0: Black
  [0, 0, 170],     // 1: Blue
  [0, 170, 0],     // 2: Green
  [0, 170, 170],   // 3: Cyan
  [170, 0, 0],     // 4: Red
  [170, 0, 170],   // 5: Magenta
  [170, 85, 0],    // 6: Brown
  [170, 170, 170], // 7: Light Gray
  [85, 85, 85],    // 8: Dark Gray
  [85, 85, 255],   // 9: Light Blue
  [85, 255, 85],   // 10: Light Green
  [85, 255, 255],  // 11: Light Cyan
  [255, 85, 85],   // 12: Light Red
  [255, 85, 255],  // 13: Light Magenta
  [255, 255, 85],  // 14: Yellow
  [255, 255, 255]  // 15: White
];

export const SPEED_OPTIONS = [
  { label: '极慢', value: 500 },
  { label: '慢速', value: 300 },
  { label: '正常', value: 100 },
  { label: '快速', value: 30 },
  { label: '极快', value: 5 },
  { label: '光速', value: 0 } // 0 means batch execution
];

export const PRESET_PROGRAMS = {
  default: `; DEMO.ASM - 综合演示程序
DATA SEGMENT
    TITLE DB '=== 8086 SIMULATOR ===$'
    INFO1 DB 'Register AX Demo$'
    INFO2 DB 'Math Operations$'
    LOOP_MSG DB 'Looping: $'
    DONE_MSG DB ' Done!$'
    LINE DB '--------------------$'
DATA ENDS
CODE SEGMENT
    MOV AX, DATA
    MOV DS, AX
    
    ; 1. 屏幕控制
    ; 青色背景白字 (0x3F = 青底白字)
    MOV AH, 6
    MOV AL, 0
    MOV BH, 3FH
    MOV CX, 0       ; 左上角 (0,0)
    MOV DX, 184FH   ; 右下角 (24,79)
    INT 10H
    
    ; 2. 字符串输出
    MOV AH, 2
    MOV DH, 3
    MOV DL, 28
    INT 10H
    
    MOV AH, 9
    MOV DX, OFFSET TITLE
    INT 21H
    
    MOV AH, 2
    MOV DH, 5
    MOV DL, 30
    INT 10H
    
    MOV AH, 9
    MOV DX, OFFSET LINE
    INT 21H
    
    ; 3. 寄存器与运算
    MOV AX, 1234H
    MOV BX, 5678H
    ADD AX, BX      ; AX = 68ACH
    
    MOV CX, 100H
    SUB CX, 1       ; CX = 0FFH
    
    ; 4. 循环演示
    MOV AH, 2
    MOV DH, 10
    MOV DL, 30
    INT 10H
    
    MOV AH, 9
    MOV DX, OFFSET LOOP_MSG
    INT 21H
    
    MOV CX, 5       ; 循环5次
    MOV BL, '1'
    
LOOP_START:
    MOV AH, 2       ; 打印字符功能
    MOV DL, BL
    INT 21H
    
    INC BL          ; 下一个字符
    LOOP LOOP_START
    
    MOV AH, 9
    MOV DX, OFFSET DONE_MSG
    INT 21H
    
    MOV AH, 4CH
    INT 21H
CODE ENDS
END START`,
  
  bubble_sort: `; 冒泡排序示例
DATA SEGMENT
    ARRAY DB 5, 2, 8, 1, 9, 3, 7, 4, 6
    COUNT DW 9
    MSG_BEFORE DB 'Before: 5,2,8,1,9,3,7,4,6$'
    MSG_AFTER DB 'After: Sorted!$'
DATA ENDS
CODE SEGMENT
    MOV AX, DATA
    MOV DS, AX
    
    ; 清屏 - 蓝色背景
    MOV AH, 6
    MOV AL, 0
    MOV BH, 1FH
    MOV CX, 0
    MOV DX, 184FH
    INT 10H
    
    ; 显示排序前
    MOV AH, 2
    MOV DH, 5
    MOV DL, 20
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_BEFORE
    INT 21H
    
    ; 冒泡排序
    MOV CX, COUNT
    DEC CX          ; 外层循环 n-1 次
    
OUTER_LOOP:
    PUSH CX
    MOV SI, 0
    MOV CX, COUNT
    DEC CX
    
INNER_LOOP:
    MOV AL, ARRAY[SI]
    MOV BL, ARRAY[SI+1]
    CMP AL, BL
    JLE NO_SWAP     ; 如果 AL <= BL，不交换
    
    ; 交换
    MOV ARRAY[SI], BL
    MOV ARRAY[SI+1], AL
    
NO_SWAP:
    INC SI
    LOOP INNER_LOOP
    
    POP CX
    LOOP OUTER_LOOP
    
    ; 显示排序后
    MOV AH, 2
    MOV DH, 7
    MOV DL, 20
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_AFTER
    INT 21H
    
    MOV AH, 4CH
    INT 21H
CODE ENDS
END START`,

  fibonacci: `; 斐波那契数列
DATA SEGMENT
    TITLE DB 'Fibonacci Sequence$'
    COUNT DW 10     ; 计算前10项
DATA ENDS
CODE SEGMENT
    MOV AX, DATA
    MOV DS, AX
    
    ; 绿色背景黄字
    MOV AH, 6
    MOV AL, 0
    MOV BH, 2EH
    MOV CX, 0
    MOV DX, 184FH
    INT 10H
    
    ; 显示标题
    MOV AH, 2
    MOV DH, 3
    MOV DL, 25
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET TITLE
    INT 21H
    
    ; 初始化
    MOV AX, 0       ; F(0) = 0
    MOV BX, 1       ; F(1) = 1
    MOV CX, COUNT
    MOV DH, 6       ; 起始行
    
FIB_LOOP:
    ; 设置光标
    PUSH AX
    MOV AH, 2
    MOV DL, 35
    INT 10H
    POP AX
    
    ; 显示当前数字（简化：只显示星号）
    PUSH CX
    MOV CX, AX
    CMP CX, 20
    JL SHOW_STARS
    MOV CX, 20      ; 最多20个星号
    
SHOW_STARS:
    CMP CX, 0
    JE SKIP_STARS
STAR_LOOP:
    PUSH AX
    MOV AH, 2
    MOV DL, '*'
    INT 21H
    POP AX
    LOOP STAR_LOOP
    
SKIP_STARS:
    POP CX
    
    ; 计算下一项
    MOV DX, AX
    ADD DX, BX
    MOV AX, BX
    MOV BX, DX
    
    INC DH          ; 下一行
    LOOP FIB_LOOP
    
    MOV AH, 4CH
    INT 21H
CODE ENDS
END START`,

  string_demo: `; 字符串处理演示
DATA SEGMENT
    SOURCE DB 'HELLO WORLD!$'
    DEST DB 20 DUP(0)
    MSG1 DB 'Original: $'
    MSG2 DB 'Reversed: $'
DATA ENDS
CODE SEGMENT
    MOV AX, DATA
    MOV DS, AX
    MOV ES, AX
    
    ; 紫色背景白字
    MOV AH, 6
    MOV AL, 0
    MOV BH, 5FH
    MOV CX, 0
    MOV DX, 184FH
    INT 10H
    
    ; 显示原字符串
    MOV AH, 2
    MOV DH, 5
    MOV DL, 20
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG1
    INT 21H
    MOV DX, OFFSET SOURCE
    INT 21H
    
    ; 计算长度
    LEA SI, SOURCE
    MOV CX, 0
COUNT_LOOP:
    MOV AL, [SI]
    CMP AL, '$'
    JE REVERSE_START
    INC SI
    INC CX
    JMP COUNT_LOOP
    
REVERSE_START:
    ; 反转字符串
    LEA SI, SOURCE
    LEA DI, DEST
    ADD DI, CX
    DEC DI
    
REVERSE_LOOP:
    MOV AL, [SI]
    CMP AL, '$'
    JE REVERSE_DONE
    MOV [DI], AL
    INC SI
    DEC DI
    JMP REVERSE_LOOP
    
REVERSE_DONE:
    MOV BYTE PTR [DI+CX+1], '$'
    
    ; 显示反转后
    MOV AH, 2
    MOV DH, 7
    MOV DL, 20
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG2
    INT 21H
    MOV DX, OFFSET DEST
    INT 21H
    
    MOV AH, 4CH
    INT 21H
CODE ENDS
END START`,

  calculator: `; 简易计算器
DATA SEGMENT
    NUM1 DW 25
    NUM2 DW 17
    MSG_ADD DB 'ADD: 25 + 17 = 42$'
    MSG_SUB DB 'SUB: 25 - 17 = 8$'
    MSG_MUL DB 'MUL: 25 * 17 = 425$'
    MSG_DIV DB 'DIV: 25 / 17 = 1 ... 8$'
    TITLE DB '=== CALCULATOR ===$'
DATA ENDS
CODE SEGMENT
    MOV AX, DATA
    MOV DS, AX
    
    ; 黄色背景黑字
    MOV AH, 6
    MOV AL, 0
    MOV BH, 60H
    MOV CX, 0
    MOV DX, 184FH
    INT 10H
    
    ; 显示标题
    MOV AH, 2
    MOV DH, 2
    MOV DL, 30
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET TITLE
    INT 21H
    
    ; 加法演示
    MOV AH, 2
    MOV DH, 5
    MOV DL, 25
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_ADD
    INT 21H
    
    ; 减法演示
    MOV AH, 2
    MOV DH, 7
    MOV DL, 25
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_SUB
    INT 21H
    
    ; 乘法演示
    MOV AH, 2
    MOV DH, 9
    MOV DL, 25
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_MUL
    INT 21H
    
    ; 除法演示
    MOV AH, 2
    MOV DH, 11
    MOV DL, 25
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_DIV
    INT 21H
    
    ; 实际计算（验证）
    MOV AX, NUM1
    ADD AX, NUM2    ; AX = 42
    MOV AX, NUM1
    SUB AX, NUM2    ; AX = 8
    MOV AX, NUM1
    MUL NUM2        ; AX = 425
    MOV AX, NUM1
    MOV DX, 0
    DIV NUM2        ; AX = 1, DX = 8
    
    MOV AH, 4CH
    INT 21H
CODE ENDS
END START`,

  loop_test: `; LOOP 指令测试
DATA SEGMENT
    MSG DB 'Count: $'
DATA ENDS
CODE SEGMENT
    MOV AX, DATA
    MOV DS, AX
    
    ; 清屏
    MOV AH, 6
    MOV AL, 0
    MOV BH, 1FH
    MOV CX, 0
    MOV DX, 184FH
    INT 10H
    
    ; 显示标题
    MOV AH, 2
    MOV DH, 3
    MOV DL, 30
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG
    INT 21H
    
    ; 循环测试
    MOV CX, 5
    MOV BL, '1'
    MOV DH, 5
    
MY_LOOP:
    ; 设置光标
    MOV AH, 2
    MOV DL, 35
    INT 10H
    
    ; 输出字符
    MOV AH, 2
    MOV DL, BL
    INT 21H
    
    ; 下一个字符
    INC BL
    INC DH
    
    ; 循环
    LOOP MY_LOOP
    
    ; 结束
    MOV AH, 2
    MOV DH, 12
    MOV DL, 30
    INT 10H
    MOV AH, 2
    MOV DL, 'D'
    INT 21H
    MOV DL, 'O'
    INT 21H
    MOV DL, 'N'
    INT 21H
    MOV DL, 'E'
    INT 21H
    MOV DL, '!'
    INT 21H
    
    MOV AH, 4CH
    INT 21H
CODE ENDS
END START`,

  clock_demo: `; 时钟演示程序 - 简化版
STACK SEGMENT STACK
      DW 200 DUP (?)
STACK ENDS

DATA SEGMENT
      SPACE DB 1000 DUP (' ')
      PATTERN DB 6 DUP (' '),0C9H,26 DUP (0CDH),0BBH,6 DUP (' ')
              DB 6 DUP (' '),0BAH,26 DUP (20H),0BAH,6 DUP (' ')
              DB 6 DUP (' '),0C8H,26 DUP (0CDH),0BCH,6 DUP (' ')
      DBUFFER  DB 8 DUP (':'),12 DUP (' ')
      DBUFFER1 DB 20 DUP (' ')
      STR  DB 0DH,0AH,'PRESS D=DATE T=TIME Q=QUIT: $'
DATA ENDS

CODE SEGMENT
      ASSUME CS:CODE,DS:DATA,ES:DATA,SS:STACK

START:
       MOV AX,0001H
       INT 10H
       MOV AX,DATA
       MOV DS,AX
       MOV ES,AX

       MOV BP,OFFSET SPACE
       MOV DX,0B00H
       MOV CX,1000
       MOV BX,0040H
       MOV AX,1300H
       INT 10H

       MOV BP,OFFSET PATTERN
       MOV DX,0B00H
       MOV CX,120
       MOV BX,004EH
       MOV AX,1301H
       INT 10H

       LEA DX,STR
       MOV AH,9
       INT 21H

       MOV AH,1
       INT 21H
       CMP AL,44H
       JNE A
       CALL DATE

A:     CMP AL,54H
       JNE B
       CALL TIME

B:     CMP AL,51H
       JNE START
       MOV AH,4CH
       INT 21H

DATE PROC NEAR
DISPLAY:
       MOV AH,2AH
       INT 21H
       MOV SI,0
       MOV AX,CX
       MOV BX,100
       DIV BL
       MOV BL,AH
       CALL BCDASC1
       MOV AL,BL
       CALL BCDASC1
       INC SI
       MOV AL,DH
       CALL BCDASC1
       INC SI
       MOV AL,DL
       CALL BCDASC1

       MOV BP,OFFSET DBUFFER1
       MOV DX,0C0DH
       MOV CX,20
       MOV BX,004EH
       MOV AX,1301H
       INT 10H

       MOV AH,02H
       MOV DX,0300H
       MOV BH,0
       INT 10H

       MOV BX,0018H
REPEA: MOV CX,0FFFFH
REPEAT:LOOP REPEAT
       DEC BX
       JNZ REPEA

       MOV AH,01H
       INT 16H
       JE  DISPLAY
       JMP START
       RET
DATE ENDP

TIME PROC NEAR
DISPLAY1:
       MOV SI,0
       MOV AH,2CH
       INT 21H
       MOV AL,CH
       CALL BCDASC
       INC SI
       MOV AL,CL
       CALL BCDASC
       INC SI
       MOV AL,DH
       CALL BCDASC

       MOV BP,OFFSET DBUFFER
       MOV DX,0C0DH
       MOV CX,20
       MOV BX,004EH
       MOV AX,1301H
       INT 10H

       MOV AH,02H
       MOV DX,0300H
       MOV BH,0
       INT 10H

       MOV BX,0018H
RE:    MOV CX,0FFFFH
REA:   LOOP REA
       DEC BX
       JNZ RE

       MOV AH,01H
       INT 16H
       JE  DISPLAY1
       JMP START
       RET
TIME ENDP

BCDASC PROC NEAR
       PUSH BX
       CBW
       MOV BL,10
       DIV BL
       ADD AL,'0'
       MOV DBUFFER[SI],AL
       INC SI
       ADD AH,'0'
       MOV DBUFFER[SI],AH
       INC SI
       POP BX
       RET
BCDASC ENDP

BCDASC1 PROC NEAR
       PUSH BX
       CBW
       MOV BL,10
       DIV BL
       ADD AL,'0'
       MOV DBUFFER1[SI],AL
       INC SI
       ADD AH,'0'
       MOV DBUFFER1[SI],AH
       INC SI
       POP BX
       RET
BCDASC1 ENDP

CODE ENDS
END START`
};

