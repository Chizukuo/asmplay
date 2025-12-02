; ========================================
; LOOP 指令测试程序
; 功能：演示各种循环结构
; 包括：简单循环、嵌套循环
; ========================================

DATA SEGMENT
    TITLE      DB '=== LOOP INSTRUCTION TEST ===$'
    MSG_SIMPLE DB 'Simple Loop (1-5): $'
    MSG_NESTED DB 'Nested Loop: $'
    MSG_DONE   DB 'ALL TESTS COMPLETE!$'
    LINE       DB '--------------------$'
DATA ENDS

CODE SEGMENT
    ASSUME CS:CODE, DS:DATA
    
START:
    ; 初始化数据段
    MOV AX, DATA
    MOV DS, AX
    
    ; 清屏 - 蓝色背景白字
    MOV AH, 6
    MOV AL, 0
    MOV BH, 1FH
    MOV CX, 0
    MOV DX, 184FH
    INT 10H
    
    ; 显示标题
    MOV AH, 2
    MOV DH, 2
    MOV DL, 24
    MOV BH, 0
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET TITLE
    INT 21H
    
    ; 显示分隔线
    MOV AH, 2
    MOV DH, 3
    MOV DL, 30
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET LINE
    INT 21H
    
    ; ===== 简单循环测试 =====
    MOV AH, 2
    MOV DH, 5
    MOV DL, 20
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_SIMPLE
    INT 21H
    
    ; 循环打印数字 1-5
    MOV CX, 5        ; 循环计数器
    MOV BL, '1'      ; 起始字符
    MOV DH, 6        ; 行号
    
SIMPLE_LOOP:
    ; 设置光标
    MOV AH, 2
    MOV DL, 35
    INT 10H
    
    ; 显示当前数字
    MOV AH, 2
    MOV DL, BL
    INT 21H
    
    ; 显示箭头
    PUSH CX
    MOV CX, 3
ARROW_LOOP:
    MOV DL, '>'
    INT 21H
    LOOP ARROW_LOOP
    POP CX
    
    ; 下一个字符和下一行
    INC BL
    INC DH
    
    ; 继续循环
    LOOP SIMPLE_LOOP
    
    ; ===== 嵌套循环测试 =====
    MOV AH, 2
    MOV DH, 12
    MOV DL, 20
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_NESTED
    INT 21H
    
    ; 外层循环：3行
    MOV CX, 3
    MOV DH, 13
    
OUTER_LOOP:
    PUSH CX          ; 保存外层计数器
    
    ; 设置光标到行首
    MOV AH, 2
    MOV DL, 25
    INT 10H
    
    ; 内层循环：每行4个星号
    MOV CX, 4
INNER_LOOP:
    MOV AH, 2
    MOV DL, '*'
    INT 21H
    MOV DL, ' '
    INT 21H
    LOOP INNER_LOOP
    
    INC DH           ; 下一行
    POP CX           ; 恢复外层计数器
    LOOP OUTER_LOOP
    
    ; 显示完成信息
    MOV AH, 2
    MOV DH, 18
    MOV DL, 26
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_DONE
    INT 21H
    
    ; 程序结束
    MOV AH, 4CH
    INT 21H
    
CODE ENDS
END START