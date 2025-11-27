export const MEMORY_SIZE = 1024 * 1024; // 1MB
export const INSTRUCTION_DELAY = 100;
export const SCREEN_ROWS = 25;
export const SCREEN_COLS = 80;

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
END START`
};
