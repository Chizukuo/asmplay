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
- `LOOP` - 循环
- `CALL/RET` - 子程序调用

#### 中断指令
- `INT 21H` - DOS 中断（支持字符输入输出）

### 示例程序

项目内置了多个示例程序：

- **综合演示** - 展示基础指令和屏幕控制
- **LOOP 测试** - 循环指令功能测试
- **冒泡排序** - 数组排序算法演示
- **斐波那契数列** - 递推数列计算
- **字符串处理** - 字符串反转示例
- **简易计算器** - 四则运算演示

## 🛠️ 技术栈

- **前端框架**: React 18
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **语言**: JavaScript (ES6+)

## 📁 项目结构

```
masm-simulator/
├── src/
│   ├── components/      # React 组件
│   ├── hooks/          # 自定义 Hooks
│   ├── utils/          # 工具函数
│   ├── constants/      # 常量定义
│   ├── App.jsx         # 主应用组件
│   └── main.jsx        # 入口文件
├── index.html          # HTML 模板
├── package.json        # 项目配置
├── vite.config.js      # Vite 配置
└── tailwind.config.js  # Tailwind 配置
```

## 🎯 功能特性

### 调试功能

- ✅ 断点设置
- ✅ 单步执行
- ✅ 变量监视
- ✅ 内存查看
- ✅ 执行日志

### 可视化

- 📊 实时寄存器显示
- 🚩 标志位状态
- 💾 内存视图
- 📺 字符显示器

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

- 你的名字 - [GitHub](https://github.com/chizukuo)

## 🙏 致谢

- 感谢所有贡献者
- 灵感来源于经典的 8086 汇编学习环境

## 📮 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件至: chizukuo@icloud.comm

---

**Note**: 此项目仅用于教育和学习目的。
