# Round 9 UI/功能测试记录（2026-05-01）

## 测试范围

- 目标：后台功能全量巡检（第 1 轮）
- 页面：`/dashboard`、`/members`、`/courses`、`/bookings`、`/coaches`、`/finance`、`/analytics`、`/notifications`、`/roles`、`/settings`
- 维度：功能链路、前后端契约一致性、权限边界、异步与并发、导入导出、移动端兼容
- 方法：实机巡检（Playwright）+ 代码级深审（Oracle）+ 自动化门禁回归

## 结果摘要

- 状态：完成（第 1 轮）
- 发现问题数：24
- 严重级别分布：Critical 2 / Major 22
- 当前状态：已修复 24 / 24，第 1 轮收口完成

## Bug 列表（Round 9 - 24 项）

| ID | 严重级别 | 页面/模块 | 问题 | 复现步骤 | 证据锚点 | 状态 |
|---|---|---|---|---|---|---|
| R9-001 | Critical | 设置 `/settings` | 数据恢复上传无法提交真实文件（FormData 被 JSON 化） | 设置 → 数据恢复 → 上传备份 | `src/services/settings.ts` + `src/utils/request.ts` | 已修复 |
| R9-002 | Critical | 预约后端 | mini-user 可直接调用签到接口完成签到，存在业务越权 | mini token 调 `PATCH /bookings/:id/checkin` | `backend/src/modules/bookings/bookings.controller.ts` | 已修复 |
| R9-003 | Major | 鉴权会话 | 前端无 refresh token 自动续期流程，access token 过期即被强制登出 | 登录后长时间停留再操作 | `src/services/auth.ts` + `src/utils/request.ts` | 已修复 |
| R9-004 | Major | 退出登录 | 前端退出仅清本地 token，未调用后端 logout 撤销 refresh token | 点击“退出当前账号” | `src/components/AppSidebar/index.tsx` + `backend/src/modules/auth/auth.controller.ts` | 已修复 |
| R9-005 | Major | 前端权限 | 页面权限裁剪仅覆盖 `/roles`，其它受限页仍可见 | 非 OWNER 登录后侧栏与路由访问 | `src/layouts/index.tsx` + `src/utils/menu.tsx` | 已修复 |
| R9-006 | Major | 角色权限 | 非 OWNER 即使具备角色权限也被前端硬拦截无法访问角色页 | 授权后访问 `/roles` | `src/layouts/index.tsx` + `backend/src/modules/roles/roles.controller.ts` | 已修复 |
| R9-007 | Major | 会员创建 | 新建会员时“会籍状态”字段实际无效，后端强制 ACTIVE | 新增会员选择非 ACTIVE 状态 | `src/pages/members/index.tsx` + `backend/src/modules/members/dto/create-member.dto.ts` | 已修复 |
| R9-008 | Major | 会员创建 | 新建会员“剩余课时”字段名不一致（前端 `remainingCredits`，后端 `initialCredits`） | 新增会员填写剩余课时 | `src/pages/members/index.tsx` + `backend/src/modules/members/dto/create-member.dto.ts` | 已修复 |
| R9-009 | Major | 会员删除 | 删除有历史关联数据的会员缺少前置依赖校验，易触发数据库约束失败 | 删除有预约/交易历史会员 | `backend/src/modules/members/members.service.ts` + `backend/prisma/schema.prisma` | 已修复 |
| R9-010 | Major | 课程创建 | 课程去重逻辑校验字段错误（按 courseCode 检查 name） | 创建同名课程两次 | `backend/src/modules/courses/courses.service.ts` | 已修复 |
| R9-011 | Major | 课程删除 | 删除课程只检查未来有限 session，历史关联导致误判可删 | 删除有历史排课课程 | `backend/src/modules/courses/courses.service.ts` + `backend/prisma/schema.prisma` | 已修复 |
| R9-012 | Major | 预约筛选 | “今天/明天/本周”筛选按 bookedAt 而非 startsAt，语义错误 | 今天预约明天课后筛选“明天” | `src/pages/bookings/index.tsx` + `backend/src/modules/bookings/bookings.service.ts` | 已修复 |
| R9-013 | Major | 预约统计 | 预约顶部统计只基于前 100 条记录，数据量大时少算 | 匹配预约 >100 时查看统计 | `src/pages/bookings/index.tsx` | 已修复 |
| R9-014 | Major | 预约创建 | 新增预约可选“状态”但创建请求未提交该字段 | 新增预约时选状态保存 | `src/pages/bookings/index.tsx` | 已修复 |
| R9-015 | Major | 预约创建 | 新增预约 session 下拉默认只取前 10 个 upcoming 排班 | 排班数 >10 时新增预约 | `src/services/courseSessions.ts` + `backend/src/modules/course-sessions/course-sessions.service.ts` | 已修复 |
| R9-016 | Major | 设置权限边界 | `GET /settings/studio` 允许 mini-user 访问，后台设置暴露过宽 | mini token 访问设置接口 | `backend/src/modules/settings/settings.controller.ts` + `backend/src/common/guards/permissions.guard.ts` | 已修复 |
| R9-017 | Major | 教练删除 | 删除教练缺少依赖校验，有课程/排班时易失败 | 删除已被课程使用的教练 | `backend/src/modules/coaches/coaches.service.ts` + `backend/prisma/schema.prisma` | 已修复 |
| R9-018 | Major | 交易创建 | 新增交易状态字段无效，后端固定写 PENDING | 新增交易选择非 PENDING | `src/pages/finance/index.tsx` + `backend/src/modules/transactions/transactions.service.ts` | 已修复 |
| R9-019 | Major | 财务关联会员 | 财务页会员下拉只加载前 100 人，后续会员无法选择 | 会员总量 >100 时新增交易 | `src/pages/finance/index.tsx` | 已修复 |
| R9-020 | Major | 通知渠道 | 前端可配置 SMS，但后端无 SMS 投递适配器 | 通知渠道选 SMS 发送 | `src/pages/notifications/index.tsx` + `backend/src/modules/notifications/notification-delivery.service.ts` | 已修复 |
| R9-021 | Major | 通知渠道/对象 | 前端允许给 admin/miniUser 发 EMAIL，但后端仅从 member.email 取地址 | 收件人选 admin/miniUser + EMAIL | `src/pages/notifications/index.tsx` + `backend/src/modules/notifications/notification-delivery.service.ts` | 已修复 |
| R9-022 | Major | 通知调度 | 同会员同日多节课提醒去重条件过宽，后续提醒被吞 | 同会员同日多预约进入提醒窗口 | `backend/src/modules/notifications/notifications.scheduler.ts` | 已修复 |
| R9-023 | Major | Dashboard 性能 | 仪表盘加载会分页拉取全量预约后前端聚合，数据大时首屏变慢 | 预约历史大量增长后打开首页 | `src/pages/dashboard/index.tsx` | 已修复 |
| R9-024 | Major | 导出错误处理 | blob 下载分支不校验错误体，失败时可能下载到错误 JSON 文件 | token 失效时点击导出 | `src/utils/request.ts` + `src/services/settings.ts` | 已修复 |

## 本轮验证记录

- 自动化脚本：
  - `npm run smoke-test`（前端）通过（11/11）
  - `npm run test`（后端）通过（140/140）
  - `npm run test:e2e`（后端）通过（2/2）
- 实机巡检：desktop（1366）/ mobile（390）全路由打开与详情动作检查已执行。

## 修复进展（当前批次）

- 已完成：
  - `src/utils/request.ts`
    - 通用请求层支持 `FormData` 原样透传（不再被 `JSON.stringify`）。
    - `blob`/`json` 请求统一增加 `response.ok` 校验，401/HTTP 错误可被正确识别。
  - `src/services/settings.ts`
    - 数据恢复移除手写 `multipart/form-data` 头，交由浏览器自动注入 boundary。
  - `src/components/AppSidebar/index.tsx`
    - 退出登录先调用后端 `authApi.logout()`，再清理本地 token。
  - `backend/src/modules/bookings/bookings.service.ts`
    - 预约列表日期筛选从 `bookedAt` 切换为 `session.startsAt`，与页面“今天/明天/本周”语义一致。
  - `backend/src/modules/bookings/dto/create-booking.dto.ts` + `src/pages/bookings/index.tsx`
    - 新增预约支持提交并落库 `status` 字段，不再出现“可选但无效”。
  - `backend/src/modules/bookings/bookings.controller.ts`
    - `checkin` 接口移除 `@AllowMiniUser()`，关闭 mini-user 直签越权入口。
  - `backend/src/modules/settings/settings.controller.ts`
    - `GET /settings/studio` 移除 `@AllowMiniUser()`，收紧后台设置读取权限。
  - `backend/src/modules/members/dto/create-member.dto.ts` + `backend/src/modules/members/members.service.ts`
    - 会员创建支持 `status` 与 `remainingCredits`，兼容现有前端表单字段。
  - `backend/src/modules/transactions/dto/create-transaction.dto.ts` + `backend/src/modules/transactions/transactions.service.ts`
    - 交易创建支持提交状态字段，不再固定写死 `PENDING`。
  - `src/services/courseSessions.ts`
    - `getUpcoming` 上调 `pageSize` 到 100，缓解新增预约排班选项被截断。
  - `src/pages/finance/index.tsx`
    - 财务页会员预加载上限从 100 提升到 500。
  - `src/pages/notifications/index.tsx`
    - 新建通知渠道按接收对象动态收敛：去掉 SMS；admin 仅站内，miniUser 仅站内/小程序。
  - `src/layouts/index.tsx` + `src/components/AppSidebar/index.tsx`
    - 移除基于 `OWNER` 的前端硬编码路由/菜单拦截，权限判断回归后端能力边界。
- 本批次验证：
  - `npm run typecheck` 通过
  - `npm run smoke-test` 通过（11/11）
  - `backend npm run test` 通过（140/140）

## 下一步（修复阶段）

1. 先修 Critical + 高风险契约问题：R9-001 / R9-002 / R9-003 / R9-004 / R9-012 / R9-024。
2. 再修创建/删除与权限语义一致性问题：R9-005~R9-021。
3. 修复后执行回归并更新本文件状态列。
