# 后端架构设计（Backend Design）

- 状态：**v0.1 设计稿（2026-11-21）**
- 依据：本轮需求讨论；标「已确认」的是产品决策，标「待确认」的是实现前需要拍板的默认值。
- 前端设计（Univer 表格、组合界面、文件交互）另行讨论，本文只描述后端职责与契约。
- 相关决策：[ADR-0003 后端框架](../adr/0003-rust-backend.md) · [ADR-0007 分层与 crate 边界](../adr/0007-backend-layering.md) · [ADR-0008 文件模型与崩溃恢复](../adr/0008-file-persistence-recovery.md) · [ADR-0009 插件系统](../adr/0009-plugin-system.md) · [ADR-0010 本地文件数据源](../adr/0010-local-file-data-sources.md)

## 0. 术语

| 术语                  | 含义                                                       |
| --------------------- | ---------------------------------------------------------- |
| **File / 文档**       | 用户打开的一个项目文件，是**计算、持久化与隔离的基本单位** |
| **Workbook / 工作簿** | File 内的表格文档（多 sheet、公式、格式），以快照形式存储  |
| **Snapshot / 快照**   | 序列化后的文档状态，带 `schemaVersion` / `engine` / `data` |
| **Dataset / 数据集**  | 从数据源读取并解析后的类型化表格数据，带版本与来源元数据   |
| **FileRuntime**       | 某个打开文件的运行时：计算图、查询缓存、调度、AI 上下文    |
| **Plugin / 插件**     | 可选、配置启用的后端能力单元（数据源连接器、公式函数等）   |

「业务系统」在 v1 理解为**文件模板**：一种预置了数据源、视图与扩展配置的文件；实例就是互相独立的文件。UI 上如何呈现由前端设计确认。

## 1. 已确认的决策

| #   | 决策                            | 说明                                                   |
| --- | ------------------------------- | ------------------------------------------------------ |
| D1  | **文件内实时计算**              | 更新与重算只在当前文件内传播；文件之间没有隐式联动     |
| D2  | **数据源 v1 = 本地 CSV / JSON** | 后续再扩展数据库 / HTTP / xlsx                         |
| D3  | **仅手动刷新**                  | 不做文件监控、不做轮询、不做后台定时读取               |
| D4  | **持久化与崩溃恢复必须支持**    | 快速持久化，崩溃后可恢复；具体参数见 §6                |
| D5  | **插件可选、配置加载**          | v1 只做官方插件；配置开关即可，不做构建期裁剪          |
| D6  | **v1 插件必须包含公式函数插件** | 用至少两类官方函数插件证明扩展点成立                   |
| D7  | 后端技术栈                      | Rust 2024 + Axum 0.8 + Tokio（ADR-0003）               |
| D8  | 工程原则                        | 性能、简洁、模块独立（[principles.md](principles.md)） |
| D9  | 前端保留 Univer                 | 后端只依赖快照信封，不感知 Univer 细节（ADR-0002）     |

## 2. 分层与 crate 结构

```text
                         ┌─────────────────────────┐
                         │        server           │  Axum 适配层：HTTP/SSE、进程生命周期
                         └───────────┬─────────────┘
             ┌───────────────────────┼───────────────────────┐
             ▼                       ▼                       ▼
      ┌────────────┐          ┌────────────┐          ┌────────────┐
      │ plugin-host│          │  storage   │          │  (ai, 后续)│
      └─────┬──────┘          └─────┬──────┘          └────────────┘
            │                       │
            ▼                       ▼
      ┌────────────┐          ┌────────────┐
      │ plugin-api │          │    core    │
      └─────┬──────┘          └────────────┘
            │
            ▼
      ┌────────────┐    ┌────────────┐
      │ plugins/*  │───▶│ data-core  │
      └────────────┘    └────────────┘
```

| Crate         | 职责                                                                                            | 依赖                             | 独立验收                             |
| ------------- | ----------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------ |
| `core`        | 领域模型：`Workbook`、`Snapshot`（信封）、`Revision`、领域错误；零 I/O、零 async、零 axum/tokio | 无内部依赖                       | `cargo test -p open-calculator-core` |
| `storage`     | `WorkbookRepository`（CAS）、`DocumentStore`（原子写/检查点/恢复）、`DatasetCache`              | core                             | 独立单元测试，临时目录               |
| `data-core`   | `DataSource` / `Dataset` / 刷新与版本契约；不依赖插件实现                                       | core                             | 契约测试 + fake 实现                 |
| `plugin-api`  | Manifest、`Plugin` trait、能力注册表、`FunctionDescriptor`、统一 Value 编码、配置错误           | 无内部依赖（可依赖 core 的类型） | 契约测试                             |
| `plugin-host` | 发现已编译插件、读配置、校验、初始化、调度、失败隔离、函数目录                                  | plugin-api、plugins/*、data-core | 用 fake 配置/插件测试                |
| `plugins/*`   | 官方插件实现：`plugin-csv`、`plugin-json`、`plugin-fn-*`                                        | plugin-api、data-core            | 每个插件独立测试                     |
| `server`      | Axum 路由、DTO、错误映射、文件会话、进程与优雅关闭                                              | 全部                             | `oneshot` 集成测试                   |

依赖规则：

1. 只能向下依赖，禁止反向或循环（`server` 不得被任何 crate 依赖）。
2. 插件不得依赖 `server` / `storage`；需要的能力由 `PluginContext` 注入（例如“用户授权的目录读取”）。
3. `core` 不出现 axum/tokio/serde 之外的基础设施依赖；存储/传输类型不进入 core。
4. 每个 crate 有自己的 README、测试命令与最小示例；`plugin-api` 与 `core` 不依赖具体实现。

## 3. 领域模型与跨层契约

### 3.1 快照信封

```json
{
  "schemaVersion": 1,
  "engine": "univer@1.5.2",
  "data": { "…引擎自有数据，后端不透明…" }
}
```

后端只校验结构，不解析 `data`；换前端引擎不影响后端。

### 3.2 File 文档（规划）

```text
FileDocument
├── id, name, schemaVersion, coreApiVersion
├── workbook: Snapshot
├── dataSources: [DataSourceDescriptor]
├── views: [ViewDefinition]        # 前端设计阶段细化
├── revision: u64
└── savedAt
```

### 3.3 统一值编码（插件函数参数/结果）

数字、字符串、布尔、错误值、二维数组、空值统一为 tagged union（具体 JSON 形状在实现前确定并写入契约测试）。Excel 错误值是显式类型，不通过异常传递。

## 4. HTTP API

### 4.1 已实现（v0.1，待开工升级契约）

| 方法 | 路径                     | 说明                                                |
| ---- | ------------------------ | --------------------------------------------------- |
| GET  | `/api/v1/health`         | 存活检查                                            |
| GET  | `/api/v1/meta`           | 版本、能力与**已启用插件/函数目录摘要**             |
| GET  | `/api/v1/workbooks/{id}` | 读取工作簿 + 快照信封 + revision                    |
| PUT  | `/api/v1/workbooks/{id}` | `{name, snapshot, expectedRevision}`；CAS，冲突 409 |

### 4.2 规划（文件模型确定后细化）

| 方法 | 路径                                            | 说明                                      |
| ---- | ----------------------------------------------- | ----------------------------------------- |
| POST | `/api/v1/files`                                 | 打开/创建本地文件（路径由用户选择后传入） |
| GET  | `/api/v1/files/{id}`                            | 读取文件文档（含数据源与视图定义）        |
| PUT  | `/api/v1/files/{id}`                            | 保存文档（`expectedRevision` CAS）        |
| POST | `/api/v1/files/{id}/sources/{sourceId}/refresh` | 手动刷新本地数据源                        |
| GET  | `/api/v1/files/{id}/recovery`                   | 查询是否存在未正常退出的检查点            |
| POST | `/api/v1/files/{id}/recovery/restore`           | 恢复检查点                                |
| GET  | `/api/v1/functions`                             | 已启用插件函数的目录（名称/签名/说明）    |
| POST | `/api/v1/functions/invoke`                      | 执行插件函数（前端 Univer 桥接调用）      |

约定：

- 所有写操作带 `expectedRevision`（乐观并发），冲突 409 + `details.currentRevision`；
- 错误统一 `{"error":{"code","message","details"?}}`，`code` 是稳定契约；
- 请求体上限 8 MiB（大数据集通过文件读取/分页，不走 JSON 请求体）；
- 资源化路径；仅函数执行与 AI 流式属于显式例外。

## 5. 文件生命周期与隔离

- 打开文件后，后端持有该文件的 `FileRuntime`：文档状态、Dataset 缓存、刷新调度、插件函数调用日志；**不同文件的运行时互不共享可变状态**。
- 文件级错误边界：单个文件的数据源失败、函数执行失败只影响该文件对应部分。
- 关闭/切换文件：先落一次检查点，再释放运行时与缓存。
- 会话标记用于崩溃检测（见 §6）。
- 多文件并发由前端决定展示方式；后端按文件隔离，不假设只有一个文件。

## 6. 持久化与崩溃恢复

### 6.1 三类快照

| 类型       | 内容                                                  | 触发                    |
| ---------- | ----------------------------------------------------- | ----------------------- |
| 文档快照   | `FileDocument`（workbook + 数据源 + 视图 + revision） | 显式保存 / 自动保存     |
| 数据快照   | 解析后的 Dataset（版本、校验和、来源元数据）          | 手动刷新成功 / 首次导入 |
| 恢复检查点 | 文档快照 + 数据快照引用 + 保存元数据                  | 自动保存触发            |

### 6.2 原子写

1. 写同目录临时文件；
2. `fsync` 文件与目录（POSIX）；
3. `rename` 覆盖目标，同时保留上一份 `.bak`；
4. 快照带 `schemaVersion`、`coreApiVersion`、`fileId`、`revision`、`savedAt`、`checksum`。

任何时刻磁盘上至少有一份完整可读快照；校验失败按「最新检查点 → `.bak` → 用户最后显式保存」回退。

### 6.3 自动保存（默认值，待确认）

- 仅在 dirty 时保存；防抖 1–2s，最长间隔 10s，切换文件/退出时立即落盘；
- 序列化与写盘不阻塞请求处理：后端 `spawn_blocking`；
- 空闲时无后台 IO、无定时器；
- 崩溃最多丢失约 10s 编辑（可调）。

### 6.4 恢复流程

```text
启动 → 扫描会话标记 / 检查点目录
     → 有未正常退出标记？
        → 是：校验最新检查点 → 提示“恢复未保存的更改？”
             → 是：加载文档 + 数据快照 → 标记为未保存
             → 否：删除检查点，加载最后显式保存
        → 否：正常加载
```

恢复范围只包含文档与数据快照，不恢复滚动位置/选区等瞬时 UI 状态。

### 6.5 数据快照缓存

- 内容寻址：`dataset-{sourceId}-{contentHash}.json` + 小型元数据索引；
- 每个数据源保留最近若干版本（默认 2，LRU）；
- 打开文件优先使用缓存并标注“数据快照时间·可能过期”；手动刷新成功则替换，失败保留旧版本并报错；
- 源文件丢失/移动时，文件仍可打开并只读展示上次数据。

### 6.6 存储选型

v1 使用**文件 + 原子写**，不引入 SQLite；若后续测量表明大文档或大量文件需要事务/查询能力，再评估 SQLite（WAL）。Decision 记录在 ADR-0008。

### 6.7 性能目标（默认值）

| 指标                                  | 目标     |
| ------------------------------------- | -------- |
| 1 MB 文档自动保存（序列化+写盘，p95） | ≤ 50 ms  |
| 10 MB 文档自动保存（p95）             | ≤ 200 ms |
| 10 MB 文档恢复加载                    | ≤ 300 ms |
| 检查点大小开销                        | ≤ 10%    |
| 空闲后台 IO / 定时器                  | 0        |

## 7. 插件系统

### 7.1 v1 范围

| 类型                        | v1                             | 形态                            |
| --------------------------- | ------------------------------ | ------------------------------- |
| 数据源连接器                | ✅ CSV / JSON                  | 官方 crate，配置开关            |
| 公式函数插件                | ✅ 至少两类（建议金融 + 文本） | 官方 crate，Rust 实现，前端桥接 |
| AI Provider / Tool          | ❌ 后置                        | 接口预留                        |
| 第三方 WASM 插件            | ❌ 后置                        | 后续 wasmtime 沙箱              |
| 构建期裁剪（Cargo feature） | ❌ v1 不做                     | 全部编入，配置开关              |

不做原生 `cdylib` 动态加载（Rust ABI 不稳定、跨平台与安全风险大）。

### 7.2 契约

```rust
pub trait Plugin: Send + Sync {
    fn manifest(&self) -> &'static PluginManifest;
    fn register(&self, registry: &mut CapabilityRegistry) -> Result<(), PluginError>;
}

pub struct PluginManifest {
    pub id: &'static str,
    pub version: &'static str,
    pub kind: PluginKind,        // DataSource | FormulaFunction | (future AiProvider/Tool)
    pub api_version: u32,
    pub capabilities: &'static [Capability],
    pub config_schema: &'static str, // JSON Schema
}
```

- 能力按类型注册（`ConnectorRegistry` / `FunctionRegistry`），避免万能 trait；
- host 统一校验：manifest、配置 schema、`apiVersion`、函数名全局唯一、插件依赖；
- 单个插件初始化失败 → 该插件禁用并记录原因，服务降级启动；`/meta` 反映实际状态。

### 7.3 配置

```toml
[plugins.csv]
enabled = true

[plugins.json]
enabled = true

[plugins.fn-finance]
enabled = true

[plugins.fn-text]
enabled = false
```

默认值建议**默认关闭、显式开启**（待确认）。配置修改后重启生效（v1 不做热加载）。

### 7.4 公式函数插件与前端桥接

- 函数实现只有一份（Rust），前端不复制业务逻辑；
- 前端启动时从 `/functions` 拉取目录，为每个函数注册 Univer 自定义函数；调用时把参数编码为统一 Value → `POST /functions/invoke` → 结果回填；
- 函数名强制命名空间前缀（如 `FIN_`、`TXT_`），host 启动时做冲突校验；
- `FunctionDescriptor` 携带参数类型、返回类型、说明、`deterministic` / `volatile`，供前端提示、缓存与 AI 使用；
- 依赖 Univer 的异步自定义函数能力（`AsyncObject` / `isAsync`）——**实现前需最小验证**；
- 性能：本地 RPC 每次约 1–3ms；前端对确定性函数按 `(name,args)` 缓存；若重算批量调用过多，再评估批量 invoke 或 WASM 化。

### 7.5 测试与安全

- `plugin-api` 契约测试；每个插件独立单测；`plugin-host` 用 fake 插件测试配置/禁用/冲突/失败降级；
- 官方插件可信、进程内运行；manifest 仍声明能力，为未来沙箱化保留接口；
- 配额（并发/超时/内存）与失败熔断在 host 实施。

## 8. 本地文件数据源（v1）

- 格式：CSV（UTF-8 含 BOM、逗号、首行表头、类型推断）与 JSON（顶层数组、扁平对象、缺字段为空）；
- 大小上限建议 32 MB / 20 万行，超限返回可读错误；流式解析后续再评估；
- 刷新语义：仅手动；成功产生新 Dataset 版本，只在当前文件内传播；失败保留旧版本；
- 不做文件监控/轮询；外部文件变化不会自动感知（明确的产品行为）；
- 文件访问：桌面端由用户选择路径后授权给后端读取；Web 端通过 File System Access API 或上传副本（前端设计阶段定）；
- 解析器实现放在官方插件内，宿主提供文件读取能力与安全边界。

## 9. 安全

- 后端默认只监听 `127.0.0.1`；CORS 仅开发期放开；
- 文件路径只能来自用户显式选择/授权，拒绝任意路径读取；
- 插件能力默认拒绝，配置授予；
- 密钥（未来 AI）只存在后端环境/系统钥匙串，永不进入前端；
- 快照与配置写入受限目录，检查点带校验和。

## 10. 测试策略

| 层                | 方式                                                                     |
| ----------------- | ------------------------------------------------------------------------ |
| core / plugin-api | 纯单元测试 + 契约测试（值编码、manifest、错误）                          |
| storage           | 临时目录原子写/回滚/恢复测试；CAS 并发测试                               |
| plugins           | 每个插件独立测试；数据源插件用 fixture 文件；函数插件用固定输入/错误输入 |
| plugin-host       | fake 插件 + 配置矩阵（禁用/非法/冲突/失败降级）                          |
| server            | `tower::ServiceExt::oneshot` 集成测试；不依赖真实端口                    |
| 崩溃恢复          | 子进程 `kill -9` 后重启校验恢复；损坏快照回退 `.bak`                     |
| 性能              | 保存/恢复耗时与 RSS 脚本；CI 对体积做门禁（时间指标做趋势）              |

## 11. 待确认事项（实现前拍板）

1. 自动保存丢失窗口：防抖 1–2s + 最长 10s 是否接受？
2. 检查点位置：应用数据目录（推荐）vs 项目文件旁 `.autosave/`？
3. 数据快照保留策略：每源最近 2 个版本（推荐）？
4. 是否同时需要用户可见的历史版本/手动快照？（建议 v1 后置）
5. 恢复交互：启动提示恢复（推荐）vs 静默恢复？
6. 插件默认开关：默认关闭（推荐）还是默认开启？
7. 公式函数命名空间：强制 `FIN_` / `TXT_` 前缀（推荐）？
8. 公式函数桥接：v1 RPC（推荐）还是直接 WASM？
9. 示例函数插件：金融 + 文本（推荐）还是其他领域？
10. 文件 API 的具体形态（`/files` 资源设计）与项目文件落盘格式。
11. v1 是否彻底不引入 SQLite（文件 + 原子写）？

## 12. 相关文档

- [工程原则与性能预算](principles.md)
- [架构总览](overview.md)
- [技术选型](tech-stack.md)
- [ADR 索引](../adr/README.md)
- [路线图](../roadmap.md)
