# 小程序 × 后台 联调测试 Round 2（2026-05-02）

## 目标

- 从“链路可用”继续深入到“业务规则是否正确”
- 重点验证会员续费连续性、方案切换边界和权益顺延语义

## Round 2 问题清单

| # | 问题 | 位置 | 严重级别 | 结果 |
|---|---|---|---|---|
| 1 | 小程序承诺“提前续费不影响当前有效期，新周期自动顺延”，但后端续费完成时直接重置 `member.joinedAt`，会缩短当前有效期 | `backend/src/modules/transactions/transactions.service.ts`、`backend/src/modules/members/members.service.ts`、`backend/src/modules/bookings/bookings.service.ts`、`src/pages/membership-renew/index.tsx`、`src/pages/help/index.tsx` | P0 | 已修复 |
| 2 | 未到期跨方案续费在当前单会员单计划模型下会立即切换权益，存在数据与权益语义失真 | `backend/src/modules/membership-renewals/membership-renewals.service.ts`、`backend/src/modules/transactions/transactions.service.ts` | P1 | 已修复（改为明确拦截） |
| 3 | 会员有效期的前后端计算口径未把已完成续费笔数叠加进去，导致会员页、预约校验、到期统计不一致 | `backend/src/modules/members/members.service.ts`、`backend/src/modules/bookings/bookings.service.ts`、`backend/src/modules/reports/reports.service.ts` | P1 | 已修复 |
| 4 | 续费连续性缺少单测保护，容易回归 | `backend/src/modules/transactions/transactions.service.spec.ts` | P1 | 已修复 |
| 5 | 小程序续费页/帮助页文案对当前支持范围承诺过宽，和实际可安全支持的行为不一致 | `src/pages/membership-renew/index.tsx`、`src/pages/help/index.tsx` | P1 | 已修复 |

## 本轮修复摘要

- 后端新增“**未到期仅支持同方案续费**”校验，拦住当前模型无法安全表达的跨方案提前切换
- 同方案续费完成后，不再重置 `joinedAt`，而是通过“已完成续费笔数 × 周期天数”统一扩展有效期
- 同步修正：
  - 小程序会员接口 `my-memberships`
  - 预约可用性校验
  - 即将到期统计
- 新增续费连续性测试，覆盖：
  - 同方案续费保持 `joinedAt`
  - 未到期跨方案续费被拒绝
- 小程序文案改为与当前支持范围一致：未到期时仅支持同方案顺延

## 本轮真实联调复测

在新启动的后端进程 `http://127.0.0.1:3001/api` 上验证：

- 同方案续费完成后，会员 `endDate` **顺延 120 天** ✅
- 同方案续费后，剩余次数从 `55 → 67`，新增权益正确叠加 ✅
- 未到期跨方案续费返回 `400`，错误为：`Current membership has not expired; only same-plan renewal is supported` ✅
- `npm run test:api`（指向 3001）✅
- `API_SMOKE_MUTATIONS=1 npm run test:api`（指向 3001）✅

## 本轮修改文件

### 后台
- `backend/src/modules/membership-renewals/membership-renewals.service.ts`
- `backend/src/modules/transactions/transactions.service.ts`
- `backend/src/modules/members/members.service.ts`
- `backend/src/modules/bookings/bookings.service.ts`
- `backend/src/modules/reports/reports.service.ts`
- `backend/src/modules/transactions/transactions.service.spec.ts`
- `backend/src/modules/bookings/bookings.service.spec.ts`
- `backend/src/modules/members/members.service.spec.ts`
- `backend/src/modules/reports/reports.service.spec.ts`
- `backend/test/auth-member-booking.e2e-spec.ts`

### 小程序
- `src/pages/membership-renew/index.tsx`
- `src/pages/help/index.tsx`

## 本轮验证结果

### 后台
- `backend npm run typecheck` ✅
- `backend npm run test` ✅（24 suites / 144 tests）
- `backend npm run test:e2e` ✅（2/2）

### 小程序
- `npm run typecheck` ✅
- `API_BASE_URL=http://127.0.0.1:3001/api npm run test:api` ✅
- `API_BASE_URL=http://127.0.0.1:3001/api API_SMOKE_MUTATIONS=1 npm run test:api` ✅

## 本轮结论

Round 2 已修复会员续费链路中的高严重度业务错误，当前系统在“不改库表”的前提下，已经对“同方案提前续费顺延”给出正确行为，并对不安全的“未到期跨方案切换”做了明确收口。
