# @open-calculator/extensions

前端扩展（插件）系统：manifest、`ExtensionRegistry`、块/面板/命令注册、React Provider 与错误边界。

- 内置块必须通过 `registry.register` 注册（dogfooding）；
- 扩展按 `apiVersion` 主版本校验；重复 id/type 会拒绝；
- 独立测试：`pnpm --filter @open-calculator/extensions test`。
