# Open Calculator 桌面端

基于 [Tauri 2](https://tauri.app/) 的桌面壳，加载 `frontend/apps/web` 的前端，并在 release 构建中内嵌
Rust 后端 `open-calculator-server` 作为 sidecar。

## 目录结构

```
frontend/apps/desktop/
├── package.json                 # dev/build/check/build:sidecar 脚本
├── README.md
├── scripts/
│   └── build-sidecar.sh         # 构建后端并复制为 externalBin 命名格式
└── src-tauri/
    ├── Cargo.toml               # crate: open-calculator-desktop（独立于根 workspace）
    ├── build.rs                 # tauri_build::build()
    ├── capabilities/
    │   └── default.json         # 主窗口最小权限（core:default）
    ├── binaries/                # 由 build-sidecar.sh 生成，已 .gitignore
    ├── icons/                   # 由 `tauri icon` 生成，需提交
    ├── src/
    │   ├── main.rs
    │   └── lib.rs               # sidecar 生命周期管理
    └── tauri.conf.json
```

## 运行模式

| 模式               | 前端来源                                 | 后端来源                                                            |
| ------------------ | ---------------------------------------- | ------------------------------------------------------------------- |
| dev（`tauri dev`） | Vite dev server: <http://localhost:5173> | 根目录 `pnpm dev` 启动的 `open-calculator-server`（127.0.0.1:8787） |
| release（打包后）  | 内嵌 `frontend/apps/web/dist`                     | 应用启动时 spawn 内嵌 sidecar，退出时 kill                          |

- `build.devUrl = http://localhost:5173`；`build.beforeDevCommand` 故意留空：开发时由仓库
  根目录 `./scripts/dev.sh` 同时启动 web 与 server，避免 Tauri 再起一份。
- debug 构建**不会** spawn sidecar（`cfg!(debug_assertions)`），后端由根目录 `./scripts/dev.sh` 提供。
- release 构建通过 `tauri-plugin-shell` 的 **Rust API** spawn sidecar，并传入
  `OPEN_CALCULATOR_PORT=8787`；`RunEvent::ExitRequested` / `RunEvent::Exit` 时 kill 子进程。
  spawn 失败只打印日志，不 panic。
- CSP 的 `connect-src` 显式允许 `http://127.0.0.1:8787`、`http://localhost:8787`
  以及 dev 的 `ws://localhost:5173`。

## 开发（dev）

首次准备（仓库根目录）：

```bash
pnpm --dir frontend install
```

1. **终端 A（仓库根目录）**：同时启动前端 dev server 与后端

   ```bash
   ./scripts/dev.sh    # web: http://localhost:5173, server: 127.0.0.1:8787
   ```

2. **终端 B（仓库根目录）**：启动桌面壳

   ```bash
   cd frontend && pnpm dev:desktop    # 等价于前端目录下 tauri dev
   ```

Tauri 会连接 `http://localhost:5173`，前端请求经 Vite proxy 打到 8787 端口的后端。

## 构建（release / 打包）

> `build` / `dev` 脚本会先自动执行 `build:sidecar`；也可以单独运行它来准备二进制。

```bash
# 1.（可选）单独构建 sidecar：后端 release 二进制 → src-tauri/binaries/...-<host-triple>
pnpm --dir frontend/apps/desktop build:sidecar

# 2. 打包桌面端（自动 build:sidecar + 根目录 `pnpm build:web`）
pnpm --dir frontend/apps/desktop build
```

`scripts/build-sidecar.sh` 做的事：

1. `cargo build --release -p open-calculator-server`（使用根 workspace）；
2. 用 `rustc -vV` 读取 host triple（如 `aarch64-apple-darwin`）；
3. 复制到 `src-tauri/binaries/open-calculator-server-<triple>`（Tauri externalBin 命名约定）。

## 图标

`assets/icon.png`（1024×1024）是图标源文件。修改后重新生成图标集：

```bash
# 在 apps/desktop 目录执行（相对路径基于该目录）
pnpm --dir frontend/apps/desktop exec tauri icon ../../assets/icon.png
# 或使用绝对路径，避免工作目录歧义
pnpm --dir frontend/apps/desktop exec tauri icon /绝对路径/assets/icon.png
```

生成物写入 `src-tauri/icons/`，属于提交内容（根 `.gitignore` 未忽略该目录）。
`src-tauri/gen/`、`src-tauri/binaries/`、`src-tauri/target/` 已被忽略，不提交。

## 校验（不打包）

```bash
# 0. 首次校验前需要 sidecar 文件：tauri-build 在编译期会校验 externalBin 是否存在
pnpm --dir frontend/apps/desktop build:sidecar

# Rust 编译检查（首次会下载并编译较多 crate）
cargo check --manifest-path frontend/apps/desktop/src-tauri/Cargo.toml

# Tauri 配置可解析
pnpm --dir frontend/apps/desktop exec tauri info

# sidecar 脚本语法
bash -n frontend/apps/desktop/scripts/build-sidecar.sh
```

> 注意：`src-tauri/binaries/` 被 `.gitignore` 忽略，因此新克隆的仓库在第一次
> `cargo check` 之前必须先执行 `build:sidecar`，否则 `tauri-build` 会因
> `resource path binaries/open-calculator-server-<triple> doesn't exist` 失败。

## 说明

- `serde` / `serde_json` 作为桌面端后续 IPC / 配置结构化的基础依赖预留。
- 桌面端 crate 不在根 Cargo workspace（根 `Cargo.toml` 的 `exclude` 已声明），
  独立维护 Tauri 依赖版本，避免与后端 workspace 的构建节奏耦合。
