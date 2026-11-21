# open-calculator-server

open-calculator 的 Rust + Axum 后端骨架，提供基于内存的工作簿读写 API。
当前阶段只做本地单机服务：数据保存在进程内存中，重启即丢失；不含数据库、认证、AI 与插件能力。

## 运行

```bash
cd backend && cargo run -p open-calculator-server
```

默认监听 `127.0.0.1:8787`，可通过环境变量覆盖：

| 变量                   | 默认值      | 说明                                                |
| ---------------------- | ----------- | --------------------------------------------------- |
| `OPEN_CALCULATOR_HOST` | `127.0.0.1` | 监听地址，默认仅本机可访问                          |
| `OPEN_CALCULATOR_PORT` | `8787`      | 监听端口                                            |
| `RUST_LOG`             | `info`      | tracing 日志过滤，如 `open_calculator_server=debug` |

服务支持 ctrl-c 与 SIGTERM 优雅关闭。

## API

所有接口位于 `/api/v1` 前缀下，请求与响应均为 JSON。
错误统一返回 `{"error":{"code":"...","message":"..."}}`。

### `GET /api/v1/health`

```json
{ "status": "ok", "name": "open-calculator-server", "version": "0.1.0" }
```

### `GET /api/v1/meta`

```json
{
  "name": "open-calculator",
  "version": "0.1.0",
  "capabilities": { "workbooks": "memory", "ai": false, "plugins": false }
}
```

### `PUT /api/v1/workbooks/{id}`

写入（upsert）一个工作簿。`revision` 首次为 1，每次成功写入递增。

```bash
curl -X PUT http://127.0.0.1:8787/api/v1/workbooks/wb-1 \
  -H 'Content-Type: application/json' \
  -d '{"name":"Sheet One","snapshot":{"cells":[{"id":"A1","value":42}]}}'
```

```json
{
  "id": "wb-1",
  "name": "Sheet One",
  "snapshot": { "cells": [{ "id": "A1", "value": 42 }] },
  "revision": 1,
  "updatedAt": "2026-01-01T00:00:00.000000000Z"
}
```

- 请求体上限 8 MiB，超出返回 `413 payload_too_large`。
- 非法 JSON 返回 `400 invalid_json`。

### `GET /api/v1/workbooks/{id}`

```bash
curl http://127.0.0.1:8787/api/v1/workbooks/wb-1
```

返回结构同上；不存在时返回 `404 not_found`。

## 开发

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

测试通过 `tower::ServiceExt::oneshot` 直接调用 router，不占用网络端口。
