; ========================================
; 时钟演示程序
; 功能：显示系统日期和时间
; 按键：D=日期, T=时间, Q=退出
; ========================================

STACK SEGMENT STACK
      DW 200 DUP (?)
STACK ENDS

DATA SEGMENT
      ; 屏幕缓冲区
      SPACE    DB 1000 DUP (' ')
      
      ; 边框图案（使用 IBM PC 扩展 ASCII 字符）
      PATTERN  DB 6 DUP (' '),0C9H,26 DUP (0CDH),0BBH,6 DUP (' ')
               DB 6 DUP (' '),0BAH,26 DUP (20H),0BAH,6 DUP (' ')
               DB 6 DUP (' '),0C8H,26 DUP (0CDH),0BCH,6 DUP (' ')
      
      ; 显示缓冲区
      DBUFFER  DB 8 DUP (':'),12 DUP (' ')     ; 时间缓冲区
      DBUFFER1 DB 20 DUP (' ')                  ; 日期缓冲区
      
      ; 提示信息
      STR      DB 0DH,0AH,'PRESS D=DATE T=TIME Q=QUIT: $'
      TITLE    DB '=== CLOCK DEMO ===$'
DATA ENDS

CODE SEGMENT
      ASSUME CS:CODE, DS:DATA, ES:DATA, SS:STACK

START:
       ; 设置视频模式（40列彩色文本）
       MOV AX, 0001H
       INT 10H
       
       ; 初始化数据段
       MOV AX, DATA
       MOV DS, AX
       MOV ES, AX

       ; 清空屏幕（填充空格）
       MOV BP, OFFSET SPACE
       MOV DX, 0B00H      ; 起始位置 (11,0)
       MOV CX, 1000       ; 字符数量
       MOV BX, 0040H      ; 颜色属性（黑底红字）
       MOV AX, 1300H      ; 功能号：写字符串
       INT 10H

       ; 绘制边框
       MOV BP, OFFSET PATTERN
       MOV DX, 0B00H      ; 起始位置
       MOV CX, 120        ; 字符数量
       MOV BX, 004EH      ; 颜色属性（黑底黄字）
       MOV AX, 1301H      ; 功能号：写字符串（带属性）
       INT 10H

       ; 显示提示信息
       LEA DX, STR
       MOV AH, 9
       INT 21H

MAIN_LOOP:
       ; 等待用户输入
       MOV AH, 1          ; 功能号：读取字符
       INT 21H
       
       ; 检查按键
       CMP AL, 44H        ; 'D' - 显示日期
       JNE CHECK_TIME
       CALL DATE
       JMP MAIN_LOOP

CHECK_TIME:
       CMP AL, 54H        ; 'T' - 显示时间
       JNE CHECK_QUIT
       CALL TIME
       JMP MAIN_LOOP

CHECK_QUIT:
       CMP AL, 51H        ; 'Q' - 退出
       JNE MAIN_LOOP
       
       ; 退出程序
       MOV AH, 4CH
       INT 21H

; ===== DATE 过程：显示系统日期 =====
DATE PROC NEAR
DISPLAY:
       ; 获取系统日期 (AL=周, CX=年, DH=月, DL=日)
       MOV AH, 2AH
       INT 21H
       
       ; 转换年份（4位数）
       MOV SI, 0
       MOV AX, CX         ; AX = 年份
       MOV BX, 100
       DIV BL             ; AL = 前两位, AH = 后两位
       MOV BL, AH
       CALL BCDASC1       ; 转换前两位
       MOV AL, BL
       CALL BCDASC1       ; 转换后两位
       INC SI             ; 添加分隔符
       
       ; 转换月份（2位数）
       MOV AL, DH
       CALL BCDASC1
       INC SI             ; 添加分隔符
       
       ; 转换日期（2位数）
       MOV AL, DL
       CALL BCDASC1

       ; 显示日期字符串
       MOV BP, OFFSET DBUFFER1
       MOV DX, 0C0DH      ; 位置 (12,13)
       MOV CX, 20
       MOV BX, 004EH      ; 颜色属性
       MOV AX, 1301H
       INT 10H

       ; 重置光标位置
       MOV AH, 02H
       MOV DX, 0300H
       MOV BH, 0
       INT 10H

       ; 延时显示（约3秒）
       MOV BX, 0018H
REPEA: MOV CX, 0FFFFH
REPEAT:LOOP REPEAT
       DEC BX
       JNZ REPEA

       ; 检查是否有按键
       MOV AH, 01H
       INT 16H
       JE DISPLAY         ; 没有按键，继续显示
       JMP MAIN_LOOP      ; 有按键，返回主循环
       RET
DATE ENDP

; ===== TIME 过程：显示系统时间 =====
TIME PROC NEAR
DISPLAY1:
       ; 获取系统时间 (CH=时, CL=分, DH=秒, DL=百分秒)
       MOV SI, 0
       MOV AH, 2CH
       INT 21H
       
       ; 转换小时
       MOV AL, CH
       CALL BCDASC
       INC SI
       
       ; 转换分钟
       MOV AL, CL
       CALL BCDASC
       INC SI
       
       ; 转换秒
       MOV AL, DH
       CALL BCDASC

       ; 显示时间字符串
       MOV BP, OFFSET DBUFFER
       MOV DX, 0C0DH      ; 位置 (12,13)
       MOV CX, 20
       MOV BX, 004EH      ; 颜色属性
       MOV AX, 1301H
       INT 10H

       ; 重置光标位置
       MOV AH, 02H
       MOV DX, 0300H
       MOV BH, 0
       INT 10H

       ; 延时显示（约1秒）
       MOV BX, 0018H
RE:    MOV CX, 0FFFFH
REA:   LOOP REA
       DEC BX
       JNZ RE

       ; 检查是否有按键
       MOV AH, 01H
       INT 16H
       JE DISPLAY1        ; 没有按键，继续显示
       JMP MAIN_LOOP      ; 有按键，返回主循环
       RET
TIME ENDP

; ===== BCDASC 过程：BCD 转 ASCII（用于时间） =====
; 输入：AL = 要转换的数字，SI = 缓冲区位置
; 输出：将数字转换为两个 ASCII 字符存入 DBUFFER
BCDASC PROC NEAR
       PUSH BX
       CBW                ; AL 扩展到 AX
       MOV BL, 10
       DIV BL             ; AL = 十位, AH = 个位
       ADD AL, '0'        ; 转换为 ASCII
       MOV DBUFFER[SI], AL
       INC SI
       ADD AH, '0'
       MOV DBUFFER[SI], AH
       INC SI
       POP BX
       RET
BCDASC ENDP

; ===== BCDASC1 过程：BCD 转 ASCII（用于日期） =====
; 输入：AL = 要转换的数字，SI = 缓冲区位置
; 输出：将数字转换为两个 ASCII 字符存入 DBUFFER1
BCDASC1 PROC NEAR
       PUSH BX
       CBW                ; AL 扩展到 AX
       MOV BL, 10
       DIV BL             ; AL = 十位, AH = 个位
       ADD AL, '0'        ; 转换为 ASCII
       MOV DBUFFER1[SI], AL
       INC SI
       ADD AH, '0'
       MOV DBUFFER1[SI], AH
       INC SI
       POP BX
       RET
BCDASC1 ENDP

CODE ENDS
END START