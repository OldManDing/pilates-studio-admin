# Round 4 UI 测试记录（2026-04-30）

## 测试范围

- 双断点视觉扫描：desktop / 1024 / 900 / mobile（390）
- 页面：dashboard / notifications / members / bookings / courses / settings / finance
- 指标：横向溢出（`scrollWidth - innerWidth`）、关键卡片可读性与层级稳定性

## 结果摘要

- 状态：完成
- 发现问题数：2
- 已修复：2
- 重点结论：
  - finance 移动端横向溢出已消除
  - notifications 中宽屏（<=1200）筛选区与右栏挤压感已缓解

## Bug 列表

| ID | 严重级别 | 页面/模块 | 问题 | 复现步骤 | 状态 |
|---|---|---|---|---|---|
| R4-001 | Medium | 财务报表 `/finance`（移动端） | 交易摘要胶囊容器不换行导致横向溢出 | 390x844 打开 `/finance`，底部出现横向滚动条 | 已修复 |
| R4-002 | Medium | 通知队列 `/notifications`（中宽屏） | 过滤器区与卡片右栏在 993~1200 断点存在挤压感 | 1024 宽度查看通知队列首卡，右栏与筛选区视觉拥挤 | 已修复 |

## 修复动作

- `src/pages/finance/index.tsx`
  - 给摘要胶囊容器增加 finance 局部类：`styles.financeMetaWrap`。
- `src/pages/finance/index.module.css`
  - 新增 `.financeMetaWrap`。
  - `@media (max-width: 768px)` 下设置 `width: 100%` 与 `flex-wrap: wrap`。

- `src/pages/notifications/index.module.css`
  - 新增 `@media (max-width: 1200px)`：
    - `queueFilters` 改为 2 列。
    - `queueQuickAction` 独占一行。
    - `notificationCard` 右栏收敛为 `minmax(236px, 280px)`。
  - `@media (max-width: 992px)` 下取消 `notificationAside` 的 `max-width`，单列时整行展开。

## 回归结果

- 横向溢出指标：
  - finance mobile 修复前：`docOverflow = 42`
  - finance mobile 修复后：`docOverflow <= 0`
- 详情抽屉移动端复测（Oracle blocker 复核）：
  - finance drawer 在 `390x844` 打开态下，`docOverflow = 0`。
  - 抽屉宽度约 `374px`（受 `responsiveDetailDrawer` 约束），不再越界。
- notifications 1024 复测：
  - 左栏约 529px，右栏约 280px
  - 无重叠、无横向溢出

- 自动化门禁：
  - `npm run lint` 通过
  - `npm run typecheck` 通过
  - `npm run smoke-test` 通过（11/11）
  - `npm run build` 通过
