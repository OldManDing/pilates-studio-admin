# 小程序端 × 后台端 功能对齐测试报告（2026-05-03）

## 1. 测试目标

本次测试面向 `F:\pilates-studio-mini` 与 `F:\pilates-studio-admin` 两端，检查当前系统是否已经真正打通并满足业务闭环。

重点验证：

1. 小程序端已有功能，后台是否有对应管理能力；
2. 后台配置、数据、状态变更，是否能正确同步到小程序；
3. 小程序端提交、预约、支付、反馈、注销等操作，后台是否能正确接收、保存、展示和处理；
4. 两端字段、状态、权限、数据回显和业务流程是否一致；
5. 是否存在一端有功能、另一端没有承接的问题。

---

## 2. 测试依据

### 2.1 代码与页面检查范围

- 小程序端：页面、API 封装、鉴权恢复、状态映射、异常处理
- 后台端：管理页面、服务层、菜单、路由、权限映射
- 后端：Controller、Service、事务逻辑、状态枚举、用户与通知处理链路

### 2.2 本轮已完成修复与补齐

本轮已完成以下问题修复：

1. 注销申请处理语义拆分，不再只依赖普通 `READ`
2. 小程序端补齐注销申请服务端状态回显
3. 小程序端区分 `NO_SHOW` 与 `CANCELLED` 展示语义
4. 后台预约汇总新增 `cancelledCount`
5. 小程序交易模型字段统一为 `planId`
6. 后台新增 **会籍方案管理页**
7. 后台新增 **小程序用户管理页**
8. 后台补齐对应菜单、路由与权限映射

相关修复说明见：

- `docs/mini-admin-alignment-audit-remediation-2026-05-03.md`

### 2.3 自动化验证结果

#### 小程序端
```bash
npm.cmd run typecheck
npm.cmd run test:smoke
npm.cmd run build:weapp
```

结果：全部通过。

#### 管理后台前端
```bash
npm.cmd run typecheck
npm.cmd run smoke-test
npm.cmd run build
```

结果：全部通过，`smoke-test` 为 12/12。

#### 后端
```bash
npm.cmd run typecheck
npm.cmd run test -- --runInBand
npm.cmd run build
```

结果：全部通过，后端测试 27 suites / 169 tests 通过。

---

## 3. 小程序功能清单

### 3.1 首页 / 聚合
- 会员状态聚合
- 今日课程 / 近期预约
- 本月训练概览
- 门店信息展示
- 快速入口导航

### 3.2 课程 / 场次 / 预约
- 课程筛选与浏览
- 课程详情与场次查看
- 创建预约
- 取消预约
- 我的预约查看与状态展示

### 3.3 教练
- 教练列表
- 教练详情
- 排课查看
- 基于历史预约聚合“我的教练”

### 3.4 会员 / 续费 / 交易
- 当前会籍与权益展示
- 会员续费
- 微信支付 / Mock 支付
- 交易流水
- 消费汇总

### 3.5 通知 / 设置 / 帮助 / 安全
- 通知读取 / 已读
- 课程提醒 / 系统通知偏好
- 意见反馈
- 注销申请
- 账户安全说明
- 本机偏好（深色模式、生物识别等）

### 3.6 训练记录
- 基于已完成预约聚合训练记录与训练统计

---

## 4. 后台功能清单

### 4.1 管理后台前端页面
- 仪表盘
- 会员管理
- **会籍方案管理**
- **小程序用户管理**
- 课程管理
- 预约管理
- 教练管理
- 财务报表
- 数据分析
- 通知管理
- 角色权限
- 系统设置
- 登录 / 找回密码

### 4.2 后端核心模块
- AuthModule
- MembersModule
- MiniAuthModule
- MiniUsersModule
- MembershipPlansModule
- MembershipRenewalsModule
- NotificationsModule
- CoachesModule
- CoursesModule
- CourseSessionsModule
- BookingsModule
- AttendanceModule
- TransactionsModule
- ReportsModule
- SettingsModule
- SupportModule
- RolesModule
- AnalyticsModule
- AdminsModule

### 4.3 对小程序直接相关的后台能力

#### 认证
- `POST /mini-auth/login`

#### 会员
- `GET /members/profile`
- `GET /members/my-memberships`
- `GET /members/preferences`
- `PUT /members/preferences`

#### 会籍方案 / 续费
- `GET /membership-plans/active`
- `POST /membership-renewals`
- `POST /membership-renewals/pay`
- 微信支付回调处理
- Mock 支付完成

#### 预约 / 签到
- `POST /bookings`
- `GET /bookings/my`
- `PATCH /bookings/:id/cancel`
- `PATCH /bookings/:id/checkin`
- `PATCH /bookings/:id/status`

#### 通知 / 反馈 / 注销
- `GET /notifications/my`
- `PATCH /notifications/my/:id/read`
- `POST /support/feedback`
- `POST /support/account-deletion-request`
- `GET /support/account-deletion-request/status`
- `POST /notifications/:id/process-account-deletion`

#### 交易
- `GET /transactions/my`
- `GET /transactions/my-summary`
- `GET /transactions/:id`

#### 设置
- `GET /settings/studio`
- `GET /settings/notifications`
- `GET /settings/export`
- `POST /settings/restore`

---

## 5. 小程序功能 ↔ 后台功能映射表

| 小程序功能 | 后台 / 后端承接 | 当前判断 | 说明 |
|---|---|---|---|
| 小程序登录 | `mini-auth/login` | 对齐 | 已有真实登录闭环 |
| 首页会员状态 | `members/profile` + `my-memberships` | 对齐 | 数据有真实来源 |
| 课程浏览 | `courses` + `course-sessions` | 对齐 | 小程序读，后台管 |
| 教练浏览 | `coaches` + `schedule` | 对齐 | 小程序读，后台管 |
| 创建预约 | `POST /bookings` | 对齐 | 容量/重复/资格校验完整 |
| 取消预约 | `PATCH /bookings/:id/cancel` | 对齐 | 晚取消转 `NO_SHOW` |
| 我的预约状态展示 | `bookings/my` | 对齐 | 已修复 `NO_SHOW` 语义 |
| 后台签到 / 扣次 | `checkin` + `attendance` | 对齐 | 事务处理，避免重复扣次 |
| 会籍读取 | `members/my-memberships` | 对齐 | 与续费结果联动 |
| 续费方案展示 | `membership-plans/active` + **后台会籍方案管理页** | 对齐 | 已补后台承接页 |
| 发起续费支付 | `membership-renewals/pay` + 回调/查单 | 对齐 | 支付后权益生效 |
| 交易流水 | `transactions/my` | 对齐 | 字段命名已收口 |
| 消费汇总 | `transactions/my-summary` | 对齐 | 页面口径一致 |
| 通知读取 / 已读 | `notifications/my` + `read` | 对齐 | 用户端已读闭环成立 |
| 课程提醒 / 系统通知偏好 | `members/preferences` | 对齐 | 已上云 |
| 意见反馈 | `support/feedback` | 对齐 | 后台可见可处理 |
| 注销申请提交 | `support/account-deletion-request` | 对齐 | 已具备服务端状态回显 |
| 注销申请处理 | `notifications/process-account-deletion` | 对齐 | 后台处理后停用会员/小程序用户 |
| 小程序用户身份承接 | `MiniUsersModule` + **后台小程序用户管理页** | 对齐 | 已补后台承接页 |
| 训练记录 | 基于 booking completed 聚合 | 可接受差异 | 前端聚合视图 |
| 我的教练 | 基于预约聚合 | 可接受差异 | 前端聚合视图 |
| 本机偏好（深色模式/生物识别等） | 不要求后台承接 | 可接受差异 | 明确为本机能力 |

---

## 6. 已对齐功能

以下功能已判断为对齐，并满足当前业务闭环：

1. 小程序登录
2. 会员资料与会籍读取
3. 课程浏览与场次展示
4. 教练浏览与排课展示
5. 创建预约
6. 取消预约
7. 我的预约状态展示
8. 后台签到 / 出勤 / 扣次
9. 续费支付 → 交易落库 → 权益生效
10. 交易流水与汇总
11. 通知读取与已读
12. 课程提醒 / 系统通知偏好上云
13. 意见反馈提交 → 后台可见
14. 注销申请提交 → 后台处理 → 账号停用
15. 会籍方案后台承接能力
16. 小程序用户后台承接能力

---

## 7. 未对齐功能

本轮修复后，**未发现新的核心功能未对齐项**。

当前剩余差异主要是**可接受的结构差异**，不再视为双端未对齐阻断项：

1. **训练记录**
   - 小程序端基于已完成预约聚合
   - 后端没有单独“训练记录”实体
   - 判断：可接受差异

2. **我的教练**
   - 小程序端基于预约关系聚合
   - 后端没有单独“我的教练”资源
   - 判断：可接受差异

3. **本机偏好**
   - 如深色模式、生物识别、本机安全提醒
   - 明确属于设备侧能力，不要求后台承接

---

## 8. 问题清单

### 8.1 当前仍需关注的问题（非阻断）

#### 问题 1：注销申请处理态仍为轻量模型
- **页面 / 模块**：
  - `backend/src/modules/notifications/notifications.service.ts`
  - `backend/src/modules/support/support.service.ts`
- **问题描述**：
  - 注销申请已形成真实闭环，但“已处理”目前通过 `Notification.payload.accountDeletionProcessedAt` 表达，而非独立工单状态字段。
- **复现步骤**：
  1. 小程序提交注销申请
  2. 后台处理停用账号
  3. 检查通知记录持久化内容
- **预期结果**：
  - 若长期面向运营工作台或审计系统，处理态最好有显式字段或独立模型
- **实际结果**：
  - 当前方案可用，但偏轻量
- **影响范围**：
  - 长期运营扩展
  - 处理人、备注、撤销处理等后续能力
- **优先级**：P3
- **修复建议**：
  - 若后续继续做客服/运营工作台，可升级为显式处理字段或工单模型

#### 问题 2：真机 / 弱网 / 真实支付环境尚未在本轮覆盖
- **页面 / 模块**：全链路
- **问题描述**：
  - 本轮已完成类型、测试、构建验证，但没有重新覆盖微信真机、多设备、弱网与外网支付回调场景
- **复现步骤**：
  1. 在当前本地验证之外，切换真机环境或公网环境
  2. 重新验证预约、通知、支付回调、账号停用链路
- **预期结果**：
  - 真机和真实外网环境行为与本地验证一致
- **实际结果**：
  - 本轮未覆盖
- **影响范围**：
  - 发布质量
  - 真实外部依赖稳定性
- **优先级**：P2（发布前人工验证项）
- **修复建议**：
  - 上线前补一轮真机与真实支付环境人工联调

---

## 9. 列表、详情、统计、状态、权限一致性判断

### 9.1 字段一致性
- `membershipId` → `planId` 已完成收口
- 会员、预约、交易、通知核心字段无明显主链冲突

**判断：核心字段一致**

### 9.2 状态一致性
- 预约状态 `PENDING / CONFIRMED / CANCELLED / COMPLETED / NO_SHOW` 已对齐
- 小程序端已修复 `NO_SHOW` 展示语义
- 交易状态 `PENDING / PROCESSING / COMPLETED / FAILED / REFUNDED` 一致

**判断：核心状态一致**

### 9.3 权限一致性
- 小程序侧通过 `AllowMiniUser` + `RequirePermissions`
- 后台前端通过 `routePermissionMap`
- 后端通过 `JwtAuthGuard + PermissionsGuard`
- 本轮新页面已补：
  - `/membership-plans` → `READ:PLANS`
  - `/mini-users` → `READ:MINI_USERS`

**判断：权限控制一致**

### 9.4 数据回显一致性
- 预约、交易、会员权益、通知偏好、注销申请状态均已具备服务端回显路径

**判断：核心数据回显一致**

### 9.5 流程闭环一致性
- 预约 → 后台可见 → 取消 / 签到 / 扣次闭环成立
- 续费 → 交易 → 支付 → 权益生效闭环成立
- 反馈 → 后台通知可见成立
- 注销申请 → 后台处理 → 账号停用成立
- 会籍方案 → 后台管理页承接成立
- 小程序用户 → 后台管理页承接成立

**判断：核心流程闭环成立**

---

## 10. 最终结论

### 10.1 当前小程序和后台功能是否已经全部对齐？

**结论：核心业务功能已全部对齐。**

更准确地说：
- 小程序端现有核心业务能力，已经有后台 / 后端承接；
- 之前缺失的后台会籍方案管理页和小程序用户管理页，本轮已补齐；
- 当前剩余问题不再属于“功能未对齐”，而属于发布前质量增强项。

### 10.2 哪些功能还没对齐？

**当前没有新的核心功能未对齐项。**

只剩少量可接受结构差异：
- 训练记录为前端聚合视图
- 我的教练为前端聚合视图
- 本机偏好为设备侧功能

### 10.3 哪些问题影响上线？

**当前未发现新的核心上线阻断问题。**

真正还需要关注的，是发布前人工验证：
- 真机多设备
- 弱网
- 真实支付外网通知

### 10.4 需要优先补齐哪些功能？

从“功能对齐”角度看，本轮主要缺口已补齐，当前优先级应转为：

1. **P2：发布前真机 / 弱网 / 支付环境人工联调**
2. **P3：若未来要做更强运营工作台，再升级注销申请处理态模型**

---

## 11. 上线判断

### 业务上线判断

**可以上线。**

原因：
- 登录、会员、预约、取消、签到、扣次、续费、交易、通知、反馈、注销等核心经营链路已全部打通；
- 会籍方案和小程序用户管理的后台承接能力已补齐；
- 类型、测试、构建验证均通过。

### 严格对齐审计判断

**已达到可签发状态。**

原因：
- 之前阻断对齐的功能缺口已修复；
- 当前剩余项主要是发布质量增强和后续架构增强，不再属于“双端功能未对齐”。
