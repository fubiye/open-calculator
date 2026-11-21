# Open Calculator

> 开放、可扩展、AI 原生的计算器 —— 以类 Excel 网格为统一交互界面，Web 技术 + Rust 后端，前后分离，可打包为桌面应用。

![Open Calculator 界面](docs/assets/screenshot.png)

## 这是什么

Open Calculator 不是传统意义上的“一个计算器页面”，而是一个**可组合的计算工作台**：

- **像 Excel**：单元格、公式栏、多工作表、数字格式、自动重算，学习成本接近零。
- **开放**：代码 MIT，公式引擎与插件机制基于开源生态（Univer / Rust）。
- **可扩展**：自定义函数与 UI 插件将来以独立包的形式接入，而不是改核心代码。
- **AI 原生**：AI 是表格的“操作者”——自然语言生成公式、解释结果、生成计算模型（当前为设计阶段，见路线图）。
- **本地优先**：计算与数据默认留在本机；Rust 后端可代理模型密钥，也可接本地 Ollama。

## 当前状态（v0.1.0 骨架）

| 能力                                           | 状态                                                      |
| ---------------------------------------------- | --------------------------------------------------------- |
| 类 Excel 表格（公式 / 格式 / 多工作表）        | ✅ 基于 Univer 1.5.2                                      |
| 工作簿自动保存 / 加载                          | ✅ 前端 → Rust 后端（内存存储，重启后重置）               |
| Rust HTTP API（health / meta / workbooks）     | ✅ Axum 0.8 + Tokio                                       |
| Tauri 桌面壳（开发加载 Web，发布内嵌 sidecar） | ✅ 骨架                                                   |
| AI 助手                                        | 🚧 面板与接口设计就绪，模型通道待接入                     |
| 自定义函数 / 插件                              | 🚧 架构设计见 [技术选型](docs/architecture/tech-stack.md) |
| 持久化（SQLite）、导入导出 xlsx                | ⏳ 路线图阶段 1                                           |

## 技术栈

| 层       | 选型                                                             | 说明                                                     |
| -------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| 前端     | React 19 + TypeScript 5.9 + Vite 8                               | 应用外壳、AI 面板、状态管理                              |
| 表格引擎 | [Univer](https://univer.ai) 1.5.2（Apache-2.0）                  | Canvas 渲染的 Excel 兼容网格、公式引擎、插件体系         |
| 后端     | Rust 2024 + [Axum](https://github.com/tokio-rs/axum) 0.8 + Tokio | 本地 HTTP API、未来的工作簿持久化 / AI 代理 / 插件运行时 |
| 桌面     | [Tauri 2](https://tauri.app)                                     | 复用系统 WebView，Rust 侧内嵌后端 sidecar                |
| 工程     | pnpm workspace + Cargo workspace                                 | 前后端同仓、独立依赖与构建                               |
| CI       | GitHub Actions                                                   | 前端 lint/test/build + Rust fmt/clippy/test              |

更完整的选型对比与理由见 [docs/architecture/tech-stack.md](docs/architecture/tech-stack.md)。

> **工程原则**：性能、简洁、模块独立是本项目的硬约束，含可度量的性能预算与模块依赖规则，见 [docs/architecture/principles.md](docs/architecture/principles.md)。
> 说明：当前 Univer 方案在“初始 JS / 内存占用”上明显超出预算，正在通过 spike 评估「自研轻量网格 + Rust/WASM 公式内核」替代，详见该文档 §6。

## 快速开始

环境要求：Node.js ≥ 22.12、pnpm 12、Rust stable ≥ 1.85（本项目使用 1.100 验证）、macOS 需 Xcode Command Line Tools（Tauri 开发）。

```bash
# 安装前端依赖
pnpm install

# 同时启动 Web（http://localhost:5173）与 Rust 后端（http://127.0.0.1:8787）
pnpm dev
```

打开 http://localhost:5173 即可编辑“月供计算器”演示工作簿：修改黄色输入格，公式会自动重算，并在 800ms 防抖后保存到本地 Rust 后端。

```bash
# 只启动后端（供前端联调 / curl）
pnpm dev:server

# 桌面端：先在一个终端 pnpm dev，再在另一个终端
pnpm dev:desktop

# 构建
pnpm build              # Web 产物 + Rust release 二进制
pnpm build:desktop      # Tauri 打包（自动先构建 sidecar）

# 质量检查
pnpm lint               # ESLint + clippy -D warnings
pnpm test               # Vitest + cargo test
pnpm format             # Prettier + rustfmt
```

## 目录结构

```text
open-calculator/
├── apps/
│   ├── web/                  # React + Vite + Univer 前端
│   │   └── src/
│   │       ├── components/   # TopBar / Spreadsheet / AiPanel / StatusBar
│   │       ├── lib/          # API 客户端、演示工作簿
│   │       └── types.ts
│   └── desktop/              # Tauri 2 桌面壳（src-tauri/）
├── crates/
│   └── server/               # Rust Axum 服务（open-calculator-server）
├── docs/
│   ├── architecture/         # 架构总览、技术选型
│   ├── adr/                  # 架构决策记录
│   └── roadmap.md            # 路线图
├── .github/workflows/ci.yml
├── Cargo.toml                # Cargo workspace
└── pnpm-workspace.yaml       # pnpm workspace
```

## 架构一览

```text
┌──────────────────────────────┐        ┌───────────────────────────────┐
│  Web / Tauri WebView          │  HTTP  │  Rust 后端 (Axum, 127.0.0.1)   │
│  React 外壳                   │◄──────►│  /api/v1/health · meta        │
│  Univer 表格（本地公式引擎）   │  JSON  │  /api/v1/workbooks/{id}       │
│  AI 面板（待接入）             │        │  [规划] 持久化 / AI / 插件     │
└──────────────────────────────┘        └───────────────────────────────┘
```

- **交互式计算**由 Univer 的 TypeScript 公式引擎在本地完成，保证输入即算、离线可用。
- **Rust 后端**负责数据持久化、未来的 AI 代理、自定义函数与插件执行等“重活”。
- 详细分层与计算引擎策略见 [架构总览](docs/architecture/overview.md)。

## 文档

- [工程原则与性能预算](docs/architecture/principles.md)
- [架构总览](docs/architecture/overview.md)
- [技术选型与对比](docs/architecture/tech-stack.md)
- [路线图](docs/roadmap.md)
- [架构决策记录（ADR）](docs/adr/)
- [贡献指南](CONTRIBUTING.md)

## License

[MIT](LICENSE) © Fu, Biye
