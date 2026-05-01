# Round 8 UI 测试记录（2026-04-30）

## 测试范围

- 重点：课程管理 / 教练管理详情页（抽屉打开态）
- 页面：`/courses`、`/coaches`
- 断点：desktop（1366）+ mobile（390）
- 指标：详情区拥挤/重叠、横向溢出、抽屉内容可见性

## 结果摘要

- 状态：完成
- 发现问题数：2
- 已修复：2

## Bug 列表

| ID | 严重级别 | 页面/模块 | 问题 | 复现步骤 | 状态 |
|---|---|---|---|---|---|
| R8-001 | High | 教练管理详情 `/coaches` | 教练详情抽屉中元信息/统计网格在固定宽度抽屉内密排，影响可读性（Oracle 评估为 blocker） | desktop 打开“查看详情”，观察“教练档案/教练概览”卡片区 | 已修复 |
| R8-002 | Medium | 课程管理详情 `/courses` | 课程详情第一张统计卡片（授课教练）在抽屉中宽度过窄，视觉失衡 | 打开“私教体态评估”详情，观察第一张统计卡片宽度与文本布局 | 已修复 |

## 修复动作

- `src/pages/coaches/index.module.css`
  - `coachProfileMetaGrid`：从 3 列改为 1 列。
  - `coachStatGrid`：从 3 列改为 1 列。
- `src/pages/coaches/index.tsx`
  - 详情抽屉接入 `rootClassName={pageCls.responsiveDetailDrawer}`，统一响应式抽屉宽度约束。
- `src/pages/courses/components/CourseDetailOverviewCard.tsx`
  - 课程详情统计区改为课程专用网格类，第一张“授课教练”卡片独占整行。
- `src/pages/courses/index.module.css`
  - 新增 `courseOverviewStatGrid` 与 `courseOverviewPrimaryStat`。
  - 新增 `courseOverviewCoachValue` 可读性样式（稳定字号与换行策略）。

## 回归结果

- `coaches` 详情抽屉复测：
  - desktop：重叠与密排问题消除，信息卡改为单列后可读性稳定。
  - mobile：可读性良好，无重叠。
- `courses` 详情抽屉复测：
  - desktop：第一张“授课教练”卡片宽度由约 `116px` 提升至约 `375px`，文本完整无拥挤。
  - mobile：统计区单列，第一张卡片可读无重叠。
- `courses` 详情抽屉复测：
  - desktop/mobile 均未发现新增重叠或溢出。
- 自动化门禁：
  - `npm run lint` 通过
  - `npm run typecheck` 通过
  - `npm run smoke-test` 通过（11/11）
  - `npm run build` 通过

## 待补充

- Oracle Round8 复审结论：
  - `coaches` 详情在修复前存在 blocker（480px 抽屉内网格密排）。
  - 本轮已补齐抽屉响应式 wrapper 并将详情网格改为单列，复审通过（无新增 blocker）。

## Round8 收口（详情页专项终审）

- Oracle 终审范围：`bookings` 与 `roles` 详情页 3 个历史 High。
- 终审结论：**High/Blocker 残留 = 0**。
- 关键锚点：
  - `src/pages/bookings/index.module.css`：`bookingDetailStatGrid` 为单列。
  - `src/pages/roles/index.tsx`：权限抽屉/详情抽屉接入 `responsiveDetailDrawer`。
  - `src/pages/roles/index.module.css`：`roleDetailStatGrid` 为单列。
- 本轮追加验证：
  - `npm run typecheck` 通过
  - `npm run smoke-test` 通过（11/11）
