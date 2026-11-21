# ADR-0011：前端包拆分与边界强制

> 本文中的包路径均相对 `frontend/`。

- 状态：已接受（2026-11-21；实现待开工）
- 相关：[ADR-0002](0002-frontend-univer.md) · [ADR-0012](0012-frontend-extension-system.md) · [前端设计](../architecture/frontend.md) · [工程原则](../architecture/principles.md)

## 背景

前端最初是单个 `apps/web` 包：React 外壳、Univer 集成、API 客户端、演示数据都混在一起。随着以下需求出现，单包不再合适：

1. Univer 是重依赖，需要从首屏/非表格视图中隔离并可懒加载；
2. 要建设“文件 → 视图 → 块”的组合体系与插件化扩展，块与运行时需要独立契约；
3. 模块独立是工程硬约束，需要可测试、可替换的边界；
4. 后端已按 crate 拆分，前端应形成对称的契约层。

## 决策

### 1. 现在拆为 6 个 packages + app

| 包                | 职责                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `contracts`       | 纯类型与契约（Snapshot、Dataset、FileContext、BlockModule、Value、ExtensionManifest），零 UI/运行时依赖 |
| `api-client`      | 类型化 HTTP 客户端（fetch，无 React）                                                                   |
| `workbook-univer` | Univer 适配层（挂载/卸载、快照编解码、变更订阅、性能生命周期）                                          |
| `extensions`      | 扩展系统（注册表、扩展点、生命周期、React 槽位、错误边界）                                              |
| `composition`     | 视图与块宿主（View schema、布局、FileContext、块懒加载）                                                |
| `blocks`          | 内置块（spreadsheet / data-table / kpi / note），通过扩展 API 注册                                      |
| `apps/web`        | 组合根（shell、文件 UX、FileDataStore、AI 面板、shared UI）                                             |

依赖方向严格向下：

```text
apps/web → blocks / composition / extensions / workbook-univer / api-client / contracts
blocks → contracts / extensions / workbook-univer
composition → extensions / contracts
extensions → contracts
workbook-univer → contracts
api-client → contracts
contracts → 无内部依赖
```

### 2. Source-first TypeScript

- 包不单独构建产物，`exports` 指向 `src/index.ts`，由 Vite 统一转译；降低 monorepo 构建复杂度；
- 只暴露 `"."` 入口，禁止深路径 import（`@open-calculator/*/src/*` 由 lint 拦截）；
- 每个包有独立 `vitest` 测试与 README。

### 3. 边界强制

- 根目录单一 `eslint.config.js` + `eslint-plugin-boundaries`；
- elements：workspace 包 + `apps/web` 内部目录（`app / features / blocks / lib / shared`）；
- policies 显式允许依赖；禁止 `apps → apps`、反向依赖、`contracts` 引入 React/Univer；
- CI 中 `pnpm lint` 失败即阻断合并。

## 理由

- 与后端 crate 对称，前后端契约集中在 `contracts`；
- Univer 被隔离在 `workbook-univer`，天然可懒加载，避免所有视图都加载它；
- 扩展体系需要一个稳定的块契约与注册表，独立包可保证这一层不被业务代码侵蚀；
- 包级拆分 + lint 强制，让“模块独立”从文档约定变成可执行的约束。

## 后果

- 优点：边界可验证、包可独立测试、懒加载自然、插件体系有落点。
- 成本/风险：
  - 6 个包的配置与依赖管理成本（用 source-first + 根级 lint 抵消）；
  - 早期包内代码可能很少（如 `composition`），需要避免“为拆而拆”的空洞抽象；
  - 边界规则初期可能过严，允许按 ADR 调整。
- 后续：当出现 CLI/工具链消费方时，`api-client`/`contracts` 可直接发布；若拆分过细可合并。

## 备选方案

- **单包 + 内部目录**：实现成本最低，但无法懒加载隔离 Univer，也无法强制包级边界；不满足本次要求。
- **更细粒度包（每块一个包）**：v1 过度拆分；先由 `blocks` 包统一承载。
- **Nx/Turborepo**：任务编排收益尚未出现，增加依赖；暂不引入。
