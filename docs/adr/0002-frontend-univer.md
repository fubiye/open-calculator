# ADR-0002：前端采用 React + Vite，表格界面采用 Univer

- 状态：已接受
- 日期：2026-11-21

## 背景

前端必须“像 Excel”，同时是开放可扩展、AI 原生的计算器。自研 Canvas 网格可以完全掌控，但需要实现选区、编辑、剪贴板、公式引擎、格式、冻结、撤销等大量细节，早期成本过高。

## 决策

- 应用外壳：React 19 + TypeScript 5.9 + Vite 8。选择 Vite 而非 Next.js：产品是本地优先的单页工具，不需要 SSR/RSC，桌面打包也更简单。
- 表格界面：**Univer 1.6**（`@univerjs/presets` + `@univerjs/preset-sheets-core`，Apache-2.0），通过 `createUniver` + `UniverSheetsCorePreset` 集成；工作簿快照用 `fWorkbook.save()` 序列化、`univerAPI.createWorkbook()` 装载。
- 状态管理：当前只有应用级状态，使用 React 内置 state；不引入 Redux/Zustand，等出现跨面板复杂状态再评估。
- 样式：手写 CSS + CSS 变量，不引入 Tailwind，避免与 Univer 自带样式体系叠加复杂度。

## 理由

- Univer 提供 Excel 兼容的公式引擎、数字格式、多工作表、剪贴板、Undo/Redo，以及可注册的插件体系（`IPlugin` / Facade API），与“可扩展”目标一致。
- 纯 TypeScript 且类型完整，与 React 集成成本低；Apache-2.0 允许商业使用与修改。
- 有活跃维护与协作/导入导出等上层能力，未来扩展路径清晰。

## 后果

- 优点：一周内得到可用的 Excel 级交互；公式、格式、多 sheet 不需要自研。
- 成本/风险：
  - 主包较大（当前产物约 7 MB，gzip ≈ 1.75 MB），后续需要按需加载/代码分割/worker 化。
  - Univer 的 Facade API 迭代较快，升级需要回归测试；锁定小版本并记录升级清单。
  - 深度定制（自定义渲染、AI 内联建议）需要理解其插件与渲染层。
- 切换成本：若未来改用自研或 FortuneSheet，需重写 `apps/web/src/components/Spreadsheet.tsx` 与快照适配层；演示数据、API、外壳不受影响。这也解释为何把 Univer 集成收敛在单一组件内。

## 备选方案

| 方案                      | 结论                                                                           |
| ------------------------- | ------------------------------------------------------------------------------ |
| FortuneSheet 1.0.4（MIT） | 更轻、API 简单，但插件/扩展能力弱，维护与 Excel 兼容度不如 Univer；作为备选。  |
| Luckysheet                | 已停止演进、无 TS 类型；不采用。                                               |
| Handsontable              | 非 GPL 场景需商业授权；公式与 Excel 体验一般。                                 |
| AG Grid                   | 强在数据网格而非电子表格；公式/格式引擎缺失。                                  |
| 自研 Canvas 网格          | 掌控力最强，但早期成本与风险过高；作为长期备选，仅在 Univer 成为硬约束时评估。 |

详细对比与事实来源见 [技术选型文档](../architecture/tech-stack.md)。
