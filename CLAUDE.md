# CLAUDE.md

项目级约定见 @AGENTS.md（目录结构、命令、边界、验证集）。

快速记忆：

- 前端 `apps/web`（React 19 + Vite 8 + Univer 1.6），后端 `crates/server`（Axum 0.8）。
- 开发：`pnpm dev`（web 5173 + server 8787）；验证：`pnpm lint && pnpm test && pnpm build`。
- 小步提交，Conventional Commits，架构变化写 ADR（`docs/adr/`）。
