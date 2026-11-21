#!/usr/bin/env bash
# 构建 Tauri 桌面应用（内部会先构建后端 sidecar 与前端产物）。
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
(cd "$ROOT/frontend" && pnpm build:desktop)
