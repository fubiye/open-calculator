# @open-calculator/workbook-univer

Univer 表格引擎适配层。唯一允许直接 import Univer 的前端包，向应用提供受控的挂载、快照与变更接口。

```tsx
<SpreadsheetHost
  initialSnapshot={workbookData}
  numberFormats={rules}
  onSnapshotChange={(snapshot) => save(snapshot)}
/>
```

- 负责 Univer 生命周期与 CSS/locale 引入；
- 不负责持久化、文件模型与业务布局；
- 独立类型检查：`pnpm --filter @open-calculator/workbook-univer typecheck`。
