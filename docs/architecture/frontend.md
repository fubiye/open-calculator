# 前端架构设计（Frontend Design）

> 本文中的前端包路径均相对 `frontend/`（例如 `apps/web` 即 `frontend/apps/web`，`packages/*` 即 `frontend/packages/*`）。

- 状态：**v0.1 设计稿（2026-11-21）**，对应决策已确认，**尚未实现**
- 本文覆盖前端框架、包拆分、边界强制、扩展体系、文件交互、视图组合、响应式数据、公式函数桥接与性能预算
- 相关决策：[ADR-0002 前端与 Univer](../adr/0002-frontend-univer.md) · [ADR-0011 包拆分与边界](../adr/0011-frontend-packages-boundaries.md) · [ADR-0012 前端扩展体系](../adr/0012-frontend-extension-system.md) · [后端设计](backend.md)

## 0. 术语

| 术语              | 含义                                                  |
| ----------------- | ----------------------------------------------------- |
| **File**          | 一个 `.ocalc` 项目文件，隔离与持久化单位              |
| **View**          | 文件内的一屏布局（如“总览”“明细”），由多个 Block 组成 |
| **Block**         | 视图块：工作簿、数据表格、KPI、说明等                 |
| **Extension**     | 前端扩展（插件）：注册 Block / 面板 / 命令            |
| **FileContext**   | 注入给块的运行时上下文（数据、动作、选中状态）        |
| **FileDataStore** | 文件级响应式数据仓库（Dataset 版本与订阅）            |

## 1. 已确认的决策

| #   | 决策                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------- |
| F1  | 应用框架：**React 19 + TypeScript 5.9 + Vite 8**（曾评估 Vue，因 Univer 官方集成与避免双框架而放弃）          |
| F2  | 表格引擎：**Univer 1.5.2**，保留完整 Excel 工具栏；性能通过工程优化控制，不自研网格                           |
| F3  | 前端性能预算按 Univer 路线校准（见 §10）；体积做 CI 硬门禁，时间指标做趋势                                    |
| F4  | 文件交互：多文件标签页 + 单活跃 Univer 实例；`.ocalc` 项目文件；自动保存只写检查点，`Ctrl/Cmd+S` 才写项目文件 |
| F5  | 崩溃恢复：启动检测未正常退出 → 恢复弹窗；恢复内容为文档 + 数据快照，不含瞬时 UI 状态                          |
| F6  | 数据源：CSV/JSON，本地文件，仅手动刷新，无监控                                                                |
| F7  | 响应式边界：数据源 → 视图块自动更新；数据源 → 单元格仅“手动一次性写入”，不做持久链接                          |
| F8  | 公式函数插件：函数目录拉取 + Univer 自定义函数桥接 + `/functions/invoke`；异步能力需先 spike                  |
| F9  | 前端拆为 **6 个 packages + apps/web**，现在拆；引入边界强制工具                                               |
| F10 | 前端插件化：扩展体系（Block/Panel/Command），内置块走同一注册 API                                             |
| F11 | 状态方案：React Context + hooks + `useSyncExternalStore`；不引入 Redux/Zustand；暂不引入路由                  |
| F12 | AI 面板默认收起 + 懒加载；移除 React StrictMode                                                               |

## 2. 应用外壳

```text
┌──────────────────────────────────────────────────────────────┐
│ TopBar: 文件标签 · 文件名/dirty · 保存/恢复 · 扩展入口 · AI   │
├────────────┬─────────────────────────────────┬───────────────┤
│ 左栏        │ 当前 View（Block 网格）           │ AI 面板       │
│ 数据源/视图 │  ┌──────────────┬────────────┐  │ （默认收起）  │
│ 扩展入口    │  │ Spreadsheet  │ KPI        │  │               │
│            │  ├──────────────┴────────────┘  │               │
│            │  │ DataTable（虚拟滚动）        │  │               │
├────────────┴─────────────────────────────────┴───────────────┤
│ StatusBar: 后端连接 · 保存状态 · 数据快照时间 · 性能/版本      │
└──────────────────────────────────────────────────────────────┘
```

- 文件标签、视图标签由 app 内部状态管理，**不引入路由**（桌面应用无需 URL 语义；后续如需要再加）。
- 上下文：`ExtensionProvider`（扩展注册表）、`FileProvider`（文件会话 + FileDataStore）、`ApiClientProvider`。
- 只有当前 View 的块被挂载；Spreadsheet 块在切换视图时**保持挂载（隐藏）**，避免销毁 Univer 实例。

## 3. 包拆分

### 3.1 包清单

| 包                                 | 职责                                                                                     | 依赖                                     | 独立测试 |
| ---------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------- | -------- |
| `@open-calculator/contracts`       | 纯类型与契约：Snapshot、Dataset、FileContext、BlockModule、Value 编码、ExtensionManifest | 无内部依赖                               | ✅       |
| `@open-calculator/api-client`      | 类型化 HTTP 客户端（fetch、错误、超时），无 React                                        | contracts                                | ✅       |
| `@open-calculator/workbook-univer` | Univer 适配：挂载/卸载、快照编解码、变更订阅、性能生命周期                               | contracts + Univer + React(peer)         | ✅       |
| `@open-calculator/extensions`      | 扩展系统：注册表、扩展点、生命周期、React 槽位、错误边界                                 | contracts + React(peer)                  | ✅       |
| `@open-calculator/composition`     | 视图与块宿主：View schema 校验、网格布局、FileContext、块懒加载                          | extensions + contracts                   | ✅       |
| `@open-calculator/blocks`          | 内置块：spreadsheet / data-table / kpi / note，走扩展注册                                | contracts + extensions + workbook-univer | ✅       |
| `apps/web`                         | 组合根：shell、文件 UX、FileDataStore、AI 面板、shared UI                                | 全部                                     | ✅       |
| `apps/desktop`                     | Tauri 壳                                                                                 | apps/web                                 | —        |

### 3.2 依赖方向

```text
apps/web ──▶ blocks ──▶ workbook-univer ──▶ Univer
    │           │
    │           └──▶ extensions ──▶ contracts
    ├──▶ composition ──▶ extensions / contracts
    ├──▶ api-client ──▶ contracts
    └──▶ contracts
```

规则：

1. 只允许向下依赖；禁止反向、禁止循环。
2. `contracts` 是叶子：不得依赖 React、Univer、浏览器/Node API。
3. 任何 package 不得依赖 `apps/*`。
4. 包之间只能通过包名入口（`exports` 只暴露 `"."`），禁止 `@open-calculator/*/src/*` 深路径。
5. 包为 **source-first TypeScript**（`exports` 指向 `src/index.ts`），由 Vite 统一转译，不单独产物化（降低构建复杂度）。

### 3.3 独立验收标准

- 每个包有 README、`vitest run` 可独立跑；
- 不依赖其他包的非公开路径；
- `contracts` 无 UI/运行时依赖；
- 新包必须能回答“为什么需要独立存在”。

## 4. 边界强制

- 根目录统一 `eslint.config.js`，新增 `eslint-plugin-boundaries`；
- elements：workspace 包 + `apps/web/src` 内部模块（`app / features / blocks / lib / shared`）；
- 策略示例：

| from              | 允许 import                                    |
| ----------------- | ---------------------------------------------- |
| `contracts`       | 无                                             |
| `api-client`      | `contracts`                                    |
| `extensions`      | `contracts`                                    |
| `workbook-univer` | `contracts`                                    |
| `composition`     | `contracts`、`extensions`                      |
| `blocks`          | `contracts`、`extensions`、`workbook-univer`   |
| `apps/web`        | 全部 packages + 自身内部模块                   |
| `features/*`      | 允许方向由配置显式列出；禁止 features 之间深引 |

- 禁止深路径：eslint 规则拦截 `@open-calculator/*/src/*`；
- CI：`pnpm lint` 必须包含边界检查；违反即失败；
- 包内的跨目录 import 同样受控（公共入口 `index.ts`）。

## 5. 前端扩展（插件）体系

### 5.1 扩展点

| 类型                 | 贡献内容                              | v1                |
| -------------------- | ------------------------------------- | ----------------- |
| `block`              | 视图块类型 + 配置 schema + 懒加载组件 | ✅ 内置块同样注册 |
| `panel`              | 侧边面板（数据源、AI、设置）          | ✅ 基础           |
| `command`            | 工具栏/菜单/快捷键动作                | ✅ 基础           |
| `data-source-config` | 数据源配置表单                        | 后续              |
| `theme` / 渲染器     | —                                     | 后续              |

### 5.2 Manifest 与注册表

```ts
interface ExtensionManifest {
  id: string; // "block.kpi"
  version: string; // semver
  apiVersion: string; // 主版本兼容
  kind: 'block' | 'panel' | 'command';
  contributes: BlockContribution | PanelContribution | CommandContribution;
  permissions?: string[]; // 预留
}

interface BlockContribution {
  type: string; // View 中引用的块类型
  title: string;
  defaultConfig: unknown;
  validate?: (config: unknown) => boolean;
  loader: () => Promise<BlockModule>; // 懒加载
}
```

- `ExtensionRegistry`：注册、查找、重复 id/type 检测、`apiVersion` 校验、激活/停用；
- 组件通过 `ExtensionSlot` 渲染，统一 `ErrorBoundary` + `Suspense`；
- 扩展加载失败只降级该扩展/块（提示 + 重试），不影响应用；
- View/Block 定义记录所需扩展 id；缺失时显示“需要扩展 X”，不崩溃；
- v1：扩展可信、进程内、随构建提供；第三方远程/沙箱扩展后置（manifest 与版本协商已预留）。

### 5.3 与后端插件的关系

- 后端插件（数据源连接器、公式函数）通过 `/meta`、`/functions` 暴露；前端自动桥接公式函数目录，**不视为前端扩展**；
- 前后端共同遵循 manifest 约定（id/version/apiVersion/permissions）；
- 数据源配置表单将来作为前端扩展，与后端连接器插件按 id 对应。

### 5.4 内置块 dogfooding

`spreadsheet / data-table / kpi / note` 全部通过 `registerBlockType` 注册，证明扩展 API 是唯一入口；第三方块将来走同一契约。

## 6. 文件交互与恢复 UX

| 场景     | 行为                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------- |
| 启动     | 恢复上次会话；最近文件列表；无文件时“新建/示例”                                                |
| 项目文件 | `.ocalc`（版本化 JSON）；原生对话框打开/保存                                                   |
| 自动保存 | 只写本地检查点（默认 10s 窗口、1–2s 防抖）；标题栏 dirty 状态                                  |
| 显式保存 | `Ctrl/Cmd+S` 写入项目文件；保存前比对 mtime/hash，外部改动时提示“覆盖/另存为”                  |
| 多文件   | 标签页；单活跃 Univer 实例；切换时保存快照并释放，切回恢复                                     |
| 关闭     | 有未保存内容时提示；退出前 flush 检查点                                                        |
| 崩溃恢复 | 启动检测未正常退出 → 弹窗（文件、时间、恢复/丢弃）；恢复后标记“未保存”并横幅提示               |
| Web/桌面 | 桌面：原生对话框 + 后端读取；Web：File System Access API（Chromium）或导入副本，刷新需重新选择 |

数据源面板：侧边栏卡片（类型、路径、行列数、上次刷新时间、过期徽标、刷新按钮）；刷新失败保留旧数据并展示错误；无文件监控。

## 7. 视图组合

- 一个文件包含 1..n 个 View；View 使用 12 列网格 + 列跨度，v1 **不做拖拽/自由布局**；
- 默认视图：工作簿 + AI 面板；
- View schema 存于 `.ocalc`，版本化；
- 块类型：`spreadsheet`、`data-table`、`kpi`、`note`；图表/筛选器后置；
- 块契约：

```ts
interface BlockModule<P = unknown> {
  type: string;
  title: string;
  defaultConfig: P;
  validate(config: unknown): P | null;
  component: React.ComponentType<{ file: FileContext; config: P }>;
}

interface FileContext {
  subscribeDataset(sourceId: string, listener: () => void): () => void;
  getDataset(sourceId: string): DatasetSnapshot | null;
  refreshSource(sourceId: string): Promise<void>;
  writeRange(target: string, data: Value[][]): Promise<void>;
  selection: { viewId: string; blockId: string } | null;
}
```

- 块之间不互相 import；共享数据/动作只能经 `FileContext`；
- 每个块独立错误边界与懒加载；隐藏视图的块不挂载（工作簿例外，保持挂载）。

## 8. 响应式数据层

```ts
interface FileDataStore {
  get(sourceId: string): DatasetSnapshot | null;
  subscribe(sourceId: string, listener: () => void): () => void;
  refresh(sourceId: string): Promise<void>;
  writeRange(target: string, data: Value[][]): Promise<void>;
}
```

- `DatasetSnapshot = { version, schema, rows, importedAt, stale, error? }`；
- 同一数据源多个块共享一次读取/刷新；订阅随块卸载释放；
- 刷新中：骨架/局部 loading；失败：保留旧数据 + 错误提示 + 快照时间；
- 表格块虚拟滚动；KPI 仅在 version 变化时重算；
- 文件级 store，挂载时创建、关闭时销毁；不引入全局状态库。

## 9. 公式函数插件桥接

```text
启动：GET /functions → 注册 Univer 自定义函数（仅启用插件）
调用：单元格公式 → 参数编码 → POST /functions/invoke → 结果回填
```

- 参数/结果：统一 tagged Value（数字/字符串/布尔/错误/二维数组/空值）；
- 函数名强制命名空间前缀，host 校验唯一性；
- 异步：依赖 Univer `AsyncObject`/`isAsync`，**实现前先 spike**；不支持则降级为临时错误值 + 状态提示；
- 超时 2–3s → 错误值（`#N/A`/`#VALUE!`）+ 非阻断提示；不在公式路径重试；
- 缓存：仅 deterministic 函数，键为 `(插件版本, 函数名, 参数)`；
- v1 单次调用；若实测请求过多再评估批量或 WASM 本地执行；
- 插件启停后需重启后端 + 刷新前端（v1 无热加载）。

## 10. Univer 集成与性能

- 挂载：`onMounted/onActivated`（React `useEffect`）→ `createUniver` + `UniverSheetsCorePreset`；卸载 `dispose()`；
- 快照：`fWorkbook.save()` → 信封 `{ schemaVersion, engine, data }`；加载时解开信封并校验 schema/engine；
- 变更：订阅 `onCommandExecuted`，仅 `CommandType.MUTATION` 触发自动保存（防抖）；
- 切换视图：隐藏容器、保持实例，切回时 `resize()`；
- 懒加载：`workbook-univer` 独立包，块级 `React.lazy`；vendor 拆分为 `univer` / `react` / `app` chunk；
- 移除 StrictMode：避免开发期双实例与重复自动保存；
- 性能预算（已校准）：

| 指标               | 硬上限  | 目标    |
| ------------------ | ------- | ------- |
| 初始 JS（gzip）    | 1.60 MB | 1.30 MB |
| 空闲 JS Heap       | 60 MB   | 45 MB   |
| 加载至 Univer 可用 | 1.2 s   | 700 ms  |
| 按键到渲染         | 33 ms   | 16 ms   |
| 10 万单元格滚动    | 50 FPS  | 60 FPS  |
| 1k 单元格重算      | 16 ms   | 8 ms    |
| 打开 10MB 文件     | 1.5 s   | 800 ms  |

- 优化顺序：① 按需插件组合（替代全量 preset）并测量；② 公式引擎 Worker 化；③ locale 裁剪；④ AI 面板懒加载；⑤ 内存生命周期检查；⑥ 体积/性能门禁。
- 风险：Univer 异步自定义函数能力、WKWebView 下的 Canvas 性能（桌面发布前实测）。

## 11. 测试策略

| 层          | 方式                                                                 |
| ----------- | -------------------------------------------------------------------- |
| contracts   | 类型 + 值编码 + schema 校验单测                                      |
| api-client  | fetch mock 单测                                                      |
| extensions  | 注册表/版本校验/重复检测/解除注册单测                                |
| composition | View schema 校验、布局计算、FileContext 单测                         |
| blocks      | 纯逻辑（KPI 聚合、表格排序）单测                                     |
| app         | 文件/恢复流程状态机单测                                              |
| 集成        | Playwright：打开文件、编辑公式、刷新数据、切换视图、恢复流程（后续） |
| 边界        | ESLint boundaries 在 CI 强制                                         |

## 12. 实施步骤（待开工）

1. 建立 `packages/*` 骨架、根 tsconfig/eslint（含 boundaries）、pnpm workspace；
2. 迁移 `contracts`（类型/值编码）与 `api-client`；
3. 迁移 Univer 集成为 `workbook-univer`；
4. 建立 `extensions`（注册表/槽位）与 `composition`（View/Block 宿主）；
5. 迁移/新增内置块到 `blocks`，走扩展注册；
6. 重构 `apps/web`：文件 tabs、FileDataStore、数据源面板、恢复/保存 UX；
7. 公式函数桥接（先 spike 异步能力）；
8. 性能：按需插件组合、vendor 拆分、懒加载、门禁脚本；
9. 验证：lint/test/build + 浏览器冒烟 + 基线测量。

**验收**：边界 lint 全绿；各包独立测试通过；首屏体积不超硬上限；文件打开/编辑/刷新/恢复链路可用。

## 13. 待细化事项

- `eslint-plugin-boundaries` 具体版本与配置形态；
- 扩展启用配置存储位置（应用配置 vs 文件）；
- 第三方扩展的加载/沙箱方案（后置）；
- 图表、筛选器等块类型；
- 文件模板/业务系统入口；
- Web 端 File System Access 的降级路径；
- Univer 异步自定义函数验证结论。

## 14. 相关文档

- [工程原则与性能预算](principles.md)
- [后端架构设计](backend.md)
- [技术选型](tech-stack.md)
- [ADR 索引](../adr/README.md)
- [路线图](../roadmap.md)
