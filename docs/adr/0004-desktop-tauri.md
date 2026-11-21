# ADR-0004：桌面端采用 Tauri 2，后端以 sidecar 内嵌

- 状态：已接受
- 日期：2026-11-21

## 背景

产品需要打包为桌面应用，同时保持 Web 端可用。桌面端要能启动本地 Rust 后端、访问本地文件、未来支持自动更新。

## 决策

- 桌面壳：**Tauri 2.12**，前端复用 `apps/web` 的构建产物（`frontendDist = ../../web/dist`）。
- 开发：`devUrl = http://localhost:5173`；根目录 `pnpm dev` 同时启动 Web 与后端，桌面端直接加载 dev server（Vite proxy 处理 `/api`）。
- 发布：后端 release 二进制作为 **sidecar** 打包（`externalBin`），应用启动时由 Rust 侧 spawn，退出时 kill；前端通过 `VITE_API_BASE_URL=http://127.0.0.1:8787` 访问。
- 环境：macOS 使用系统 WKWebView；Windows 使用 WebView2；Linux 使用 WebKitGTK。
- 安全：CSP 仅允许连接本机后端；默认不开启远程内容。

## 理由

- Rust 后端 + Rust 桌面壳可共享工具链，二进制体积远小于 Electron（无需打包 Chromium）。
- 系统 WebView 对 Canvas 2D 支持良好，Univer 可正常运行。
- sidecar 模式保留 HTTP 边界：桌面端、浏览器、脚本、插件都使用同一套 API。

## 后果

- 优点：安装包小、内存占用低；后端随应用分发，无需用户另装服务。
- 成本/风险：
  - WebView 差异（尤其 Linux WebKitGTK 与 macOS 旧版本）需要做兼容性验证。
  - sidecar 命名需按目标 triple 生成（`scripts/build-sidecar.sh`），CI 需为三平台分别构建。
  - macOS 公证/签名、Windows 签名、自动更新（`tauri-plugin-updater`）尚未接入，发布前必须补齐。
- 备选：Electron（体积大但 WebView 统一）、纯 Web/PWA（无法访问本地文件与常驻后端）。当前选择基于体积、Rust 协同与本地优先的产品方向。
