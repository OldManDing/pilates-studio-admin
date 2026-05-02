# 小程序 × 后台 联调测试 Round 1（2026-05-02）

## 目标

- 建立当前联调基线
- 优先修复首个阻断门禁问题
- 用真实数据验证“反馈、续费、预约、通知、签到扣次”核心闭环是否基本可用

## Round 1 问题清单

> 本轮以真实发现为准，未为了凑数重复记录同类问题。

| # | 问题 | 位置 | 严重级别 | 结果 |
|---|---|---|---|---|
| 1 | 后台通知页 smoke 用例仍按 `500` 断言接收人分页窗口，已与当前实现 `100` 脱节，导致后台 smoke 直接失败 | `smoke-tests/pages/notifications.spec.tsx` | P0 | 已修复 |
| 2 | 小程序“累计消费金额”把 `PENDING / PROCESSING` 续费单也计入累计消费，造成数据口径失真 | `src/pages/transactions/index.tsx` | P1 | 已修复 |

## 本轮联调通过的关键链路

### 1. 小程序反馈 → 后台通知
- 小程序提交 `/support/feedback` 成功
- 后台 `/notifications?type=MINI_PROGRAM_FEEDBACK` 可查到对应记录
- 后台可将该记录从 `PENDING` 标记为 `READ`

### 2. 小程序续费申请 → 后台通知/交易
- 小程序提交 `/membership-renewals` 成功
- 后台通知列表可查到 `MEMBERSHIP_RENEWAL_REQUEST`
- 后台交易列表可查到 `MEMBERSHIP_RENEWAL + PENDING`

### 3. 后台推进续费状态 → 小程序会员/交易回显
- 后台可将续费交易从 `PENDING → PROCESSING → COMPLETED`
- 小程序 `/members/profile`、`/members/my-memberships`、`/transactions/my-summary` 可看到更新后的权益与交易数据

### 4. 小程序预约 → 通知 → 取消预约 → 通知
- 小程序创建预约成功
- 小程序 `/notifications/my` 可看到 `BOOKING_CONFIRMATION`
- 小程序取消预约成功
- 小程序 `/notifications/my` 可看到 `BOOKING_CANCELLED`

### 5. 后台签到 → 扣次 → 幂等验证
- 后台 `/bookings/:id/checkin` 可完成签到
- 小程序会员剩余次数只扣减 1 次
- 重复签到未出现二次扣减

## 本轮修改文件

### 后台
- `smoke-tests/pages/notifications.spec.tsx`

### 小程序
- `src/pages/transactions/index.tsx`

## 本轮验证结果

### 后台
- `npm run typecheck` ✅
- `npm run smoke-test` ✅（11/11）
- `backend npm run typecheck` ✅
- `backend npm run test:e2e` ✅（2/2）

### 小程序
- `npm run typecheck` ✅
- `npm run test:smoke` ✅
- `npm run build:weapp` ✅
- `npm run test:api` ✅

### 真实联调验证
- mini 登录 → 反馈提交 → admin 通知查询 ✅
- mini 登录 → 续费申请 → admin 通知/交易查询 ✅
- admin 交易状态推进 → mini 权益/交易回显 ✅
- mini 预约 → mini 通知确认 → 取消预约 → mini 通知取消 ✅
- admin 签到 → 扣次一次且重复签到不重复扣减 ✅

## 本轮结论

Round 1 已完成两项真实问题修复，并确认当前系统主闭环具备基本联调可用性。下一轮应重点转向更深的业务规则正确性与口径一致性，例如续费有效期顺延语义、交易统计口径统一、以及更细粒度的状态流转边界。 
