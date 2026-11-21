# 贡献指南

感谢参与 Open Calculator。我们追求**小步、可验证、可回滚**的改动。

## 1. 环境准备

- Node.js ≥ 22.12、pnpm 12
- Rust stable ≥ 1.85（`rust-toolchain.toml` 会请求 stable）
- macOS 开发桌面端需要 Xcode Command Line Tools

```bash
pnpm install
pnpm dev        # web:5173 + server:8787
```

## 2. 常用命令

| 命令                               | 作用                                 |
| ---------------------------------- | ------------------------------------ |
| `pnpm dev`                         | 同时启动前端与后端                   |
| `pnpm dev:web` / `pnpm dev:server` | 只启动其中一端                       |
| `pnpm dev:desktop`                 | 启动 Tauri 桌面壳（需先 `pnpm dev`） |
| `pnpm build`                       | 构建 Web + Rust release 二进制       |
| `pnpm build:desktop`               | 打包桌面应用（自动构建 sidecar）     |
| `pnpm lint`                        | ESLint + `cargo clippy -D warnings`  |
| `pnpm test`                        | Vitest + `cargo test`                |
| `pnpm format`                      | Prettier + rustfmt 格式化            |

## 3. 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```text
<type>(<scope>): <summary>
```

- `feat`：用户可见的新能力
- `fix`：缺陷修复
- `refactor`：不改变行为的重构
- `docs`：文档
- `test`：测试
- `chore`：构建、依赖、工具链
- `perf`：性能

示例：`feat(web): autosave workbook snapshots to rust backend`

要求：

- 一次提交只做一件事；拆分“重构”和“行为变化”。
- 提交信息用英文，正文可中文；涉及 API/架构变化必须在提交正文说明。
- 不允许提交未使用的依赖、注释掉的代码、密钥或本地数据。

## 4. 代码约定

### TypeScript / React

- strict 模式；禁止 `any`（确需时写明原因并局部收窄）。
- 组件保持“展示 / 逻辑”分离；数据访问集中在 `src/lib/api.ts`。
- Univer 相关逻辑收敛在 `src/components/Spreadsheet.tsx`，不要在页面各处直接操作 `univerAPI`。
- 新增依赖前先评估包体积与维护状态；表格引擎相关依赖锁定小版本。

### Rust

- `cargo fmt` + `clippy -D warnings` 必须通过。
- 错误使用 `thiserror` 表达，禁止在请求路径 `unwrap`/`expect`/`panic`。
- 新 API 必须带集成测试（`tower::ServiceExt::oneshot`，不依赖真实端口）。
- 保持 `routes / store / app / config / error` 的职责边界；新增抽象前先确认有两个以上使用方。

### 文档

- 行为/架构/接口变化必须同步更新文档：`docs/architecture/`、`docs/adr/` 或 `README.md`。
- 重要技术取舍写成 ADR，而不是散落在 PR 描述里。

## 5. Pull Request 检查清单

- [ ] `pnpm lint`、`pnpm test`、`pnpm build` 均通过
- [ ] 新增/修改的行为有测试，或说明为何无法自动化测试
- [ ] 文档已更新（含 `docs/` 或 README）
- [ ] 没有提交 `.env`、本地数据库、`target/`、`node_modules/`
- [ ] 桌面相关改动注明是否验证了 `pnpm --dir apps/desktop check`
- [ ] 提交历史符合 Conventional Commits，且可按需回滚

## 6. 架构决策

新增架构决策请：

1. 在 `docs/adr/` 新建 `NNNN-title.md`（沿用现有格式：背景 / 决策 / 理由 / 后果 / 备选）。
2. 更新相关文档索引（`docs/adr/README.md`）。
3. 如果是替换既有决策，将旧 ADR 标记为“已被 ADR-XXXX 取代”，不要删除历史。
