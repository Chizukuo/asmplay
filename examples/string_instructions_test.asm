; ========================================
; 字符串指令测试程序
; 测试 MOVSB, CMPSB, SCASB, LODSB, STOSB
; 以及 REP, REPE, REPNE 前缀
; ========================================

DATA SEGMENT
    SRC_STR    DB 'Hello, World!$'
    DEST_STR   DB 20 DUP(0)
    EQUAL_STR  DB 'Hello, World!$'
    DIFF_STR   DB 'Hello, ASM!$'
    SCAN_STR   DB 'Find the letter Z in this string$'
    FOUND_MSG  DB 'Found!$'
    NOT_FOUND  DB 'Not Found.$'
DATA ENDS

CODE SEGMENT
    ASSUME CS:CODE, DS:DATA, ES:DATA

START:
    MOV AX, DATA
    MOV DS, AX
    MOV ES, AX

    ; ----------------------------------------
    ; 测试 1: REP MOVSB (复制字符串)
    ; ----------------------------------------
    LEA SI, SRC_STR
    LEA DI, DEST_STR
    MOV CX, 13       ; 长度
    CLD              ; 正向
    REP MOVSB        ; 复制

    ; ----------------------------------------
    ; 测试 2: REPE CMPSB (比较相同字符串)
    ; ----------------------------------------
    LEA SI, SRC_STR
    LEA DI, EQUAL_STR
    MOV CX, 13
    CLD
    REPE CMPSB
    ; 此时 ZF 应为 1 (相等)

    ; ----------------------------------------
    ; 测试 3: REPE CMPSB (比较不同字符串)
    ; ----------------------------------------
    LEA SI, SRC_STR
    LEA DI, DIFF_STR
    MOV CX, 13
    CLD
    REPE CMPSB
    ; 此时 ZF 应为 0 (不相等)，SI/DI 指向第一个不匹配字符之后

    ; ----------------------------------------
    ; 测试 4: REPNE SCASB (扫描字符 'Z')
    ; ----------------------------------------
    LEA DI, SCAN_STR
    MOV CX, 30
    MOV AL, 'Z'
    CLD
    REPNE SCASB
    ; 如果找到，ZF=1

    ; ----------------------------------------
    ; 测试 5: STOSB (填充内存)
    ; ----------------------------------------
    LEA DI, DEST_STR
    MOV CX, 5
    MOV AL, 'A'
    REP STOSB        ; 将 DEST_STR 前5个字节填充为 'A'

    ; ----------------------------------------
    ; 测试 6: LODSB (手动循环)
    ; ----------------------------------------
    LEA SI, SRC_STR
    MOV CX, 5
LOOP_START:
    LODSB            ; AL = [SI], SI++
    ; 这里可以做一些处理，例如转大写
    LOOP LOOP_START

    MOV AH, 4CH
    INT 21H
CODE ENDS
END START
