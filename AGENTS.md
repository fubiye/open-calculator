# AGENTS.md

本文件面向在本仓库工作的 AI Agent（以及人类贡献者），约定项目结构、命令、边界与验收标准。

## 1. 项目定位

Open Calculator：开放、可扩展、AI 原生的计算器。以类 Excel 网格为交互界面，Web 技术 + Rust 后端，前后分离，可打包为桌面应用。

## 2. 技术栈（版本以仓库配置为准）

- 前端：React 19 + TypeScript 5.9 + Vite 8
- 表格：Univer 1.6（`@univerjs/presets` + `@univerjs/preset-sheets-core`，Apache-2.0）
- 后端：Rust 2024 + Axum 0.8 + Tokio 1.54
- 桌面：Tauri 2（sidecar 内嵌后端）
- 工程：pnpm workspace + Cargo workspace；CI 见 `.github/workflows/ci.yml`

## 3. 目录与所有权

| 路径            | 内容                             | 修改注意                                                 |
| --------------- | -------------------------------- | -------------------------------------------------------- |
| `apps/web`      | React 应用、Univer 集成、AI 面板 | 表格引擎逻辑集中在 `Spreadsheet.tsx`                     |
| `crates/server` | Axum 服务、工作簿 API            | 新接口必须带集成测试                                     |
| `apps/desktop`  | Tauri 壳                         | `src-tauri` 不在根 Cargo workspace；`binaries/` 是生成物 |
| `docs/`         | 架构、ADR、路线图                | 架构变化必须更新文档                                     |
| 根配置          | workspace、CI、工具链            | 修改需评估全仓影响                                       |

## 4. 常用命令

```bash
pnpm install
pnpm dev                 # web:5173 + server:8787
pnpm lint                # ESLint + clippy -D warnings
pnpm test                # Vitest + cargo test
pnpm build               # web + rust release
pnpm --dir apps/desktop check   # Tauri 壳 cargo check（需先生成 sidecar）
pnpm format              # Prettier + rustfmt
```

## 5. 工作方式

- 小步修改：一次只解决一个明确问题，行为变化与重构分开提交。
- 先读再写：修改前阅读相关实现与文档；不要臆测 Univer / Tauri API，必要时查官方文档。
- 以验证收尾：改完必须运行最小验证集（见下），并说明验证结果。
- 提交规范：Conventional Commits；完成任务后主动提交（若被授权）。
- 文档同步：行为、接口、架构变化必须更新 README / docs。

### 每次交付的最小验证集

```bash
pnpm lint
pnpm test
pnpm build
```

涉及桌面端的改动额外运行：

```bash
pnpm --dir apps/desktop check
```

## 6. 边界（当前阶段明确不做）

- 不引入数据库迁移、认证、云同步、多人协作（阶段 1 才做 SQLite）。
- 不提前实现 AI 模型调用；AI 相关只做接口设计与占位（见 `docs/adr/0006-ai-architecture.md`）。
- 不新增“框架级”抽象（状态管理库、依赖注入、自研渲染器），除非有第二个使用方。
- 前端不得直接持有模型 API key；AI 一律经 Rust 后端。
- 不修改 `apps/desktop/src-tauri/binaries/`、`target/`、`node_modules/` 等生成物。

## 7. 已知陷阱

- 本仓库 `.npmrc` 使用官方 npm registry：Univer 新版本在国内镜像可能缺失。
- `apps/desktop/src-tauri` 被排除在根 Cargo workspace 外；修改 Rust 依赖时留意两份 `Cargo.lock`。
- Tauri 的 `externalBin` 在编译期校验文件存在：首次桌面构建前需运行 `pnpm --dir apps/desktop build:sidecar`（`dev`/`build` 脚本已自动执行）。
- Univer 的工作簿快照中公式存于 `cellData[row][col].f`（0-based 行列），演示数据的 Excel 引用需注意偏移。
- 前端 API 基地址：浏览器走 Vite proxy（同源），Tauri 运行时自动切换为 `http://127.0.0.1:8787`。

## 8. 文档索引

- [README](README.md)
- [架构总览](docs/architecture/overview.md)
- [技术选型](docs/architecture/tech-stack.md)
- [ADR](docs/adr/README.md)
- [路线图](docs/roadmap.md)
- [贡献指南](CONTRIBUTING.md)
