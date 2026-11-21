//! Open Calculator 桌面端 Tauri 壳。
//!
//! 运行模式：
//! - **dev**（`tauri dev` / `cargo check` 之外的 debug 构建，`cfg(debug_assertions)` 为真）：
//!   窗口加载 Vite dev server（`http://localhost:5173`）。前端请求通过 Vite proxy 转发到
//!   后端，后端由仓库根目录的 `pnpm dev` 统一启动，因此桌面壳**不** spawn sidecar。
//! - **release**：前端产物由 Tauri 内嵌，应用启动时用 `tauri-plugin-shell` 的 Rust API
//!   spawn `open-calculator-server` sidecar（环境变量 `OPEN_CALCULATOR_PORT=8787`），
//!   应用退出时 kill 子进程。spawn 失败只记录日志，前端仍可提示用户连接外部后端。
//!
//! 该 crate 与 web 前端的唯一约定是后端监听地址 `127.0.0.1:8787`
//! （见 `tauri.conf.json` 的 CSP `connect-src`）。

use std::sync::Mutex;

use tauri::{AppHandle, Manager, RunEvent};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};

/// sidecar 二进制名。
///
/// 与 `tauri.conf.json` 的 `bundle.externalBin`（`binaries/open-calculator-server`）对应；
/// 打包后 Tauri 会把它放到主程序同目录（macOS 为 `Contents/MacOS/`），因此这里只传文件名。
const SIDECAR_NAME: &str = "open-calculator-server";

/// 后端监听端口，需与后端默认值、CSP `connect-src` 保持一致。
const SIDECAR_PORT: u16 = 8787;

/// 保存 sidecar 子进程句柄，应用退出时用于 kill。
#[derive(Default)]
struct SidecarState(Mutex<Option<CommandChild>>);

/// 启动 sidecar，成功时返回子进程句柄；任何失败都只记录日志并返回 `None`。
fn spawn_sidecar(app: &AppHandle) -> Option<CommandChild> {
    let command = match app.shell().sidecar(SIDECAR_NAME) {
        Ok(command) => command,
        Err(err) => {
            eprintln!("[sidecar] 无法解析 sidecar 路径 {SIDECAR_NAME}: {err}");
            return None;
        }
    };

    let command = command.env("OPEN_CALCULATOR_PORT", SIDECAR_PORT.to_string());

    match command.spawn() {
        Ok((mut rx, child)) => {
            // 必须持续消费子进程输出，否则管道缓冲写满后后端日志会阻塞子进程。
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            println!("[server] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Stderr(line) => {
                            eprintln!("[server] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Error(err) => {
                            eprintln!("[sidecar] 子进程错误: {err}");
                        }
                        CommandEvent::Terminated(payload) => {
                            eprintln!("[sidecar] 子进程已退出: {:?}", payload);
                        }
                        _ => {}
                    }
                }
            });

            println!(
                "[sidecar] 已启动 {SIDECAR_NAME} (pid {}, port {SIDECAR_PORT})",
                child.pid()
            );
            Some(child)
        }
        Err(err) => {
            eprintln!("[sidecar] 启动 {SIDECAR_NAME} 失败（不阻塞应用启动）: {err}");
            None
        }
    }
}

/// 取出 sidecar 句柄（幂等，重复调用返回 `None`）。锁中毒时仍能取回内部数据，避免 panic。
fn take_sidecar(app: &AppHandle) -> Option<CommandChild> {
    let state = app.state::<SidecarState>();
    match state.0.lock() {
        Ok(mut guard) => guard.take(),
        Err(poisoned) => poisoned.into_inner().take(),
    }
}

/// 应用退出钩子：停止 sidecar。重复调用安全。
fn shutdown_sidecar(app: &AppHandle) {
    if let Some(child) = take_sidecar(app) {
        let pid = child.pid();
        match child.kill() {
            Ok(()) => println!("[sidecar] 已停止 {SIDECAR_NAME} (pid {pid})"),
            Err(err) => eprintln!("[sidecar] 停止 {SIDECAR_NAME} (pid {pid}) 失败: {err}"),
        }
    }
}

/// 桌面端入口，由 `main.rs` 调用。
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SidecarState::default())
        .setup(|app| {
            if cfg!(debug_assertions) {
                // dev：后端由仓库根目录 `pnpm dev` 启动，桌面壳不接管其生命周期。
                println!(
                    "[desktop] dev 模式：sidecar 交给根目录 `pnpm dev`，桌面壳只加载 {SIDECAR_PORT}/5173"
                );
            } else if let Some(child) = spawn_sidecar(app.handle()) {
                match app.state::<SidecarState>().0.lock() {
                    Ok(mut guard) => *guard = Some(child),
                    Err(poisoned) => *poisoned.into_inner() = Some(child),
                }
            }
            Ok(())
        });

    let app = match builder.build(tauri::generate_context!()) {
        Ok(app) => app,
        Err(err) => {
            eprintln!("启动 Open Calculator 桌面端失败: {err}");
            std::process::exit(1);
        }
    };

    app.run(|app_handle, event| match event {
        // 关闭最后一个窗口 / Cmd+Q 都会走到这里；ExitRequested 先收一次，
        // Exit 作为兜底（take_sidecar 已幂等）。
        RunEvent::ExitRequested { .. } | RunEvent::Exit => shutdown_sidecar(app_handle),
        _ => {}
    });
}
