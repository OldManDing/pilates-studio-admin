# 后台 UI 修复验收矩阵（逐条复核）

- 日期：2026-04-29
- 范围：`UI-01 ~ UI-33`
- 说明：此文档用于避免“口头关闭”；每条均给出代码证据。视觉类条目标注“需人工视觉验收”。

## 验收口径

- **代码已修复**：在代码中可定位到对应修复实现。
- **需人工视觉验收**：代码已修复，但仍建议在 1440/1200/1024/768 断点做截图比对。

## 逐条状态

| ID | 状态 | 代码证据 | 备注 |
|---|---|---|---|
| UI-01 | 代码已修复 | `src/pages/members/index.tsx`：`<Spin spinning={loading}>` 包裹会员列表区 | 后续加载有可见反馈 |
| UI-02 | 代码已修复 | `src/pages/members/index.tsx`：`confirmLoading={isSavingMember}` | 防重复提交 |
| UI-03 | 代码已修复 | `src/pages/members/index.tsx`：`deletingMemberId` + 删除按钮/Popconfirm `loading/disabled` | 删除动作加锁 |
| UI-04 | 代码已修复 | `src/pages/coaches/index.tsx`：`<Spin spinning={loading}>` 包裹教练列表区 | 后续加载有反馈 |
| UI-05 | 代码已修复 | `src/pages/coaches/index.tsx`：`confirmLoading={isSavingCoach}` | 保存防重 |
| UI-06 | 代码已修复 | `src/pages/bookings/index.tsx`：`<Spin spinning={loading}>` 包裹预约列表区 | 非首屏加载可见 |
| UI-07 | 代码已修复 | `src/pages/bookings/index.tsx`：`statusUpdatingBookingId` 绑定按钮 `loading/disabled` | 状态推进防并发 |
| UI-08 | 代码已修复 | `src/pages/bookings/index.tsx`：`deletingBookingId` 绑定删除按钮和 Popconfirm | 删除防并发 |
| UI-09 | 代码已修复 | `src/pages/finance/index.tsx`：`hasFinanceTrendData/hasRevenueStructureData` + `EmptyState` | 图表空态已兜底 |
| UI-10 | 代码已修复 | `src/pages/finance/index.tsx`：交易 Modal `confirmLoading={isSavingTransaction}` | 提交防重 |
| UI-11 | 代码已修复 | `src/pages/finance/index.tsx`：`statusUpdatingTransactionId` 绑定列表/抽屉状态按钮 | 状态更新防重 |
| UI-12 | 代码已修复 | `src/pages/notifications/index.tsx`：`markingNotificationId` + 按钮 `loading/disabled` | 标记动作防重 |
| UI-13 | 代码已修复 | `src/pages/settings/index.tsx`：`primaryActionLoading={isSavingStoreInfo}` | 门店保存有进行中态 |
| UI-14 | 代码已修复 | `src/pages/settings/index.tsx`：更新密码按钮 `loading/disabled` | 改密防重 |
| UI-15 | 代码已修复 | `src/pages/settings/index.tsx`：2FA 三按钮统一 `loading/disabled` | 流程态明确 |
| UI-16 | 代码已修复 | `src/pages/settings/index.tsx`：初始化通知按钮 `loading/disabled` | 初始化防重 |
| UI-17 | 代码已修复 | `src/pages/settings/index.tsx`：`togglingNotificationKey` + `Switch loading/disabled` | 开关并发受控 |
| UI-18 | 代码已修复 | `src/components/AppSidebar/index.tsx`：菜单项改为 `Link` | 导航语义修正 |
| UI-19 | 代码已修复 | `src/components/AppSidebar/index.tsx`：激活项 `aria-current="page"` | 读屏可识别当前页 |
| UI-20 | 代码已修复 | `src/pages/settings/index.tsx`：通知 `Switch aria-label` | 开关可读名称已补 |
| UI-21 | 代码已修复 | `src/pages/dashboard/components/TodayCoursePanel.tsx`：无回调时按钮 `disabled` | 去除“可点无动作” |
| UI-22 | 代码已修复（需人工视觉验收） | `src/pages/settings/index.module.css`：`.settingsOverviewTitle` 下调到 `clamp(24px,2.4vw,30px)` | 建议断点截图确认层级 |
| UI-23 | 代码已修复（需人工视觉验收） | `src/pages/courses/index.module.css`：课程标题改为 `clamp(22px,1.6vw,24px)` | 建议与页标题同屏验收 |
| UI-24 | 代码已修复 | `src/pages/forgot-password/index.module.css`：`.title` 31→30 | 与登录页一致 |
| UI-25 | 代码已修复（需人工视觉验收） | `src/pages/bookings/index.module.css`：inactive 按钮背景/边框/文案对比增强 | 建议状态切换比对 |
| UI-26 | 代码已修复（需人工视觉验收） | `src/pages/members/index.module.css`：新增 `@media (max-width:1200px)`，hero 3列→2列 | 平板断点检查 |
| UI-27 | 代码已修复（需人工视觉验收） | `src/pages/bookings/index.module.css`：日期块最小宽度 92→82 | 长标题场景检查 |
| UI-28 | 代码已修复 | `src/styles/global.css`：全局 focus ring 强度 20%→28% | 键盘焦点更醒目 |
| UI-29 | 代码已修复（需人工视觉验收） | `src/pages/settings/index.module.css`：SavedBadge 对比增强 | 建议对比“已保存/未保存” |
| UI-30 | 代码已修复（需人工视觉验收） | `src/pages/courses/index.module.css`：工具栏断点 1200→1320 | 中宽窗口挤压缓解 |
| UI-31 | 代码已修复（需人工视觉验收） | `src/pages/settings/index.module.css`：多处 action 区改为 `justify-content:flex-start` | 阅读路径收口 |
| UI-32 | 代码已修复（需人工视觉验收） | `src/pages/members/index.module.css`：`.transactionAside` 最小宽度提升并分断点配置 | 长文案不易断裂 |
| UI-33 | 代码已修复（需人工视觉验收） | `src/styles/page.module.css` + `src/pages/courses/index.module.css` + `src/pages/settings/index.module.css`：间距 token 化收口 | 跨页节奏需截图确认 |

## 本轮命令验证

- `cmd /c npm run typecheck`：通过
- `cmd /c npm run smoke-test`：11/11 通过
- `cmd /c npm run build`：通过
- 本轮相关文件 `lsp_diagnostics`：无错误

## 视觉证据

- 断点视觉验收报告：`docs/visual-breakpoint-audit-2026-04-29.md`
- 截图目录：`docs/screenshots/visual-audit-2026-04-29-round3/`（36 张）
