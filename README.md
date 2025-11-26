# Asmplay - 8086 汇编模拟器

一个基于 Web 的交互式 8086 汇编语言模拟器，提供实时可视化执行环境。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.2.0-61dafb.svg)
![Vite](https://img.shields.io/badge/Vite-4.4.5-646cff.svg)

## ✨ 特性

- 🎮 **交互式编辑器** - 实时语法高亮和代码编辑
- 🔍 **可视化执行** - 实时查看寄存器、标志位和内存状态
- 🐛 **调试功能** - 断点设置、单步执行、变量监视
- 📺 **字符显示器** - 80x25 字符模式虚拟显示器
- 📚 **示例程序** - 内置多个经典汇编程序示例
- ⚡ **速度控制** - 可调节的执行速度
- 💾 **文件操作** - 导入/导出 ASM 文件

## 🚀 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm 或 yarn

### 安装

```bash
# 克隆仓库
git clone https://github.com/chizukuo/asmplay.git
cd asmplay

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问地址
# 开发服务器默认运行在 http://localhost:5173
```

### 构建

```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 📖 使用说明

### 基本操作

1. **编写代码** - 在左侧编辑器中输入 8086 汇编代码
2. **运行程序** - 点击"运行"按钮开始执行
3. **单步调试** - 使用"单步"按钮逐行执行代码
4. **查看状态** - 右侧面板实时显示 CPU 状态和内存

### 支持的指令

#### 数据传输指令
- `MOV` - 数据传送
- `PUSH/POP` - 堆栈操作
- `XCHG` - 交换数据
- `LEA` - 加载有效地址

#### 算术指令
- `ADD/SUB` - 加法/减法
- `INC/DEC` - 自增/自减
- `MUL/DIV` - 乘法/除法
- `NEG` - 取反

#### 逻辑指令
- `AND/OR/XOR/NOT` - 逻辑运算
- `TEST` - 测试
- `CMP` - 比较

#### 移位指令
- `SHL/SHR` - 逻辑移位
- `ROL/ROR` - 循环移位

#### 控制转移指令
- `JMP` - 无条件跳转
- `JZ/JNZ/JE/JNE` - 条件跳转
- `JG/JL/JGE/JLE` - 有符号比较跳转
- `LOOP` - 循环
- `CALL/RET` - 子程序调用

#### 中断指令
- `INT 10H` - BIOS 视频中断（屏幕控制、光标定位）
  - `AH=02H` - 设置光标位置
  - `AH=06H` - 清屏/滚动窗口
  - `AH=09H` - 显示字符和属性
- `INT 21H` - DOS 中断（字符输入输出）
  - `AH=01H` - 键盘输入
  - `AH=02H` - 字符输出
  - `AH=09H` - 字符串输出
  - `AH=4CH` - 程序终止

### 数据定义伪指令

- `DB` - 定义字节（Byte）
- `DW` - 定义字（Word）
- `DD` - 定义双字（Double Word）
- `DUP` - 重复定义操作符
- `SEGMENT/ENDS` - 段定义
- `OFFSET` - 取偏移地址

### 示例程序

项目内置了 6 个完整的示例程序：

1. **综合演示 (default)** - 展示基础指令和屏幕控制
   - 屏幕背景色设置
   - 光标定位
   - 字符串输出
   - 寄存器运算
   - 循环演示

2. **LOOP 测试 (loop_test)** - 循环指令功能测试
   - LOOP 指令用法
   - 计数器应用
   - 屏幕定位输出

3. **冒泡排序 (bubble_sort)** - 数组排序算法演示
   - 嵌套循环
   - 数据比较与交换
   - 内存数组操作

4. **斐波那契数列 (fibonacci)** - 递推数列计算
   - 数列计算
   - 可视化显示（星号图表）
   - 循环累加

5. **字符串处理 (string_demo)** - 字符串反转示例
   - 字符串长度计算
   - 字符数组操作
   - 反向遍历

6. **简易计算器 (calculator)** - 四则运算演示
   - 加减乘除运算
   - 多次计算演示
   - 结果验证

## 🛠️ 技术栈

- **前端框架**: React 18
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **语言**: JavaScript (ES6+)

## 📁 项目结构

```
masm/
├── src/
│   ├── components/
│   │   └── RegisterCard.jsx    # 寄存器显示组件
│   ├── hooks/
│   │   └── useAssembler.js     # 汇编器核心逻辑 Hook
│   ├── utils/
│   │   └── assembler.js        # 指令解析和执行引擎
│   ├── constants/
│   │   └── index.js            # 常量定义（内存大小、示例程序等）
│   ├── App.jsx                 # 主应用组件
│   ├── main.jsx                # 入口文件
│   └── index.css               # 全局样式
├── index.html                  # HTML 模板
├── package.json                # 项目配置
├── vite.config.js              # Vite 配置
├── tailwind.config.js          # Tailwind 配置
├── postcss.config.js           # PostCSS 配置
├── LICENSE                     # MIT 许可证
└── README.md                   # 项目文档
```

## 🎯 功能特性

### 调试功能

- ✅ 断点设置
- ✅ 单步执行
- ✅ 变量监视
- ✅ 内存查看
- ✅ 执行日志

### 可视化

- 📊 实时寄存器显示（AX, BX, CX, DX, SP, BP, SI, DI）
- 🚩 标志位状态（ZF, SF, CF, OF, PF, AF）
- 💾 内存视图（64KB 地址空间）
- 📺 字符显示器（80×25 彩色文本模式）
- 📝 执行日志（指令追踪）
- 🎯 断点管理

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👥 作者

- chizukuo - [GitHub](https://github.com/chizukuo)

## 🙏 致谢

- 感谢所有贡献者
- 灵感来源于经典的 8086 汇编学习环境
- 基于 8086/8088 处理器指令集设计

## 🔧 核心功能

### 支持的寻址方式
- 立即数寻址：`MOV AX, 1234H`
- 寄存器寻址：`MOV AX, BX`
- 直接寻址：`MOV AX, [1000H]`
- 寄存器间接寻址：`MOV AX, [BX]`
- 变址寻址：`MOV AX, [BX+SI]`
- 相对寻址：`MOV AX, VARNAME`

### 段结构支持
```assembly
DATA SEGMENT
    ; 数据定义
DATA ENDS

CODE SEGMENT
    ; 代码指令
CODE ENDS
```

## ⚠️ 已知限制

- 不支持浮点运算指令
- 不支持字符串指令（MOVS, CMPS 等）
- 中断功能有限（仅支持基本的 INT 10H 和 INT 21H）
- 不支持宏定义
- 不支持过程（PROC/ENDP）定义

## 🐛 问题排查

### 程序无法运行
1. 检查代码段是否以 `END START` 结尾
2. 确保标签定义使用冒号（如 `LABEL:`）
3. 验证数据段和代码段正确闭合

### 显示乱码
1. 确保字符串以 `$` 结尾
2. 检查 INT 21H 功能号是否正确（AH=09H 用于字符串输出）
3. 验证数据段寄存器 DS 已正确初始化

### 内存访问错误
1. 检查数组索引是否越界
2. 确保变量在 DATA SEGMENT 中已定义
3. 验证寻址方式语法正确

## 📮 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件至: chizukuo@icloud.com

---

**Note**: 此项目仅用于教育和学习目的。
