# ADR-0001：采用 pnpm + Cargo 双 workspace 的 monorepo

- 状态：已接受
- 日期：2026-11-21

## 背景

项目同时包含 TypeScript 前端、Rust 后端与 Tauri 桌面壳。三者版本强相关（例如前端 API 客户端与后端契约、桌面壳与前端构建产物），需要原子提交、统一 CI 与文档。

## 决策

- 仓库根按**前后端分区**：`frontend/`（前端区域）与 `backend/`（后端区域），根目录只保留文档、CI 与编排脚本。
- `frontend/` 是独立的 pnpm workspace：`apps/web`（React + Vite）、`apps/desktop`（Tauri）、`packages/*`（可独立测试的前端包）；工具链配置（`package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`、`eslint.config.js`、`tsconfig.base.json`）都在 `frontend/`。
- `backend/` 是独立的 Cargo workspace：`crates/server`（当前），后续 `core/storage/data-core/plugin-*`；`Cargo.toml`、`Cargo.lock`、`rust-toolchain.toml`、`rustfmt.toml` 都在 `backend/`。
- Tauri 的 `src-tauri` 位于 `frontend/apps/desktop`，被 exclude 出 backend workspace，避免与桌面构建的 profile/feature 冲突。
- 根目录 `scripts/`（`dev.sh`、`build.sh`、`check.sh`、`build-desktop.sh`）负责跨端编排，不承载实现代码。
- CI 分 Frontend / Backend 两个 job，各自以子目录为 working-directory 与缓存路径。

## 后果

- 优点：前后端目录、依赖、锁文件与构建入口完全分离；各自的命令不会互相污染；一次 PR 仍可同时修改前后端契约。
- 成本：需要 Node + Rust 两套工具链；跨端操作必须通过根级脚本或显式 `cd`。
- 约束：新增 Rust crate 必须加入 `backend/Cargo.toml` 的 `members`；新增前端包必须放在 `frontend/apps` 或 `frontend/packages` 并被 `frontend/pnpm-workspace.yaml` 覆盖。

## 备选方案

- **前后端分仓**：契约变更需要跨仓 PR，早期速度慢，不采用。
- **单一语言（全 TS 或全 Rust/WASM）**：与“Rust 后端 + Web 前端”的产品要求冲突，不采用。
- **Turborepo / Nx**：当前只有两个 JS 包，任务编排收益低于维护成本；需要时再引入。
