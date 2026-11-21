# @open-calculator/api-client

类型化 HTTP 客户端（fetch），无 React/UI 依赖。封装后端 `/api/v1` 接口、超时与统一错误（`ApiError`）。

- 只依赖 `@open-calculator/contracts`；
- 浏览器与 Tauri 共用；Tauri 运行时自动直连 `http://127.0.0.1:8787`；
- 独立测试：`pnpm --filter @open-calculator/api-client test`。
