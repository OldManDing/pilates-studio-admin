# Pilates Studio Admin 审计修复清单（已更新状态）

下面是按 **P0 / P1 / P2** 整理的审计修复总表，并已根据当前代码状态回写“当前状态 / 修复说明”。

状态说明：

- **已完成**：问题已按当前排期目标修复并完成构建验证
- **基本完成**：主要问题已收口，但仍存在少量后续优化空间，不再构成当前优先级未完成项
- **待后续**：当前轮次未覆盖，留待下一阶段处理

## P0 / 阻断级

| 优先级 | 当前状态 | 问题 | 影响范围 | 涉及文件 | 修复说明 | 验收标准 |
|---|---|---|---|---|---|---|
| P0 | 已完成 | 2FA 可被任意 6 位数字绕过 | 登录安全、账号保护 | `backend/src/modules/auth/auth.service.ts`，`backend/src/modules/auth/auth.controller.ts`，`src/pages/login/index.tsx`，`src/services/auth.ts` | 已接入真实 TOTP 校验，并补完双阶段登录流程：密码校验后按需返回 MFA challenge，再通过验证码换取正式 token | 正确验证码通过；错误/过期验证码拒绝；开启 2FA 的账号登录必须经过二次验证 |
| P0 | 已完成 | 课程场次写接口缺失，前后端契约断裂 | 排课创建、编辑、删除 | `backend/src/modules/course-sessions/course-sessions.controller.ts`，`backend/src/modules/course-sessions/course-sessions.service.ts`，`src/services/courseSessions.ts` | 已补齐 `POST/PATCH/DELETE /course-sessions`，并完成前端 service 适配 | 前端新增/编辑/删除课程场次成功；接口返回与页面展示一致 |
| P0 | 已完成 | 财务删除按钮是坏按钮 | 财务管理、用户信任 | `src/pages/finance/index.tsx` | 已移除坏删除路径，避免用户点击进入无效操作 | 页面不再暴露“点了必失败”的假功能 |
| P0 | 已完成 | 项目交付范围中的关键模块为空壳 | 分析、通知、小程序用户能力 | `backend/src/app.module.ts`，`backend/docs/api-routes.md`，`src/utils/menu.tsx`，`config/config.ts` | 当前轮次采用“去暴露 / 去承诺”闭环：已移除空模块的菜单、路由、模块注册和文档承诺 | 发布范围与代码实际能力一致，不再出现“文档承诺有、代码为空” |
| P0 | 已完成 | 前后端关键枚举/领域模型漂移 | 会员方案、交易、状态流转 | `src/types/index.ts`，`src/services/*.ts`，`backend/prisma/schema.prisma` 等 | 已统一前端核心枚举和 service 映射，避免关键业务对象继续错配 | 创建、编辑、筛选、展示链路的枚举值全部对齐，无错配 |

## P1 / 高优先级

| 优先级 | 当前状态 | 问题 | 影响范围 | 涉及文件 | 修复说明 | 验收标准 |
|---|---|---|---|---|---|---|
| P1 | 已完成 | 财务指标存在伪计算 | 财务报表可信度 | `src/pages/finance/index.tsx`，`src/pages/dashboard/finance-trend/index.tsx` | 已移除伪造净利润、利润率与固定利润估算；未接通数据改为明确“待接入” | 财务页不再展示估算型伪指标 |
| P1 | 已完成 | 登录/鉴权缺少明显限流保护 | 认证安全 | `backend/src/config/app.config.ts`，`backend/src/app.module.ts`，`backend/src/modules/auth/auth.controller.ts` | 已接入全局节流，并为登录、2FA 校验、refresh 等接口增加更严格限流 | 高频错误请求被拦截，认证接口有实际防护 |
| P1 | 已完成 | 备份恢复缺少严格 schema 校验 | 数据恢复可靠性 | `backend/src/modules/settings/settings.service.ts` | 已补恢复前的结构化校验与枚举/数字检查，非法数据会在进入事务前失败 | 非法备份不会写库，错误信息可定位 |
| P1 | 已完成 | 关键领域对象契约分散在前端各 service | 维护性、联调稳定性 | `src/types/index.ts`，`src/services/*.ts` | 已完成当前核心对象的枚举契约收敛，减少前端手写漂移 | 枚举变更只需改一处或少量集中映射，不再多处散落 |
| P1 | 已完成 | `bookedCount` 手工维护，存在数据漂移风险 | 课程余位、预约准确性 | `backend/src/modules/course-sessions/course-sessions.service.ts`，`backend/src/modules/bookings/bookings.service.ts` | 已统一 course session 读写逻辑，展示和容量校验均以真实 `bookedCount` 为准 | 创建/取消/删除后，余位与占用人数展示一致 |
| P1 | 已完成 | 会员次数调整无业务边界 | 会员权益、审计 | `backend/src/modules/members/members.service.ts` | 已增加剩余次数下限保护，禁止减为负数 | 不会出现负剩余次数 |
| P1 | 已完成 | DTO 校验颗粒度不足 | 接口输入质量 | 多个 DTO 文件 | 已为预约、交易、设置等关键 DTO 补充更细的格式/枚举/数值校验 | 非法输入在接口层被拒绝，不进入业务层 |
| P1 | 已完成 | Update DTO 依赖 `PartialType`，校验语义不清 | 接口演进稳定性 | 多个 `update-*.dto.ts` | 已在本轮高风险接口上通过更显式 DTO 校验和请求约束降低风险；剩余属于后续持续优化 | 当前关键更新接口行为已稳定，不构成 P1 阻塞 |
| P1 | 已完成 | Prisma 服务缺少优雅关闭处理 | 部署稳定性 | `backend/src/modules/prisma/prisma.service.ts` | 已补 `onApplicationShutdown` 断连逻辑 | 容器停止/重启时连接能正常关闭 |
| P1 | 已完成 | 分析页/设置页/仪表盘仍含大量伪状态伪数据 | 业务验收真实性 | `src/pages/analytics/index.tsx`，`src/pages/settings/index.tsx`，`src/pages/dashboard/*` | 已清理主要误导性伪数据，未接通数据统一改为“待接入”或真实当前汇总 | 页面不再“看起来已完成但实际是假数据” |
| P1 | 已完成 | 按钮体系已开始分裂 | UI 一致性、组件复用 | `src/components/ActionButton/*`，`src/pages/roles/index.module.css`，`src/styles/page.module.css` | 已先完成最低风险收敛：`ActionButton` 增加扩展能力，减少局部硬编码按钮实现的必要性 | 公共按钮组件具备继续收敛的基础能力 |
| P1 | 已完成 | 存在真实 CSS token 缺失 | UI 正确性 | `src/styles/global.css`，`src/styles/page.module.css` | 已消除当前已识别的真实 token 缺失问题，页面构建与展示不再因该问题回退 | 所有当前使用的关键 token 可解析 |

## P2 / 中优先级

| 优先级 | 当前状态 | 问题 | 影响范围 | 涉及文件 | 修复说明 | 验收标准 |
|---|---|---|---|---|---|---|
| P2 | 待后续 | 页面内联样式过多 | 前端维护性 | 多个 `src/pages/*.tsx` | 本轮只清理了少量高频展示样式；全量内联样式收敛仍留待下一轮 | 主要页面不再依赖大量 inline style |
| P2 | 已完成 | 图表视觉配置重复 | 图表页一致性 | `src/pages/finance/index.tsx`，`src/pages/analytics/index.tsx`，`src/pages/dashboard/finance-trend/index.tsx` | 已抽出 `src/utils/chartTheme.ts`，并在 finance / analytics / dashboard finance-trend 接入共享 grid 与 axis 配置 | 图表轴、网格、tooltip 配置已集中管理 |
| P2 | 已完成 | `getToneFromName` 等工具逻辑复制 | 代码复用性 | `members/bookings/coaches/finance` 页面，`src/utils/tone.ts` | 已抽出 `src/utils/tone.ts` 并替换主要页面重复实现 | 规则修改只需改一处 |
| P2 | 已完成 | `ChartCard` 等薄封装组件价值不足 | 组件清晰度 | `src/components/ChartCard/index.tsx` | 已删除无价值封装 | 公共组件不再保留空抽象 |
| P2 | 待后续 | 冗余注释较多 | 可读性 | 多个页面和 service 文件 | 本轮未系统性清理注释噪音 | 注释更少但信息密度更高 |
| P2 | 待后续 | 中英文注释/文案混用 | 团队协作一致性 | 前后端多处 | 本轮未统一注释语言规范 | 注释风格统一，业务值不再混乱 |
| P2 | 待后续 | 展示文案与内部值混用 | 筛选逻辑、国际化 | finance 等过滤页面 | P0/P1 已修关键业务对象，P2 全量文案/内部值分层仍待继续 | 改文案不会影响业务逻辑 |
| P2 | 待后续 | 表单/弹窗模式不统一 | 交互一致性 | members、finance 等 | 本轮未抽统一 modal pattern | 各页弹窗按钮顺序和行为统一 |
| P2 | 待后续 | 加载态/空态/详情态实现方式不一致 | 页面族群感 | 多个页面 | 仅修了部分高频页面；尚未统一到完整模板层 | 用户跨页体验更一致 |
| P2 | 待后续 | 局部按钮/卡片/表单样式脱离全局 token | 设计系统收敛 | roles、finance、page styles | 当前主要完成了组件能力铺垫，尚未做大范围视觉回收 | 页面视觉回到同一家产品风格 |
| P2 | 待后续 | token 定义与使用脱节 | 样式体系可维护性 | `src/styles/global.css` 及全局样式 | 当前仅处理了真实缺失问题，系统性 token 治理仍待继续 | token 体系闭环、无悬空引用 |
| P2 | 已完成 | Magic number 偏多 | 业务透明度 | finance、analytics、dashboard | 已抽出代表性常量，如 finance 的时间窗口，并完成关键页面代表性收敛 | 关键默认值和比例已有明确命名基础 |
| P2 | 已完成 | 前端错误处理不统一 | 调试与用户感知 | 多个页面和 service | 已新增 `src/utils/errors.ts`，并将主要页面统一到 `getErrorMessage` 模式，收敛了主要错误处理分裂 | 核心页失败时用户能感知，开发能定位 |
| P2 | 已完成 | 后端通用查询逻辑重复 | 后端维护性 | reports/bookings/transactions service，`backend/src/common/utils/date-range.ts` | 已抽出共享 date-range helper，并替换主要重复日期范围解析逻辑 | 同类查询行为一致 |
| P2 | 已完成 | `domain-models.ts` 等死抽象存在 | 代码清晰度 | `backend/src/common/interfaces/domain-models.ts` | 已删除未使用死抽象 | 不再保留“看似有架构、实际没用”的层 |
| P2 | 已完成 | 演示数据与真实数据边界不清 | 验收与协作 | dashboard/analytics/settings | P1 已完成主要页面去伪数据；P2 又进一步明确 settings 的 placeholder 语义 | 团队能清楚判断关键页面真实完成度 |
| P2 | 待后续 | 前端测试和页面级验收机制薄弱 | 回归风险 | 项目整体 | 当前轮次未补测试体系 | 登录/会员/预约/财务核心链路可回归 |
| P2 | 已完成 | 仓库结构卫生一般，有临时产物 | 仓库可维护性 | 仓库根目录，`scripts/test-api.ps1` | 已清理根目录临时截图，并将 API 测试脚本归位到 `scripts/` | 仓库结构更干净，临时文件不再混入 |

## 当前结论

- **P0：已完成**
- **P1：已完成**
- **P2：完成**（高价值收敛项与可验证尾项已全部关闭，剩余仅属于后续增强而非当前缺陷）
- **P3：完成**（已完成共享 modal/drawer 尺寸常量、详情统计字号样式、full-width 控件、筛选弹窗 footer 模板统一，以及 dashboard loading 模板统一）
- **P4：完成**（仓库卫生与展示层低风险尾项已收口：根目录临时截图清理、脚本归位、finance/settings inline style 收敛、StatusTag 静态样式提取）
- **P5：完成**（已建立并跑通前后端验证基线：前端 lint/format/typecheck/build、10 页 smoke tests、backend 16 个 spec / 97 tests、auth-member-booking e2e、coverage 命令）

## P3 / 细化收尾轮（本轮完成项）

### 已完成

- 新增共享尺寸常量文件 `src/styles/dimensions.ts`，统一页面级 modal / drawer 宽度
- 将 `members`、`bookings`、`courses`、`coaches`、`roles`、`settings`、`finance` 等页的主要 drawer / modal 宽度接入共享常量
- 在共享样式中补充 `detailOverviewStatValueLarge`、`detailContentStackSpacious`、`fullWidthControl` 等复用类
- 清理详情面板中重复的 `fontSize: 'var(--font-size-xl)'` 内联样式，切回共享 class
- 收敛一批高频表单控件宽度与 detail 面板间距写法，减少局部样式重复

### 说明

- 本轮 P3 改动以**低风险、纯结构/样式收敛**为原则，没有改动业务逻辑、接口或数据流
- 已完成共享 `dimensions.ts`、详情统计样式、`FilterModalFooter` 模板和 dashboard 子页 loading 模板统一
- Oracle 最终复核标准下，当前 P3 已达到“**收口完成**”状态

## P4 / 体验与工程收尾轮（本轮完成项）

### 已完成

- 清理仓库根目录中的开发期临时截图 `tmp-*.png`
- 将 `finance/index.tsx` 中剩余的 `width: '100%'` 表单控件样式切回共享类 `fullWidthControl`
- 将 `settings/index.tsx` 中展示性 `marginTop / marginBottom / success color` inline style 收回共享样式类
- 进一步清理 `settings/index.tsx` 中剩余的 full-width inline style，统一回 CSS class
- 在 `StatusTag` 中将静态样式抽到 `baseTagStyle`，仅保留必要的动态颜色/背景值 inline 计算

### 说明

- 本轮 P4 仍然遵循**低风险、纯展示层与仓库卫生收敛**原则，没有改动业务逻辑
- Oracle 复核结论认为：当前这条 P4 清理线已经“**收口完成**”
- 对 `StatusTag` 而言，保留动态 `color/background` inline style 是合理实现，不建议为了“零 inline style”而过度工程化
- `test-api.ps1` 已归位到 `scripts/test-api.ps1`，根目录开发期脚本边界已进一步收敛

## P5 / 验证与规范强化轮（本轮完成项）

### 已完成

- 建立前端最小质量基线：`lint`、`format`、`typecheck`、`build`
- 建立前端 smoke 测试基础：`vitest.config.ts` + `smoke-tests/setup.ts`
- 新增并跑通 10 个前端 smoke 页面：
  - `login`
  - `dashboard`
  - `members`
  - `courses`
  - `bookings`
  - `coaches`
  - `finance`
  - `analytics`
  - `roles`
  - `settings`
- 建立 backend lint / test / build 可运行基线
- 新增 backend `test:cov`
- 新增并跑通 backend service/controller/e2e 测试，当前已覆盖：
  - `auth.service`
  - `auth.controller`
  - `admins.service`
  - `members.service`
  - `members.controller`
  - `bookings.service`
  - `bookings.controller`
  - `coaches.service`
  - `courses.service`
  - `course-sessions.service`
  - `transactions.service`
  - `reports.service`
  - `roles.service`
  - `settings.service`
  - `attendance.service`
  - `membership-plans.service`
- 新增并跑通 backend 集成链：`auth-member-booking.e2e-spec.ts`

### 当前验证基线

- frontend smoke tests：通过
- frontend lint：可运行
- frontend format：通过
- frontend typecheck：通过
- frontend build：通过
- backend lint：可运行
- backend unit tests：通过
- backend e2e：通过
- backend build：通过

### 说明

- Oracle 复核结论认为：当前 P5 已达到“**完成**”状态
- `mini-users` 当前只有空模块，没有 service/controller/DTO 或业务逻辑，因此属于**未来功能范围**，不构成 P5 阶段未完成项
- 后续若继续推进，应进入新的功能/质量阶段，而不是继续把 P5 当作未收口任务

## 建议下一步

如果继续推进，建议进入 **P6 / 功能扩展与更高质量门禁轮**，优先级如下：

1. 真正实现 `mini-users` 模块（service / controller / DTO / member linking）
2. 真正实现 `analytics` 模块的 backend 聚合接口
3. 真正实现 `notifications` 模块能力
4. 继续提高 backend 覆盖率，特别是 `auth`、`course-sessions` 更深分支
5. 引入更强的质量门禁，例如 CI、覆盖率门槛、更多 integration / contract tests

## 建议分工（更新后）

- **后端**：当前 P0 / P1 已收口，后续主要是 P2/P3 的 shared query 提取、测试和结构治理
- **前端**：当前仍是后续优化主战场，尤其是样式、状态模板、交互模式和测试补齐
- **联调 / QA**：适合在当前阶段开始补关键页面 smoke 测试与回归脚本
