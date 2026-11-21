# ADR-0003：Rust 后端采用 Axum + Tokio，先内存后 SQLite

- 状态：已接受
- 日期：2026-11-21

## 背景

后端承担：工作簿快照持久化、未来的 AI 模型代理、自定义函数/插件运行时、文件导入导出。要求单机可运行、低资源占用、易打包进桌面应用。

## 决策

- HTTP 框架：**Axum 0.8** + Tokio 1.54 + tower-http（Trace / CORS）。
- 结构：`app`（路由装配、AppState）/ `routes`（handler + DTO）/ `store`（存储抽象，当前 `RwLock<HashMap>`）/ `config` / `error`，错误统一 `thiserror` + `{"error":{code,message}}`。
- 存储演进：v0.1 内存（重启即失，仅打通链路）→ v0.2 `sqlx` + SQLite，单文件数据库放在应用数据目录。
- 契约：REST/JSON；AI 流式与函数 RPC 后续使用 SSE。
- 默认只监听 `127.0.0.1`，CORS 在开发期放开，发布形态下再收紧。
- 类型共享：先手写 TS 类型；接口稳定后采用 OpenAPI 生成或 `ts-rs` 导出，二选一。

## 理由

- Axum 与 Tokio/tower 生态一致，中间件与测试（`tower::ServiceExt::oneshot`）成熟；相比 Actix Web 更贴近 tower 生态，便于未来接入限流、鉴权、SSE。
- Rust 与 Tauri 同构，sidecar/单进程嵌入都简单。
- 先内存存储可以避免在语义未定时引入数据库迁移负担；“快照整体读写”也符合当前 Univer 的 save/load 模型。

## 后果

- 优点：二进制小、启动快、资源占用低；无 GC，适合随桌面应用常驻。
- 成本：需要维护 Rust 与 TS 两套类型（短期）；SQLite 迁移需要设计 `revision` 冲突与快照版本号。
- 风险：多实例同时写同一工作簿会互相覆盖（本地单机场景暂可接受）；后续要么加文件锁，要么改为增量事件模型。

## 备选方案

- **Actix Web**：性能上限高，但生态/中间件模型与 tower 不同，团队心智成本更高。
- **Poem / Salvo**：更轻，但社区与中间件生态较小。
- **Tauri IPC 直连（无 HTTP）**：桌面端更快，但与“前后分离、可 Web 部署”的目标冲突；HTTP 边界同时是扩展点（插件、AI、自动化）。因此保留 HTTP，桌面端通过本地端口访问。
