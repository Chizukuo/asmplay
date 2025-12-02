; ========================================
; 字符串处理演示程序
; 功能：字符串操作（长度计算、反转）
; 算法：双指针反转法
; ========================================

DATA SEGMENT
    SOURCE     DB 'HELLO WORLD!$'    ; 源字符串
    DEST       DB 20 DUP(0)          ; 目标缓冲区
    TITLE      DB '=== STRING OPERATIONS ===$'
    MSG_ORIG   DB 'Original: $'
    MSG_REV    DB 'Reversed: $'
    MSG_LEN    DB 'Length: $'
    LINE       DB '--------------------$'
DATA ENDS

CODE SEGMENT
    ASSUME CS:CODE, DS:DATA, ES:DATA
    
START:
    ; 初始化数据段
    MOV AX, DATA
    MOV DS, AX
    MOV ES, AX       ; ES 也指向数据段
    
    ; 清屏 - 紫色背景白字 (5FH = 紫底白字)
    MOV AH, 6
    MOV AL, 0
    MOV BH, 5FH
    MOV CX, 0
    MOV DX, 184FH
    INT 10H
    
    ; 显示标题
    MOV AH, 2
    MOV DH, 2
    MOV DL, 26
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
    
    ; 显示原字符串
    MOV AH, 2
    MOV DH, 6
    MOV DL, 20
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_ORIG
    INT 21H
    MOV DX, OFFSET SOURCE
    INT 21H
    
    ; ===== 计算字符串长度 =====
    LEA SI, SOURCE
    MOV CX, 0        ; 长度计数器
    
COUNT_LOOP:
    MOV AL, [SI]     ; 读取当前字符
    CMP AL, '$'      ; 检查是否到达结束符
    JE COUNT_DONE    ; 如果是，结束计数
    INC SI           ; 移动到下一个字符
    INC CX           ; 长度加1
    JMP COUNT_LOOP
    
COUNT_DONE:
    ; 显示字符串长度
    MOV AH, 2
    MOV DH, 8
    MOV DL, 20
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_LEN
    INT 21H
    
    ; 显示长度数字（假设长度 < 10）
    MOV AX, CX
    ADD AL, '0'
    MOV DL, AL
    MOV AH, 2
    INT 21H
    
    ; ===== 反转字符串 =====
    ; SI 指向源字符串开头，DI 指向目标字符串末尾
    LEA SI, SOURCE
    LEA DI, DEST
    ADD DI, CX       ; DI 指向末尾+1
    DEC DI           ; DI 指向最后一个位置
    
    PUSH CX          ; 保存长度
    
REVERSE_LOOP:
    MOV AL, [SI]     ; 读取源字符
    CMP AL, '$'      ; 检查结束符
    JE REVERSE_DONE
    MOV [DI], AL     ; 写入目标位置
    INC SI           ; 源指针前进
    DEC DI           ; 目标指针后退
    JMP REVERSE_LOOP
    
REVERSE_DONE:
    POP CX           ; 恢复长度
    ; 添加字符串结束符
    LEA DI, DEST
    ADD DI, CX
    MOV BYTE PTR [DI], '$'
    
    ; 显示反转后的字符串
    MOV AH, 2
    MOV DH, 10
    MOV DL, 20
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_REV
    INT 21H
    MOV DX, OFFSET DEST
    INT 21H
    
    ; 显示完成信息
    MOV AH, 2
    MOV DH, 13
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