# 小程序端 × 后台端 功能对齐审计报告（2026-05-02）

## 1. 审计目标

- 梳理小程序端页面、功能、流程
- 梳理后台端前端模块、后端模块、配置与流程
- 建立两端功能映射关系
- 判断两端是否在真实业务上形成闭环，而不仅是“看起来有对应页面/接口”
- 输出未对齐项、风险分级、最小补齐方案与上线判断

## 2. 审计范围与方法

### 2.1 范围

- 小程序端：`F:\pilates-studio-mini`
- 后台端：`F:\pilates-studio-admin`
  - 管理后台前端：`src/pages`, `src/services`
  - 后端：`backend/src/modules`

### 2.2 方法

- 代码级梳理：页面、API 适配层、控制器、服务、状态与权限逻辑
- 文档级梳理：
  - `F:\pilates-studio-mini\docs-func-final-2026-05-02.md`
  - `F:\pilates-studio-admin\docs\integration-final-2026-05-02.md`
- 关注真实闭环：
  - 数据是否落库
  - 状态是否同步
  - admin 是否可见/可处理
  - 小程序结果是否有真实回显
  - 异常处理是否成立

## 3. 小程序功能清单

### 3.1 首页 / 聚合
- 页面：`src/pages/index/index.tsx`
- 功能：
  - 会员状态聚合
  - 今日/近期课程信息
  - 本月训练概览
  - 门店信息展示与地图跳转
- 数据来源：会员资料、会籍、预约、课程、门店设置

### 3.2 课程 / 场次 / 预约
- 页面：
  - `src/pages/courses/index.tsx`
  - `src/pages/course-detail/index.tsx`
  - `src/pages/my-bookings/index.tsx`
- 功能：
  - 课程筛选与浏览
  - 查看课程详情与场次
  - 创建预约
  - 取消预约
  - 按状态查看我的预约

### 3.3 教练
- 页面：
  - `src/pages/coaches/index.tsx`
  - `src/pages/coach-detail/index.tsx`
  - `src/pages/my-coaches/index.tsx`
- 功能：
  - 教练列表与详情
  - 查看排课
  - 基于预约记录聚合“我的教练”

### 3.4 会员 / 续费 / 交易
- 页面：
  - `src/pages/membership/index.tsx`
  - `src/pages/membership-renew/index.tsx`
  - `src/pages/transactions/index.tsx`
- 功能：
  - 当前会籍与权益展示
  - 训练总览
  - 续费申请提交
  - 交易流水与汇总

### 3.5 通知 / 反馈 / 设置
- 页面：
  - `src/pages/notifications/index.tsx`
  - `src/pages/help/index.tsx`
  - `src/pages/settings/index.tsx`
  - `src/pages/account-security/index.tsx`
  - `src/pages/agreement/index.tsx`
  - `src/pages/privacy/index.tsx`
- 功能：
  - 通知列表、已读、全已读
  - FAQ 与反馈提交
  - 本地偏好开关
  - 账户安全展示
  - 修改密码（前端入口存在）
  - 注销申请（前端入口存在）

### 3.6 训练记录
- 页面：`src/pages/training-records/index.tsx`
- 功能：
  - 基于已完成预约聚合训练记录与统计

### 3.7 鉴权与异常恢复
- 核心文件：
  - `src/api/auth.ts`
  - `src/api/request.ts`
  - `src/utils/storage.ts`
- 功能：
  - 自动小程序登录
  - 401 清理本地状态
  - 多页面 `authRequired` 恢复
  - 加载失败/空态/部分失败降级

## 4. 后台功能清单

### 4.1 管理后台前端页面
- 登录 / 找回密码：`src/pages/login`, `src/pages/forgot-password`
- 仪表盘：`src/pages/dashboard`
- 会员管理：`src/pages/members`
- 课程管理：`src/pages/courses`
- 预约管理：`src/pages/bookings`
- 教练管理：`src/pages/coaches`
- 财务管理：`src/pages/finance`
- 数据分析：`src/pages/analytics`
- 通知管理：`src/pages/notifications`
- 角色权限：`src/pages/roles`
- 系统设置：`src/pages/settings`

### 4.2 后端启用模块
来自 `backend/src/app.module.ts`：

- `AuthModule`
- `MembersModule`
- `MiniAuthModule`
- `MiniUsersModule`
- `MembershipPlansModule`
- `MembershipRenewalsModule`
- `NotificationsModule`
- `CoachesModule`
- `CoursesModule`
- `CourseSessionsModule`
- `BookingsModule`
- `AttendanceModule`
- `TransactionsModule`
- `ReportsModule`
- `SettingsModule`
- `SupportModule`
- `RolesModule`
- `AnalyticsModule`

### 4.3 对小程序最相关的后台能力

#### 认证
- `POST /mini-auth/login`
- `POST /auth/login`
- `POST /auth/change-password`（管理员能力）

#### 会员 / 会籍
- `GET /members/profile`
- `GET /members/my-memberships`
- `GET /members`
- `PATCH /members/:id`
- `POST /members/:id/credits`

#### 会籍计划 / 续费
- `GET /membership-plans/active`
- `POST /membership-renewals`

#### 预约 / 签到
- `POST /bookings`
- `GET /bookings/my`
- `PATCH /bookings/:id/cancel`
- `PATCH /bookings/:id/checkin`
- `PATCH /bookings/:id/status`

#### 通知 / 反馈
- `GET /notifications/my`
- `PATCH /notifications/my/:id/read`
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `POST /support/feedback`

#### 交易
- `GET /transactions/my`
- `GET /transactions/my-summary`
- `GET /transactions`
- `PATCH /transactions/:id/status`

#### 设置 / 运维
- `GET /settings/studio`
- `GET /settings/notifications`
- `GET /settings/export`
- `POST /settings/restore`

## 5. 功能映射表

| 小程序功能 | 后台/后端对应能力 | 当前判断 | 说明 |
|---|---|---|---|
| 小程序登录 | `mini-auth/login` | 对齐 | 已有真实登录入口 |
| 会员资料读取 | `members/profile` + admin 会员管理 | 对齐 | mini 读本人，admin 管全局 |
| 会籍读取 | `members/my-memberships` + `membership-plans` | 基本对齐 | 续费顺延规则已联调修复 |
| 续费申请 | `membership-renewals` + admin 通知/财务处理 | 强闭环 | mini 提交 → admin 可见/可推进 |
| 交易流水 | `transactions/my` + admin 财务页 | 对齐 | 两端均消费交易数据 |
| 交易汇总 | `transactions/my-summary` + admin finance summary | 部分对齐 | 页面口径已修正，API 语义仍不完全统一 |
| 课程浏览 | `courses` + `course-sessions` + admin 课程/排期 | 对齐 | mini 读、admin 管 |
| 预约创建 | `POST /bookings` + admin bookings | 强闭环 | 创建后 admin 可见 |
| 预约取消 | `PATCH /bookings/:id/cancel` + admin booking status | 强闭环 | 4 小时规则已闭环 |
| 签到 / 扣次 | admin booking/attendance + backend booking logic | 强闭环 | 已验证一次扣减且不重复 |
| 消息通知查看 / 已读 | `notifications/my` + admin 通知管理 | 基本对齐 | 语义层面仍有差异 |
| 反馈提交 | `support/feedback` + admin 通知处理 | 闭环 | mini 提交 → admin 可处理 |
| 我的教练 | 无后端独立“我的教练”实体 | 可接受差异 | 前端基于预约历史聚合 |
| 训练记录 | 无后端独立“训练记录”实体 | 可接受差异 | 前端基于已完成预约聚合 |
| 修改密码 | 无 mini 用户对应后端能力 | **未对齐** | 前端有入口，后端无闭环 |
| 注销申请 | 无 `members/delete-request` 及 admin 处理流 | **未对齐** | 前端有入口，后端无闭环 |
| 课程提醒/系统通知开关 | 后台仅全局通知模板，无用户级偏好 | **未对齐** | mini 仅本地存储 |
| 生物识别 / 异地登录提醒 | 后台无对应 mini 用户真实能力 | **未对齐/部分对齐** | 仅本地状态，不是服务端安全能力 |

## 6. 未对齐项与查缺补漏清单

## 6.1 P1：小程序修改密码为伪能力
- **所属端**：小程序端 + 后端
- **页面/模块**：
  - `F:\pilates-studio-mini\src\pages\account-security\index.tsx`
  - `F:\pilates-studio-mini\src\api\members.ts`
  - `F:\pilates-studio-admin\backend\src\modules\members\members.controller.ts`
  - `F:\pilates-studio-admin\backend\src\modules\auth\auth.controller.ts`
- **问题描述**：小程序暴露“修改密码”入口，但 mini 用户并没有对应密码模型和后端路由。
- **当前现状**：mini 调 `/members/change-password`；backend 无该路由，仅管理员有 `/auth/change-password`。
- **预期行为**：小程序要么不暴露密码修改，要么提供真实 mini 用户密码体系。
- **影响范围**：账户安全、审计签发、用户信任。
- **修复建议**：
  - 最小方案：下线“修改密码”，改文案为“账号由微信授权管理”。
  - 完整方案：新增 mini 密码体系与后端接口。
- **优先级**：P1

## 6.2 P1：小程序申请注销账户无后端闭环
- **所属端**：小程序端 + 后端 + 后台运营
- **页面/模块**：
  - `F:\pilates-studio-mini\src\pages\settings\index.tsx`
  - `F:\pilates-studio-mini\src\api\members.ts`
  - `F:\pilates-studio-admin\backend\src\modules\members\members.controller.ts`
  - `F:\pilates-studio-admin\backend\src\modules\members\members.service.ts`
- **问题描述**：前端提供“申请注销账户”，但 backend 无 `delete-request` 路由，也无 admin 处理工作流。
- **当前现状**：前端请求 `/members/delete-request`；backend 不存在该接口；现有管理员删除会员逻辑还会被历史记录阻断。
- **预期行为**：应存在真实“注销申请 → 审核/停用/脱敏”闭环，或前端不应承诺此能力。
- **影响范围**：账户设置、合规、用户投诉风险。
- **修复建议**：
  - 最小方案：下线入口，改为“联系客服处理注销”。
  - 完整方案：新增 delete-request 实体、接口、后台处理流。
- **优先级**：P1

## 6.3 P2：用户级通知/安全偏好仅为本地状态
- **所属端**：小程序端 + 后台/后端
- **页面/模块**：
  - `F:\pilates-studio-mini\src\pages\settings\index.tsx`
  - `F:\pilates-studio-mini\src\pages\account-security\index.tsx`
  - `F:\pilates-studio-admin\src\pages\settings\index.tsx`
  - `F:\pilates-studio-admin\backend\src\modules\settings\settings.controller.ts`
- **问题描述**：课程提醒、系统通知、异地登录提醒、部分安全开关只写本地 storage，不影响真实后端推送或安全行为。
- **当前现状**：mini 是本地开关；admin/settings 管的是全局通知模板，不是用户级偏好。
- **预期行为**：要么真实支持 member-level preferences，要么文案明确为“本机偏好”。
- **影响范围**：设置页、消息预期、安全预期。
- **修复建议**：
  - 最小方案：把文案降级为“本机偏好”，隐藏误导性强的开关。
  - 后续方案：补用户级偏好表和接口。
- **优先级**：P2（偏高）

## 6.4 P2：通知状态语义不完全一致
- **所属端**：小程序端 + 后端
- **页面/模块**：
  - `F:\pilates-studio-mini\src\pages\notifications\index.tsx`
  - `F:\pilates-studio-admin\backend\src\modules\notifications\notifications.service.ts`
- **问题描述**：backend 区分 `PENDING / SENT / READ / FAILED`，mini 基本把所有非 `READ` 归成“未读”。
- **当前现状**：mini 只做 `READ`/非 `READ` 两分法。
- **预期行为**：至少区分“未读”与“未送达/失败”，或 backend 不向 mini 暴露这些中间态。
- **影响范围**：通知状态理解、用户消息感知。
- **修复建议**：
  - 最小方案：mini 端细化状态映射，或 backend `findMine` 只返回 `SENT/READ`。
- **优先级**：P2

## 6.5 P2：交易汇总 API 语义仍不完全统一
- **所属端**：小程序端 + 后端
- **页面/模块**：
  - `F:\pilates-studio-mini\src\pages\transactions\index.tsx`
  - `F:\pilates-studio-mini\src\api\transactions.ts`
  - `F:\pilates-studio-admin\backend\src\modules\transactions\transactions.service.ts`
- **问题描述**：小程序页面现在按已完成交易展示“累计消费金额”，但 backend `/transactions/my-summary` 仍是全状态聚合模型。
- **当前现状**：前端已自行纠偏，接口契约仍偏宽。
- **预期行为**：API 含义清晰且与页面展示一致。
- **影响范围**：后续功能复用、统计解释一致性。
- **修复建议**：
  - 最小方案：接口显式返回 `completedRevenue` 字段，或补文档说明。
- **优先级**：P2

## 6.6 P2：审计/联调文档对账户能力结论过乐观
- **所属端**：文档 / 发布流程
- **页面/模块**：
  - `F:\pilates-studio-mini\docs-func-final-2026-05-02.md`
  - `F:\pilates-studio-admin\docs\integration-final-2026-05-02.md`
- **问题描述**：文档中已有“P0/P1 清零、可上线”表述，但代码层面的账户安全/注销并未闭环。
- **当前现状**：文档结论强于代码能力。
- **预期行为**：文档应与真实能力一致。
- **影响范围**：审计签发可信度、团队决策。
- **修复建议**：
  - 最小方案：更新文档，把账户能力标记为未对齐/待补齐。
- **优先级**：P2

## 7. 风险分级总览

### P1
1. 小程序“修改密码”无后端闭环
2. 小程序“申请注销账户”无后端/后台处理闭环

### P2
3. 用户级通知/安全偏好仅为本地状态
4. 通知状态语义不完全一致
5. 交易汇总 API 语义与展示不完全统一
6. 审计文档对账户能力结论偏乐观

### 可接受但需说明的结构性差异
7. `我的教练`、`训练记录` 是基于现有预约/教练数据前端聚合出的视图，不是后端独立资源；当前可接受，但不属于严格一一映射能力。

## 8. 最小补齐方案

### 第一优先级：清 P1

#### 最快上线方案
1. 下线/隐藏 mini“修改密码”入口
2. 下线/隐藏 mini“申请注销账户”入口
3. 在设置/帮助文案中明确：
   - 账号由微信授权管理
   - 注销请联系客服或走人工流程

#### 若坚持保留能力
1. 新增 `delete-request` 数据模型、接口与后台处理流
2. 为 mini 用户建立独立密码/安全体系

### 第二优先级：清 P2 语义错位
1. 把 `课程提醒 / 系统通知 / 异地登录提醒` 文案改为“本机偏好”，或隐藏不真实生效的开关
2. mini 通知页补齐状态映射，避免把 `PENDING/FAILED` 混成普通未读
3. 明确 `/transactions/my-summary` 契约语义，或补 `completedRevenue`
4. 更新审计/联调文档，把账户能力现状写实

### 第三优先级：后续增强
1. 若未来要支持“多卡并存 / 未来生效权益”，需引入独立权益周期模型
2. 若未来要支持真正用户级通知偏好，需要 member-level preference 能力

## 9. 是否达到上线标准

### 9.1 如果只看核心经营链路
以下链路已有较强闭环证据：
- mini 登录
- 会员资料/会籍读取
- 续费申请 → admin 通知/交易处理
- 预约创建/取消
- 通知可见与已读
- 签到扣次

**判断：基本达到上线要求。**

### 9.2 如果看“系统能力全面对齐审计签发”
按本次审计标准，要求不仅要“能跑”，还要“功能对齐、权限对齐、状态闭环、异常处理一致”。

由于当前仍有 **2 个 P1**（修改密码、注销申请），因此：

**判断：尚未达到最终审计签发标准。**

## 10. 最终审计结论

### 审计结论
- 小程序与后台在**核心经营主链**上已大体对齐
- 小程序与后台在**账户安全、账户注销、用户级偏好设置**方面仍未完全对齐
- 当前不应给出“所有功能已全面对齐、P0/P1 已清零”的最终签发结论

### 推荐对外表述
> 当前项目在预约、续费、通知、签到扣次等核心经营链路上已基本形成前后端闭环，但在小程序账户安全、账户注销和用户级偏好设置方面仍存在未对齐项。若以“核心业务先发布”为目标，可在收口或下线相关伪能力后进入上线；若以“系统能力全面对齐”为验收标准，则当前尚未达到最终签发条件。
