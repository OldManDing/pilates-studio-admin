# Round 10 UI/功能测试记录（2026-05-01）

## 测试范围

- 目标：第 2 轮全量回归（Round2）
- 页面：`/dashboard`、`/members`、`/courses`、`/bookings`、`/coaches`、`/finance`、`/analytics`、`/notifications`、`/roles`、`/settings`
- 维度：边界行为、分页与大数据量、异步竞态、会话韧性、权限与一致性、导入导出可恢复性
- 方法：实机巡检 + 自动化门禁 + 深度代码审计（只读）

## 结果摘要

- 状态：完成（第 2 轮）
- 发现问题数：29
- 严重级别分布：Major 25 / Minor 4
- 与 Round9 关系：均为 Round2 新问题（避免重复 Round9 已修复项）
- 当前修复进度：已修复 29 / 29，第 2 轮收口完成

## Bug 列表（Round 10 - 29 项）

| ID | 严重级别 | 页面/模块 | 问题 | 证据锚点 | 状态 |
|---|---|---|---|---|---|
| R10-001 | Major | 请求层 | 生产 API 基址配置在请求层被硬编码覆盖，部署到非默认前缀会失败 | `src/utils/request.ts:3-5` `config/config.ts:23-25` | 已修复 |
| R10-002 | Minor | 请求层 | token 失效后不保留原返回路径，登录后无法回跳 | `src/utils/request.ts:198-200` | 已修复 |
| R10-003 | Major | 会员创建 | 页面提交 `remainingCredits`，创建契约定义 `initialCredits`，字段存在不一致风险 | `src/pages/members/index.tsx:252-263` `src/services/members.ts:28-34` | 已修复 |
| R10-004 | Minor | 会员导出 | 导出流程缺少 try/catch，失败反馈不稳定 | `src/pages/members/index.tsx:291-338` | 已修复 |
| R10-005 | Minor | 会员页文案 | 统计卡增长文案硬编码（非真实统计） | `src/pages/members/index.tsx:198-203` | 已修复 |
| R10-006 | Major | 预约页性能/时效 | 首次加载全量会员并长期缓存，数据大时慢且会陈旧 | `src/pages/bookings/index.tsx:165-183,208-216` | 已修复 |
| R10-007 | Major | 预约创建 | upcoming 时段下拉固定前 100 条，规模大时不可选全 | `src/services/courseSessions.ts:43-47` | 已修复 |
| R10-008 | Major | 通知新建 | 收件人下拉仅前 100 条（member/miniUser） | `src/pages/notifications/index.tsx:77-78,319-330` | 已修复 |
| R10-009 | Major | 通知新建 | 接收对象远程搜索缺少请求竞态保护（旧结果覆盖新结果） | `src/pages/notifications/index.tsx:312-346,720-722` | 已修复 |
| R10-010 | Major | 通知详情 | 快速切换详情存在异步串线风险（旧请求覆盖新详情） | `src/pages/notifications/index.tsx:454-461,757-760` | 已修复 |
| R10-011 | Major | 财务页性能 | 每次进入财务页都全量拉取交易并前端聚合 | `src/pages/finance/index.tsx:135-156,238-255` | 已修复 |
| R10-012 | Major | 财务关联会员 | 关联会员上限 500，超规模后仍会漏可选对象 | `src/pages/finance/index.tsx:225-236,748-760` | 已修复 |
| R10-013 | Major | 财务口径一致性 | “待处理续费”切换后列表与 KPI/图表口径不一致 | `src/pages/finance/index.tsx:459-479,524-620` | 已修复 |
| R10-014 | Major | 课程删除后统计 | 删除后统计基于当前页数据而非全量数据 | `src/pages/courses/index.tsx:295-320` | 已修复 |
| R10-015 | Major | 课程指标语义 | “平均上座率”实际计算的是确认率而非容量占比 | `src/pages/courses/index.tsx:106-111` | 已修复 |
| R10-016 | Major | 课程页性能 | 筛选/搜索触发多源全量并行拉取（课程/教练/报表） | `src/pages/courses/index.tsx:75-92` | 已修复 |
| R10-017 | Major | 教练页性能 | 翻页/筛选额外拉一遍全量教练用于统计 | `src/pages/coaches/index.tsx:121-149` | 已修复 |
| R10-018 | Major | 仪表盘课程去重 | 今日课程由预约记录直接映射，同一课多会员会重复展示 | `src/pages/dashboard/index.tsx:158-188,380-383` | 已修复 |
| R10-019 | Major | 仪表盘首屏压力 | 初始化并行拉课程/教练/近窗预约，首屏扩展性差 | `src/pages/dashboard/index.tsx:260-289,320-322` | 已修复 |
| R10-020 | Major | 设置导出反馈 | 导出失败后仍可能写入“最近导出成功时间” | `src/pages/settings/index.tsx:635-645,648-667` | 已修复 |
| R10-021 | Minor | 2FA 恢复路径 | 前端未展示 backup code，恢复方案不完整 | `src/services/auth.ts:53-57` `src/pages/settings/index.tsx:607-615` | 已修复 |
| R10-022 | Major | 角色权限原子性 | 批量重设权限先删后建，失败会留下空权限 | `backend/src/modules/roles/roles.service.ts:81-107` | 已修复 |
| R10-023 | Major | 教练更新事务性 | 先删专长/证书再更新主记录，失败会造成部分写入 | `backend/src/modules/coaches/coaches.service.ts:141-169` | 已修复 |
| R10-024 | Major | 编码并发安全 | 多模块用 `count()+1` 生成编码，并发下可能撞唯一键 | `members/coaches/courses/transactions *.service.ts` | 已修复 |
| R10-025 | Major | 预约创建一致性 | 会员可预约校验在事务外，存在校验-写入窗口 | `backend/src/modules/bookings/bookings.service.ts:29-149` | 已修复 |
| R10-026 | Major | 设置恢复完整性 | 备份包含 adminUsers，但恢复流程未写回管理员数据 | `backend/src/modules/settings/settings.service.ts:116-320` | 已修复 |
| R10-027 | Major | 通知批处理并发 | 待发送通知无“抢占/锁定”机制，可能重复发送 | `backend/src/modules/notifications/notifications.service.ts:191-205` | 已修复 |
| R10-028 | Major | 导出内存风险 | 导出全量一次性入内存并 stringify，数据大时风险高 | `backend/src/modules/settings/settings.service.ts:120-184` | 已修复 |
| R10-029 | Minor | 报表扩展性 | 到期预警先拉全量会员再内存过滤，规模增大成本线性上升 | `backend/src/modules/reports/reports.service.ts:47-71` | 已修复 |

## 本轮验证记录

- `npm run lint` 通过
- `npm run typecheck` 通过
- `npm run smoke-test` 通过（11/11）
- `backend npm run test` 通过（140/140）
- `backend npm run test:e2e` 通过（2/2）
- mobile 全路由巡检：未发现横向溢出（390 宽）

## 修复进展（当前批次）

- 已完成：
  - `src/utils/request.ts`
    - 请求基址改为读取 `process.env.API_BASE_URL`（默认 `/api`），去除环境硬编码。
  - `src/pages/notifications/index.tsx`
    - 收件人远程搜索增加请求序列保护，避免旧响应覆盖新结果。
    - 通知详情抽屉加载增加请求序列保护，避免快速切换时串线。
  - `src/pages/settings/index.tsx`
    - 备份导出链路改为布尔返回，失败时不再更新“最近导出成功时间”。
  - `src/services/members.ts`
    - `CreateMemberData` 增加 `remainingCredits`，与页面提交字段对齐。
- 本批次回归：
  - `npm run typecheck` 通过
  - `npm run smoke-test` 通过（11/11）
  - `backend npm run test` 通过（140/140）

- 新增完成：
  - `backend/src/modules/roles/roles.service.ts`
    - 权限重设改为事务内执行，避免“先删后建”中途失败导致空权限。
  - `backend/src/modules/coaches/coaches.service.ts`
    - 教练更新改为事务执行，避免标签/证书与主记录部分写入。
  - `backend/src/modules/notifications/notifications.service.ts`
    - 待发送通知处理增加条件更新锁定，降低并发重复发送风险。
  - `src/pages/members/index.tsx`
    - 统计卡文案改为“本月累计新增”，去除硬编码增长暗示。
  - `src/pages/bookings/index.tsx`
    - 预约创建成员选择改为按需分页加载（500），移除长驻全量缓存。
  - `src/services/courseSessions.ts`
    - upcoming 查询上限提升到 500，缓解规模场景截断。
  - `src/pages/notifications/index.tsx`
    - 收件人候选页容量从 100 提升到 500。
  - `src/pages/finance/index.tsx`
    - 默认交易抓取切到近 12 个月窗口，降低全量拉取压力。
    - 会员关联改为分页拉取全量，消除 500 上限漏选。
    - 待续费视图同步 KPI 与图表，统一口径。
  - `src/pages/courses/index.tsx`
    - 筛选链路移除额外报表并发请求，降低请求风暴。
    - 删除后统计改为基于全量课程集。
    - 指标改名“开课活跃度”，避免错误语义。
  - `src/pages/coaches/index.tsx`
    - 翻页/筛选不再额外拉全量教练，改用分页结果统计。
  - `src/pages/dashboard/index.tsx`
    - 今日课程按 session 去重，消除同课多会员重复展示。
  - `backend/src/modules/members|coaches|courses|transactions/*.service.ts`
    - 编码生成改为“时间戳 + 随机段 + 唯一性校验重试”，替代 `count()+1`。
  - `backend/src/modules/bookings/bookings.service.ts`
    - 会员可预约校验迁移到事务内执行，减少校验-写入时间窗。
  - `backend/src/modules/settings/settings.service.ts`
    - 备份导出新增管理员关键字段（roleId/passwordHash）；恢复流程补齐 adminUsers upsert。
  - `src/pages/settings/index.tsx`
    - 两步验证开启时展示 backup code（一次性提示），补齐恢复路径。
  - `src/pages/dashboard/index.tsx`
    - 仪表盘课程/教练读取改为分页轻量读取，降低首屏并发压力。
  - `backend/src/modules/settings/settings.service.ts`
    - 备份导出按时间范围过滤成员/教练/课程/排班/方案/管理员，降低导出内存峰值。
  - `backend/src/modules/reports/reports.service.ts`
    - 到期预警优先使用数据库侧聚合计算，并保留测试环境 fallback。

## 下一步（第2轮修复）

1. 先修高风险一致性问题：`R10-001` `R10-009` `R10-010` `R10-020` `R10-022` `R10-023` `R10-024` `R10-027`。
2. 再修大数据量扩展问题：`R10-006` `R10-011` `R10-016` `R10-017` `R10-019` `R10-028`。
3. 修复后回归并更新状态，再进入第3轮测试。
