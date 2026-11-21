# ADR-0012：前端扩展（插件）体系

- 状态：已接受（2026-11-21；实现待开工）
- 相关：[ADR-0011](0011-frontend-packages-boundaries.md) · [前端设计](../architecture/frontend.md) · [ADR-0009 后端插件](../adr/0009-plugin-system.md)

## 背景

产品要求“插件化、可扩展”：文件内的视图由可组合的块构成，未来还要支持第三方块、面板与命令。若块与视图硬编码在应用里，扩展只能靠改核心代码，与“开放可扩展”目标冲突。

同时，v1 只做前端扩展（进程内、可信、随构建提供），不引入远程/沙箱扩展的复杂度。

## 决策

### 1. 扩展点

| 类型                 | 贡献                                   | v1      |
| -------------------- | -------------------------------------- | ------- |
| `block`              | 视图块类型（配置 schema + 懒加载组件） | ✅      |
| `panel`              | 侧边面板（数据源、AI、设置等）         | ✅ 基础 |
| `command`            | 工具栏/菜单/快捷键动作                 | ✅ 基础 |
| `data-source-config` | 数据源配置表单                         | 后续    |
| `theme` / 渲染器     | —                                      | 后续    |

### 2. Manifest 与 API 版本

```ts
interface ExtensionManifest {
  id: string; // "block.kpi"
  version: string; // semver
  apiVersion: string; // 宿主扩展 API 主版本
  kind: 'block' | 'panel' | 'command';
  contributes: BlockContribution | PanelContribution | CommandContribution;
  permissions?: string[]; // 预留，v1 不强制执行
}
```

- 注册时校验：id/type 唯一、`apiVersion` 兼容、contribution 结构合法；
- 不兼容扩展拒绝加载并给出可读原因；
- 前后端 manifest 采用一致的 id/version/apiVersion/permissions 约定，便于未来插件市场统一。

### 3. 注册表与运行时

- `extensions` 包提供 `ExtensionRegistry`：注册、查找、重复检测、激活/停用；
- React 适配层：`ExtensionProvider`、`useExtensions`、`ExtensionSlot`；
- 每个扩展 UI 包裹 `ErrorBoundary` + `Suspense`；加载/渲染失败只影响自身，可重试；
- 块声明 `loader` 懒加载，未使用不进首包；
- 生命周期：`activate/deactivate` 可选，必须可重复调用且清理资源。

### 4. 内置块 dogfooding

`spreadsheet / data-table / kpi / note` 全部通过同一 `registerBlockType` 注册；**不允许**存在绕过扩展注册的内置块路径。这保证扩展 API 是真实可用的，而不是为第三方预留的摆设。

### 5. 文件引用与降级

- View/Block 定义记录所需扩展 id（块类型）；
- 扩展缺失/未启用时，块显示“需要扩展 X”的占位与说明，不影响文件其他内容；
- 扩展注册与文件数据解耦，切换文件不重复注册扩展。

### 6. v1 边界

- 只支持可信、进程内、随构建提供的扩展；
- 不做远程加载、不做 iframe/WASM 沙箱、不做插件签名（后续阶段）；
- 扩展配置的启用状态 v1 随应用构建（无需运行时安装）。

## 理由

- 与“文件 → 视图 → 块”组合模型天然对齐，块即扩展；
- 内置块走同一 API，能在 v1 就验证契约；
- 懒加载 + 错误隔离符合性能与独立性原则；
- 与后端插件系统共享 manifest 语义，降低未来统一插件市场的成本。

## 后果

- 优点：视图可组合、新块即插即用、失败隔离、可懒加载。
- 成本/风险：
  - 扩展 API 一旦公开就需要版本兼容；v1 用 `apiVersion` 做粗粒度控制；
  - 进程内扩展无安全隔离，需明确“仅可信扩展”；
  - 扩展注册与文件加载顺序、错误提示需要仔细设计。
- 未来：远程/第三方扩展需要沙箱、签名、权限执行；manifest 已预留字段。

## 备选方案

- **硬编码块**：开发最快，但违背“插件化/可扩展”要求；拒绝。
- **一开始做微前端/iframe 沙箱**：隔离好但成本高、性能差，v1 不需要。
- **每个块一个 npm 包**：过度拆分；由 `blocks` 包统一承载，内部按块分目录。
