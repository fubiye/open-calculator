#!/usr/bin/env bash
# 构建后端 release 二进制与前端产物。
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
(cd "$ROOT/backend" && cargo build --release -p open-calculator-server)
(cd "$ROOT/frontend" && pnpm build)
