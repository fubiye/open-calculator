# 路线图

> 原则：小步交付，每个阶段都以“可用 + 可验证”为准，不提前引入下一阶段依赖。
> 状态：✅ 已完成 · 🚧 进行中 · ⏳ 计划中

## 阶段 0：骨架（v0.1.0）✅

- [x] monorepo（pnpm + Cargo workspace）、CI、文档骨架
- [x] React + Vite + Univer 表格界面，演示“月供计算器”工作簿
- [x] Rust Axum 服务（health / meta / workbooks GET+PUT，内存存储，集成测试）
- [x] 前端自动保存/加载（800ms 防抖，离线降级）
- [x] Tauri 2 桌面壳骨架（dev + release sidecar 方案）
- [x] AI 面板占位与后端能力开关

**验收**：`pnpm dev` 后编辑表格 → 公式重算 → 刷新页面数据仍在（后端未重启时）；`pnpm lint && pnpm test` 通过。

## 阶段 0.5：性能与模块化基线（进行中）

以 [工程原则与性能预算](architecture/principles.md) 为验收标准。

- [x] release 构建启用 LTO + strip（后端二进制 3.2MB → 2.0MB）
- [x] 基线测量：前端 1.72MB JS(gzip) / 42MB Heap；后端 2.0MB / 6.8MB RSS / 6.5ms 启动
- [x] 工程原则、性能预算、模块地图与接口规则文档化
- [x] 后端架构设计定稿：分层/crate 边界、文件持久化与崩溃恢复、插件系统、本地文件数据源（ADR-0007~0010）
- [x] 前端架构设计定稿：包拆分与边界强制、扩展体系、文件/视图/响应式/函数桥接/性能预算（ADR-0011、0012）
- [ ] 后端实现：core/storage/server 拆分 + data-core/plugin-api/plugin-host；快照信封 + `expectedRevision` CAS
- [ ] 前端拆包：contracts/api-client/workbook-univer/extensions/composition/blocks + 根级 boundaries lint
- [ ] 前端扩展体系与内置块 dogfooding
- [ ] 文件级持久化与崩溃恢复（原子写 + 检查点 + 数据快照缓存）
- [ ] 官方插件：CSV/JSON 数据源 + 公式函数插件（金融/文本），配置开关启用
- [ ] Univer 路线性能优化（Worker 公式计算、按需插件、locale 裁剪、面板懒加载），按实测校准前端预算
- [ ] `criterion` 基准 + bundle 体积门禁接入 CI

**验收**：性能数据可复现；模块依赖方向符合 principles.md §4；后端决策记录（ADR-0007~0010）已定稿并作为实现依据；前端设计待讨论。

## 阶段 1：可用（v0.2.0）

- [ ] 文件级持久化与崩溃恢复（原子写 + 检查点；SQLite 是否引入待测量）
- [ ] 本地 CSV/JSON 数据源 + 手动刷新 + 数据快照缓存
- [ ] 前端文件 UX：多文件标签、保存/恢复、数据源面板、视图组合、响应式数据层
- [ ] 文件列表 / 新建 / 打开 / 保存；多文件后端隔离（session）
- [ ] 导入 / 导出 `.xlsx`（Rust `umya-spreadsheet` 或 Univer 插件，先定一条权威路径）
- [ ] Playwright 端到端测试：输入公式、重算、刷新后保留
- [ ] 打包验证：`tauri build` 在 macOS 产出可运行 `.app`，sidecar 正常启停

**验收**：断网可计算；重启应用数据不丢；导出的 xlsx 可被 Excel 打开。

## 阶段 2：AI（v0.3.0）

- [ ] Rust AI 模块：Provider 抽象（OpenAI 兼容 / Ollama）+ SSE 流式
- [ ] 工具调用：读取选区、解释公式、生成公式并写入（建议/确认模式）
- [ ] AI 面板真实对话；错误、超时、取消；token 用量显示
- [ ] 隐私开关：本地模型优先、云端 provider 明示
- [ ] 评估集：常见计算任务的公式正确率

**验收**：对“把年利率改成 4.2% 并解释月供变化”这类请求，能完成受控读写并给出可解释结果。

## 阶段 3：可扩展（v0.4.0）

- [ ] 自定义函数插件：manifest、WASM 沙箱（wasmtime）、权限与资源限额
- [ ] 公式一致性测试向量（前端 vs Rust）
- [ ] 前端 UI 插件机制（工具栏/侧边栏扩展）
- [ ] 插件安装/启用/禁用与版本兼容检查
- [ ] 示例插件包（如汇率、单位换算、日期计算）

**验收**：不修改核心代码即可新增一个函数与一个 UI 扩展，并能通过测试。

## 阶段 4：发布（v1.0.0）

- [ ] 三平台打包（macOS 签名/公证、Windows 签名、Linux AppImage/DEB）
- [ ] 自动更新（`tauri-plugin-updater`）
- [ ] 设置面板：模型 provider、主题、数据目录、备份/恢复
- [ ] 安全评审：本地 API 鉴权、CSP、插件权限
- [ ] 用户文档与示例工作簿库

## 明确不做（至少到 v1.0 前）

- 多人实时协作 / CRDT / 云同步
- 账号体系与云端存储
- 通用 BI / 图表分析平台
- 自研完整 Excel 公式引擎（除非一致性测试表明必须）
