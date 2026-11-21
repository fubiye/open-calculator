// Windows release 构建下隐藏额外的控制台窗口，不要删除。
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    open_calculator_desktop_lib::run()
}
