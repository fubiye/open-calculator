# @open-calculator/composition

视图与块宿主：按 `ViewDefinition` 渲染 12 列网格，解析块类型、懒加载块组件，并为每个块提供错误隔离。

- 只依赖 `contracts` 与 `extensions`，不依赖具体块实现；
- 块加载失败只降级该块；
- 独立测试：`pnpm --filter @open-calculator/composition test`。
