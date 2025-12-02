# 8086 指令集文档

本文档详细说明了 Asmplay 模拟器支持的 8086 汇编指令集。

## 📑 目录

- [数据传输指令](#数据传输指令)
- [算术运算指令](#算术运算指令)
- [逻辑运算指令](#逻辑运算指令)
- [移位和循环指令](#移位和循环指令)
- [控制转移指令](#控制转移指令)
- [堆栈操作指令](#堆栈操作指令)
- [中断指令](#中断指令)
- [伪指令](#伪指令)
- [寻址方式](#寻址方式)

---

## 数据传输指令

### MOV - 数据传送

**语法**: `MOV dest, src`

**功能**: 将源操作数复制到目标操作数

**影响标志位**: 无

**示例**:
```assembly
MOV AX, 1234H        ; 立即数 -> 寄存器
MOV BX, AX           ; 寄存器 -> 寄存器
MOV [1000H], AX      ; 寄存器 -> 内存
MOV AX, [BX]         ; 内存 -> 寄存器
MOV AL, [SI]         ; 字节传送
MOV WORD PTR [BX], 100  ; 指定操作数大小
```

**限制**:
- 不能直接在两个内存操作数之间传送
- 不能直接传送立即数到段寄存器
- 源和目标必须大小匹配（字节/字）

---

### XCHG - 交换数据

**语法**: `XCHG op1, op2`

**功能**: 交换两个操作数的值

**影响标志位**: 无

**示例**:
```assembly
XCHG AX, BX          ; 交换 AX 和 BX
XCHG AL, BL          ; 交换字节
XCHG AX, [SI]        ; 交换寄存器和内存
```

---

### LEA - 加载有效地址

**语法**: `LEA reg, mem`

**功能**: 将内存操作数的有效地址（偏移量）加载到寄存器

**影响标志位**: 无

**示例**:
```assembly
LEA SI, ARRAY        ; 加载 ARRAY 的地址到 SI
LEA BX, [SI+100H]    ; 加载计算后的地址
```

---

### OFFSET - 取偏移地址

**语法**: `MOV reg, OFFSET symbol`

**功能**: 获取符号的偏移地址

**示例**:
```assembly
MOV DX, OFFSET MSG   ; 将 MSG 的偏移地址加载到 DX
```

---

## 算术运算指令

### ADD - 加法

**语法**: `ADD dest, src`

**功能**: dest = dest + src

**影响标志位**: CF, ZF, SF, OF, PF, AF

**示例**:
```assembly
ADD AX, BX           ; AX = AX + BX
ADD AL, 10H          ; AL = AL + 10H
ADD [BX], CX         ; [BX] = [BX] + CX
ADD AX, [SI]         ; AX = AX + [SI]
```

---

### SUB - 减法

**语法**: `SUB dest, src`

**功能**: dest = dest - src

**影响标志位**: CF, ZF, SF, OF, PF, AF

**示例**:
```assembly
SUB AX, BX           ; AX = AX - BX
SUB CX, 1            ; CX = CX - 1
SUB [BX], 10         ; [BX] = [BX] - 10
```

---

### INC - 自增

**语法**: `INC op`

**功能**: op = op + 1

**影响标志位**: ZF, SF, OF, PF, AF（不影响 CF）

**示例**:
```assembly
INC AX               ; AX = AX + 1
INC BYTE PTR [BX]    ; [BX] = [BX] + 1
INC SI               ; SI = SI + 1
```

---

### DEC - 自减

**语法**: `DEC op`

**功能**: op = op - 1

**影响标志位**: ZF, SF, OF, PF, AF（不影响 CF）

**示例**:
```assembly
DEC CX               ; CX = CX - 1
DEC BYTE PTR [SI]    ; [SI] = [SI] - 1
```

---

### MUL - 无符号乘法

**语法**: `MUL src`

**功能**:
- 字节操作: AX = AL × src
- 字操作: DX:AX = AX × src

**影响标志位**: CF, OF（结果溢出时置位）

**示例**:
```assembly
MUL BL               ; AX = AL × BL
MUL CX               ; DX:AX = AX × CX
MUL BYTE PTR [BX]    ; AX = AL × [BX]
```

---

### DIV - 无符号除法

**语法**: `DIV src`

**功能**:
- 字节操作: AL = AX ÷ src (商), AH = AX mod src (余数)
- 字操作: AX = DX:AX ÷ src (商), DX = DX:AX mod src (余数)

**影响标志位**: 未定义

**示例**:
```assembly
DIV BL               ; AL = AX ÷ BL, AH = AX mod BL
DIV CX               ; AX = DX:AX ÷ CX, DX = 余数
```

**注意**: 如果除数为 0 或商太大，会产生除法错误中断（INT 0）

---

### NEG - 取反（求补）

**语法**: `NEG op`

**功能**: op = 0 - op（二进制补码）

**影响标志位**: CF, ZF, SF, OF, PF, AF

**示例**:
```assembly
NEG AX               ; AX = -AX
NEG BYTE PTR [BX]    ; [BX] = -[BX]
```

---

## 逻辑运算指令

### AND - 逻辑与

**语法**: `AND dest, src`

**功能**: dest = dest & src（按位与）

**影响标志位**: CF=0, OF=0, ZF, SF, PF

**示例**:
```assembly
AND AX, 0FFH         ; 保留 AX 的低字节，高字节清零
AND AL, BL           ; AL = AL & BL
AND [BX], 7FH        ; 清除 [BX] 的最高位
```

**用途**:
- 清除特定位（与 0 进行 AND）
- 保留特定位（与 1 进行 AND）
- 测试某位是否为 1

---

### OR - 逻辑或

**语法**: `OR dest, src`

**功能**: dest = dest | src（按位或）

**影响标志位**: CF=0, OF=0, ZF, SF, PF

**示例**:
```assembly
OR AX, 80H           ; 设置 AX 的第 7 位
OR AL, AL            ; 测试 AL 是否为 0
OR AX, BX            ; AX = AX | BX
```

**用途**:
- 设置特定位（与 1 进行 OR）
- 合并位模式

---

### XOR - 逻辑异或

**语法**: `XOR dest, src`

**功能**: dest = dest ^ src（按位异或）

**影响标志位**: CF=0, OF=0, ZF, SF, PF

**示例**:
```assembly
XOR AX, AX           ; 快速清零 AX（常用技巧）
XOR AL, BL           ; AL = AL ^ BL
XOR [BX], 0FFH       ; 翻转 [BX] 的所有位
```

**用途**:
- 快速清零（自己与自己异或）
- 翻转特定位（与 1 进行 XOR）
- 简单加密

---

### NOT - 逻辑非

**语法**: `NOT op`

**功能**: op = ~op（按位取反）

**影响标志位**: 无

**示例**:
```assembly
NOT AX               ; 翻转 AX 的所有位
NOT BYTE PTR [BX]    ; 翻转 [BX] 的所有位
```

---

### TEST - 测试

**语法**: `TEST op1, op2`

**功能**: 执行 op1 & op2，设置标志位但不保存结果

**影响标志位**: CF=0, OF=0, ZF, SF, PF

**示例**:
```assembly
TEST AL, 80H         ; 测试 AL 的最高位
TEST AX, AX          ; 测试 AX 是否为 0
TEST [BX], 0FH       ; 测试 [BX] 的低 4 位
```

**用途**: 常用于条件判断，类似 AND 但不修改操作数

---

### CMP - 比较

**语法**: `CMP op1, op2`

**功能**: 执行 op1 - op2，设置标志位但不保存结果

**影响标志位**: CF, ZF, SF, OF, PF, AF

**示例**:
```assembly
CMP AX, BX           ; 比较 AX 和 BX
CMP AL, 'A'          ; 比较 AL 和字符 'A'
CMP BYTE PTR [SI], 0 ; 比较内存字节和 0
```

**用途**: 与条件跳转指令配合使用进行判断

**标志位含义**:
- ZF=1: op1 == op2
- CF=1: op1 < op2 (无符号)
- SF≠OF: op1 < op2 (有符号)

---

## 移位和循环指令

### SHL / SAL - 逻辑左移 / 算术左移

**语法**: `SHL dest, count` 或 `SAL dest, count`

**功能**: 将 dest 左移 count 位，右边补 0

**影响标志位**: CF（最后移出的位）, ZF, SF, PF

**示例**:
```assembly
SHL AX, 1            ; AX = AX × 2
SHL BL, CL           ; BL 左移 CL 位
SAL WORD PTR [BX], 1 ; [BX] 左移 1 位
```

**注意**: SHL 和 SAL 完全相同

---

### SHR - 逻辑右移

**语法**: `SHR dest, count`

**功能**: 将 dest 右移 count 位，左边补 0

**影响标志位**: CF（最后移出的位）, ZF, SF, PF

**示例**:
```assembly
SHR AX, 1            ; AX = AX ÷ 2 (无符号)
SHR BL, CL           ; BL 右移 CL 位
```

---

### SAR - 算术右移

**语法**: `SAR dest, count`

**功能**: 将 dest 右移 count 位，左边补符号位

**影响标志位**: CF（最后移出的位）, ZF, SF, PF

**示例**:
```assembly
SAR AX, 1            ; AX = AX ÷ 2 (有符号)
SAR BL, CL           ; BL 算术右移 CL 位
```

**用途**: 有符号数除以 2 的幂

---

### ROL - 循环左移

**语法**: `ROL dest, count`

**功能**: 将 dest 循环左移 count 位（移出的位从右边进入）

**影响标志位**: CF（最后循环的位）, OF

**示例**:
```assembly
ROL AX, 1            ; AX 循环左移 1 位
ROL BL, CL           ; BL 循环左移 CL 位
```

---

### ROR - 循环右移

**语法**: `ROR dest, count`

**功能**: 将 dest 循环右移 count 位（移出的位从左边进入）

**影响标志位**: CF（最后循环的位）, OF

**示例**:
```assembly
ROR AX, 1            ; AX 循环右移 1 位
ROR BL, CL           ; BL 循环右移 CL 位
```

---

## 控制转移指令

### JMP - 无条件跳转

**语法**: `JMP label`

**功能**: 无条件跳转到指定标签

**影响标志位**: 无

**示例**:
```assembly
JMP START            ; 跳转到 START 标签
JMP SHORT SKIP       ; 短跳转（-128 到 +127 字节）
```

---

### JZ / JE - 零标志/相等跳转

**语法**: `JZ label` 或 `JE label`

**功能**: 如果 ZF=1 则跳转（结果为 0 或相等）

**示例**:
```assembly
CMP AX, BX
JE EQUAL             ; 如果 AX == BX 则跳转
TEST AL, AL
JZ IS_ZERO           ; 如果 AL == 0 则跳转
```

---

### JNZ / JNE - 非零/不等跳转

**语法**: `JNZ label` 或 `JNE label`

**功能**: 如果 ZF=0 则跳转（结果非 0 或不等）

**示例**:
```assembly
CMP AX, BX
JNE NOT_EQUAL        ; 如果 AX != BX 则跳转
```

---

### JG / JNLE - 大于跳转（有符号）

**语法**: `JG label` 或 `JNLE label`

**功能**: 如果 ZF=0 且 SF=OF 则跳转（op1 > op2）

**示例**:
```assembly
CMP AX, BX
JG GREATER           ; 如果 AX > BX（有符号）则跳转
```

---

### JL / JNGE - 小于跳转（有符号）

**语法**: `JL label` 或 `JNGE label`

**功能**: 如果 SF≠OF 则跳转（op1 < op2）

**示例**:
```assembly
CMP AX, BX
JL LESS              ; 如果 AX < BX（有符号）则跳转
```

---

### JGE / JNL - 大于等于跳转（有符号）

**语法**: `JGE label` 或 `JNL label`

**功能**: 如果 SF=OF 则跳转（op1 >= op2）

**示例**:
```assembly
CMP AX, 0
JGE NON_NEGATIVE     ; 如果 AX >= 0 则跳转
```

---

### JLE / JNG - 小于等于跳转（有符号）

**语法**: `JLE label` 或 `JNG label`

**功能**: 如果 ZF=1 或 SF≠OF 则跳转（op1 <= op2）

**示例**:
```assembly
CMP CX, 10
JLE LESS_OR_EQUAL    ; 如果 CX <= 10 则跳转
```

---

### JA / JNBE - 大于跳转（无符号）

**语法**: `JA label` 或 `JNBE label`

**功能**: 如果 CF=0 且 ZF=0 则跳转（op1 > op2，无符号）

**示例**:
```assembly
CMP AL, 'Z'
JA ABOVE             ; 如果 AL > 'Z'（无符号）则跳转
```

---

### JB / JNAE / JC - 小于跳转（无符号）

**语法**: `JB label` 或 `JNAE label` 或 `JC label`

**功能**: 如果 CF=1 则跳转（op1 < op2，无符号或进位）

**示例**:
```assembly
CMP AL, 'A'
JB BELOW             ; 如果 AL < 'A'（无符号）则跳转
```

---

### JAE / JNB / JNC - 大于等于跳转（无符号）

**语法**: `JAE label` 或 `JNB label` 或 `JNC label`

**功能**: 如果 CF=0 则跳转（op1 >= op2，无符号或无进位）

**示例**:
```assembly
CMP AL, 'A'
JAE ABOVE_OR_EQUAL   ; 如果 AL >= 'A' 则跳转
```

---

### JBE / JNA - 小于等于跳转（无符号）

**语法**: `JBE label` 或 `JNA label`

**功能**: 如果 CF=1 或 ZF=1 则跳转（op1 <= op2，无符号）

**示例**:
```assembly
CMP AL, 'Z'
JBE BELOW_OR_EQUAL   ; 如果 AL <= 'Z' 则跳转
```

---

### JS - 符号位跳转

**语法**: `JS label`

**功能**: 如果 SF=1 则跳转（结果为负）

---

### JNS - 非符号位跳转

**语法**: `JNS label`

**功能**: 如果 SF=0 则跳转（结果为正或零）

---

### JO - 溢出跳转

**语法**: `JO label`

**功能**: 如果 OF=1 则跳转（有符号溢出）

---

### JNO - 不溢出跳转

**语法**: `JNO label`

**功能**: 如果 OF=0 则跳转（无溢出）

---

### LOOP - 循环

**语法**: `LOOP label`

**功能**: CX = CX - 1，如果 CX ≠ 0 则跳转到 label

**影响标志位**: 无

**示例**:
```assembly
MOV CX, 10           ; 循环 10 次
LOOP_START:
    ; 循环体
    LOOP LOOP_START  ; CX--, 如果 CX≠0 则跳转
```

---

### LOOPZ / LOOPE - 为零/相等时循环

**语法**: `LOOPZ label` 或 `LOOPE label`

**功能**: CX = CX - 1，如果 CX ≠ 0 且 ZF=1 则跳转

---

### LOOPNZ / LOOPNE - 非零/不等时循环

**语法**: `LOOPNZ label` 或 `LOOPNE label`

**功能**: CX = CX - 1，如果 CX ≠ 0 且 ZF=0 则跳转

---

### CALL - 调用子程序

**语法**: `CALL label`

**功能**: 
1. 将返回地址（下一条指令）压入堆栈
2. 跳转到指定标签

**影响标志位**: 无

**示例**:
```assembly
CALL SUBROUTINE      ; 调用子程序
; ... 子程序返回后从这里继续

SUBROUTINE:
    ; 子程序代码
    RET              ; 返回
```

---

### RET - 从子程序返回

**语法**: `RET` 或 `RET n`

**功能**: 
1. 从堆栈弹出返回地址
2. 可选：弹出 n 字节参数
3. 跳转到返回地址

**影响标志位**: 无

**示例**:
```assembly
RET                  ; 简单返回
RET 4                ; 返回并弹出 4 字节参数
```

---

## 堆栈操作指令

### PUSH - 压栈

**语法**: `PUSH op`

**功能**: 
1. SP = SP - 2
2. [SP] = op

**影响标志位**: 无

**示例**:
```assembly
PUSH AX              ; 将 AX 压入堆栈
PUSH BX              ; 将 BX 压入堆栈
PUSH [SI]            ; 将内存字压入堆栈
```

**注意**: 只能压入字（16位），不能压入字节

---

### POP - 出栈

**语法**: `POP op`

**功能**: 
1. op = [SP]
2. SP = SP + 2

**影响标志位**: 无

**示例**:
```assembly
POP BX               ; 从堆栈弹出到 BX
POP AX               ; 从堆栈弹出到 AX
POP [SI]             ; 从堆栈弹出到内存字
```

**注意**: 
- PUSH 和 POP 必须配对使用
- 遵循 LIFO（后进先出）原则
- 堆栈向低地址增长

---

## 中断指令

### INT - 软件中断

**语法**: `INT n`

**功能**: 调用中断服务程序

**影响标志位**: 取决于中断服务

---

### INT 10H - BIOS 视频服务

#### AH=00H - 设置视频模式

**功能**: 设置显示模式

**参数**:
- AL: 模式号（03H = 80x25 文本模式）

**示例**:
```assembly
MOV AH, 00H
MOV AL, 03H          ; 80x25 彩色文本模式
INT 10H
```

---

#### AH=02H - 设置光标位置

**功能**: 移动光标到指定位置

**参数**:
- BH: 页号（通常为 0）
- DH: 行号（0-24）
- DL: 列号（0-79）

**示例**:
```assembly
MOV AH, 02H
MOV BH, 0            ; 第 0 页
MOV DH, 10           ; 第 10 行
MOV DL, 20           ; 第 20 列
INT 10H
```

---

#### AH=06H - 滚动窗口向上 / 清屏

**功能**: 清屏或滚动窗口

**参数**:
- AL: 滚动行数（0 = 清空整个窗口）
- BH: 填充属性（颜色）
- CH, CL: 窗口左上角（行，列）
- DH, DL: 窗口右下角（行，列）

**颜色属性** (BH):
- 高 4 位: 背景色
- 低 4 位: 前景色

**颜色代码**:
```
0=黑   1=蓝   2=绿   3=青   4=红   5=紫   6=棕   7=白
8=灰   9=亮蓝 A=亮绿 B=亮青 C=亮红 D=亮紫 E=黄  F=亮白
```

**示例**:
```assembly
; 清屏 - 蓝底白字
MOV AH, 06H
MOV AL, 0            ; 清空整个窗口
MOV BH, 1FH          ; 蓝底(1)白字(F)
MOV CX, 0            ; 左上角 (0,0)
MOV DX, 184FH        ; 右下角 (24,79)
INT 10H
```

---

#### AH=09H - 显示字符和属性

**功能**: 在当前光标位置显示字符（带属性）

**参数**:
- AL: 要显示的字符
- BH: 页号
- BL: 字符属性（颜色）
- CX: 重复次数

**示例**:
```assembly
MOV AH, 09H
MOV AL, 'A'          ; 字符 'A'
MOV BH, 0            ; 页 0
MOV BL, 0EH          ; 黄色
MOV CX, 5            ; 显示 5 次
INT 10H
```

---

#### AH=0AH - 显示字符（无属性）

**功能**: 在当前光标位置显示字符（使用当前属性）

**参数**:
- AL: 要显示的字符
- BH: 页号
- CX: 重复次数

---

#### AH=0EH - 显示字符（TTY 模式）

**功能**: 电传打字机模式输出字符（自动换行）

**参数**:
- AL: 字符
- BL: 前景色（图形模式）

**示例**:
```assembly
MOV AH, 0EH
MOV AL, 'H'
INT 10H
```

---

### INT 16H - BIOS 键盘服务

#### AH=00H - 读取键盘字符（阻塞）

**功能**: 等待键盘输入并返回

**返回**:
- AH: 扫描码
- AL: ASCII 码

**示例**:
```assembly
MOV AH, 00H
INT 16H              ; 等待按键
; AL 包含 ASCII 码
```

---

#### AH=01H - 检查键盘状态

**功能**: 检查键盘缓冲区是否有按键（非阻塞）

**返回**:
- ZF=1: 无按键
- ZF=0: 有按键（AH=扫描码，AL=ASCII码）

**示例**:
```assembly
CHECK_KEY:
    MOV AH, 01H
    INT 16H
    JZ NO_KEY        ; 无按键则跳转
    ; 有按键，但还未读取
    MOV AH, 00H
    INT 16H          ; 读取按键
    ; 处理按键...
NO_KEY:
```

---

### INT 21H - DOS 系统调用

#### AH=01H - 读取键盘字符（带回显）

**功能**: 从键盘读取一个字符并显示

**返回**:
- AL: 读取的字符

**示例**:
```assembly
MOV AH, 01H
INT 21H              ; 等待输入
; AL 包含输入的字符
```

---

#### AH=02H - 显示单个字符

**功能**: 在当前光标位置输出一个字符

**参数**:
- DL: 要显示的字符

**示例**:
```assembly
MOV AH, 02H
MOV DL, 'A'
INT 21H              ; 输出 'A'
```

---

#### AH=09H - 显示字符串

**功能**: 输出以 '$' 结尾的字符串

**参数**:
- DS:DX: 字符串地址

**示例**:
```assembly
DATA SEGMENT
    MSG DB 'Hello, World!$'
DATA ENDS

CODE SEGMENT
    MOV AX, DATA
    MOV DS, AX
    
    MOV AH, 09H
    MOV DX, OFFSET MSG
    INT 21H          ; 输出字符串
CODE ENDS
```

**注意**: 字符串必须以 '$' 结尾

---

#### AH=0AH - 读取字符串

**功能**: 从键盘读取字符串（带缓冲）

**参数**:
- DS:DX: 指向输入缓冲区

**缓冲区格式**:
```
字节 0: 缓冲区最大长度
字节 1: 实际读取字符数（返回）
字节 2+: 读取的字符
```

---

#### AH=4CH - 程序终止

**功能**: 终止程序并返回 DOS

**参数**:
- AL: 返回码（通常为 0）

**示例**:
```assembly
MOV AH, 4CH
MOV AL, 0            ; 返回码 0
INT 21H              ; 终止程序
```

**注意**: 这是推荐的程序终止方式

---

## 伪指令

### SEGMENT / ENDS - 段定义

**语法**:
```assembly
segname SEGMENT
    ; 段内容
segname ENDS
```

**示例**:
```assembly
DATA SEGMENT
    VAR1 DB 10
    VAR2 DW 1234H
DATA ENDS

CODE SEGMENT
    ; 代码
CODE ENDS
```

---

### ASSUME - 段寄存器关联

**语法**: `ASSUME segreg:segname, ...`

**功能**: 告诉汇编器段寄存器与段的关联

**示例**:
```assembly
ASSUME CS:CODE, DS:DATA, SS:STACK
```

---

### DB - 定义字节

**语法**: `name DB value [, value...]`

**功能**: 定义字节（8位）数据

**示例**:
```assembly
BYTE1 DB 10              ; 单个字节
BYTE2 DB 1, 2, 3, 4      ; 字节数组
MSG DB 'Hello$'          ; 字符串
BUFFER DB 100 DUP(0)     ; 100 个 0
```

---

### DW - 定义字

**语法**: `name DW value [, value...]`

**功能**: 定义字（16位）数据

**示例**:
```assembly
WORD1 DW 1234H           ; 单个字
ARRAY DW 10, 20, 30      ; 字数组
WORDS DW 50 DUP(?)       ; 50 个未初始化的字
```

---

### DD - 定义双字

**语法**: `name DD value [, value...]`

**功能**: 定义双字（32位）数据

**示例**:
```assembly
DWORD1 DD 12345678H      ; 单个双字
DWORDS DD 10 DUP(0)      ; 10 个双字初始化为 0
```

---

### DUP - 重复操作符

**语法**: `count DUP(value)`

**功能**: 重复定义相同的值

**示例**:
```assembly
ZEROS DB 100 DUP(0)      ; 100 个字节的 0
BUFFER DW 50 DUP(?)      ; 50 个未初始化的字
PATTERN DB 10 DUP(1,2,3) ; 重复 1,2,3 模式 10 次
```

---

### END - 程序结束

**语法**: `END [start_label]`

**功能**: 标记程序结束和入口点

**示例**:
```assembly
CODE SEGMENT
START:
    ; 程序代码
    MOV AH, 4CH
    INT 21H
CODE ENDS
END START                ; 入口点为 START
```

---

## 寻址方式

### 1. 立即数寻址

**格式**: `指令 reg, immediate`

**说明**: 操作数直接在指令中给出

**示例**:
```assembly
MOV AX, 1234H
ADD BX, 10
CMP AL, 'A'
```

---

### 2. 寄存器寻址

**格式**: `指令 reg1, reg2`

**说明**: 操作数在寄存器中

**示例**:
```assembly
MOV AX, BX
ADD CX, DX
XCHG AX, BX
```

---

### 3. 直接寻址

**格式**: `指令 reg, [address]`

**说明**: 操作数在指定内存地址中

**示例**:
```assembly
MOV AX, [1000H]      ; 从地址 1000H 读取
MOV [2000H], BX      ; 写入地址 2000H
```

---

### 4. 寄存器间接寻址

**格式**: `指令 reg, [BX/SI/DI/BP]`

**说明**: 操作数地址在寄存器中

**示例**:
```assembly
MOV AX, [BX]         ; AX = [DS:BX]
MOV [SI], CL         ; [DS:SI] = CL
MOV AX, [BP]         ; AX = [SS:BP] (注意默认段)
```

**默认段**:
- BX, SI, DI: DS 段
- BP: SS 段

---

### 5. 基址变址寻址

**格式**: `指令 reg, [BX/BP + SI/DI]`

**说明**: 地址 = 基址寄存器 + 变址寄存器

**示例**:
```assembly
MOV AX, [BX+SI]      ; AX = [DS:BX+SI]
MOV [BP+DI], AX      ; [SS:BP+DI] = AX
```

**合法组合**:
- BX + SI/DI
- BP + SI/DI

---

### 6. 相对基址变址寻址

**格式**: `指令 reg, [BX/BP + SI/DI + disp]`

**说明**: 地址 = 基址 + 变址 + 位移

**示例**:
```assembly
MOV AX, [BX+SI+10]   ; AX = [DS:BX+SI+10]
MOV [BP+DI+100H], CX ; [SS:BP+DI+100H] = CX
```

---

### 7. 符号寻址

**格式**: `指令 reg, varname`

**说明**: 使用变量名访问内存

**示例**:
```assembly
DATA SEGMENT
    VAR1 DB 10
    VAR2 DW 20
DATA ENDS

CODE SEGMENT
    MOV AL, VAR1         ; 读取 VAR1
    MOV VAR2, AX         ; 写入 VAR2
    LEA SI, VAR1         ; 加载 VAR1 地址
    MOV DX, OFFSET VAR2  ; 获取 VAR2 偏移
CODE ENDS
```

---

## 📋 指令速查表

### 数据传输
| 指令 | 功能 | 标志位 |
|------|------|--------|
| MOV | 传送 | - |
| XCHG | 交换 | - |
| LEA | 加载地址 | - |
| PUSH | 压栈 | - |
| POP | 出栈 | - |

### 算术运算
| 指令 | 功能 | 标志位 |
|------|------|--------|
| ADD | 加法 | CF,ZF,SF,OF,PF,AF |
| SUB | 减法 | CF,ZF,SF,OF,PF,AF |
| INC | 自增 | ZF,SF,OF,PF,AF |
| DEC | 自减 | ZF,SF,OF,PF,AF |
| MUL | 无符号乘 | CF,OF |
| DIV | 无符号除 | 未定义 |
| NEG | 取反 | CF,ZF,SF,OF,PF,AF |

### 逻辑运算
| 指令 | 功能 | 标志位 |
|------|------|--------|
| AND | 逻辑与 | CF=0,OF=0,ZF,SF,PF |
| OR | 逻辑或 | CF=0,OF=0,ZF,SF,PF |
| XOR | 逻辑异或 | CF=0,OF=0,ZF,SF,PF |
| NOT | 逻辑非 | - |
| TEST | 测试 | CF=0,OF=0,ZF,SF,PF |
| CMP | 比较 | CF,ZF,SF,OF,PF,AF |

### 移位和循环
| 指令 | 功能 | 标志位 |
|------|------|--------|
| SHL/SAL | 左移 | CF,ZF,SF,PF |
| SHR | 逻辑右移 | CF,ZF,SF,PF |
| SAR | 算术右移 | CF,ZF,SF,PF |
| ROL | 循环左移 | CF,OF |
| ROR | 循环右移 | CF,OF |

### 控制转移
| 指令 | 条件 | 说明 |
|------|------|------|
| JMP | 无条件 | 跳转 |
| JZ/JE | ZF=1 | 零/相等 |
| JNZ/JNE | ZF=0 | 非零/不等 |
| JG/JNLE | ZF=0且SF=OF | 大于(有符号) |
| JL/JNGE | SF≠OF | 小于(有符号) |
| JGE/JNL | SF=OF | 大于等于(有符号) |
| JLE/JNG | ZF=1或SF≠OF | 小于等于(有符号) |
| JA/JNBE | CF=0且ZF=0 | 大于(无符号) |
| JB/JNAE | CF=1 | 小于(无符号) |
| JAE/JNB | CF=0 | 大于等于(无符号) |
| JBE/JNA | CF=1或ZF=1 | 小于等于(无符号) |
| LOOP | CX-- ≠ 0 | 循环 |
| CALL | - | 调用子程序 |
| RET | - | 返回 |

---

## 📝 编程技巧

### 常用模式

#### 1. 快速清零
```assembly
XOR AX, AX           ; 比 MOV AX, 0 更快
```

#### 2. 测试寄存器是否为零
```assembly
TEST AX, AX          ; 比 CMP AX, 0 更高效
JZ IS_ZERO
```

#### 3. 乘以/除以 2 的幂
```assembly
SHL AX, 1            ; AX = AX × 2
SHL AX, 3            ; AX = AX × 8
SHR AX, 2            ; AX = AX ÷ 4
```

#### 4. 保留特定位
```assembly
AND AL, 0FH          ; 保留低 4 位
AND AX, 0FF00H       ; 保留高字节
```

#### 5. 设置特定位
```assembly
OR AL, 80H           ; 设置最高位
OR BX, 0001H         ; 设置最低位
```

#### 6. 翻转特定位
```assembly
XOR AL, 0FFH         ; 翻转所有位
XOR BL, 01H          ; 翻转最低位
```

#### 7. 嵌套循环保存 CX
```assembly
MOV CX, 10           ; 外层循环
OUTER:
    PUSH CX          ; 保存外层计数
    MOV CX, 5        ; 内层循环
INNER:
    ; 循环体
    LOOP INNER
    POP CX           ; 恢复外层计数
    LOOP OUTER
```

---

## ⚠️ 注意事项

1. **段寄存器初始化**: 使用数据段前必须初始化 DS
   ```assembly
   MOV AX, DATA
   MOV DS, AX
   ```

2. **堆栈平衡**: PUSH 和 POP 必须配对
   ```assembly
   PUSH AX
   PUSH BX
   ; ...
   POP BX    ; 注意顺序相反
   POP AX
   ```

3. **除法前准备**: 
   - 字节除法: AX 中放被除数
   - 字除法: DX:AX 中放被除数（通常 DX=0）
   ```assembly
   MOV AX, 100
   MOV DX, 0    ; 清除 DX
   DIV CX
   ```

4. **字符串结尾**: INT 21H, AH=09H 需要 '$' 结尾
   ```assembly
   MSG DB 'Hello$'  ; 必须有 $
   ```

5. **标签后的冒号**: 
   ```assembly
   START:           ; 正确
   LOOP_START:      ; 正确
   ```

6. **内存操作数大小**: 必要时使用类型修饰符
   ```assembly
   MOV BYTE PTR [BX], 10   ; 字节操作
   MOV WORD PTR [SI], 100  ; 字操作
   ```

---

## 🔗 相关资源

- [返回主文档](./README.md)
- [开发计划](./TODO.md)
- [Intel 8086 手册](https://edge.edx.org/c4x/BITSPilani/EEE231/asset/8086_family_Users_Manual_1_.pdf)

---

**版本**: 1.0.0  
**最后更新**: 2025年12月1日
