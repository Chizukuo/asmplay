; ========================================
; 斐波那契数列程序
; 功能：计算并显示斐波那契数列
; 公式：F(n) = F(n-1) + F(n-2)
; F(0)=0, F(1)=1, F(2)=1, F(3)=2, ...
; ========================================

DATA SEGMENT
    TITLE      DB '=== FIBONACCI SEQUENCE ===$'
    COUNT      DW 10              ; 计算前10项
    LABEL_NUM  DB 'F($'
    LABEL_EQ   DB ') = $'
    CRLF       DB 0DH, 0AH, '$'  ; 回车换行
DATA ENDS

CODE SEGMENT
    ASSUME CS:CODE, DS:DATA
    
START:
    ; 初始化数据段
    MOV AX, DATA
    MOV DS, AX
    
    ; 清屏 - 绿色背景黄字 (2EH = 绿底黄字)
    MOV AH, 6
    MOV AL, 0
    MOV BH, 2EH
    MOV CX, 0
    MOV DX, 184FH
    INT 10H
    
    ; 显示标题
    MOV AH, 2
    MOV DH, 2
    MOV DL, 25
    MOV BH, 0
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET TITLE
    INT 21H
    
    ; ===== 计算斐波那契数列 =====
    ; 初始化前两项
    MOV AX, 0        ; F(0) = 0
    MOV BX, 1        ; F(1) = 1
    MOV CX, COUNT    ; 循环次数
    MOV DH, 5        ; 起始行号
    MOV SI, 0        ; 项数计数器
    
FIB_LOOP:
    ; 设置光标位置
    PUSH AX
    MOV AH, 2
    MOV DL, 25       ; 列号
    INT 10H
    POP AX
    
    ; 显示序号 F(n)
    PUSH AX
    MOV AH, 2
    MOV DL, 'F'
    INT 21H
    MOV DL, '('
    INT 21H
    ; 显示序号数字
    MOV AX, SI
    ADD AL, '0'
    MOV DL, AL
    MOV AH, 2
    INT 21H
    MOV DL, ')'
    INT 21H
    MOV DL, ' '
    INT 21H
    MOV DL, '='
    INT 21H
    MOV DL, ' '
    INT 21H
    POP AX
    
    ; 可视化显示（星号表示大小）
    PUSH CX
    PUSH AX
    MOV CX, AX
    CMP CX, 25       ; 最多显示25个星号
    JLE SHOW_STARS
    MOV CX, 25
    
SHOW_STARS:
    CMP CX, 0
    JE SKIP_STARS
STAR_LOOP:
    PUSH CX
    MOV AH, 2
    MOV DL, '*'
    INT 21H
    POP CX
    LOOP STAR_LOOP
    
SKIP_STARS:
    POP AX
    POP CX
    
    ; 计算下一项 F(n+1) = F(n) + F(n-1)
    PUSH DX          ; 保存 DH (行号)
    MOV DX, AX       ; DX = F(n-1)
    ADD DX, BX       ; DX = F(n-1) + F(n)
    MOV AX, BX       ; AX = F(n)
    MOV BX, DX       ; BX = F(n+1)
    POP DX           ; 恢复 DH
    
    INC DH           ; 下一行
    INC SI           ; 下一项
    LOOP FIB_LOOP
    
    ; 显示完成信息
    MOV AH, 2
    MOV DH, 17
    MOV DL, 30
    INT 10H
    MOV AH, 2
    MOV DL, 'D'
    INT 21H
    MOV DL, 'o'
    INT 21H
    MOV DL, 'n'
    INT 21H
    MOV DL, 'e'
    INT 21H
    MOV DL, '!'
    INT 21H
    
    ; 程序结束
    MOV AH, 4CH
    INT 21H
    
CODE ENDS
END START