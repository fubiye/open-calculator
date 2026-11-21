#!/usr/bin/env bash
# 全仓最小验证集：后端 fmt/clippy/test + 前端 lint/test/build。
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
(cd "$ROOT/backend" && cargo fmt --all -- --check && cargo clippy --workspace --all-targets -- -D warnings && cargo test --workspace)
(cd "$ROOT/frontend" && pnpm lint && pnpm test && pnpm build)
