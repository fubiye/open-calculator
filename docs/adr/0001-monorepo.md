# ADR-0001：采用 pnpm + Cargo 双 workspace 的 monorepo

- 状态：已接受
- 日期：2026-11-21

## 背景

项目同时包含 TypeScript 前端、Rust 后端与 Tauri 桌面壳。三者版本强相关（例如前端 API 客户端与后端契约、桌面壳与前端构建产物），需要原子提交、统一 CI 与文档。

## 决策

- 仓库根同时声明 JS workspace（`pnpm-workspace.yaml`）与 Cargo workspace（根 `Cargo.toml`）。
- `apps/*` 为可运行应用：`apps/web`（React + Vite）、`apps/desktop`（Tauri）。
- `crates/*` 为 Rust 库/二进制：当前只有 `crates/server`；Tauri 的 `src-tauri` 被 exclude 出根 workspace，避免与桌面构建的 profile/feature 冲突。
- 桌面端作为独立 npm package（私有），复用根目录的 `@tauri-apps/cli`。
- CI 分 Web / Rust 两个 job，各自缓存依赖。

## 后果

- 优点：一次 PR 可同时修改前后端契约；依赖与脚本集中管理；文档与版本同仓。
- 成本：根目录工具链更复杂（需要 Node + Rust）；前端依赖安装体积较大（Univer 依赖树）。
- 约束：新增 Rust crate 必须加入根 `members`；新增前端包必须放在 `apps/` 下并被 pnpm workspace 覆盖。

## 备选方案

- **前后端分仓**：契约变更需要跨仓 PR，早期速度慢，不采用。
- **单一语言（全 TS 或全 Rust/WASM）**：与“Rust 后端 + Web 前端”的产品要求冲突，不采用。
- **Turborepo / Nx**：当前只有两个 JS 包，任务编排收益低于维护成本；需要时再引入。
