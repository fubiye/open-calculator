# AGENTS.md

本文件面向在本仓库工作的 AI Agent（以及人类贡献者），约定项目结构、命令、边界与验收标准。

## 1. 项目定位

Open Calculator：开放、可扩展、AI 原生的计算器。以类 Excel 网格为交互界面，Web 技术 + Rust 后端，前后分离，可打包为桌面应用。

## 2. 工程原则（硬约束）

1. **性能优先**：有可度量预算（前端初始 JS 硬上限 1.60MB gzip、空闲 Heap 60MB；后端启动 ≤50ms、空闲 RSS ≤15MB 等，详见 `docs/architecture/principles.md` §3），超预算需 ADR 说明并给出回收计划。
2. **简洁优先**：能删不增；抽象必须有第二个使用方；接口先设计后实现。
3. **模块独立**：每个 crate/package 可单独构建、测试、使用；依赖方向单向无环。

完整规则、预算数值与当前差距见 [docs/architecture/principles.md](docs/architecture/principles.md)。性能相关改动必须在 PR/汇报中附前后测量数据。

## 3. 技术栈（版本以仓库配置为准）

- 前端：React 19 + TypeScript 5.9 + Vite 8（`frontend/`）
- 表格：Univer 1.5.2（`@univerjs/presets` + `@univerjs/preset-sheets-core`，Apache-2.0）
- 后端：Rust 2024 + Axum 0.8 + Tokio 1.54（`backend/`）
- 桌面：Tauri 2（`frontend/apps/desktop`，sidecar 内嵌后端）
- 工程：pnpm workspace（frontend）+ Cargo workspace（backend）；CI 见 `.github/workflows/ci.yml`

## 4. 目录与所有权

| 路径                    | 内容                                      | 修改注意                                                 |
| ----------------------- | ----------------------------------------- | -------------------------------------------------------- |
| `frontend/apps/web`     | React 应用、视图宿主、AI 面板、文件运行时 | 表格引擎只通过 `workbook-univer` 包访问                  |
| `frontend/packages/*`   | 6 个可独立测试的前端包                    | 跨包只能走包入口，ESLint boundaries 强制                 |
| `backend/crates/server` | Axum 服务、工作簿 API                     | 新接口必须带集成测试                                     |
| `frontend/apps/desktop` | Tauri 壳                                  | `src-tauri` 不在 backend workspace；`binaries/` 是生成物 |
| `scripts/`              | 根级编排（dev/build/check/build-desktop） | 不放置实现代码                                           |
| `docs/`                 | 架构、ADR、路线图                         | 架构变化必须更新文档                                     |
| 根配置                  | 文档、CI 与仓库级配置                     | 前后端各自持有工具链配置                                 |

## 5. 常用命令

```bash
# 仓库根目录
./scripts/dev.sh            # 同时启动后端 8787 + 前端 5173
./scripts/build.sh          # 后端 release + 前端产物
./scripts/check.sh          # 后端 fmt/clippy/test + 前端 lint/test/build
./scripts/build-desktop.sh  # Tauri 打包

# 前端（cd frontend）
pnpm install
pnpm dev                    # Vite dev server
pnpm dev:desktop            # Tauri dev（需先启动后端）
pnpm lint                   # ESLint（含 boundaries）
pnpm test                   # 各前端包测试
pnpm build                  # tsc + vite build
pnpm typecheck              # 各包 tsc --noEmit

# 后端（cd backend）
cargo run -p open-calculator-server
cargo fmt --all
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

## 6. 工作方式

- 小步修改：一次只解决一个明确问题，行为变化与重构分开提交。
- 先读再写：修改前阅读相关实现与文档；不要臆测 Univer / Tauri API，必要时查官方文档。
- 以验证收尾：改完必须运行 `./scripts/check.sh`（或对应的最小集），并说明验证结果。
- 提交规范：Conventional Commits；完成任务后主动提交（若被授权）。
- 文档同步：行为、接口、架构变化必须更新 README / docs。

### 每次交付的最小验证集

```bash
./scripts/check.sh
```

涉及桌面端的改动额外运行：

```bash
cd frontend && pnpm --filter @open-calculator/desktop check
```

## 7. 边界（当前阶段明确不做）

- v1 不引入 SQLite（文件原子写 + 检查点；测量后再评估）；不做认证、云同步、多人协作。
- 不提前实现 AI 模型调用；AI 相关只做接口设计与占位（见 `docs/adr/0006-ai-architecture.md`）。
- 不新增“框架级”抽象（状态管理库、依赖注入、自研渲染器），除非有第二个使用方。
- 表格引擎已定为 Univer（Excel 级体验优先）；v1 不做自研网格。
- v1 后端插件只做官方插件（CSV/JSON 数据源 + 公式函数插件），配置开关启用；不做第三方 WASM、不做原生动态库。
- 实时计算只在单个文件内传播；不做文件监控/轮询，数据源仅手动刷新。
- 前端包拆分与扩展体系按 ADR-0011/0012 实现：6 个 packages + `frontend/apps/web`，边界由 ESLint boundaries 强制；新代码不得绕过包入口或扩展注册。
- 前端不得直接持有模型 API key；AI 一律经 Rust 后端。
- 不修改 `frontend/apps/desktop/src-tauri/binaries/`、`target/`、`node_modules/` 等生成物。

## 8. 已知陷阱

- 前端 `.npmrc` 使用官方 npm registry：Univer 新版本在国内镜像可能缺失。
- 前后端各有独立工具链：前端命令在 `frontend/` 执行，后端命令在 `backend/` 执行；仓库根目录不再有 `package.json` / `Cargo.toml`。
- `frontend/apps/desktop/src-tauri` 被排除在 backend Cargo workspace 外；修改 Rust 依赖时留意两份 `Cargo.lock`。
- Tauri 的 `externalBin` 在编译期校验文件存在：首次桌面构建前需运行 `cd frontend && pnpm --filter @open-calculator/desktop build:sidecar`（`dev`/`build` 脚本已自动执行）。
- Univer 的工作簿快照中公式存于 `cellData[row][col].f`（0-based 行列），演示数据的 Excel 引用需注意偏移。
- 前端 API 基地址：浏览器走 Vite proxy（同源），Tauri 运行时自动切换为 `http://127.0.0.1:8787`。
- 性能预算见 `docs/architecture/principles.md`；released 二进制已启用 LTO/strip，改动构建配置后需重新测量体积与启动时间。

## 9. 文档索引

- [README](README.md)
- [工程原则与性能预算](docs/architecture/principles.md)
- [后端架构设计](docs/architecture/backend.md)
- [前端架构设计](docs/architecture/frontend.md)
- [架构总览](docs/architecture/overview.md)
- [技术选型](docs/architecture/tech-stack.md)
- [ADR](docs/adr/README.md)
- [路线图](docs/roadmap.md)
- [贡献指南](CONTRIBUTING.md)
