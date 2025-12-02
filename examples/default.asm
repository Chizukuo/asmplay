; ========================================
; 综合演示程序
; 功能：展示 8086 汇编语言基础操作
; 包括：屏幕控制、字符串输出、寄存器操作、循环
; ========================================

DATA SEGMENT
    TITLE      DB '=== 8086 SIMULATOR ===$'
    INFO1      DB 'Register Operations$'
    INFO2      DB 'Loop Demonstration$'
    LOOP_MSG   DB 'Counting: $'
    DONE_MSG   DB ' Complete!$'
    LINE       DB '--------------------$'
    WELCOME    DB 'Welcome to ASM Demo!$'
DATA ENDS

CODE SEGMENT
    ASSUME CS:CODE, DS:DATA
    
START:
    ; 初始化数据段
    MOV AX, DATA
    MOV DS, AX
    
    ; ===== 1. 屏幕控制 =====
    ; 清屏 - 青色背景白字 (3FH = 青底白字)
    MOV AH, 6        ; 功能号：滚动窗口
    MOV AL, 0        ; 清空整个窗口
    MOV BH, 3FH      ; 颜色属性
    MOV CX, 0        ; 左上角 (0,0)
    MOV DX, 184FH    ; 右下角 (24,79)
    INT 10H
    
    ; ===== 2. 字符串输出演示 =====
    ; 显示标题
    MOV AH, 2        ; 设置光标位置
    MOV DH, 3        ; 行号
    MOV DL, 28       ; 列号
    MOV BH, 0        ; 页号
    INT 10H
    MOV AH, 9        ; 显示字符串
    MOV DX, OFFSET TITLE
    INT 21H
    
    ; 显示分隔线
    MOV AH, 2
    MOV DH, 4
    MOV DL, 30
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET LINE
    INT 21H
    
    ; 显示欢迎信息
    MOV AH, 2
    MOV DH, 6
    MOV DL, 28
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET WELCOME
    INT 21H
    
    ; ===== 3. 寄存器操作演示 =====
    ; 16位加法
    MOV AX, 1234H    ; AX = 1234H
    MOV BX, 5678H    ; BX = 5678H
    ADD AX, BX       ; AX = 68ACH
    
    ; 减法操作
    MOV CX, 100H     ; CX = 256
    SUB CX, 1        ; CX = 255 (0FFH)
    
    ; 逻辑运算
    MOV DX, 0FFFFH   ; DX = 全1
    AND DX, 0FF00H   ; DX = 0FF00H
    
    ; ===== 4. 循环演示 =====
    MOV AH, 2
    MOV DH, 10
    MOV DL, 30
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET LOOP_MSG
    INT 21H
    
    ; 循环打印数字 1-5
    MOV CX, 5        ; 循环计数器
    MOV BL, '1'      ; 起始字符
    
LOOP_START:
    PUSH CX          ; 保存循环计数器
    
    MOV AH, 2        ; 显示单个字符
    MOV DL, BL       ; 字符内容
    INT 21H
    
    ; 显示空格分隔
    MOV DL, ' '
    INT 21H
    
    INC BL           ; 下一个字符
    POP CX           ; 恢复循环计数器
    LOOP LOOP_START  ; 循环
    
    ; 显示完成信息
    MOV AH, 9
    MOV DX, OFFSET DONE_MSG
    INT 21H
    
    ; 程序结束
    MOV AH, 4CH
    INT 21H
    
CODE ENDS
END START