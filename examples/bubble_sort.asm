; ========================================
; 冒泡排序示例程序
; 功能：对数组进行升序排序并显示结果
; 算法：冒泡排序 O(n²)
; ========================================

DATA SEGMENT
    ARRAY DB 5, 2, 8, 1, 9, 3, 7, 4, 6    ; 待排序数组
    COUNT DW 9                             ; 数组元素个数
    MSG_BEFORE DB 'Before: 5,2,8,1,9,3,7,4,6$'
    MSG_AFTER  DB 'After:  1,2,3,4,5,6,7,8,9$'
    TITLE      DB '=== BUBBLE SORT ===$'
DATA ENDS

CODE SEGMENT
    ASSUME CS:CODE, DS:DATA
    
START:
    ; 初始化数据段
    MOV AX, DATA
    MOV DS, AX
    
    ; 清屏 - 蓝色背景白字 (1FH = 蓝底白字)
    MOV AH, 6        ; 功能号：滚动窗口
    MOV AL, 0        ; 清空整个窗口
    MOV BH, 1FH      ; 颜色属性
    MOV CX, 0        ; 左上角 (0,0)
    MOV DX, 184FH    ; 右下角 (24,79)
    INT 10H
    
    ; 显示标题
    MOV AH, 2        ; 设置光标位置
    MOV DH, 3        ; 行号
    MOV DL, 28       ; 列号
    MOV BH, 0        ; 页号
    INT 10H
    MOV AH, 9        ; 显示字符串
    MOV DX, OFFSET TITLE
    INT 21H
    
    ; 显示排序前的数组
    MOV AH, 2
    MOV DH, 6
    MOV DL, 20
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_BEFORE
    INT 21H
    
    ; ===== 冒泡排序算法 =====
    ; 外层循环：需要 n-1 趟
    MOV CX, COUNT
    DEC CX           ; CX = n-1
    
OUTER_LOOP:
    PUSH CX          ; 保存外层循环计数器
    MOV SI, 0        ; SI 指向数组起始
    MOV CX, COUNT    ; 内层循环次数
    DEC CX           ; CX = n-1
    
    ; 内层循环：相邻元素比较
INNER_LOOP:
    MOV AL, ARRAY[SI]      ; AL = ARRAY[i]
    MOV BL, ARRAY[SI+1]    ; BL = ARRAY[i+1]
    CMP AL, BL             ; 比较相邻元素
    JLE NO_SWAP            ; 如果 AL <= BL，不交换
    
    ; 交换 ARRAY[i] 和 ARRAY[i+1]
    MOV ARRAY[SI], BL
    MOV ARRAY[SI+1], AL
    
NO_SWAP:
    INC SI           ; 移动到下一个元素
    LOOP INNER_LOOP  ; 继续内层循环
    
    POP CX           ; 恢复外层循环计数器
    LOOP OUTER_LOOP  ; 继续外层循环
    
    ; 显示排序后的数组
    MOV AH, 2
    MOV DH, 8
    MOV DL, 20
    INT 10H
    MOV AH, 9
    MOV DX, OFFSET MSG_AFTER
    INT 21H
    
    ; 程序结束
    MOV AH, 4CH      ; 终止程序
    INT 21H
    
CODE ENDS
END START