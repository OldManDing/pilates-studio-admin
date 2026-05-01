# Round 3 UI 测试记录（2026-04-30）

## 测试范围

- 最终上线门禁前复核
- 重点：lint / typecheck / smoke-test / build 全绿
- 辅助证据：既有断点截图与逐条验收矩阵

## 结果摘要

- 状态：完成
- `lint`：通过
- `typecheck`：通过
- `smoke-test`：通过（11/11）
- `build`：通过
- 新增 2 个布局问题并当轮修复完成

## Bug 列表

| ID | 严重级别 | 页面/模块 | 问题 | 复现步骤 | 状态 |
|---|---|---|---|---|---|

| R3-001 | High | 通知队列 `/notifications` | 卡片右栏（描述+按钮）未被约束，挤压主内容栏导致顶部标签与标题层级混乱、按钮区视觉压迫 | 打开通知队列首条记录，在常规桌面宽度下观察卡片左右分栏宽度与顶部信息层级 | 已修复 |
| R3-002 | Medium | 财务报表 `/finance`（移动端） | 交易摘要胶囊容器在小屏不换行，导致页面横向溢出（出现底部横向滚动条） | 使用 390x844 进入 `/finance`，观察页面底部是否出现横向滚动 | 已修复 |

## 修复动作

- `src/pages/notifications/index.module.css`
  - 将卡片栅格改为 `minmax(0, 1fr) + minmax(264px, 320px)`，避免右栏反向撑爆主内容栏。
  - 新增 `max-width: 1200px` 断点：筛选区改为 2 列 + 快捷操作换行，减少中宽屏工具栏挤压。
  - `max-width: 992px` 下移除右栏 `max-width` 限制，单列栈叠时右栏可扩展到整行宽度。
  - 新增 `max-width: 1200px` 卡片右栏收敛到 `236~280px`，缓解 1024 宽度下的视觉拥挤。
  - 为右栏 `Descriptions` 增加 `width: 100%` + `table-layout: fixed`，并对 label/content 增加 `word-break`。
  - 优化标题区与类型标签约束：`notificationTitleWrap` 分层、`typePill` 溢出省略、`notificationTitle` 去除上边距并允许换行。
  - 将正文改为 `p` 并重置 margin，确保正文与操作区视觉分层稳定。
- `src/pages/notifications/index.tsx`
  - 语义化结构：正文容器改为 `<p>`，侧栏容器改为 `<aside>`。
- `src/pages/finance/index.tsx`
  - 交易摘要胶囊容器增加 finance 局部类，避免仅依赖共享 `statusMetaWrap`。
- `src/pages/finance/index.module.css`
  - 新增 `financeMetaWrap`：移动端 `width: 100%` + `flex-wrap: wrap`，消除横向溢出。

## 回归结果

- 通知首条卡片边界复测：左栏 617px / 右栏 320px，未出现挤压。
- 通知中宽屏复测（1024）：左栏约 529px / 右栏 280px，无重叠、无横向溢出。
- finance 移动端复测：`scrollWidth - innerWidth <= 0`，横向滚动条消失。
- 自动化门禁复测：`lint` / `typecheck` / `smoke-test` / `build` 全通过。
