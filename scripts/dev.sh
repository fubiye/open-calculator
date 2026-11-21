#!/usr/bin/env bash
# 同时启动后端（Rust）与前端（Vite）。Ctrl+C 结束两者。
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "==> 首次运行，安装前端依赖"
  (cd "$ROOT/frontend" && pnpm install)
fi

(cd "$ROOT/backend" && cargo run -p open-calculator-server) &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM

echo "==> 后端已启动（127.0.0.1:8787），启动前端…"
(cd "$ROOT/frontend" && pnpm dev)
