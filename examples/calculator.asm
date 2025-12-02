; ========================================
; 简易计算器程序
; 功能：演示基本算术运算
; 包括：加法、减法、乘法、除法
; ========================================

DATA SEGMENT
    NUM1 DW 25              ; 第一个操作数
    NUM2 DW 17              ; 第二个操作数
    RESULT_ADD DW 0         ; 加法结果
    RESULT_SUB DW 0         ; 减法结果
    RESULT_MUL DW 0         ; 乘法结果（低16位）
    RESULT_DIV_Q DW 0       ; 除法商
    RESULT_DIV_R DW 0       ; 除法余数
    
    TITLE      DB '=== CALCULATOR ===$'
    MSG_ADD    DB 'ADD: 25 + 17 = 42$'
    MSG_SUB    DB 'SUB: 25 - 17 = 8$'
    MSG_MUL    DB 'MUL: 25 * 17 = 425$'
    MSG_DIV    DB 'DIV: 25 / 17 = 1 R 8$'
    MSG_DONE   DB 'Calculation Complete!$'
DATA ENDS

CODE SEGMENT
    ASSUME CS:CODE, DS:DATA
    
START:
    ; 初始化数据段
    MOV AX, DATA
    MOV DS, AX
    
    ; 清屏 - 黄色背景黑字 (60H = 黄底黑字)
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
    MOV BH, 0
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET TITLE
    INT 21H
    
    ; ===== 执行加法 =====
    MOV AX, NUM1
    ADD AX, NUM2
    MOV RESULT_ADD, AX       ; 保存结果 42
    
    ; 显示加法结果
    MOV AH, 2
    MOV DH, 5
    MOV DL, 25
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_ADD
    INT 21H
    
    ; ===== 执行减法 =====
    MOV AX, NUM1
    SUB AX, NUM2
    MOV RESULT_SUB, AX       ; 保存结果 8
    
    ; 显示减法结果
    MOV AH, 2
    MOV DH, 7
    MOV DL, 25
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_SUB
    INT 21H
    
    ; ===== 执行乘法 =====
    MOV AX, NUM1
    MUL NUM2                 ; DX:AX = 425
    MOV RESULT_MUL, AX       ; 保存低16位
    
    ; 显示乘法结果
    MOV AH, 2
    MOV DH, 9
    MOV DL, 25
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_MUL
    INT 21H
    
    ; ===== 执行除法 =====
    MOV AX, NUM1
    MOV DX, 0                ; DX:AX = 被除数
    DIV NUM2                 ; AX = 商(1), DX = 余数(8)
    MOV RESULT_DIV_Q, AX
    MOV RESULT_DIV_R, DX
    
    ; 显示除法结果
    MOV AH, 2
    MOV DH, 11
    MOV DL, 25
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_DIV
    INT 21H
    
    ; 显示完成信息
    MOV AH, 2
    MOV DH, 14
    MOV DL, 27
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_DONE
    INT 21H
    
    ; 程序结束
    MOV AH, 4CH
    INT 21H
    
CODE ENDS
END START