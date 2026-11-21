# 技术选型调研（Tech Stack Survey）

- 状态：调研草案 v0.1，供后续 ADR 引用；不是最终架构决定。
- 事实快照时间：2026-11-21（版本、许可证、发布时间均以该日 registry / crates.io 查询为准）。
- 项目目标：开放、可扩展、AI 原生的计算器；Web 技术 + Rust 后端，前后分离，可打包桌面应用；前端体验像 Excel。
- 核实方式：`npm view <pkg> version license time --registry=https://registry.npmjs.org`、`crates.io` API（`/api/v1/crates/<crate>`）、官方文档与仓库 README。凡未能一手核实的结论在文中标注「待验证」，汇总见第 10 节。
- 相关文档：[架构总览](overview.md)、[路线图](../roadmap.md)、[ADR 索引](../adr/README.md)。本文档是 ADR-0001～0006 的事实依据；若本文与已接受 ADR 冲突，以 ADR 的决策为准。

---

## 1. 决策摘要

| 领域          | 选择                                                                  | 备选                                             | 核心理由                                                                           | 主要风险                                                                 |
| ------------- | --------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 前端框架      | React 19.3.1（MIT）                                                   | Vue 3、Svelte 5                                  | Univer 视图层基于 React 18，官方声明支持 18/19；生态与 AI UI 组件最多              | 无显著风险；Univer 对 16.9/17 仅「最小兼容」，本项目用 19 属正常路径     |
| 构建          | Vite 8.3.8（MIT）+ TypeScript ~5.9.3                                  | Rspack、webpack 5                                | Univer 官方推荐 Vite/esbuild；当前仓库构建链路已跑通                               | TS 最新为 7.0.2（2026-07-08），项目落后两个大版本，升级需独立 spike      |
| 表格引擎      | Univer 1.6.0（Apache-2.0）                                            | FortuneSheet、AG Grid、Handsontable、自研 Canvas | 开源核心自带公式引擎 + 命令/插件/DI/撤销体系，与「可扩展」目标最贴合               | 1.6.0 发布极新；XLSX 导入导出等属商业模块；包体积大                      |
| 桌面壳        | Tauri 2.12.7 / CLI 2.12.6                                             | Electron、纯 PWA                                 | 体积小、Rust 侧可复用后端逻辑，sidecar 可打包本地 server（仓库已配 `externalBin`） | 三平台 webview 行为差异；签名/自动更新链路尚未落地                       |
| HTTP 后端     | Axum 0.8.9 + Tokio 1.54.1（均 MIT）                                   | Actix Web 4.20、Poem 3.1                         | 与 tokio/hyper/tower 同栈，中间件生态成熟，学习与维护成本低                        | 当前功能不构成性能瓶颈，性能差异不构成选型理由                           |
| 存储          | 内存 Store → SQLite（sqlx 0.9.1 或 rusqlite 0.43.0）                  | Postgres、嵌入式 KV                              | 单机优先、零运维；`revision` 字段已在 API 中出现，天然适配快照版本化               | 迁移期双写/兼容；SQLite 并发写入需串行化                                 |
| 类型共享      | 现阶段手写 TS 接口（`apps/web/src/lib/api.ts`）                       | ts-rs 12、utoipa 6 + openapi-typescript          | 接口少时手写成本最低；后端已用 serde                                               | 手写易漂移；ts-rs 12.0.1 已近 10 个月无新版（待验证），utoipa 6 生态更新 |
| 交互式计算    | Univer `engine-formula`（前端 TS）                                    | HyperFormula（AGPL）、自研                       | 与表格渲染同一数据模型，零序列化开销，支持 Worker 计算                             | 与 Rust 侧权威计算存在「双引擎口径」问题（第 5 节核心）                  |
| 权威/批量计算 | formualizer 0.14.0（MIT OR Apache-2.0）— 先做 spike                   | umya-spreadsheet、calamine、LibreOffice 无头     | 纯 Rust、400+ 函数、增量重算、可注册自定义函数、WASM 友好                          | 0.14 版本迭代极快（月内 0.9→0.14），API 不稳、社区极新                   |
| 插件沙箱      | 现在不做；下一步 wasmtime 51（Apache-2.0 WITH LLVM-exception）        | 进程隔离、Deno、JS 沙箱                          | 组件化调用、燃料/超时控制、formualizer 亦支持 wasmtime 插件                        | 集成成本高；WASI 能力边界需自行裁剪                                      |
| AI 层         | 后端统一代理 + SSE；provider 抽象（OpenAI 兼容 / Anthropic / Ollama） | 前端直连模型                                     | key 不落前端；本地优先；可替换 provider                                            | 流式 + 工具调用状态机复杂度；隐私边界需产品化说明                        |
| 工程          | pnpm 12 workspace + Cargo workspace                                   | npm/yarn、Nx                                     | 两端依赖管理简单直接，符合 monorepo 现状                                           | 跨端任务编排（`concurrently`）在 CI 上需注意信号处理                     |

---

## 2. 前端表格引擎

### 2.1 现状（事实）

前端已按 Univer 初始化，不是「待选」状态：

- `apps/web/src/components/Spreadsheet.tsx`：`createUniver` + `UniverSheetsCorePreset`（preset 模式），挂载后创建/恢复 workbook，命令订阅后 800ms 防抖自动保存。
- `apps/web/package.json`：`@univerjs/presets@^1.6.0`、`@univerjs/preset-sheets-core@^1.6.0`。
- 依赖事实：两包均为 **Apache-2.0**，npm 最新 **1.6.0**，发布于 **2026-11-21**（1.5.0 为 2026-11-14）。`preset-sheets-core` 的 peer 依赖为 `react ^16.9 || ^17 || ^18 || ^19`、`react-dom` 同、`rxjs >=7`。
- 官方 README：Univer 视图层基于 React 18，**支持 React 18 与 19**；浏览器基线 Chrome/Edge ≥88、Firefox ≥90、Safari ≥14.1；依赖 `Intl.Segmenter`（不支持时需 polyfill）。
- 文档站当前标注版本 **v1.5.2**，落后于包版本 1.6.0（文档滞后，属正常但需注意 API 以实际类型为准）。

### 2.2 为什么保留 Univer（论证，不是重新推荐）

1. **许可证可商用且核心开源**：仓库 README 明确「本仓库 Apache-2.0，可在商业应用中使用」，公式引擎、渲染引擎、命令系统、Facade API 都在开源核心内。对「开放」定位，这是硬门槛（HyperFormula 为 AGPL-3.0 或商业授权，直接排除）。
2. **它提供的正是本项目最贵的那部分**：Canvas 渲染 + 公式引擎 + 选区/剪贴板/格式/撤销，自研等价物是月级起步。
3. **扩展模型与「可扩展」目标同构**：三层插件（core → product → feature）、`DependentOn` 声明依赖、DI 容器、Command/Mutation/Operation 三分、`IUndoRedoService` 统一撤销。自定义函数是官方一等能力（第 7 节）。
4. **Facade API 面向外部操作**，`FWorkbook`/`FWorksheet`/`FRange` 与 `univerAPI.Event`/`Enum` 是稳定的应用层入口——AI 层与后续插件都应只走 Facade，不碰内部 service。
5. **React 19 官方支持**已在 1.6.0 的 peer 范围内，不需要 hack。

### 2.3 横向对比

| 维度                 | Univer 1.6.0                                                                                           | FortuneSheet 1.0.4                                          | Luckysheet 2.1.13                                                                             | Handsontable 18.1.3                                                           | AG Grid 36.3.0                           | 自研 Canvas 网格 |
| -------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------- | ---------------- |
| 许可证               | Apache-2.0（核心）                                                                                     | MIT                                                         | MIT                                                                                           | 非标准：`SEE LICENSE IN LICENSE.txt`（非商业免费 + 商业授权，具体条款待验证） | 社区版 MIT（企业版商业）                 | 自有             |
| 公式引擎             | 内置（TS），支持 Worker                                                                                | 无（需外挂）                                                | 内置，老旧                                                                                    | 无（需 HyperFormula 等）                                                      | 无                                       | 自研             |
| Excel 兼容度         | 高（格式/公式/富文本/冻结/数据验证等开源能力，见 README 能力表）；**XLSX 导入导出属商业/独立分发模块** | 中（基础格式 + 公式渲染）                                   | 中低，停止演进                                                                                | 低（数据网格定位）                                                            | 低（数据网格定位）                       | 取决于投入       |
| 插件扩展             | 强：插件 + DI + 命令 + Facade                                                                          | 弱                                                          | 无                                                                                            | 中（插件 API，商业特性多）                                                    | 强（但偏数据网格）                       | 完全自有         |
| React/TS 集成        | 官方 React 集成文档，类型完整                                                                          | React 包（`@fortune-sheet/react`）                          | 非 React 原生                                                                                 | 官方 React 封装                                                               | 官方 React 封装                          | 自行封装         |
| 维护活跃度           | 高（周级发版）                                                                                         | 低-中（最新 1.0.4，registry 更新于 2025-11-06，此后无新版） | 停滞（npm 最后 2.1.13 / 2021-01，registry 2022 后无更新；仓库标题已写「upgraded to Univer」） | 高（18.1.3 / 2026-11-20）                                                     | 高（36.3.0 / 2026-11-04，v32 为 LTS 线） | —                |
| 体积（npm unpacked） | 核心 + preset 分层（preset 仅 22 KB，实际体积取决于插件与 locale/CSS）                                 | 8.2 MB                                                      | —                                                                                             | 34.7 MB / 3580 文件                                                           | 21.9 MB                                  | 可控             |
| 协作能力             | 开源核心不含协作；OT 协作在商业 Server SDK                                                             | 无                                                          | 无                                                                                            | 无                                                                            | 无                                       | 无               |
| 与「AI 原生」契合    | 高：Facade/Headless/官方 AI SDK 扩展均基于同一快照模型                                                 | 低                                                          | 低                                                                                            | 低                                                                            | 低                                       | 中               |

**结论**：保留 Univer。它不是「唯一能画表格的库」，而是「唯一同时满足 Apache-2.0 + 内置公式引擎 + 可编程扩展 + 面向 Agent 的 Facade」的选项。

### 2.4 风险与切换成本

| 风险     | 说明                                                                                                                  | 缓解                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 版本极新 | 1.6.0 发布于事实快照当天；`^1.6.0` 允许 1.x 漂移，而 Univer 要求所有 `@univerjs/*` **同版本**，混版会出现运行时不匹配 | 锁定精确版本；升级时全量 `@univerjs/*` 同步升级并跑冒烟测试                                               |
| 开源边界 | 协作、图表、透视表、**XLSX 导入导出**、Server SDK、AI SDK 均为商业/独立分发；README 与 pricing 页为准                 | 产品层面把「导入/导出 Excel」明确为后续商业决策点；自研导入用 `calamine`（第 5 节）                       |
| 体积     | Canvas + 多 locale + 多 CSS；当前 `dist/assets` 已含大量 locale chunk                                                 | 按需 locale、路由级/懒加载、构建产物预算（spike 项）                                                      |
| 文档滞后 | 文档站 v1.5.2 vs 包 1.6.0                                                                                             | API 以 `node_modules` 类型声明为准，重要 API 写测试固化                                                   |
| 锁定成本 | 数据模型是 Univer 的 `IWorkbookData` 快照                                                                             | **已在做**：后端只存不透明 snapshot + revision，前后端解耦；再加一层 `SpreadsheetHost` 接口（不必现在写） |

切换成本粗估（同等功能达成度下）：

| 备选               | 迁移成本         | 代价                                                                      |
| ------------------ | ---------------- | ------------------------------------------------------------------------- |
| FortuneSheet 1.0.4 | 1–2 周 UI 层替换 | 失去公式引擎与插件体系，需要引入 HyperFormula（AGPL，不可接受）或自研公式 |
| AG Grid 36         | 2–4 周           | 数据网格语义，需自建公式栏、单元格编辑器、公式计算                        |
| 自研 Canvas        | ≥ 2 人月         | 渲染、选区、编辑、公式、撤销全部自建                                      |

---

## 3. 桌面壳

事实：`tauri` crate **2.12.7**（2026-11-18，Apache-2.0 OR MIT）、`@tauri-apps/cli` **2.12.6**、`@tauri-apps/api` **2.12.5**；仓库 `apps/desktop/src-tauri/tauri.conf.json` 已启用 `externalBin: ["binaries/open-calculator-server"]` 与 CSP。另注：3.0 已进入 alpha（`tauri 3.0.0-alpha.6`，2026-11-06），2.x 仍是稳定主线，**不提前迁移**。

| 维度     | Tauri 2（选择）                                                                             | Electron                       | PWA              |
| -------- | ------------------------------------------------------------------------------------------- | ------------------------------ | ---------------- |
| 运行时   | 系统 webview + Rust 主进程                                                                  | 自带 Chromium + Node           | 浏览器           |
| 安装体积 | 小（依赖系统 webview；可用 `lto`/`opt-level="s"`/`strip` 进一步压缩，见官方 App Size 文档） | 大（Chromium 随包）            | 无安装           |
| 后端复用 | Rust 代码可直接编译进主进程，或用 sidecar 启动本地 server                                   | 需要 Node 侧重写或 fork 子进程 | 需要远端服务     |
| 平台差异 | macOS WKWebView / Windows WebView2 / Linux WebKitGTK，渲染与 API 行为有差异                 | 三平台一致                     | 取决于用户浏览器 |
| 自动更新 | 官方 updater 插件（要求签名密钥对；静态 JSON 或动态更新服务器；插件文档要求 Rust ≥1.90）    | electron-updater 生态成熟      | 浏览器自动更新   |
| 签名分发 | macOS 需 codesign + notarization，Windows 需 Authenticode                                   | 同左，工具链更成熟             | 无               |

**决策**：Tauri 2。理由不是「更轻」，而是「后端是 Rust」——主进程、sidecar、`crates/server` 三点可以共享类型与逻辑（当前 desktop 通过 sidecar 跑 server，未来可选进程内集成）。

**已知差异与待验证**：

- macOS WKWebView 对 Canvas/字体/`Intl` 的行为与 Chromium 不同；Univer 是 Canvas 渲染，**必须在 WKWebView 实测滚动与编辑延迟**（spike）。
- Linux WebKitGTK 版本碎片化，可能成为支持矩阵短板。
- sidecar 二进制需按 `-$TARGET_TRIPLE` 命名（官方 sidecar 文档）；仓库已有 `apps/desktop/scripts/build-sidecar.sh`（`build:sidecar`），三平台 triple 与 CI 产物待补。
- 自动更新与签名**现在不做**：需要密钥管理、更新服务器、公证账号，属于发布阶段工作。

---

## 4. Rust 后端

### 4.1 框架对比（2026-11-21 事实）

| 框架      | 最新版 | 发布日期   | 许可证            | 判断                                                                                                                |
| --------- | ------ | ---------- | ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| Axum      | 0.8.9  | 2026-04-14 | MIT               | **选择**：与 tokio/hyper/tower 同栈，`tower-http` 中间件与 `axum::serve` 生命周期清晰（仓库已有 graceful shutdown） |
| Actix Web | 4.20.0 | 2026-11-17 | MIT OR Apache-2.0 | 性能标杆，但独立 actor 运行时与项目其余栈不一致，收益不成立                                                         |
| Poem      | 3.1.12 | 2025-07-28 | MIT OR Apache-2.0 | 生态与更新频率弱于前两者                                                                                            |

当前仓库事实：`crates/server` 已有 `config/routes/store/app/error` 与 `tests/api.rs`，依赖 `axum 0.8.9`、`tokio 1.54`、`tower-http 0.6`、`thiserror 2`。

值得记录的小项：

- `tower-http` 当前锁 **0.6**，最新为 **0.7.1**（2026-08-31）——升级待验证（CORS/trace 层 API 可能有变）。
- `tokio` 锁定 `1.54`，crates.io 最新 **1.54.1**，可直接补丁升级。

### 4.2 存储演进

| 阶段   | 方案                                                                             | 说明                                                                                                                                                             |
| ------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 现在   | 进程内 `InMemoryStore`（snapshot JSON + `revision` + `updatedAt`）               | 已有 API：`GET/PUT /api/v1/workbooks/{id}`（写入即 bump revision）、`/health`、`/meta`；`meta.capabilities.workbooks` 当前为 `"memory"`，前端 800ms 防抖自动保存 |
| 下一步 | SQLite：`sqlx 0.9.1`（异步、迁移、编译期校验）或 `rusqlite 0.43.0`（同步、更轻） | 单机场景建议 `sqlx` + `sqlite` feature；表草案见下                                                                                                               |
| 以后   | Postgres（多用户/云同步时）                                                      | 与「现在不做」清单一致，不提前抽象                                                                                                                               |

表草案（下一步）：

```sql
CREATE TABLE workbooks (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  snapshot     TEXT NOT NULL,      -- 不透明 JSON，前端/iWorkbookData 快照
  revision     INTEGER NOT NULL DEFAULT 0,
  engine       TEXT NOT NULL,      -- 产生快照的计算引擎标识:version
  updated_at   TEXT NOT NULL
);
```

`engine` 列对应第 5 节的「计算身份」，为双引擎口径问题留证据。

### 4.3 类型共享

| 方案                              | 优点                            | 缺点                                                    | 结论                         |
| --------------------------------- | ------------------------------- | ------------------------------------------------------- | ---------------------------- |
| 手写 TS（现状）                   | 零构建依赖，可控                | 易漂移                                                  | 现在：够用，配合后端集成测试 |
| ts-rs 12.0.1                      | 从 Rust 类型生成 `.d.ts`        | 最后发版 2026-01-31，近 10 个月无更新（待验证维护状态） | 下一步候选，先跑 spike       |
| utoipa 6.0.0 + openapi-typescript | 单一 OpenAPI 契约，顺带产出文档 | 引入注解噪音；`utoipa 6` 较新                           | 接口数量上到 10+ 时再切换    |

---

## 5. 计算引擎分层（核心设计难题）

### 5.1 现状事实

- Univer 的公式运行时是 `@univerjs/engine-formula`：解析公式、注册函数、依赖图、计算、Facade 扩展；支持 **Worker 计算**（主线程 `notExecuteFormula: true`，Worker 内 `@univerjs/engine-formula/worker`）。
- Univer 提供 **Headless**（Node.js ≥18.17）能力：内容模型/命令/计算可脱离编辑器运行，是「后端权威计算」的官方路径之一。
- 因此当前实际形态是：**浏览器内 TS 引擎是唯一计算者**，后端只做快照持久化。

### 5.2 分层（建议目标形态）

```text
L4 持久化/审计   后端 snapshot + revision + engine:version + 变更日志
      ▲
L3 权威/批量重算  Rust: formualizer（读 xlsx、批量重算、导出、无 UI）
      ▲  RPC（可选，默认不启用）
L2 自定义函数     前端 TS 插件（现在）→ v0.2 Rust 注册表 + WASM（wasmtime）
      ▲
L1 交互式计算     Univer engine-formula（主线程或 Worker）——用户看到的结果
      ▲
L0 数据/引用模型  Univer IWorkbookData 快照；后端只存不透明 JSON
```

设计原则：

1. **单一写入者**：单元格值的权威来源恒为 L1 的编辑结果；L3 只能在「导入/重算」这类显式动作中产出新快照，且必须整体替换 + 记录 `engine:version`，不做隐式回填。
2. **计算身份**：快照携带 `engine`（如 `univer@1.6.0` / `formualizer@0.14.0`），出现数值差异时可定位到引擎与版本。
3. **函数清单单一来源**：自定义函数名/签名/参数说明集中定义，L1 与 L3 的实现共用同一份清单与测试向量，禁止两边各写一份。

### 5.3 双引擎口径一致性

这是最容易埋雷的地方，必须用工程手段而非口头约定：

| 问题           | 现象                                        | 对策                                                              |
| -------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| 浮点与求和顺序 | `SUM` 大范围结果末位差异                    | 统一 IEEE-754 float64；对账用相对误差阈值（如 1e-9）              |
| 日期/时间      | Excel 序列号、1900 闰年 bug、时区           | 明确「值层用序列号，UI 层格式化」；测试向量覆盖 1900-02-29 等边界 |
| 错误值传播     | `#DIV/0!`/`#VALUE!`/`#N/A`/`#NUM!` 的优先级 | 建立错误值映射表，纳入 golden fixtures                            |
| 空单元格语义   | 空串 vs 0 vs 空                             | 用 Excel 行为做基准（formualizer 声称按 Excel 逐单元格语义校验）  |
| 函数覆盖差异   | Univer 与 formualizer 函数集合不完全相同    | 函数能力矩阵 + 「不支持则整表拒绝重算」而非静默降级               |

落地方式：建立 `testdata/formula-golden/`（A 列公式、B 列期望值、C 列来源引擎），由 Rust 测试与前端 vitest 双向读取；CI 中两端各跑一次，差异即失败。

### 5.4 异步自定义函数（RPC 方案）

Univer 侧事实：`BaseFunction` 子类 + `AsyncObject` + `isAsync(): true` 可返回异步结果；`withCustomData` 可附带元数据（官方文档 `docs.univer.ai/blog/custom-formula`）。但**异步函数不应在公式内直接做长耗时网络调用**（会阻塞重算批次、难以缓存）。

建议协议：

```http
POST /api/v1/functions/invoke
{ "name": "AI_CLASSIFY", "args": [{ "type": "range", "value": "A1:A10" }],
  "workbookId": "demo", "revision": 42, "timeoutMs": 3000, "idempotencyKey": "sha256(formula+args+revision)" }
→ 200 { "type": "array", "value": [[0.12],[0.88]] }
```

- **幂等键**由「函数名 + 规范化参数 + workbook revision」哈希得到，前端可缓存短期结果。
- **超时**返回 `#TIMEOUT!`（自定义错误位，需与 Univer 错误对象映射），不抛异常穿透执行栈。
- **限流**在后端按 workbook 维度做；失败计数超阈值后该函数进入降级（返回 `#N/A` + 侧边栏提示）。
- **不要**把 SSE/流式用于函数调用；流式只属于第 6 节的 AI 对话通道。

### 5.5 Rust 侧 crate 评估

| crate                | 最新版（发布）                                         | 许可证                         | 能力                                                                                                                                                                                 | 风险/判断                                                                                            |
| -------------------- | ------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **formualizer**      | 0.14.0（2026-11-08）                                   | MIT OR Apache-2.0              | 400+ 函数、动态数组、`LET`/`LAMBDA`、增量重算、注册自定义函数、读 XLSX/CSV/JSON、写 XLSX、WASM + wasmtime 插件、SheetPort（把表格当有类型的 API）、确定性求值（可注入时钟/随机种子） | **社区极新**：总下载约 6.5k，两个月内 0.9→0.14，API 不稳、单人维护；不能作为当前生产依赖，只能 spike |
| **umya-spreadsheet** | 4.0.0-beta.1（2026-10-26）；稳定线 3.1.1（2026-10-12） | MIT                            | 读写 XLSX（含样式），无公式求值                                                                                                                                                      | 4.0 处于 beta；若只需写文件，可用稳定 3.1.1                                                          |
| **calamine**         | 0.38.0（2026-11-02）                                   | MIT                            | 只读 xls/xlsx/xlsm/xlsb/ods，可读公式文本与样式（xlsx），**不计算、不写**                                                                                                            | 成熟稳定（下载 1900 万+），适合导入与大数据扫描                                                      |
| **wasmtime**         | 51.0.0（2026-11-20）                                   | Apache-2.0 WITH LLVM-exception | WASM 运行时，可做插件沙箱（燃料/超时/内存限制）                                                                                                                                      | 集成成本高；组件模型与 WASI 能力需裁剪（待验证具体 API）                                             |

组合建议：

- **现在**：不引入任何 Rust 计算引擎。L1 = Univer。
- **下一步**：`calamine` 做「导入 Excel 为快照」的读取层（成熟、低风险）；`formualizer` 只做一致性 spike（用同一批 golden fixtures 与 Univer 对比）。
- **以后**：若重算/批量/服务端权威计算成为真实需求，再引入 `formualizer`（固定小版本，隔离在单独 crate，提供 trait 抽象以便替换）；若只需导出 XLSX，用 `umya-spreadsheet` 稳定线即可。

### 5.6 分阶段建议（避免过度设计）

| 阶段       | 计算引擎                                                               | 后端                                            | 扩展                                                                                                                     |
| ---------- | ---------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **现在**   | 仅 Univer `engine-formula`，主线程；公式正确性靠前端 vitest + 人工冒烟 | 快照存储（内存）+ `engine` 字段预留             | 自定义函数走 Univer 插件（TS），先做 1–2 个示例函数                                                                      |
| **下一步** | 打开 Worker 计算（大表不卡 UI）；建立 golden fixtures 与函数清单       | SQLite 持久化 + revision 冲突检测（`If-Match`） | `calamine` 导入；`formualizer` 一致性 spike；Rust 自定义函数注册表 + 异步函数 RPC；wasmtime 沙箱试点（ADR-0005 的 v0.2） |
| **以后**   | `formualizer` 作为批量/权威重算，显式动作触发；差异对账工具            | 变更日志/审计；可选 Postgres                    | 插件 manifest/权限体系、签名分发、插件市场                                                                               |

---

## 6. AI 层

### 6.1 provider 抽象

后端统一入口，前端只认自家协议：

```text
POST /api/v1/ai/chat  (SSE)
{ "provider": "openai-compatible|anthropic|ollama",
  "model": "...", "messages": [...], "tools": [...], "context": { "workbookId": "demo", "selection": "B2:D4" } }
← event: token / tool_call / tool_result / done / error
```

- **配置在后端**：env（如 `AI_PROVIDER`、`AI_BASE_URL`、`AI_API_KEY`），未配置时 `meta.capabilities.ai = false`（前端 `AiPanel` 已按此渲染）。
- **OpenAI 兼容优先**：一个适配器同时覆盖 OpenAI、DeepSeek、vLLM、Ollama 的 `/v1/chat/completions`；Anthropic 单独适配（消息结构不同），排后面。
- 桌面场景下后端跑在 `127.0.0.1`，key 只存在本机 env/系统钥匙串，**永不进入前端 bundle**。

### 6.2 工具调用（最小集合）

| 工具                                 | 语义                      | 风险控制                                              |
| ------------------------------------ | ------------------------- | ----------------------------------------------------- |
| `read_range(sheet, range)`           | 读选区，返回值 + 公式文本 | 只读，必开                                            |
| `get_workbook_schema()`              | 工作表/表头/结构摘要      | 只读；不含全量单元格                                  |
| `explain_formula(...)`               | 解释公式语义与依赖        | 只读                                                  |
| `set_formula(sheet, range, formula)` | 写入公式                  | 写工具：MVP 返回 diff 由用户确认，v0.3 才允许自动应用 |
| `write_range(...)`                   | 写入值                    | 同 `set_formula`；服务端校验范围与大小上限            |

工具命名与实施阶段以 [ADR-0006](../adr/0006-ai-architecture.md) 为准（本文只记录依据）。前端形态：侧边栏对话（已存在 `AiPanel`）+ 选区上下文注入；模型输出到单元格时走「预览 → 确认 → 执行」，执行通过 Facade API（`FRange.setValue`）而不是直接改 store。

### 6.3 流式与隐私

- SSE 用 `axum::response::sse` + `tokio-stream 0.1.19`；事件带 `id` 以支持重连补偿。
- 上下文预算：只传选区 + 结构摘要（sheet 名、表头、少量样例），不传整本 snapshot；大表先让模型调 `get_range`。
- 「本地优先」写进产品说明：默认 provider 可设 Ollama，数据不出本机；云端 provider 需显式开启。

---

## 7. 可扩展性模型（插件）

### 7.1 三类插件

| 类型         | 运行位置                                      | 能力                                 | 阶段                           |
| ------------ | --------------------------------------------- | ------------------------------------ | ------------------------------ |
| UI/命令插件  | 前端（Univer plugin）                         | 面板、菜单、快捷键、命令与撤销       | 下一步（先做一个示例）         |
| 计算函数插件 | 前端 TS → v0.2 Rust 注册表 + WASM（wasmtime） | 注册函数、异步函数                   | 现在：TS 示例；v0.2：Rust/WASM |
| AI 工具插件  | 后端                                          | 声明工具名/参数 schema，交给模型调用 | 下一步（v0.3 起）              |

### 7.2 插件清单 manifest 草案

```json
{
  "id": "com.example.loan-functions",
  "name": "Loan Functions",
  "version": "0.1.0",
  "apiVersion": "0.1",
  "engines": { "univer": "1.6.x", "openCalculator": ">=0.1.0 <0.2.0" },
  "kind": "function",
  "entry": { "runtime": "wasm", "module": "plugin.wasm", "functions": ["LOAN_PMT"] },
  "permissions": ["cells.read", "ai.invoke"],
  "limits": { "timeoutMs": 2000, "fuel": 50000000, "maxMemoryMb": 64 },
  "signature": null
}
```

### 7.3 权限 / 沙箱 / 版本兼容

| 项       | 现在                     | 以后                                                                                |
| -------- | ------------------------ | ----------------------------------------------------------------------------------- |
| 权限     | 无插件运行时             | 声明式权限列表（`cells.read`/`cells.write`/`net.fetch`/`ai.invoke`），安装时展示    |
| 沙箱     | 无                       | wasmtime：fuel 限制、epoch 超时、内存上限、host 函数白名单（默认只给 `cells.read`） |
| 网络     | 后端代理，函数内不可直连 | 需 `net.fetch` 权限 + 域名白名单                                                    |
| 版本兼容 | `apiVersion` 字段预留    | 半开区间 semver；加载前校验，不匹配拒绝加载并给可读原因                             |
| 分发     | 本地目录                 | 签名 + 来源校验（待验证 Tauri updater 签名机制能否复用）                            |

---

## 8. 风险清单与验证计划（Spike）

| #   | 风险                                                              | 影响            | 验证方式（spike）                                                                                                                                | 完成判据                                |
| --- | ----------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| S1  | Univer 在 macOS WKWebView（Tauri）中滚动/编辑性能与 Chromium 差异 | 桌面端体验      | 在 `apps/desktop` 打包后跑 1 万行 × 30 列工作表，记录 FPS 与输入延迟                                                                             | 输入到渲染 < 50ms，滚动无明显掉帧       |
| S2  | Univer 版本升级破坏（1.6.0 极新、`@univerjs/*` 需同版本）         | 构建/运行时错误 | 锁定精确版本，写升级脚本 + 冒烟测试清单                                                                                                          | 升级流程可重复，冒烟全绿                |
| S3  | 双引擎口径差异（Univer vs formualizer）                           | 数值不可信      | 20–50 条 golden fixtures（SUM/IF/VLOOKUP/日期/错误值/动态数组）两端对拍                                                                          | 差异项有明确归类（支持/不支持/精度）    |
| S4  | formualizer 0.14 API 不稳                                         | 返工            | 单独 crate + trait 隔离，只做一个「读 xlsx → 重算 → 导出值」最小闭环                                                                             | 一周内可替换实现而不动业务层            |
| S5  | 前端 bundle 体积（Univer + locale + CSS）                         | 首屏            | 当前实测：主 JS 6.9 MB（gzip 1.66 MB），`dist` 共 43 MB / 157 文件（含 locale chunk 与 sourcemap）；再用 `rollup-plugin-visualizer` 拆解，定预算 | 主 chunk 预算明确，超限有构建告警       |
| S6  | 异步自定义函数阻塞重算                                            | 卡顿/超时雪崩   | 用假接口（延迟 500ms/3s/超时）验证 `AsyncObject` 行为与降级                                                                                      | 超时不出异常穿透，UI 可继续编辑         |
| S7  | AI 工具调用误写单元格                                             | 数据损坏        | 所有写操作走「确认 + 服务端校验 + revision 冲突检测」                                                                                            | 冲突/越界/超限均被拒绝且有可读错误      |
| S8  | sidecar 跨平台打包（`-$TARGET_TRIPLE`、CSP、端口）                | 发布            | 已有 `apps/desktop/scripts/build-sidecar.sh` 与 `build:sidecar` 脚本；补三平台 triple 与 CI 产物                                                 | 三平台双击可启动，前端能连上本地 server |
| S9  | 后端存储从内存迁移 SQLite 的并发写                                | 数据丢失        | 并发 PUT 同一 workbook 的测试（revision CAS）                                                                                                    | 冲突返回 409，无静默覆盖                |

---

## 9. 现在不做（明确排除）

1. 协作/CRDT/多人光标 —— Univer 协作在商业 Server SDK，且产品当前是单机。
2. 多用户账户、权限、云同步、云端存储。
3. 插件的 WASM 沙箱与签名分发（v0.2 才启动，现状只需 TS 示例函数）。
4. 自研表格渲染或自研公式引擎。
5. Rust 侧权威计算进入生产链路（`formualizer` 只做 spike）。
6. 自动更新、代码签名、公证（发布阶段再做）。
7. AI 多 provider 全量适配（先 OpenAI 兼容 + Ollama；Anthropic 后置）。
8. XLSX 导入导出作为「已支持」对外宣称 —— 开源核心不含，需商业模块或自研（`calamine` 读 / `umya-spreadsheet` 写）。

---

## 10. 待验证清单

| #   | 条目                                                                  | 不确定点                                                               | 验证方法                                                       |
| --- | --------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | Univer 1.6.0 实际 API 与文档 v1.5.2 的差异                            | 文档滞后                                                               | 以 `node_modules/@univerjs/*` 类型声明为准，关键调用补类型测试 |
| 2   | Univer 开源核心的公式函数覆盖清单                                     | README 未列函数级清单                                                  | 从 `@univerjs/engine-formula` 导出表统计，与 Excel 对照        |
| 3   | Univer XLSX 导入导出的商业授权与价格                                  | pricing 页未逐一核实                                                   | 查 `univer.ai/pricing/` 与 `univer.ai/compare/`，必要时询价    |
| 4   | Handsontable 18.1.3 的许可条款细节                                    | npm 只写 `SEE LICENSE IN LICENSE.txt`                                  | 读仓库 LICENSE 文本，确认非商业/商业边界                       |
| 5   | AG Grid React 封装版本线                                              | `ag-grid-community@36.3.0` 与 `@ag-grid-community/react@32.3.9` 不一致 | 查官方迁移文档（v32 LTS vs 最新）                              |
| 6   | formualizer 0.14 与 Excel 的边界行为                                  | 官方自述按 Excel 校验，但无独立审计                                    | 用 Excel 生成的 golden fixtures 对拍                           |
| 7   | formualizer WASM 插件 + wasmtime 51 的集成方式                        | 版本/feature 组合未验证                                                | 跑官方 `wasm_plugin_inspect_attach_bind` 示例                  |
| 8   | Tauri updater 与签名复用                                              | 需要密钥体系与更新服务器                                               | 查 updater 插件文档 + macOS 签名文档，评估成本                 |
| 9   | WKWebView 上 Univer 的 `Intl.Segmenter` 可用性                        | macOS 版本差异                                                         | 在目标 macOS 版本实测；必要时打包 polyfill                     |
| 10  | TypeScript 7.0.2（原生编译器）与 Vite 8 / eslint 10 / vitest 5 的兼容 | 未知                                                                   | 单独分支试升级，跑全量 lint/test                               |
| 11  | ts-rs 12 的维护状态                                                   | 近 10 个月无新版                                                       | 查仓库最近提交与 issue 响应                                    |
| 12  | tower-http 0.6 → 0.7 的破坏性变更                                     | 未读 changelog                                                         | 读 CHANGELOG，评估 CORS/trace 迁移                             |

---

## 11. 参考链接

- Univer
  - [GitHub: dream-num/univer（README：许可证、开源/商业边界、React 支持、运行环境）](https://github.com/dream-num/univer)
  - [npm: @univerjs/presets](https://www.npmjs.com/package/@univerjs/presets) / [@univerjs/preset-sheets-core](https://www.npmjs.com/package/@univerjs/preset-sheets-core)
  - [官方文档：React 集成](https://docs.univer.ai/guides/sheets/getting-started/integrations/react) / [Headless（Node）](https://docs.univer.ai/guides/sheets/getting-started/node) / [Worker](https://docs.univer.ai/guides/sheets/getting-started/worker)
  - [自定义公式（BaseFunction / AsyncObject / withCustomData）](https://docs.univer.ai/blog/custom-formula)
  - [功能对比（开源 vs 商业）](https://univer.ai/compare/) / [定价](https://univer.ai/pricing/)
- 其他表格库
  - [npm: @fortune-sheet/react](https://www.npmjs.com/package/@fortune-sheet/react)
  - [npm: luckysheet](https://www.npmjs.com/package/luckysheet) / [GitHub（仓库标题：upgraded to Univer）](https://github.com/dream-num/Luckysheet)
  - [Handsontable](https://handsontable.com/)
  - [npm: ag-grid-community](https://www.npmjs.com/package/ag-grid-community)
- Tauri
  - [crates.io: tauri](https://crates.io/crates/tauri) / [npm: @tauri-apps/cli](https://www.npmjs.com/package/@tauri-apps/cli)
  - [App Size（体积优化）](https://v2.tauri.app/concept/size/) / [Sidecar（externalBin，`-$TARGET_TRIPLE`）](https://v2.tauri.app/develop/sidecar/)
  - [Updater 插件（签名、静态 JSON / 动态更新服务器）](https://v2.tauri.app/plugin/updater/) / [macOS 签名](https://v2.tauri.app/distribute/sign/macos/)
- Rust 生态
  - [crates.io: axum](https://crates.io/crates/axum) / [docs.rs: axum 0.8.9](https://docs.rs/axum/0.8.9) / [crates.io: actix-web](https://crates.io/crates/actix-web) / [crates.io: poem](https://crates.io/crates/poem)
  - [crates.io: formualizer](https://crates.io/crates/formualizer) / [docs.rs](https://docs.rs/formualizer) / [GitHub](https://github.com/psu3d0/formualizer) / [文档站](https://www.formualizer.dev/docs)
  - [crates.io: umya-spreadsheet](https://crates.io/crates/umya-spreadsheet) / [crates.io: calamine](https://crates.io/crates/calamine) / [GitHub: tafia/calamine](https://github.com/tafia/calamine)
  - [crates.io: wasmtime](https://crates.io/crates/wasmtime) / [crates.io: sqlx](https://crates.io/crates/sqlx) / [crates.io: rusqlite](https://crates.io/crates/rusqlite)
  - [crates.io: ts-rs](https://crates.io/crates/ts-rs) / [crates.io: utoipa](https://crates.io/crates/utoipa)
- 工具链
  - [npm: typescript](https://www.npmjs.com/package/typescript) / [npm: vite](https://www.npmjs.com/package/vite) / [npm: react](https://www.npmjs.com/package/react)
