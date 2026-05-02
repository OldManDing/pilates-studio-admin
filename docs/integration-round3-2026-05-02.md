# 小程序 × 后台 联调测试 Round 3（2026-05-02）

## 目标

- 深测规则边界与异常处理
- 验证 FAQ / 页面承诺是否真的被后端执行

## Round 3 问题清单

| # | 问题 | 位置 | 严重级别 | 结果 |
|---|---|---|---|---|
| 1 | 小程序帮助页写明“课程开始前 4 小时可取消，超过时限扣一次权益”，但后端实际允许开课前 1 小时仍免费取消 | `backend/src/modules/bookings/bookings.service.ts`、`src/pages/help/index.tsx` | P0 | 已修复 |
| 2 | 4 小时内取消后，前端仍统一提示“已取消”，无法反映实际是 `NO_SHOW + 扣次` | `src/pages/my-bookings/index.tsx` | P1 | 已修复 |
| 3 | 后端缺少“late cancel → NO_SHOW + 扣次”单测保护 | `backend/src/modules/bookings/bookings.service.spec.ts` | P1 | 已修复 |

## 本轮修复摘要

- 小程序端在未到期 4 小时内取消预约时，后端不再返回 `CANCELLED`
- 改为统一走 `NO_SHOW` 路径，并对会消耗次数的卡种执行一次扣次
- 小程序取消成功 toast 现在能区分：
  - 正常取消 → `已取消`
  - 超时取消 → `已按规则扣除一次权益`
- 增加单测覆盖“late cancellation”规则，避免后续回归

## 本轮真实联调复测

在 `http://127.0.0.1:3001/api` 上验证：

- 创建 3 小时后开课的测试场次 ✅
- 小程序成功预约该场次 ✅
- 取消操作返回 `NO_SHOW`，不再是 `CANCELLED` ✅
- 会员剩余次数从 `67 → 66`，实际扣减 1 次 ✅

## 本轮修改文件

### 后台
- `backend/src/modules/bookings/bookings.service.ts`
- `backend/src/modules/bookings/bookings.service.spec.ts`

### 小程序
- `src/pages/my-bookings/index.tsx`

## 本轮验证结果

### 后台
- `backend npm run typecheck` ✅
- `backend npm run test` ✅

### 小程序
- `npm run typecheck` ✅

### 真实联调
- 4 小时内取消 → 返回 `NO_SHOW` ✅
- 4 小时内取消 → 权益扣减 1 次 ✅

## 本轮结论

Round 3 已把“预约取消边界规则”从文案承诺提升为真实可执行逻辑，补足了一个会直接影响用户权益与投诉风险的高优先级业务缺口。
