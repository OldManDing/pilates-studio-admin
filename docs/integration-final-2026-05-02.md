# 小程序 × 后台 功能联调测试最终汇总（2026-05-02）

## 目标

- 对小程序与后台的主要页面、核心功能和关键业务流程进行真实联调测试
- 完成测试、修复、复测闭环，直到达到可上线标准
- 聚焦接口请求、数据加载与回显、状态流转、边界场景、异常处理与关键链路完整性

## 三轮联调概览

| 轮次 | 文档 | 主要问题数 | 结果 |
|---|---|---:|---|
| Round 1 | `docs/integration-round1-2026-05-02.md` | 2 | 完成首轮联调基线修复与真实闭环验证 |
| Round 2 | `docs/integration-round2-2026-05-02.md` | 5 | 完成会员续费连续性与方案切换规则修复 |
| Round 3 | `docs/integration-round3-2026-05-02.md` | 3 | 完成预约取消边界规则与扣次反馈修复 |

## 关键联调结论

### 1. 反馈闭环
- 小程序提交反馈成功
- 后台通知页可查到 `MINI_PROGRAM_FEEDBACK`
- 后台可将其从 `PENDING` 标记为 `READ`

### 2. 续费闭环
- 小程序续费申请成功
- 后台通知页可查到 `MEMBERSHIP_RENEWAL_REQUEST`
- 后台交易页可查到 `MEMBERSHIP_RENEWAL + PENDING`
- 后台推进交易状态后，小程序会员权益与交易数据回显正确
- 同方案提前续费已支持顺延
- 未到期跨方案续费已被明确拦截

### 3. 预约 / 通知闭环
- 小程序预约成功后可收到 `BOOKING_CONFIRMATION`
- 取消预约后可收到 `BOOKING_CANCELLED`
- 4 小时内超时取消现在会走 `NO_SHOW + 扣次` 规则，而不是免费取消

### 4. 签到 / 扣次闭环
- 后台签到成功后，小程序会员权益只扣减 1 次
- 重复签到不重复扣减

### 5. 数据口径一致性
- 小程序消费总览的“累计消费金额”已改为仅统计已完成交易
- 不再把 `PENDING / PROCESSING` 金额误算为已消费

## 修改文件说明

### 后台
- `smoke-tests/pages/notifications.spec.tsx`
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
- `src/pages/transactions/index.tsx`
- `src/pages/membership-renew/index.tsx`
- `src/pages/help/index.tsx`
- `src/pages/my-bookings/index.tsx`

## 验证结果

### 后台前端
- `npm run typecheck` ✅
- `npm run smoke-test` ✅（11/11）

### 后端
- `backend npm run typecheck` ✅
- `backend npm run test` ✅（24 suites / 144 tests）
- `backend npm run test:e2e` ✅（2/2）
- `backend npm run build` ✅

### 小程序
- `npm run typecheck` ✅
- `npm run test:smoke` ✅
- `npm run build:weapp` ✅
- `npm run test:api` ✅
- `API_SMOKE_MUTATIONS=1 npm run test:api` ✅
- `API_BASE_URL=http://127.0.0.1:3001/api npm run test:api` ✅
- `API_BASE_URL=http://127.0.0.1:3001/api API_SMOKE_MUTATIONS=1 npm run test:api` ✅

### 真实联调验证
- mini 反馈 → admin 通知可见/可处理 ✅
- mini 续费申请 → admin 通知/交易可见 ✅
- admin 推进续费状态 → mini 权益与交易回显正确 ✅
- mini 同方案提前续费顺延 ✅
- mini 未到期跨方案续费被拦截 ✅
- mini 预约 → mini 通知确认 → 取消预约 → mini 通知取消 ✅
- admin 签到 → 扣次一次且不重复扣减 ✅
- 4 小时内取消 → `NO_SHOW + 扣次` ✅

## 验收结论

- P0 已清零
- P1 已按本轮联调范围清零
- 核心功能和关键流程正常
- 前后端数据交互正确
- 未发现阻断操作、严重数据错误、关键接口异常、关键状态缺失问题
- 当前达到本次联调测试任务范围内的可上线标准

## 遗留风险

1. 当前会员模型仍是“单会员 + 单当前计划”结构，虽然已对不安全的未到期跨方案续费做了拦截，但**若未来要支持“多卡并存 / 未来生效权益”**，仍需要独立权益周期模型
2. 通知“一键设为已读”在小程序侧仍是逐条请求，消息量很大时可能受限流影响
3. 我的预约仍采用按状态全量抓取再合并的方式，大数据量下会有性能压力
4. 本轮真实联调主要基于本地数据与本地 API 进程，未覆盖多设备真机矩阵和外部网络波动场景
5. 注销申请虽已形成“提交申请 → admin 可见/可处理”的闭环，但后台处理仍由前端串联多步 API 完成，尚未下沉为单一后端事务动作
6. admin 通知页的“停用账号”动作尚未按真实写权限做前端按钮可见性/禁用控制，权限边界仍建议补强
