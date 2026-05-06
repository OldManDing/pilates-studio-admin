# 愈己CareMe工作室 Admin 项目测试审计与修复报告

日期：2026-05-03  
范围：Admin 前端、Admin 后端、单元/烟测/覆盖率、依赖审计、本地启动与浏览器路由验证

## 执行计划

1. 盘点项目脚本、测试设施、依赖和关键路由。
2. 跑前后端安装、typecheck、lint、test、coverage、build、audit。
3. 启动本地服务，登录后台并巡检关键页面。
4. 按失败项和高风险问题修复。
5. 重启服务并复测。

## 主要变更文件

- `src/services/miniUsers.ts`
- `src/pages/login/index.tsx`
- `src/pages/membership-plans/index.tsx`
- `src/utils/request.ts`
- `src/utils/safeRedirect.ts`
- `smoke-tests/setup.ts`
- `smoke-tests/pages/membership-plans.spec.tsx`
- `vitest.config.ts`
- `backend/src/modules/membership-renewals/wechat-pay.service.ts`
- `backend/src/modules/analytics/analytics.service.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/health/health.controller.ts`
- `backend/src/modules/settings/settings.controller.ts`
- `backend/src/modules/members/members.controller.ts`
- `backend/src/modules/members/members.service.ts`
- `backend/src/modules/transactions/transactions.service.ts`
- `backend/prisma/seed.ts`
- `backend/.env.example`
- `package.json`
- `package-lock.json`

> 注意：开始前工作区已经存在大量未提交修改，本报告只记录本轮测试发现并处理的事项。

## 问题清单

| ID | 优先级 | 状态 | 问题 | 证据 | 处理 |
|---|---:|---|---|---|---|
| QA-001 | P0 | 已修复 | `/mini-users` 浏览器运行时崩溃，错误为 `Cannot read properties of undefined (reading 'filter')` | Playwright 路由巡检：`/mini-users` 无 h1 且控制台 React error | `miniUsersApi.getAll` 改用 `requestWithMeta`，保留分页 `meta` |
| QA-002 | P0 | 已修复 | 后端 lint 失败，WeChat Pay Authorization 模板字符串存在无意义转义 | `npm run lint` 报 `no-useless-escape` 10 errors | 移除模板字符串中的 `\"` 转义 |
| QA-003 | P0 | 已修复 | `smoke-test:cov` 缺少 `@vitest/coverage-v8`，覆盖率命令不可用 | `MISSING DEPENDENCY Cannot find dependency '@vitest/coverage-v8'` | 安装 `@vitest/coverage-v8` |
| QA-004 | P1 | 已修复 | 前端完整烟测执行时间约 210s，默认 5s 单测超时导致页面 smoke 偶发失败 | `courses.spec.tsx` 在 5.354s 超时 | `vitest.config.ts` 设置 `testTimeout: 15000` |
| QA-005 | P1 | 已修复 | 会员方案页缺少 smoke test 覆盖 | 指定 `membership-plans.spec.tsx` 时无匹配文件 | 新增 `smoke-tests/pages/membership-plans.spec.tsx` |
| QA-006 | P1 | 已修复 | Recharts 在 jsdom 下输出 0 宽高警告，污染测试输出 | analytics smoke stderr 输出 chart width/height 警告 | 在 `smoke-tests/setup.ts` mock 元素尺寸 |
| QA-007 | P1 | 已修复 | 登录页密码框缺少 `autocomplete` | 浏览器 console 提示 password autocomplete | 增加 `autoComplete="username/current-password"` |
| QA-008 | P1 | 已修复 | 未登录访问 `/mini-users` 后登录不能可靠回到原页面，安全跳转白名单缺少新路由且 login 未读 `next` | 浏览器验证直接访问 `/mini-users` 进入 login | `safeRedirect` 加入 `/mini-users`、`/membership-plans`，login 读取 `next` |
| QA-009 | P1 | 已修复 | `backend/.env.example` 种子账号与当前 seed/default/local env 不一致 | `owner@pilates.com / Passw0rd!` 登录 401，`admin@pilates.com / Admin123!` 成功 | example 改为 `admin@pilates.com / Admin123!` |
| QA-010 | P2 | 已修复 | AntD `InputNumber addonBefore` deprecated，控制台报错级 warning | `/membership-plans` 浏览器巡检出现 AntD deprecation | 移除 deprecated prop |
| QA-011 | P2 | 已修复 | `request.ts` 底层工具调用 AntD 静态 `message.error`，动态主题下控制台 warning | `/dashboard` 浏览器巡检出现 `Static function can not consume context` | 移除底层静态 toast，交给页面层处理错误 |
| QA-012 | P2 | 已修复 | 后端 lint warning：未使用导入/变量 | `backend lint` 15 warnings | 清理未使用导入，保留 analytics 调用并用 `_` 变量避免 warning |
| QA-013 | P2 | 部分修复 | 前端依赖审计存在漏洞 | 初始 40 vulnerabilities，`npm audit fix` 后 37 | 已执行非破坏性 `npm audit fix`；剩余需主版本/force 升级 |
| QA-014 | P2 | 未修复 | 后端依赖审计存在漏洞 | `npm audit` 仍为 24 vulnerabilities | 剩余项要求 Nest/Swagger/CLI 等 breaking upgrade，需单独升级任务 |
| QA-015 | P2 | 未修复 | 前端覆盖率低于生产 App 目标 | Frontend statements 45.33%、branches 29.41% | 已记录基线；需后续补交互/错误态/权限态测试 |
| QA-016 | P2 | 未修复 | 后端 branch/function 覆盖率不足 | Backend statements 71.47%、branches 46.19%、functions 69.31% | 已记录基线；重点补 `settings`、`membership-renewals/wechat-pay`、`mini-users` |

## 覆盖率基线

### 前端 smoke coverage

- Statements：45.33%
- Branches：29.41%
- Functions：38.63%
- Lines：46.67%
- 重点低覆盖：`request.ts`、`safeRedirect.ts`、`membership-plans` 交互分支、`mini-users` 交互分支、多数页面错误态/表单提交态。

### 后端 Jest coverage

- Statements：71.47%
- Branches：46.19%
- Functions：69.31%
- Lines：71.29%
- 重点低覆盖：`settings.service.ts`、`membership-renewals/wechat-pay.service.ts`、`mini-users.service.ts`、`roles.service.ts`、`transactions.service.ts` 分支。

## 验证结果

| 命令 | 结果 |
|---|---|
| `npm.cmd install` | 通过 |
| `npm.cmd install` in `backend` | 通过 |
| `npm.cmd run typecheck` | 通过 |
| `npm.cmd run lint` | 通过 |
| `npm.cmd run build` | 通过 |
| `npm.cmd run smoke-test -- --reporter=verbose` | 13 files / 13 tests 通过 |
| `npm.cmd run smoke-test:cov` | 13 files / 13 tests 通过 |
| `npm.cmd run typecheck` in `backend` | 通过 |
| `npm.cmd run lint` in `backend` | 通过 |
| `npm.cmd run test:cov -- --runInBand` in `backend` | 27 suites / 170 tests 通过 |
| `npm.cmd run build` in `backend` | 通过 |
| `npm.cmd audit fix` | 前端部分修复；剩余 37 个需后续处理 |
| `npm.cmd audit fix` in `backend` | 无可安全自动修复项；剩余 24 个 |

## 本地重启与浏览器复验

- 重启前端：`npm.cmd run dev`，监听 `http://localhost:8000`
- 重启后端：`node dist/src/main.js`，监听 `http://localhost:3000`
- `GET /api/health`：ok
- `GET /api/health/db`：ok
- 登录账号：`admin@pilates.com / Admin123!`
- 验证未登录访问 `/mini-users` 后登录回跳 `/mini-users`：通过
- 浏览器复验关键路由：
  - `/dashboard`：h1 `仪表盘`，无 console error
  - `/membership-plans`：h1 `会员方案管理`，无 console error
  - `/mini-users`：h1 `小程序用户管理`，无 console error
  - 前一轮全量路由巡检确认 12 个后台主路由均可打开

## 剩余风险与下一步

1. 依赖漏洞需要单独升级任务处理，尤其是 Umi/Nest 相关 transitive 漏洞；建议建分支做主版本/破坏性升级验证。
2. 前端 coverage 仍明显低于生产 App 目标，优先补登录、request、safeRedirect、会员方案、小程序用户、预约/财务表单交互。
3. 后端 branch 覆盖率不足，优先补 WeChat Pay 非 mock、通知失败重试、权限拒绝、设置导入导出异常、mini user 绑定冲突。
4. 当前 smoke suite 仍耗时约 4 分钟，后续可拆分 CI job 或降低页面级导入成本。
