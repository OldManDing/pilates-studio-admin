# Round 11 UI/功能测试记录（2026-05-01）

## 测试范围

- 目标：第 3 轮全量回归（Round3）
- 范围：前后端一致性、ID 契约、备份恢复语义、会话安全、出勤与预约状态一致性
- 方法：深度代码审计（只读）+ 自动化门禁回归

## 结果摘要

- 状态：完成（第 3 轮）
- 发现问题数：22
- 严重级别分布：Critical 4 / Major 16 / Minor 2
- 当前修复进度：已修复 22 / 22

## Bug 列表（Round 11 - 22 项）

| ID | 严重级别 | 问题 | 锚点 | 状态 |
|---|---|---|---|---|
| R11-001 | Major | 预约“今天/明天/本周”日期范围存在 +1 天偏移 | `src/pages/bookings/index.tsx` | 已修复 |
| R11-002 | Major | 预约创建会员候选仅第一页（500） | `src/pages/bookings/index.tsx` | 已修复 |
| R11-003 | Major | 财务列表口径（12个月）与汇总口径（全量）不一致 | `src/pages/finance/index.tsx` | 已修复 |
| R11-004 | Major | 设置页“导出备份”与“导出数据”共用范围语义，易误判全量备份 | `src/pages/settings/index.tsx` | 已修复 |
| R11-005 | Major | 通知页 miniUser 候选数据结构处理错误风险 | `src/pages/notifications/index.tsx` `src/services/miniUsers.ts` | 已修复 |
| R11-006 | Major | 通知创建 DTO 对 cuid 错用 UUID 校验 | `backend/src/modules/notifications/dto/create-notification.dto.ts` | 已修复 |
| R11-007 | Major | 通知查询 DTO 对 cuid 错用 UUID 校验 | `backend/src/modules/notifications/dto/query-notification.dto.ts` | 已修复 |
| R11-008 | Major | 交易创建 DTO 对 memberId/planId 错用 UUID 校验 | `backend/src/modules/transactions/dto/create-transaction.dto.ts` | 已修复 |
| R11-009 | Major | mini-user 绑定 memberId 错用 UUID 校验 | `backend/src/modules/mini-users/dto/create-mini-user.dto.ts` | 已修复 |
| R11-010 | Major | 周期卡会籍在小程序活跃判断中被误判失效 | `backend/src/modules/members/members.service.ts` | 已修复 |
| R11-011 | Major | 周期卡会员预约/签到可用性校验不合理 | `backend/src/modules/bookings/bookings.service.ts` | 已修复 |
| R11-012 | Critical | Attendance 与 Booking 状态链路不一致（签到/扣课） | `backend/src/modules/attendance/attendance.service.ts` `backend/src/modules/bookings/bookings.service.ts` | 已修复 |
| R11-013 | Major | Attendance 对 NO_SHOW 预约仍可签到 | `backend/src/modules/attendance/attendance.service.ts` | 已修复 |
| R11-014 | Major | Attendance 完成后不回写 booking 状态 | `backend/src/modules/attendance/attendance.service.ts` | 已修复 |
| R11-015 | Major | 改密后 refresh token 不吊销 | `backend/src/modules/auth/auth.service.ts` | 已修复 |
| R11-016 | Major | 管理员重置密码后会话不吊销 | `backend/src/modules/admins/admins.service.ts` | 已修复 |
| R11-017 | Major | 2FA backup code 仅展示不存储、不校验 | `backend/src/modules/auth/auth.service.ts` | 已修复 |
| R11-018 | Major | refresh token DB 过期策略与配置可能漂移 | `backend/src/modules/auth/auth.service.ts` | 已修复 |
| R11-019 | Major | 导出 API 默认范围语义与文件名“全部”不一致 | `backend/src/modules/settings/settings.controller.ts` `backend/src/modules/settings/settings.service.ts` | 已修复 |
| R11-020 | Critical | 近窗导出会切断 plan 依赖链（历史 plan 被截断） | `backend/src/modules/settings/settings.service.ts` | 已修复 |
| R11-021 | Critical | 近窗导出会切断 course/session/coach 依赖链 | `backend/src/modules/settings/settings.service.ts` | 已修复 |
| R11-022 | Critical | 备份恢复未覆盖关键配置与业务对象全量（settings/roles/miniUsers/attendance/reviews） | `backend/src/modules/settings/settings.service.ts` | 已修复 |

## 已完成修复（本轮）

- 预约日期边界修正：`src/pages/bookings/index.tsx`
- ID 契约修正（cuid vs UUID）：
  - `backend/src/modules/notifications/dto/create-notification.dto.ts`
  - `backend/src/modules/notifications/dto/query-notification.dto.ts`
  - `backend/src/modules/transactions/dto/create-transaction.dto.ts`
  - `backend/src/modules/mini-users/dto/create-mini-user.dto.ts`
- 设置导出默认语义修正：`backend/src/modules/settings/settings.service.ts`
- 预约成员候选分页补全：`src/pages/bookings/index.tsx`
- 财务口径统一（列表/汇总一致）：`src/pages/finance/index.tsx`
- 导出备份与导出数据语义拆分：`src/pages/settings/index.tsx`
- miniUser 候选数据结构容错：`src/pages/notifications/index.tsx`
- 周期卡规则修正：
  - `backend/src/modules/members/members.service.ts`
  - `backend/src/modules/bookings/bookings.service.ts`
- 2FA/会话安全修正：
  - `backend/src/modules/auth/auth.service.ts`
  - `backend/src/modules/admins/admins.service.ts`
  - `backend/src/modules/attendance/attendance.service.ts`
- 备份恢复覆盖面扩展：`backend/src/modules/settings/settings.service.ts`

## 本轮回归结果

- `npm run lint` 通过
- `npm run typecheck` 通过
- `npm run smoke-test` 通过（11/11）
- `backend npm run test` 通过（24 suites / 141 tests）
- `backend npm run test:e2e` 通过（2/2）
