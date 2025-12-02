# Asmplay - 8086 汇编模拟器

一个基于 Web 的交互式 8086 汇编语言模拟器，提供实时可视化执行环境。完全在浏览器中运行，无需安装任何软件，让您轻松学习和实践 8086 汇编语言。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.2.0-61dafb.svg)
![Vite](https://img.shields.io/badge/Vite-4.4.5-646cff.svg)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.3-38B2AC.svg)

## ✨ 特性

- 🎮 **交互式编辑器** - 实时语法高亮、代码提示和自动补全
- 🔍 **可视化执行** - 实时查看寄存器、标志位和内存状态
- 🐛 **调试功能** - 断点设置、单步执行、变量监视、调用栈追踪
- 📺 **虚拟显示器** - 80x25 字符模式彩色显示器，支持 BIOS 视频中断
- 🎹 **键盘输入** - 支持实时键盘输入和 DOS 中断功能
- 📚 **示例程序** - 内置 6 个经典汇编程序示例
- ⚡ **速度控制** - 6 档可调节执行速度（极慢~光速）
- 💾 **文件操作** - 导入/导出 ASM 文件
- 🌙 **主题切换** - 支持亮色/暗色主题
- 📱 **响应式设计** - 适配桌面和移动设备

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
2. **加载示例** - 点击"示例"按钮选择预设程序
3. **运行程序** - 点击"运行"按钮开始执行
4. **单步调试** - 使用"单步"按钮逐行执行代码
5. **设置断点** - 点击行号设置/取消断点
6. **查看状态** - 右侧面板实时显示 CPU 状态和内存

### 界面布局

#### 左侧面板
- **代码编辑器**: 支持语法高亮和代码提示
- **控制按钮**: 运行、暂停、单步、重置、速度调节
- **文件操作**: 导入/导出 ASM 文件、示例程序

#### 右侧面板（可切换视图）
- **CPU 状态**: 寄存器值、标志位状态
- **内存视图**: 查看内存内容（支持十六进制/ASCII）
- **监视窗口**: 监视变量和表达式
- **调用栈**: 查看子程序调用层次
- **虚拟显示器**: 80x25 字符模式彩色显示

### 调试技巧

- **断点**: 点击行号添加断点，程序会在断点处暂停
- **单步执行**: 逐条指令执行，观察寄存器和内存变化
- **变量监视**: 添加变量名到监视窗口，实时查看其值
- **速度控制**: 调整执行速度以便更好地观察程序运行

### 支持的指令

详细的指令集说明请参阅 [INSTRUCTION_SET.md](./INSTRUCTION_SET.md)

### 示例程序

项目内置了 6 个完整的示例程序，展示不同的编程技巧：

1. **综合演示 (default)** - 展示基础指令和屏幕控制
   - 屏幕背景色设置（青色背景白字）
   - 光标定位
   - 字符串输出
   - 寄存器运算
   - 循环演示（输出 1-5）

2. **LOOP 测试 (loop_test)** - 循环指令功能测试
   - LOOP 指令用法
   - CX 寄存器作为计数器
   - 屏幕定位输出

3. **冒泡排序 (bubble_sort)** - 数组排序算法演示
   - 嵌套循环实现
   - 数据比较与交换
   - 内存数组操作
   - 排序前后对比显示

4. **斐波那契数列 (fibonacci)** - 递推数列计算
   - 数列计算与累加
   - 可视化显示（星号图表）
   - 绿色背景黄字主题

5. **字符串处理 (string_demo)** - 字符串反转示例
   - 字符串长度计算
   - 字符数组操作
   - 反向遍历与复制
   - 紫色背景白字主题

6. **简易计算器 (calculator)** - 四则运算演示
   - 加减乘除运算
   - 多次计算演示
   - 结果验证与显示

## 🛠️ 技术栈

- **前端框架**: React 18
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **语言**: JavaScript (ES6+)

## 📁 项目结构

```
asmplay/
├── src/
│   ├── components/           # React 组件
│   │   ├── AutoResizingContainer.jsx  # 自适应容器
│   │   ├── CallStack.jsx              # 调用栈显示
│   │   ├── ExamplesModal.jsx          # 示例程序模态框
│   │   ├── MemoryView.jsx             # 内存视图
│   │   ├── Monitor.jsx                # 虚拟显示器
│   │   ├── RegisterCard.jsx           # 寄存器卡片
│   │   └── WatchWindow.jsx            # 监视窗口
│   ├── hooks/
│   │   └── useAssembler.js   # 汇编器核心逻辑 Hook
│   ├── utils/
│   │   ├── assembler.js      # 指令解析和执行引擎
│   │   ├── cpu.js            # CPU 模拟器
│   │   ├── displayUtils.js   # 显示工具函数
│   │   ├── highlightLine.jsx # 语法高亮
│   │   ├── interrupts.js     # 中断处理
│   │   └── memoryUtils.js    # 内存工具函数
│   ├── constants/
│   │   └── index.js          # 常量定义（示例程序、颜色等）
│   ├── styles/               # 样式文件
│   ├── App.jsx               # 主应用组件
│   ├── main.jsx              # 入口文件
│   └── index.css             # 全局样式
├── examples/                 # 示例程序目录（可选）
├── index.html                # HTML 模板
├── package.json              # 项目配置和依赖
├── vite.config.js            # Vite 构建配置
├── tailwind.config.js        # Tailwind CSS 配置
├── postcss.config.js         # PostCSS 配置
├── LICENSE                   # MIT 许可证
├── README.md                 # 项目文档
├── INSTRUCTION_SET.md        # 指令集详细文档
└── TODO.md                   # 开发计划
```

## 🎯 功能特性

### 编辑器功能
- ✅ 语法高亮（指令、寄存器、注释）
- ✅ 代码自动补全
- ✅ 行号显示
- ✅ 当前执行行高亮
- ✅ 断点可视化标记
- ✅ 错误提示

### 调试功能
- ✅ 断点设置（点击行号）
- ✅ 单步执行
- ✅ 连续运行/暂停
- ✅ 变量监视窗口
- ✅ 内存查看（十六进制/ASCII）
- ✅ 调用栈追踪
- ✅ 执行速度控制（6档）

### CPU 可视化
- 📊 实时寄存器显示
  - 通用寄存器：AX, BX, CX, DX
  - 索引寄存器：SI, DI
  - 指针寄存器：SP, BP
  - 段寄存器：CS, DS, SS, ES
- 🚩 标志位状态（ZF, SF, CF, OF, PF, AF）
- 💾 内存视图（1MB 地址空间）
- 🎮 程序计数器（PC）显示

### 虚拟硬件
- 📺 字符显示器（80×25 彩色文本模式）
  - 支持 16 色 DOS 调色板
  - 光标位置显示
  - 字符属性（前景/背景色）
- ⌨️ 键盘输入支持
  - 实时按键捕获
  - 键盘缓冲区
  - 支持 INT 16H 和 INT 21H

### 中断支持
- ✅ INT 10H - BIOS 视频服务
- ✅ INT 16H - BIOS 键盘服务
- ✅ INT 21H - DOS 系统调用
- 详细功能请参阅 [INSTRUCTION_SET.md](./INSTRUCTION_SET.md)

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
- **立即数寻址**: `MOV AX, 1234H`
- **寄存器寻址**: `MOV AX, BX`
- **直接寻址**: `MOV AX, [1000H]`
- **寄存器间接寻址**: `MOV AX, [BX]` / `MOV AX, [SI]` / `MOV AX, [DI]`
- **基址变址寻址**: `MOV AX, [BX+SI]` / `MOV AX, [BX+DI]`
- **相对基址变址寻址**: `MOV AX, [BX+SI+100H]`
- **符号寻址**: `MOV AX, VARNAME` / `MOV AX, OFFSET VARNAME`

### 段结构支持
```assembly
DATA SEGMENT
    ; 数据定义
    VAR1 DB 10
    VAR2 DW 1234H
    STR1 DB 'Hello$'
DATA ENDS

CODE SEGMENT
    ASSUME CS:CODE, DS:DATA
START:
    ; 初始化数据段
    MOV AX, DATA
    MOV DS, AX
    
    ; 程序代码
    ; ...
    
    ; 程序终止
    MOV AH, 4CH
    INT 21H
CODE ENDS
END START
```

### 数据类型
- **DB** (Define Byte): 定义字节，8 位
- **DW** (Define Word): 定义字，16 位
- **DD** (Define Double Word): 定义双字，32 位
- **DUP**: 重复定义操作符，如 `BUFFER DB 100 DUP(0)`

## ⚠️ 已知限制

- ❌ 不支持浮点运算指令（FPU 指令集）
- ❌ 不支持字符串指令（MOVS, CMPS, SCAS, LODS, STOS）
- ❌ 不支持部分高级中断功能
- ❌ 不支持宏定义（MACRO/ENDM）
- ❌ 不支持过程定义（PROC/ENDP，但支持 CALL/RET）
- ❌ 不支持模块化编程（PUBLIC/EXTERN）
- ⚠️ 内存空间为 1MB（实际 8086 为 1MB）
- ⚠️ 部分中断功能为模拟实现

如需完整的 8086 开发环境，推荐使用 DOSBox + MASM 或 emu8086。

## 🐛 问题排查

### 程序无法运行
1. ✅ 检查代码段是否以 `END START` 结尾
2. ✅ 确保标签定义使用冒号（如 `LABEL:`）
3. ✅ 验证数据段和代码段正确闭合（SEGMENT/ENDS 成对出现）
4. ✅ 检查是否正确初始化数据段寄存器 DS

### 显示乱码或无输出
1. ✅ 确保字符串以 `$` 结尾（用于 INT 21H, AH=09H）
2. ✅ 检查 INT 21H 功能号是否正确
   - AH=02H：输出单个字符（DL 中的字符）
   - AH=09H：输出字符串（DS:DX 指向字符串）
3. ✅ 验证数据段寄存器 DS 已正确初始化
4. ✅ 检查 INT 10H 的参数设置（光标位置、颜色属性）

### 内存访问错误
1. ✅ 检查数组索引是否越界
2. ✅ 确保变量在 DATA SEGMENT 中已定义
3. ✅ 验证寻址方式语法正确
4. ✅ 检查段寄存器是否正确设置

### 循环不执行或死循环
1. ✅ 确保 CX 寄存器初始化为正确的循环次数
2. ✅ 检查 LOOP 指令的跳转目标是否正确
3. ✅ 注意 LOOP 指令会自动递减 CX
4. ✅ 嵌套循环时注意保存/恢复 CX（使用 PUSH/POP）

### 断点和调试
1. ✅ 断点设置在可执行指令行（非注释、空行、标签行）
2. ✅ 使用单步执行观察寄存器变化
3. ✅ 添加变量到监视窗口查看实时值
4. ✅ 查看调用栈追踪子程序调用关系

## 📮 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 📧 邮件: chizukuo@icloud.com
- 🐛 问题反馈: [GitHub Issues](https://github.com/chizukuo/asmplay/issues)
- 💡 功能建议: [GitHub Discussions](https://github.com/chizukuo/asmplay/discussions)

## 🔗 相关链接

- [在线演示](https://chizukuo.github.io/asmplay) *(如果已部署)*
- [开发计划](./TODO.md) - 查看未来功能规划
- [指令集文档](./INSTRUCTION_SET.md) - 详细的指令说明

## 📚 学习资源

推荐的 8086 汇编学习资源：
- [8086 指令集参考](http://www.mlsite.net/8086/)
- [Intel 8086 手册](https://edge.edx.org/c4x/BITSPilani/EEE231/asset/8086_family_Users_Manual_1_.pdf)

---

**Note**: 此项目仅用于教育和学习目的，是一个轻量级的 8086 汇编模拟器。

🌟 如果这个项目对你有帮助，请给个 Star！
