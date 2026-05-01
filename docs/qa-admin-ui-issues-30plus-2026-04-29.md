# 后台 UI 问题清单（30+）

- 项目：`pilates-studio-admin`
- 产出日期：2026-04-29
- 范围：`src/pages/**`、`src/components/**`、`src/styles/**`
- 说明：本清单基于代码审计（read/glob/grep）整理，证据为文件与行段定位；用于后续逐条修复与回归。

## 严重级别定义

- **High**：会导致误操作、重复提交、关键状态不可感知或明显可用性阻断。
- **Medium**：可完成任务但体验显著下降（语义/层级/反馈不足）。
- **Low**：一致性与可读性问题，短期不阻断流程。

## 问题清单（33 条）

| ID | 严重级别 | 类别 | 页面/模块 | 证据定位 | 问题描述 | 复现提示 |
|---|---|---|---|---|---|---|
| UI-01 | High | 状态反馈 | 会员管理 | `src/pages/members/index.tsx:134-149, 413-467` | 列表仅首屏加载显示全屏 Spin，后续搜索/筛选/翻页无局部 loading。 | 先加载出列表，再切换页码或搜索。 |
| UI-02 | High | 异步防重 | 会员管理 | `src/pages/members/index.tsx:250-266, 513-523` | 新增/编辑会员弹窗 `onOk` 无 `confirmLoading`，提交中可重复点击。 | 在慢网下连续点击“保存修改/新增会员”。 |
| UI-03 | High | 异步防重 | 会员详情抽屉 | `src/pages/members/index.tsx:268-280, 604-609` | 删除会员按钮缺少 in-flight 锁定与进行中反馈。 | 点击删除后快速重复点击确认。 |
| UI-04 | High | 状态反馈 | 教练管理 | `src/pages/coaches/index.tsx:119-152, 329-383` | 教练列表后续请求（筛选/翻页/搜索）无刷新中反馈。 | 列表有数据后切换筛选条件。 |
| UI-05 | High | 异步防重 | 教练管理 | `src/pages/coaches/index.tsx:201-254, 450-460` | 教练新增/编辑弹窗保存无 `confirmLoading`。 | 快速多次点击保存按钮。 |
| UI-06 | High | 状态反馈 | 预约管理 | `src/pages/bookings/index.tsx:189-245, 433-479` | 预约列表非首屏请求无可见加载反馈。 | 切换状态/日期/页码。 |
| UI-07 | High | 异步防重 | 预约详情抽屉 | `src/pages/bookings/index.tsx:380-397, 618-623` | “确认/签到”按钮无 loading/disabled。 | 慢网环境下连续点击状态推进。 |
| UI-08 | High | 异步防重 | 预约详情抽屉 | `src/pages/bookings/index.tsx:380-397, 621-623` | 删除预约按钮无 in-flight 锁定，可能重复触发删除。 | 删除动作确认后快速重复触发。 |
| UI-09 | High | 空态缺失 | 财务报表 | `src/pages/finance/index.tsx:520-572` | 营收趋势与构成图无空态兜底，数据为空时出现“空白图表区”。 | 用空数据/无交易数据账号进入财务页。 |
| UI-10 | High | 异步防重 | 财务报表 | `src/pages/finance/index.tsx:489-499, 666-676` | 新增/编辑交易弹窗无 `confirmLoading`。 | 多次点击提交交易。 |
| UI-11 | High | 异步防重 | 财务报表 | `src/pages/finance/index.tsx:401-414, 640-649, 755-761` | “开始处理/完成续费”状态按钮无 loading/disabled。 | 列表卡片与详情抽屉中连续点击状态按钮。 |
| UI-12 | High | 异步防重 | 通知中心 | `src/pages/notifications/index.tsx:453-470, 603-621, 742-750` | “标记已读/已处理”按钮无进行中锁定。 | 连续点击同一通知动作。 |
| UI-13 | High | 异步防重 | 系统设置 | `src/pages/settings/index.tsx:468-507, 727-730` | 保存门店信息主按钮无 loading，仅 disabled 条件不足以表达进行中。 | 修改门店信息后快速连续点击保存。 |
| UI-14 | High | 异步防重 | 系统设置 | `src/pages/settings/index.tsx:537-563, 941-943` | 更新密码按钮无 loading/disabled in-flight。 | 重复点击“更新密码”。 |
| UI-15 | High | 异步防重 | 系统设置 | `src/pages/settings/index.tsx:525-535, 961-983` | 二步验证流程异步动作共用处理器但无 pending 反馈。 | 在生成密钥/验证/关闭流程中连续触发。 |
| UI-16 | High | 异步防重 | 系统设置 | `src/pages/settings/index.tsx:525-535, 843-843` | 初始化通知模板操作无 loading/禁用反馈。 | 连续点击“初始化通知模板”。 |
| UI-17 | High | 并发状态 | 系统设置 | `src/pages/settings/index.tsx:510-518, 832-833` | 通知开关异步保存但 `Switch` 无独立 loading/disabled，易出现并发切换回弹。 | 快速来回切换同一通知开关。 |
| UI-18 | Medium | 语义可用性 | 侧边导航 | `src/components/AppSidebar/index.tsx:136-154` | 导航项使用 `div + role="button"` 代替语义链接，导航语义弱。 | 键盘/读屏浏览侧边导航。 |
| UI-19 | Medium | 可访问性 | 侧边导航 | `src/components/AppSidebar/index.tsx:134-141` | 当前激活菜单仅视觉高亮，缺 `aria-current`。 | 读屏下无法明确当前页面位置。 |
| UI-20 | Medium | 可访问性 | 系统设置 | `src/pages/settings/index.tsx:827-834` | 多个通知开关无可读语义关联（仅裸 `Switch`）。 | 使用读屏逐项朗读通知开关。 |
| UI-21 | Medium | 交互一致性 | Dashboard 今日课程面板 | `src/pages/dashboard/components/TodayCoursePanel.tsx:19-23, 47-52` | 行项渲染为可点击按钮但 `onViewDetail` 可选，存在“可点无动作”场景。 | 在无详情回调场景点击行项。 |
| UI-22 | High | 视觉层级 | 系统设置 | `src/pages/settings/index.module.css:143-150` | 页面标题 `clamp(28px,3vw,34px)` 与全站标题层级差异过大。 | 对比设置页与其它管理页标题观感。 |
| UI-23 | High | 视觉层级 | 课程管理 | `src/pages/courses/index.module.css:108-116` | 卡片/概览标题使用 `var(--font-size-xl)`，与页面主标题竞争层级。 | 在课程页观察标题主次关系。 |
| UI-24 | Medium | 视觉一致性 | 登录/找回密码 | `src/pages/login/index.module.css:23-28` + `src/pages/forgot-password/index.module.css:23-28` | 两个同类认证页标题字号不一致（30px vs 31px）。 | 登录页与找回密码页来回切换。 |
| UI-25 | Medium | 状态对比 | 预约管理 | `src/pages/bookings/index.module.css:74-96` | 筛选按钮 inactive 与激活态视觉落差极大，未激活边界弱。 | 切换预约状态筛选标签。 |
| UI-26 | Medium | 响应式 | 会员管理 | `src/pages/members/index.module.css:59-63, 142-148` | 英雄信息区桌面三列仅在移动端才降列，中间断点拥挤。 | 平板/中等宽度查看会员详情头部。 |
| UI-27 | Low | 信息密度 | 预约管理 | `src/pages/bookings/index.module.css:154-165` | 左侧日期/时间块固定最小宽度（92px）压缩右侧正文。 | 在预约列表查看长课程名记录。 |
| UI-28 | Medium | 焦点可见性 | 全局样式 | `src/styles/global.css:188-197` | 全局 focus ring 透明度偏低，浅底卡片区不够醒目。 | 键盘 Tab 导航跨卡片区域。 |
| UI-29 | Medium | 信息权重 | 系统设置 | `src/pages/settings/index.module.css:152-170` | 保存状态徽标视觉权重过轻，与超大标题失衡。 | 修改设置后观察“已保存/未保存”提示。 |
| UI-30 | Medium | 响应式 | 课程管理 | `src/pages/courses/index.module.css:63-80, 188-196` | 工具栏双栏布局在中等宽度区间控件挤压明显。 | 1200px 左右宽度查看搜索+筛选区。 |
| UI-31 | Low | 布局节奏 | 系统设置 | `src/pages/settings/index.module.css:83-93, 101-105, 165-170` | 多处 action row 全部偏右对齐，阅读路径不自然。 | 顺序浏览设置页多个卡片。 |
| UI-32 | Low | 文本可读性 | 会员管理 | `src/pages/members/index.module.css:134-140` | 交易侧栏最小宽度偏窄，长文案易断裂。 | 会员交易记录出现较长状态文本时查看。 |
| UI-33 | Medium | 间距系统 | 全局 vs 页面 | `src/styles/page.module.css:1-3` + `src/pages/courses/index.module.css:9-13` + `src/pages/settings/index.module.css:5-9` | 页面外层间距基线不统一，跨页切换有明显版式漂移。 | 在课程页/设置页/其它列表页切换观察。 |

## 建议修复顺序

1. **先 High（UI-01 ~ UI-17, UI-22, UI-23）**：先解决异步防重、空态缺失、关键层级问题。  
2. **再 Medium（UI-18 ~ UI-21, UI-24 ~ UI-30, UI-33）**：统一语义、响应式、信息权重。  
3. **最后 Low（UI-31, UI-32）**：收口视觉节奏与细节一致性。

## 回归验证建议

- 功能回归：保存/删除/状态推进/标记类动作全部验证“单击一次只触发一次请求”。
- 视觉回归：按 1440 / 1200 / 1024 / 768 断点截图对比间距与层级。
- 可访问性回归：键盘 Tab 顺序、焦点可见性、读屏对导航和开关语义朗读。

## 修复进展（2026-04-29）

### 已完成（本次迭代累计）

- **已关闭 ID**：`UI-01 ~ UI-33`
  - 第一轮完成：异步防重、按钮 loading/disabled、列表二次加载反馈、财务图表空态。
  - 第二轮完成：导航语义（link）与 `aria-current`、通知开关可读名称、今日课程面板“无回调即禁用”。
  - 第三轮完成：视觉层级收口（设置/课程/认证页）、预约筛选对比度、课程工具栏中宽断点、会员与预约中间断点、全局焦点可见性、设置页布局节奏与页面间距一致性。

### 待处理（下一轮）

- 当前清单 33 条已全部进入修复完成状态，可进入回归观察阶段。
