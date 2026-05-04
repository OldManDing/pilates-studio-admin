# 小程序端 × 后台端 功能对齐修复报告（2026-05-03）

## 1. 目标

基于上一轮双端功能对齐审计，对已确认的 P1 / P2 问题做最小范围修复，并给出修复后的验证结果与上线判断。

本轮只覆盖以下 5 项已确认问题：

1. 注销申请处理语义混用（`READ` 同时表示已读与已处理）
2. 小程序端注销申请缺少服务端状态回显
3. 小程序端 `NO_SHOW` 与 `CANCELLED` 展示语义混用
4. 后台预约汇总缺少 `cancelledCount`
5. 小程序交易模型 `membershipId` 命名漂移

---

## 2. 修复摘要

### 2.1 已完成修复

#### A. 注销申请处理语义拆分
- **问题**：后台原实现把注销申请处理结果直接写成 `NotificationStatus.READ`，导致“已读”和“已处理”语义混用。
- **修复方式**：
  - 保持现有 `Notification` 工作流不变；
  - 不新增数据表、不扩 Prisma 枚举；
  - 在 `Notification.payload` 中持久化 `accountDeletionProcessedAt`，作为“已处理注销申请”的专用标记；
  - `processAccountDeletionRequest()` 继续完成 `Member -> SUSPENDED`、`MiniUser -> DISABLED`，同时写入该处理标记；
  - `markAsRead()` 禁止直接把 `ACCOUNT_DELETION_REQUEST` 当普通已读处理。
- **结果**：注销申请不再只依赖普通 `READ` 语义判断是否已处理。

#### B. 小程序端注销申请状态回显补齐
- **问题**：设置页原先只靠本地 `deletionRequested`，刷新或换设备后状态会丢失。
- **修复方式**：
  - 后端新增 `GET /support/account-deletion-request/status`；
  - 返回当前小程序用户最近一条注销申请状态：`no_request / pending / processed`，并带 `requestId / notificationStatus / requestedAt / processedAt / updatedAt`；
  - 小程序设置页初始化时主动同步该状态，登录后也会刷新；
  - 用户提交成功后仍保留当前乐观更新体验。
- **结果**：注销申请状态以服务端为准，可跨刷新、跨设备回显。

#### C. 小程序端 `NO_SHOW` / `CANCELLED` 语义区分
- **问题**：我的预约页虽然把 `NO_SHOW` 拉进“已取消”页签，但卡片/详情文案都显示成“已取消”。
- **修复方式**：
  - 保留现有三标签结构不变；
  - 在“已取消”标签内区分真实状态：
    - `CANCELLED` → `已取消`
    - `NO_SHOW` → `未到场（已扣次）`
  - 详情弹窗与列表 meta 一并同步区分。
- **结果**：前端展示不再误导 `NO_SHOW` 为普通取消。

#### D. 后台预约汇总补齐 `cancelledCount`
- **问题**：后台预约 summary 只返回 `pending / confirmed / completed / noShow`，没有 `cancelledCount`。
- **修复方式**：
  - 后端 `BookingsService.getSummary()` 新增 `BookingStatus.CANCELLED` 统计；
  - 前端 `BookingSummary` 类型同步扩展；
  - 预约管理页在现有统计卡片 hint 中显示“已确认 · 已取消”。
- **结果**：后台汇总与列表过滤口径更一致。

#### E. 小程序交易类型命名收口
- **问题**：小程序 `Transaction` 类型残留 `membershipId`，后台/后端真实语义为 `planId`。
- **修复方式**：将 `src/api/transactions.ts` 中的旧字段名改为 `planId`。
- **结果**：前后端领域命名一致性提升。

---

## 3. 变更文件

### 3.1 后端 / 管理端

- `F:\pilates-studio-admin\backend\src\modules\notifications\notifications.service.ts`
- `F:\pilates-studio-admin\backend\src\modules\support\support.service.ts`
- `F:\pilates-studio-admin\backend\src\modules\support\support.controller.ts`
- `F:\pilates-studio-admin\backend\src\modules\bookings\bookings.service.ts`
- `F:\pilates-studio-admin\backend\src\modules\notifications\notifications.service.spec.ts`
- `F:\pilates-studio-admin\backend\src\modules\support\support.service.spec.ts`
- `F:\pilates-studio-admin\src\services\notifications.ts`
- `F:\pilates-studio-admin\src\services\bookings.ts`
- `F:\pilates-studio-admin\src\pages\notifications\index.tsx`
- `F:\pilates-studio-admin\src\pages\bookings\index.tsx`

### 3.2 小程序端

- `F:\pilates-studio-mini\src\api\support.ts`
- `F:\pilates-studio-mini\src\api\transactions.ts`
- `F:\pilates-studio-mini\src\pages\settings\index.tsx`
- `F:\pilates-studio-mini\src\pages\my-bookings\index.tsx`
- `F:\pilates-studio-mini\src\pages\my-bookings\index.scss`

---

## 4. 验证结果

### 4.1 语言服务诊断

已对关键改动文件和后端源码目录执行 LSP 诊断，结果均为 **No diagnostics found**。

### 4.2 实际执行的验证命令

#### 小程序端
```bash
npm.cmd run typecheck
npm.cmd run test:smoke
npm.cmd run build:weapp
```

结果：
- `typecheck` 通过
- `test:smoke` 通过
- `build:weapp` 通过

#### 管理后台前端
```bash
npm.cmd run typecheck
npm.cmd run smoke-test
npm.cmd run build
```

结果：
- `typecheck` 通过
- `smoke-test` 通过（11/11）
- `build` 通过

#### 后端
```bash
npm.cmd run typecheck
npm.cmd run test -- --runInBand
npm.cmd run build
```

结果：
- `typecheck` 通过
- `test` 通过（27 suites / 169 tests）
- `build` 通过

---

## 5. 修复后的对齐判断

### 5.1 已闭环项

修复后，以下问题已不再视为阻断对齐项：

1. **注销申请处理语义**：已不再只依赖普通 `READ`
2. **小程序注销申请状态回显**：已具备服务端读取能力
3. **`NO_SHOW` / `CANCELLED` 展示混淆**：已在小程序端区分
4. **后台预约汇总缺 `cancelledCount`**：已补齐
5. **交易模型命名漂移**：已统一为 `planId`

### 5.2 剩余风险

本轮修复后，剩余风险主要不再是“功能未对齐”，而是发布质量层面的增强项：

1. **注销申请处理标记目前落在 `Notification.payload`**
   - 优点：避免引入新表与 schema 级联影响
   - 风险：若未来对“运营处理态”要求更高（处理人、处理备注、撤销处理），仍建议后续升级为独立显式字段或工单模型

2. **小程序注销状态查询仍是轻量接口**
   - 当前足够支撑“未申请 / 待处理 / 已处理”回显
   - 若未来要支持更复杂流程（驳回、撤回、人工留言），还需要扩展状态机

3. **本轮未做真机多设备联调**
   - 已完成类型、测试、构建验证
   - 但未覆盖微信真机、弱网、真实支付外网通知等运行态环境

---

## 6. 修复后的上线判断

### 6.1 核心业务先上线标准

**判断：可上线。**

原因：
- 预约 / 取消 / 签到 / 扣次 / 续费 / 通知 / 反馈 / 注销申请等核心经营链路均已有真实闭环；
- 本轮 P1 / P2 已确认问题已完成补齐；
- 类型、测试、构建均已通过。

### 6.2 严格审计签发标准

**判断：已基本达到可签发状态。**

原因：
- 原先阻断签发的几项问题（注销状态语义、用户端状态回显、`NO_SHOW` 语义偏差、后台取消统计缺失）已完成修复；
- 当前剩余问题属于架构增强和发布质量增强，不再属于“双端功能未对齐”阻断项。

---

## 7. 建议的发布前人工复核

在已有自动验证基础上，建议上线前再做 3 条人工链路确认：

1. **注销申请链路**
   - 小程序提交注销申请
   - 刷新设置页，状态仍正确回显
   - 后台处理后，小程序再次进入状态更新正确

2. **晚取消链路**
   - 课程开始前 4 小时内取消
   - 小程序列表展示“未到场（已扣次）”而不是“已取消”

3. **续费链路**
   - 支付完成后
   - 会员权益、交易状态、后台可见记录同步正确

---

## 8. 结论

本轮修复后，上一版审计报告中列出的已确认 P1 / P2 双端对齐问题已全部完成最小补齐，并通过类型检查、测试与构建验证。

**最新结论：**

- 以当前项目能力边界为准，**双端功能对齐已达到可上线、可签发状态**；
- 后续需要关注的重点，已从“功能未对齐”转移为“真机验证、弱网、真实支付环境与规模化质量增强”。
