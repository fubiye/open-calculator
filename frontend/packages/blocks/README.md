# @open-calculator/blocks

内置视图块：`spreadsheet`、`data-table`、`kpi`、`note`。全部通过 `registerBuiltinBlocks(registry)` 注册，和第三方块使用同一扩展 API。

- 只依赖 `contracts`、`extensions`、`workbook-univer`；
- 通过 `FileContext` 访问数据集与工作簿，块之间不互相引用；
- 独立测试：`pnpm --filter @open-calculator/blocks test`。
