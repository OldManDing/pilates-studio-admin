# Figma 接入阶段总结

## 文档目的

本文档用于汇总本轮 Figma Make 导出页面接入后台管理项目的实施结果，方便后续维护、继续扩展，以及在团队内快速说明当前接入边界与后续建议。

目标项目：`D:\pilates-studio-admin`

---

## 本轮完成范围

本轮已完成以下后台页面的一阶段或二阶段接入，并全部保持在现有后台架构内落地：

1. Dashboard
2. Members
3. Bookings
4. Courses

所有接入都遵循同一原则：

- 保留现有 Umi 路由、布局、权限和服务层
- 不整体迁移 Figma 原型工程结构
- 仅吸收页面层级、区块结构、卡片节奏和视觉语言
- 展示层组件化，页面入口保留数据请求与行为逻辑
- 使用 Ant Design + TypeScript + CSS Modules + 现有共享样式体系

---

## 已沉淀文档

- `docs/dashboard-figma-integration-plan.md`
- `docs/figma-integration-summary.md`（本文档）

---

## 页面级实施结果

### 1. Dashboard

#### 目标

将 Figma 首页中的会员权益、课程卡片、快捷入口、训练概览等结构翻译为后台 Dashboard 的工作台骨架。

#### 已完成内容

- 将 `src/pages/dashboard/index.tsx` 重构为“数据装配层 + 展示组件组合层”
- 新增 Dashboard 展示组件：
  - `MembershipOverviewCard`
  - `TodayCoursePanel`
  - `QuickActionPanel`
  - `TrainingSummaryCard`
  - `UpcomingBookingsPanel`
- 新增 `src/pages/dashboard/index.module.css`
- 保留原有 Dashboard 路由、数据源和页面职责

#### 当前状态

- 已验证通过
- 可继续增量扩展

#### 后续建议

- 继续把今日课程、近期安排与会员概览的字段映射收得更贴近真实业务语义

---

### 2. Members

#### 目标

将 Figma 会员页中“会员状态卡 / 会员概览 / 近期活动”翻译为后台成员页的详情抽屉增强结构。

#### 第一阶段已完成内容

- 抽取成员列表展示组件：
  - `MemberRecordCard`
- 增强详情抽屉顶部结构：
  - `MemberProfileOverviewCard`
  - `MemberProfileStats`
- 新增 `src/pages/members/index.module.css`

#### 第二阶段已完成内容

- 在详情抽屉中接入：
  - 近期预约
  - 近期交易
- 通过现有接口直接读取：
  - `membersApi.getBookings(id)`
  - `membersApi.getTransactions(id)`

#### 当前状态

- 已完成第二阶段
- 详情抽屉已具备更完整的会员行为视图

#### 后续建议

- 将 `membersApi.getBookings/getTransactions` 的前端类型签名继续收严
- 对 recent 数据增加显式排序约束，避免未来依赖后端默认顺序

---

### 3. Bookings

#### 目标

将 Figma 预约页中的筛选节奏、预约卡片层级和浏览感，翻译为后台预约页的主列表和详情流。

#### 已完成内容

- 新增 bookings 展示组件：
  - `BookingHeroStats`
  - `BookingPeriodSelector`
  - `BookingListCard`
- 新增 `src/pages/bookings/index.module.css`
- 保留现有预约 CRUD、详情抽屉、筛选、分页、服务层结构

#### 本轮修正的关键正确性问题

- 编辑已有预约时，不再误导性地展示可修改会员/课程时段
- 状态动作文案与真实行为保持一致
- 完整覆盖 `NO_SHOW / 未到场` 展示路径
- 统一为“同一批周内数据 → 前端过滤 → 前端分页”
- 顶部 hero stats 改为从当前 bookings 数据实时派生

#### 当前状态

- 第一阶段已完成
- 页面结构、交互与状态流已达到可签收状态

#### 后续建议

- 当前仍使用 `BOOKING_QUERY_PAGE_SIZE = 200` 拉取周内数据，若未来周预约量超过该上限，需进一步改成完整服务端分页或循环拉全

---

### 4. Courses

#### 目标

将 Figma 课程页中的课程卡片层级、浏览外壳和详情概览结构翻译为后台课程管理页。

#### 已完成内容

- 新增 courses 展示组件：
  - `CourseBrowseShell`
  - `CourseListCard`
  - `CourseDetailOverviewCard`
- 新增 `src/pages/courses/index.module.css`
- 保留原有课程 CRUD、详情抽屉、筛选和服务层结构

#### 本轮修正的关键正确性问题

- 课程增删改后 stats 同步刷新
- 表单校验失败不再误弹通用“保存失败”
- 课程卡片 key 改为稳定 id

#### 当前状态

- 第一阶段已完成
- 可继续在当前结构上增量扩展

#### 后续建议

- 后续如需继续贴近 Figma，可在不引入原型字段的前提下，继续加强课程详情页中的说明区和教练信息区

---

## 组件化策略总结

本轮所有页面统一采用以下结构：

### 页面入口文件职责

`src/pages/**/index.tsx` 负责：

- 调用 services
- 管理筛选、弹窗、抽屉、分页、编辑态等行为状态
- 将原始接口数据转换为展示层 props
- 组合展示组件

### 页面子组件职责

`src/pages/**/components/*` 负责：

- 接收类型明确的 props
- 只做展示，不直接发请求
- 不持有复杂业务逻辑
- 尽量复用现有 shared components 和样式 token

### 样式职责

- 全局与共用布局继续复用：
  - `src/styles/page.module.css`
  - `src/styles/widgets.module.css`
- 页面专属视觉细节单独放在：
  - `src/pages/**/index.module.css`

---

## 本轮新增/重构的主要文件

### Dashboard

- `src/pages/dashboard/index.tsx`
- `src/pages/dashboard/index.module.css`
- `src/pages/dashboard/components/*`

### Members

- `src/pages/members/index.tsx`
- `src/pages/members/index.module.css`
- `src/pages/members/components/*`

### Bookings

- `src/pages/bookings/index.tsx`
- `src/pages/bookings/index.module.css`
- `src/pages/bookings/components/*`

### Courses

- `src/pages/courses/index.tsx`
- `src/pages/courses/index.module.css`
- `src/pages/courses/components/*`

### Shared

- `src/components/StatusTag/index.tsx`
- `src/types/index.ts`

### Docs

- `docs/dashboard-figma-integration-plan.md`
- `docs/figma-integration-summary.md`

---

## 验证结果

本轮收尾时已执行并通过：

- `npm run typecheck`
- `npm run build`

同时，各页面改造过程中均经过目录级诊断与多轮只读复核。

---

## 当前项目状态判断

当前后台项目已经从“局部原型参考阶段”进入“可持续增量开发阶段”。

这意味着：

- 主要管理页面已具备统一的组件化模式
- Figma 接入不再是临时拼装代码
- 结构上可以继续安全扩展
- 后续新增页面或深化现有页面时，可以直接复用当前模式

---

## 建议的下一步优先级

### 优先级 1：继续业务页接入

建议优先继续：

1. `coaches`
2. `settings`

理由：这两页最容易延续当前已经建立的组件化接入模式。

### 优先级 2：继续语义收口

对已完成页面继续做小范围深化：

- Dashboard：真实字段语义继续收紧
- Members：recent 数据排序与类型继续补严
- Bookings：数据拉取规模继续优化
- Courses：继续补充更完整的详情说明区块

---

## 结论

本轮已经完成后台管理项目中 4 个核心页面的 Figma 接入与结构重构：

- Dashboard
- Members
- Bookings
- Courses

这些页面当前都已具备：

- 可维护的组件结构
- 与现有后台体系一致的目录与依赖关系
- 可通过验证的 TypeScript / 构建状态
- 可以继续向生产代码演进的稳定基线
