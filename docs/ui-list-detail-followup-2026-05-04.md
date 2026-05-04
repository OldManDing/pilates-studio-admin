# UI List / Detail Follow-up - 2026-05-04

## Scope

- `/membership-plans`
- `/bookings`

## Issues Found

| ID | Page | Problem | Status |
| --- | --- | --- | --- |
| UI-LD-001 | 会籍方案列表 | 列表卡片把详情页级别的三段信息都铺开，信息层级偏重，和同类列表卡片不统一 | Fixed |
| UI-LD-002 | 预约列表 | 列表内容过密，和详情页信息重复感强 | Fixed |
| UI-LD-003 | 预约列表 | 预约列表测试断言仍按旧版布局，未覆盖新的摘要卡结构 | Fixed |

## Fixes

### 会籍方案列表

- Changed: `src/pages/membership-plans/index.tsx`
- Changed: `src/pages/membership-plans/index.module.css`
- Result: list row now keeps title/status/code + description + two brief fields only (`分类`, `标价`).
- Detail drawer kept the richer overview and basic-info layout.

### 预约列表

- Changed: `src/pages/bookings/components/BookingListCard.tsx`
- Changed: `src/pages/bookings/index.module.css`
- Result: list row now shows member + status + date summary, plus two brief fields (`课程`, `上课时间`).
- Detail drawer remains the single place for coach/source/booking-code-style details.

### Tests

- Changed: `smoke-tests/pages/membership-plans.spec.tsx`
- Changed: `smoke-tests/pages/bookings.spec.tsx`
- Result: updated list-level assertions to match the simplified cards and keep the no-duplicate-detail check.

## Verification

- `npm.cmd run typecheck` - passed
- `npm.cmd run smoke-test` - passed
- `npm.cmd run build` - passed
- Browser verification at `1440x1000` for both pages - passed

## Remaining Notes

- The repo still contains unrelated pre-existing worktree changes outside this UI pass.
- No unresolved issue remains in the two targeted list/detail flows after this round.
