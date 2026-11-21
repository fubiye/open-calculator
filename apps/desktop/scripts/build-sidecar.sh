#!/usr/bin/env bash
# 构建 open-calculator-server sidecar，并按 Tauri externalBin 命名约定放到
# apps/desktop/src-tauri/binaries/open-calculator-server-<host-triple>。
#
# 用法：bash apps/desktop/scripts/build-sidecar.sh
# 注意：`tauri build` 前必须先执行本脚本，否则打包会因缺少 sidecar 失败。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$DESKTOP_DIR/../.." && pwd)"
SRC_TAURI_DIR="$DESKTOP_DIR/src-tauri"
BINARIES_DIR="$SRC_TAURI_DIR/binaries"

# HOST triple 必须来自 rustc，不能手写，避免与 Tauri 的 target 判断不一致。
TRIPLE="$(rustc -vV | sed -n 's/^host: //p')"
if [ -z "$TRIPLE" ]; then
  echo "error: 无法通过 'rustc -vV' 获取 host target triple" >&2
  exit 1
fi

echo "==> 构建 open-calculator-server (release, host: $TRIPLE)"
cargo build --manifest-path "$REPO_ROOT/Cargo.toml" --release -p open-calculator-server

SOURCE_BIN="$REPO_ROOT/target/release/open-calculator-server"
if [ ! -f "$SOURCE_BIN" ]; then
  echo "error: 未找到构建产物: $SOURCE_BIN" >&2
  exit 1
fi

mkdir -p "$BINARIES_DIR"
DEST_BIN="$BINARIES_DIR/open-calculator-server-$TRIPLE"
cp "$SOURCE_BIN" "$DEST_BIN"
chmod +x "$DEST_BIN"

echo "==> sidecar 就绪: $DEST_BIN"
