# 工程原则与性能预算

> 本文中的路径：Rust crate 相对 `backend/`，前端包相对 `frontend/`。

> 状态：**草案 v0.1（2026-11-21），待确认后升级为正式规范**
> 本文是三条产品原则的工程化落地：性能、简洁、模块独立。任何与其冲突的实现都需要 ADR 说明理由。

## 1. 三条原则

### P1 性能优先：高性能、低资源占用

性能不是“以后优化”，而是**设计约束**：

- 冷启动、输入延迟、内存占用、包体积都有**可度量的硬预算**（见 §3），超预算视为回归。
- 先测量后优化：没有基线的优化不做；每次性能相关改动附测量数据。
- 前端交互路径（输入 → 显示）与后端请求路径（API → 存储）各自有预算，不能用“本地够快”互相搪塞。
- 资源占用按“常驻桌面应用”标准衡量：空闲时不应持续占用 CPU，内存与包体积是产品体验的一部分。

### P2 简洁优先：最小实现、接口清晰

- **能删不增**：新抽象必须回答“第二个使用方是谁”；单使用方的抽象一律拒绝。
- 接口先设计、后实现：每个跨模块边界（HTTP、存储、公式、AI、UI 引擎）只有一个入口，接口稳定、可文档化、可测试。
- 依赖集中声明、显式评审：新增依赖要说明体积/许可证/维护状态；禁止为了一个函数引入一个库。
- 错误、类型、命名保持一致；不做“防御不可能的输入”的代码。
- 代码量是成本：模块超过约 1500 行或文件超过约 400 行时，先考虑拆分职责而不是继续堆。

### P3 模块独立：边界清晰、可单独使用

- 每个模块（crate / npm package）原则上**可以脱离本项目单独构建、测试和使用**。
- 依赖方向单向、无环：领域层不依赖传输层，传输层不依赖具体存储实现。
- 模块只通过公开 API 交互；禁止跨模块 reach-in（前端深路径 import、Rust `pub(crate)` 穿透）。
- 每个模块有自己的 README、测试与最小示例；构建命令独立。

### 冲突裁决顺序

1. **正确性**（结果对、不丢数据）
2. **P1 性能硬预算**
3. **P3 模块边界**（必要的结构复杂度）
4. **P2 简洁**（实现层面的最小化）

即：可以为了性能与边界多写一点结构，但不能为了“以后可能有用”牺牲简洁；反过来，不能为了简洁把两个模块揉成一个不可独立使用的整体。

## 2. 当前基线（2026-11-21 实测）

| 指标                         | 现状                        | 测量方式                                        |
| ---------------------------- | --------------------------- | ----------------------------------------------- |
| Web 初始 JS（gzip）          | **1.72 MB**                 | `vite build` 后 preview + 浏览器 `transferSize` |
| Web 空闲 JS Heap             | **42 MB**                   | Chromium `performance.memory`（加载 3s 后）     |
| Web `dist`（不含 sourcemap） | 11 MB                       | `find dist -type f ! -name '*.map'`             |
| Web 加载至 load 事件         | 332 ms（M1、preview、本地） | Playwright 计时                                 |
| 后端 release 二进制          | **2.0 MB**（LTO+strip 后）  | `ls -lh`                                        |
| 后端启动到首个 200           | **6.5 ms**                  | 3 次取均值，Python socket 轮询                  |
| 后端空闲 RSS                 | **6.8 MB**                  | `ps -o rss=`                                    |
| 后端集成测试                 | 6 passed                    | `cargo test`                                    |

结论：**Rust 侧已经达标；前端表格引擎（Univer）是当前唯一显著偏离 P1 的部分**——1.72 MB JS + 42 MB Heap 对一个“计算器”过重。是否继续承担这笔成本，是 §6 的待决问题。

## 3. 性能预算（目标架构）

> 注：前端预算已按 **Univer 路线校准**（2026-11-21，Excel 级体验优先）；体积做 CI 硬门禁，时间指标做趋势/相对基线（±20%）。详见 [前端设计 §10](frontend.md) 与 [ADR-0002](../adr/0002-frontend-univer.md)。

### 前端（计算器主界面）

| 指标               | 硬上限（不可回归） | 目标    | 说明                |
| ------------------ | ------------------ | ------- | ------------------- |
| 初始 JS（gzip）    | 1.60 MB            | 1.30 MB | 不含按需加载功能块  |
| 空闲 JS Heap       | 60 MB              | 45 MB   | 打开空工作簿 10s 后 |
| 加载至 Univer 可用 | 1.2 s              | 700 ms  | M1 + 本机预览服务   |
| 按键到渲染         | 33 ms              | 16 ms   | 单单元格编辑        |
| 10 万单元格滚动    | 稳定 50 FPS        | 60 FPS  | 可视区重绘，非全量  |
| 公式重算 1k 单元格 | 16 ms              | 8 ms    | 增量重算            |
| 打开 10MB 文件     | 1.5 s              | 800 ms  | 前端+后端合计       |

### 后端 / 桌面

| 指标                | 硬上限 | 目标  | 说明                             |
| ------------------- | ------ | ----- | -------------------------------- |
| 启动到首个 200      | 50 ms  | 20 ms | 单机 sidecar 常驻                |
| 空闲 RSS            | 15 MB  | 10 MB | 无请求时                         |
| release 二进制      | 5 MB   | 3 MB  | server                           |
| `GET /health` p99   | 5 ms   | 1 ms  | 本机                             |
| 1 MB 快照 GET / PUT | 50 ms  | 20 ms | 内存存储；SQLite 另定            |
| 桌面安装包          | 20 MB  | 12 MB | Tauri（不含 sidecar 的重复内容） |

> 预算以 M1 Mac 为基准机；CI 只对**体积/二进制大小**做强校验，时间类指标用相对基线（±20%）防回归。

## 4. 模块地图与依赖规则

### 目标 Rust workspace

```text
core       领域模型：Workbook、Revision、Snapshot 信封、领域错误。零 I/O、零 async、零 axum。
formula    公式：AST、解析、求值、依赖图、内置函数。只依赖 core；可编译到 wasm32 与 native。
storage    WorkbookRepository trait + Memory / SQLite 实现。只依赖 core。
ai         LlmProvider trait + OpenAI 兼容 / Ollama 适配。只依赖 serde/reqwest，不依赖 server。
plugins    WASM 插件宿主（后续）。依赖 formula/core。
server     Axum 适配层 + 组装 + main。依赖以上所有，但只做 HTTP 映射与进程生命周期。
```

依赖方向（禁止反向）：

```text
server → storage / ai / formula / plugins / core
storage → core
formula → core
ai      → (无内部依赖)
core    → (无内部依赖)
```

### 目标前端 packages

| 包                         | 职责                                                                                  | 独立性             |
| -------------------------- | ------------------------------------------------------------------------------------- | ------------------ |
| `packages/contracts`       | 纯类型与契约（Snapshot、Dataset、FileContext、BlockModule、Value、ExtensionManifest） | 无 UI/运行时依赖   |
| `packages/api-client`      | 类型化 HTTP 客户端（无 React）                                                        | 可单独发布/Node 用 |
| `packages/workbook-univer` | Univer 适配层（挂载、快照、变更订阅）                                                 | 重依赖隔离、懒加载 |
| `packages/extensions`      | 扩展系统（注册表、扩展点、槽位、错误边界）                                            | 不依赖具体块       |
| `packages/composition`     | 视图与块宿主（View schema、布局、FileContext）                                        | 不依赖具体块       |
| `packages/blocks`          | 内置块（spreadsheet/data-table/kpi/note）                                             | 走扩展注册         |
| `apps/web`                 | 组合根：shell、文件 UX、数据 store、AI 面板                                           | 只组合 packages    |
| `apps/desktop`             | Tauri 壳                                                                              | 组合 apps/web      |

### 模块独立验收标准

一个模块算“独立”必须同时满足：

1. 有独立 README（用途、公开 API、最小示例）；
2. 有独立测试，可单命令运行（`cargo test -p <crate>` / `pnpm --filter <pkg> test`）；
3. 不依赖其他模块的非公开路径；
4. 依赖清单中没有传输层/UI 框架（领域模块）；
5. 在仓库外单独构建的最小验证路径已记录（后续 CI 可自动化）。

## 5. 接口设计规则

### 5.1 进程边界：HTTP `/api/v1`

- 资源化：`/workbooks`、`/workbooks/{id}`；禁止 RPC 风格的动词端点（AI 流式除外）。
- 所有写操作携带 `expectedRevision`（乐观并发），冲突返回 `409`，不做静默覆盖。
- 统一错误信封：`{"error":{"code","message","details?}}`；错误码是稳定契约，message 面向人。
- 快照在边界上使用**版本化信封**，后端不感知具体表格引擎：

```json
{
  "schemaVersion": 1,
  "engine": "univer@1.5.2",
  "data": { "...": "引擎自有数据，向后端不透明" }
}
```

- 类型单一来源：领域类型在 `core`（serde），前端类型由 `ts-rs`（候选）或 OpenAPI 生成；在手写阶段必须用契约测试锁定。
- 请求体上限、超时、CORS 只在服务入口统一配置。

### 5.2 Rust 内部接口

- `WorkbookRepository`：`get / put(if_revision) / list / delete`，返回 `Result<T, StorageError>`；用显式 `BoxFuture` 保持 dyn-safe，避免为异步 trait 引入宏依赖。
- `FormulaEngine`（引入 formula crate 时定义）：`evaluate(&WorkbookView, &str) -> Result<Value, FormulaError>`；不直接依赖存储或 HTTP。
- `LlmProvider`：`chat_stream(request) -> impl Stream<Item = ChatEvent>`；工具 schema 用 JSON Schema 常量，与前端共享同一份定义。
- 库 crate 禁止 `anyhow` 出现在公开签名；`anyhow` 仅限二进制入口。

### 5.3 前端接口

- `workbook-univer` 包通过受控接口（挂载/快照/变更事件/释放）暴露 Univer；`apps/web` 与 `blocks` 不直接 import Univer 内部模块。
- `api-client` 只暴露资源方法，不暴露 fetch 细节；错误统一 `ApiError`。
- AI 面板只通过 `ai-client`（SSE 事件流）通信，不直接操作表格；写操作通过 `exec(command)` 进入命令/撤销体系。

## 6. 当前差距与待决问题（重要）

| #   | 差距                                                                     | 原则     | 处理                                    |
| --- | ------------------------------------------------------------------------ | -------- | --------------------------------------- |
| G1  | Univer：1.72 MB JS + 42 MB Heap，超出原预算                              | P1 / P2  | 已决策保留并校准预算（前端设计 §10）    |
| G2  | `crates/server` 同时承载传输、存储、配置；无 `core`/`storage` 独立 crate | P3       | 已设计，待开工拆分（ADR-0007）          |
| G3  | 快照无版本信封；PUT 无 revision 冲突控制                                 | 接口规则 | 已设计，待开工修正                      |
| G4  | 前端单包，Univer 逻辑与 UI 未隔离                                        | P3       | 已设计包拆分（ADR-0011），待开工        |
| G5  | 无基准/体积门禁；性能靠自觉                                              | P1       | 待接入 `criterion` + bundle budget 脚本 |
| G6  | 手写前端类型，契约可能漂移                                               | P2/P3    | 接口稳定后生成类型                      |

### 前端表格引擎（已决策）

保留 Univer（A 方案），Excel 级体验优先；接受较高初始 JS / Heap，预算按 Univer 路线校准（见 §3、[前端设计 §10](frontend.md)）。优化项：按需插件组合、公式引擎 Worker 化、locale 裁剪、AI 面板懒加载、内存生命周期检查、体积门禁。B（自研网格）不再推进，保留在 [技术选型](tech-stack.md) 作为历史备选。

## 7. 执行计划

### P0（立即，约 1–2 天）

1. 后端实现：core/storage/server 拆分、快照信封 + CAS（见 ADR-0007/0008）；
2. 前端拆包：contracts/api-client/workbook-univer/extensions/composition/blocks + 根级 boundaries lint（见 ADR-0011）；
3. 前端扩展体系与内置块 dogfooding（见 ADR-0012）；
4. 公式函数桥接（先 spike Univer 异步能力）；
5. 提交基线测量脚本（体积/启动/RSS）到 `scripts/`。

### P1（1–2 周）

1. 后端：文件持久化/恢复、官方插件（CSV/JSON + 公式函数插件）；
2. 前端：文件 UX（tabs/保存/恢复）、视图组合、数据源面板、响应式数据层；
3. Univer 性能优化（Worker 公式计算、按需插件、locale 裁剪、面板懒加载）并实测校准；
4. `criterion` 基准 + bundle budget 与 CI 门禁。

### P2（持续）

1. 每个模块 README + 独立测试命令；
2. 契约测试与类型生成；
3. 桌面三平台打包与性能基准（WKWebView 实测）。

## 8. 度量与门禁

- 构建产物：`pnpm build` 后脚本统计初始 JS gzip、dist 体积，超预算 CI 失败。
- 后端：`cargo build --release` 二进制大小、`criterion` 基准、启动/RSS 脚本（本机）。
- Web 运行时：Playwright 脚本采集 load、首交互、Heap、FPS（作为报告，不做门禁，避免 CI 抖动）。
- 每个性能改动在 PR 中贴前后数据；超预算的豁免必须写 ADR，并给出回收计划。
