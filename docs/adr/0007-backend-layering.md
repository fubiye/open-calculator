# ADR-0007：后端分层与 crate 边界

> 本文中的 crate 路径均相对 `backend/`。

- 状态：已接受（方向与边界已定；具体 crate 清单可在开工前微调）
- 日期：2026-11-21
- 关联：[ADR-0003](0003-rust-backend.md) · [工程原则](../architecture/principles.md) · [后端设计](../architecture/backend.md)

## 背景

项目要求“模块原则上可以独立”，同时坚持性能与简洁。Rust 单体 crate 会让工作簿领域、存储、传输、插件运行时相互纠缠；拆得过细又会引入无用的抽象与构建复杂度。需要一个可落地的边界。

## 决策

后端按职责拆为以下 crate，依赖方向严格向下：

```text
server ──▶ plugin-host ──▶ plugin-api
   │            │
   │            └──▶ data-core
   ├──▶ storage ──▶ core
   └──▶ core

plugins/* ──▶ plugin-api / data-core
```

| Crate         | 职责                                                                  | 独立验收         |
| ------------- | --------------------------------------------------------------------- | ---------------- |
| `core`        | 领域模型（Workbook、Snapshot 信封、Revision）；零 I/O/async/axum      | 独立单测         |
| `storage`     | WorkbookRepository（CAS）、DocumentStore（原子写/恢复）、DatasetCache | 临时目录测试     |
| `data-core`   | DataSource / Dataset / 刷新与版本契约                                 | 契约测试 + fake  |
| `plugin-api`  | Manifest、Plugin trait、能力注册表、值编码                            | 契约测试         |
| `plugin-host` | 插件发现/配置/校验/生命周期/调度/降级                                 | fake 插件测试    |
| `plugins/*`   | 官方插件（CSV、JSON、公式函数插件）                                   | 每插件独立测试   |
| `server`      | Axum 路由、DTO、错误映射、文件会话、进程生命周期                      | oneshot 集成测试 |

规则：

1. 禁止反向/循环依赖；`server` 不被任何 crate 依赖。
2. 插件不依赖 `server`/`storage`；所需能力由 `PluginContext` 注入。
3. 存储/传输 DTO 不进入 `core`；领域类型不与 axum 耦合。
4. 每个 crate 有独立 README、测试命令；库 crate 公开签名不使用 `anyhow`。
5. v1 不提前创建没有实现方的 crate（例如 AI 层等真正需要时再加）。

## 理由

- 边界贴合真实变化点：存储会演进（内存→文件/SQLite）、插件会增长、传输可能增加 SSE/函数调用；领域模型与接口规则相对稳定。
- 每个 crate 可独立测试，符合“模块独立”原则；同时避免拆出大量空 crate。
- `plugin-api` 隔离宿主与具体插件，是后续第三方 WASM 的可迁移边界。

## 后果

- 优点：依赖清晰、可单独测试、插件与存储可替换；为文件模型/插件/恢复分别提供落点。
- 成本：多 crate 增加少量编译与维护成本；跨 crate 重构需要同步接口。
- 风险：过早拆出 `data-core` 若只有一个实现，可能显得抽象；以“插件需要实现它”作为第二个使用方，成立。

## 备选方案

- **单 crate + 模块**：最初成本最低，但无法满足“独立使用/测试”，且插件与传输会互相牵扯；不采用。
- **微服务化**：本地单机桌面应用，进程/网络隔离成本远大于收益；不采用。
- **按插件拆成独立 workspace**：v1 官方插件数量少，先放同一 workspace 的独立 crate 即可。
