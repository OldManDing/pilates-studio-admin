# Round 1 测试与修复记录

## 测试范围

- 自动化：`lint` / `typecheck` / `smoke-test` / `build`
- 手测：登录后核心页面巡检（dashboard/settings/courses/members/bookings/finance/notifications）
- 键盘可达性专项：侧边账户面板 Tab 焦点流

## 测试结果（原始）

- `npm run lint`：1 条 warning
  - `src/services/courseSessions.ts` 未使用导入 `PaginatedResponse`
- `npm run typecheck`：通过
- `npm run smoke-test`：通过
- `npm run build`：通过

## Bug 列表

| ID | 严重级别 | 标题 | 复现 | 影响 | 状态 |
|---|---|---|---|---|---|
| R1-001 | High | 账户面板关闭时隐藏动作仍可被 Tab 聚焦 | 在 dashboard 连续 Tab，聚焦到 `userCard` 后，下一焦点进入 `accountAction` | 键盘焦点落入不可见区域，形成焦点循环风险 | 已修复 |
| R1-002 | Low | 未使用导入导致 lint 警告 | `npm run lint` 输出 `courseSessions.ts` unused import | 影响代码质量门禁 | 已修复 |

## 修复动作

1. `src/components/AppSidebar/index.tsx`
   - 为账户面板动作按钮增加 `tabIndex={accountOpen ? 0 : -1}`，关闭时移出 Tab 链。
   - 移除多余焦点循环逻辑，避免隐藏项持续可聚焦。

2. `src/services/courseSessions.ts`
   - 删除未使用导入 `PaginatedResponse`。

## 修复后回归

- 键盘焦点复测（Playwright）结果：
  - 聚焦到 `userCard` 后，下一焦点进入主内容按钮（非 `accountAction`）。
  - `hasUnexpectedAccountAction = false`。
- `lint`：通过（无 warning）
- `typecheck`：通过
- `smoke-test`：通过
