# Dashboard Figma 接入与重构方案

## 文档目的

本文档用于指导将 Figma Make 导出的页面骨架，重构并接入现有后台管理项目 `D:\pilates-studio-admin` 的 Dashboard 页面。

目标不是迁移一套独立原型工程，而是在**保留现有后台项目的路由、布局、权限、接口层和目录结构**的前提下，吸收 Figma 页面中的视觉层级、区块组织和组件骨架，并将其翻译为可维护、可合并的正式代码。

---

## 项目上下文

### 目标后台项目

- 路径：`D:\pilates-studio-admin`
- 技术栈：React 18 + Umi 4 + Ant Design 5 + TypeScript + CSS Modules + Recharts
- 关键结构：
  - 路由：`config/config.ts`
  - 布局：`src/layouts/index.tsx`
  - 菜单：`src/utils/menu.tsx`
  - 页面：`src/pages/*`
  - 组件：`src/components/*`
  - 接口层：`src/services/*`
  - 公共样式：`src/styles/page.module.css`、`src/styles/widgets.module.css`

### Figma 导出参考项目

- 路径：`D:\miniProgram`
- 作用：仅作为 UI 参考和页面骨架来源
- 可参考来源：
  - `src/app/pages/HomePage.tsx`
  - `src/app/pages/BookingPage.tsx`
  - `src/app/pages/MemberPage.tsx`
  - `src/app/components/shared.tsx`

---

## 接入原则

1. 保留现有后台项目的路由、布局、权限、请求层和目录结构。
2. 不直接复制 Figma 导出项目的工程结构、路由结构和组件体系。
3. 所有原生 HTML 控件和 shadcn/Radix 风格组件，优先替换为 Ant Design 组件。
4. 样式保持简洁、高级、白色 + 浅灰色后台风格，延续现有后台视觉体系。
5. 删除演示性质的 mock 数据、页面级假逻辑和无用状态。
6. 组件必须拆分，避免将页面继续堆成单个超大文件。
7. mock 数据位置必须替换成真实 API 的字段映射结构，而不是继续保留页面硬编码。
8. TypeScript 保持严格类型，组件只接收明确 props，不在展示组件中直接拉接口。

---

## 明确不迁移的内容

以下内容不应从 Figma 导出工程直接迁入后台项目：

- `react-router` 路由与 `routes.tsx`
- `PageShell` 的移动端页面壳
- `BottomNav` 底部导航
- Tailwind 类名体系
- shadcn / Radix UI 组件目录 `src/app/components/ui/*`
- 页面中的 mock 常量数组
- 页面里的硬编码业务文案、假时间、假会员状态、假课程记录
- 移动端固定宽度和底部留白逻辑，例如 `maxWidth: 430px`、`pb-24`

---

## 可复用的设计语义

来自 `D:\miniProgram\src\app\components\shared.tsx` 的高价值参考主要是设计语义，而不是代码本身：

- `Card`：白底、圆角、轻阴影卡片容器
- `SectionTitle`：区块标题 + 辅助信息布局
- `GoldTag`：会员等级/特殊状态标签
- `EmptyState` / `LoadingState` / `ErrorState`
- `Divider`
- 金色细进度条
- 高级感字体层级和留白节奏

这些语义应优先映射到后台现有组件与样式体系中：

- `src/components/PageHeader`
- `src/components/SectionCard`
- `src/components/StatCard`
- `src/styles/page.module.css`
- `src/styles/widgets.module.css`

如确实存在跨页面复用价值，再考虑补充后台公共组件，而不是搬运一份新的 `shared.tsx`。

---

## Dashboard 第一阶段目标

### 目标页面

- `src/pages/dashboard/index.tsx`

### 第一阶段只做什么

第一阶段只做 **Dashboard 页面骨架重构与视觉接入**，不更改后端接口，不更改路由，不更改权限逻辑。

优先接入以下 5 个区块：

1. 顶部欢迎信息
2. 会员权益卡
3. 今日课程区块
4. 快捷入口区块
5. 本月训练区块

### 第一阶段明确不做什么

以下内容不纳入第一阶段：

- 新增后端接口
- 改动 `config/config.ts`
- 改动 `src/utils/menu.tsx`
- 改动 `src/layouts/index.tsx`
- 引入 Tailwind 或 shadcn 组件体系
- 完整迁移 Figma 首页所有内容
- 优先实现“精选推荐”和“门店信息”等低优先区块

---

## Dashboard 文件改造计划

### 保留文件

- `src/pages/dashboard/index.tsx`
  - 继续作为 Dashboard 页面入口
  - 保留现有接口请求和消息提示逻辑
  - 重构为“数据装配层 + 组件组合层”

### 新增文件

建议新增以下目录与文件：

```text
src/pages/dashboard/
├── components/
│   ├── MembershipOverviewCard.tsx
│   ├── TodayCoursePanel.tsx
│   ├── QuickActionPanel.tsx
│   ├── TrainingSummaryCard.tsx
│   ├── UpcomingBookingsPanel.tsx
│   └── index.ts
├── index.module.css
└── index.tsx
```

### 各文件职责

#### `src/pages/dashboard/index.tsx`

职责：

- 调用现有 services 获取数据
- 保留 loading/error/message 处理
- 将后端响应映射为页面 view-model
- 组合子组件并处理导航事件

不负责：

- 编写大段展示 JSX
- 持有复杂样式定义
- 直接承担多个视觉区块的展示细节

#### `src/pages/dashboard/components/MembershipOverviewCard.tsx`

职责：

- 承接 Figma 首页中的会员权益卡骨架
- 展示会员等级、计划名称、有效期、权益概览、剩余天数、进度条

#### `src/pages/dashboard/components/TodayCoursePanel.tsx`

职责：

- 承接“今日课程”区块
- 展示课程标题、时间、时长、教练、门店、状态

#### `src/pages/dashboard/components/QuickActionPanel.tsx`

职责：

- 承接 Figma 中服务导航带的视觉和结构思想
- 改造成后台快捷入口
- 跳转后台已有页面，如 `/members`、`/courses`、`/bookings`、`/settings`

#### `src/pages/dashboard/components/TrainingSummaryCard.tsx`

职责：

- 承接“本月训练”区块
- 展示训练次数、累计时长、连续训练天数、目标进度

#### `src/pages/dashboard/components/UpcomingBookingsPanel.tsx`

职责：

- 承接“近期安排”区块
- 展示最近预约或课程安排，保留查看详情/查看全部的交互入口

#### `src/pages/dashboard/index.module.css`

职责：

- 承载 Dashboard 专属骨架样式
- 只放当前页面特有的布局和视觉增强
- 通用能力继续复用 `src/styles/page.module.css` 和 `src/styles/widgets.module.css`

---

## 组件 Props 约定

以下为第一阶段建议的组件接口草案。

### MembershipOverviewCardProps

```ts
type MembershipOverviewCardProps = {
  tierLabel: string;
  planName: string;
  expiryDateText: string;
  benefitText: string;
  remainingDaysText: string;
  progressPercent?: number;
  onViewDetail?: () => void;
  onPrimaryAction?: () => void;
};
```

### TodayCoursePanelProps

```ts
type TodayCoursePanelProps = {
  items: Array<{
    id: string;
    title: string;
    timeText: string;
    durationText: string;
    coachName: string;
    locationText: string;
    statusText?: string;
  }>;
  onViewAll?: () => void;
  onViewDetail?: (id: string) => void;
};
```

### QuickActionPanelProps

```ts
type QuickActionPanelProps = {
  items: Array<{
    key: string;
    label: string;
    subLabel: string;
    path: string;
  }>;
  onNavigate: (path: string) => void;
};
```

### TrainingSummaryCardProps

```ts
type TrainingSummaryCardProps = {
  sessionCountText: string;
  hoursText: string;
  streakDaysText: string;
  goalPercent?: number;
  goalLabel?: string;
};
```

### UpcomingBookingsPanelProps

```ts
type UpcomingBookingsPanelProps = {
  items: Array<{
    id: string;
    dayText: string;
    weekdayText: string;
    title: string;
    metaText: string;
    tagText?: string;
  }>;
  onViewAll?: () => void;
  onViewDetail?: (id: string) => void;
};
```

---

## 数据来源与字段映射原则

第一阶段不新增接口，优先使用现有 services：

- `reportsApi`
- `coursesApi`
- `coachesApi`
- `bookingsApi`
- `transactionsApi`

### 映射原则

页面展示层不直接依赖原始接口结构，统一在 `src/pages/dashboard/index.tsx` 中转换为 view-model。

建议引入以下映射函数概念：

- `deriveMembershipSummary(...)`
- `mapTodayCourses(...)`
- `deriveTrainingSummary(...)`
- `mapUpcomingBookings(...)`

这些函数第一阶段可以先放在 `index.tsx` 文件内，后续稳定后再抽离到 `helpers.ts`。

### 关键约束

1. 不允许再写新的页面级 mock 业务数组。
2. 如果现有接口暂时没有字段，使用明确的映射占位，如：
   - `'-'`
   - `undefined`
   - `待接入真实排班`
3. 占位只能出现在映射层，不允许散落在多个展示组件内部。
4. 展示组件不得直接调用 services。

---

## Dashboard 中各区块建议的数据映射

### 1. 顶部欢迎信息

可由当前 dashboard 统计数据拼出文案，不新增接口。

建议字段：

- `welcomeTitle`
- `welcomeSubtitle`

### 2. 会员权益卡

建议字段：

- `tierLabel`
- `planName`
- `expiryDateText`
- `benefitText`
- `remainingDaysText`
- `progressPercent`

说明：

- 第一阶段允许部分字段来自聚合推导或占位映射
- 不允许伪造真实业务数据

### 3. 今日课程区块

建议字段：

- `id`
- `title`
- `timeText`
- `durationText`
- `coachName`
- `locationText`
- `statusText`

来源优先：`coursesApi`、后续接 `courseSessionsApi`

### 4. 快捷入口区块

建议固定映射到后台已存在页面：

- 会员管理 → `/members`
- 课程管理 → `/courses`
- 预约管理 → `/bookings`
- 系统设置 → `/settings`

### 5. 本月训练区块

建议字段：

- `sessionCountText`
- `hoursText`
- `streakDaysText`
- `goalPercent`
- `goalLabel`

来源优先：`reportsApi`，缺失字段可先走统一映射占位。

### 6. 近期安排区块

建议字段：

- `id`
- `dayText`
- `weekdayText`
- `title`
- `metaText`
- `tagText`

来源优先：`bookingsApi`

---

## 样式接入规则

### 保持后台样式体系

继续复用：

- `src/styles/page.module.css`
- `src/styles/widgets.module.css`

### 新增样式的原则

1. 页面专属结构放入 `src/pages/dashboard/index.module.css`
2. 能复用现有 `pageCls` / `widgetCls` 的地方优先复用
3. 避免大段 inline style 重复出现
4. 避免引入 Tailwind
5. 尽量复用当前后台已有的间距、圆角、阴影和文本 token

### 允许引入的视觉元素

- 浅灰背景卡片区分层级
- 柔和圆角
- 更轻的阴影
- 金色细节强调（仅作为辅助强调，不替代后台主色）

### 不建议的做法

- 将 Figma 的所有十六进制颜色硬编码铺满新页面
- 在 TSX 中继续堆叠大量 `style={{ ... }}`
- 引入第二套完整设计系统

---

## 后续可扩展方向

Dashboard 第一阶段完成后，可按以下顺序扩展：

1. 接入“近期安排”区块
2. 进一步完善会员权益卡的数据来源
3. 将 Figma 中部分高质量展示模式下沉为后台公共组件
4. 再考虑把同样的方法用于 `members` 页面详情区和 `courses/bookings` 页面

---

## 验收标准

本阶段完成后应满足：

1. 页面仍走现有 `/dashboard` 路由
2. 现有 layout、auth、menu、service 结构不被破坏
3. 所有新组件均为严格 TypeScript props
4. 无新的页面级 mock 业务数组
5. 页面骨架已体现 Figma 的层级感和视觉节奏
6. 代码目录符合现有后台结构
7. 可以直接在现有工程中继续增量开发，而不是留下原型式代码

---

## 实施建议

推荐的落地顺序如下：

1. 创建 Dashboard 子组件目录和基础文件
2. 先重构 `src/pages/dashboard/index.tsx` 为数据装配层
3. 先接入会员权益卡、今日课程、快捷入口、本月训练四个核心区块
4. 再补近期安排区块
5. 最后统一微调样式和字段命名

该顺序可以保证每一步都可运行、可验证、可回退。
