# UI 测试自我进化记录（2026-04-30）

## 触发问题

- 用户连续反馈“通知队列布局错乱”，但此前轮次门禁与功能链路均通过。
- 说明现有测试更偏功能可用性，缺少“视觉几何约束”与“内容驱动型布局回归”拦截。

## 根因复盘

1. **验证口径偏功能**：主要检查 lint/typecheck/smoke/build 与交互成功，不足以捕获布局挤压。
2. **视觉检查缺少量化阈值**：没有对关键区块做边界重叠判定（overlap）与横向溢出扫描（scrollWidth）。
3. **内容压力场景覆盖不足**：长标签/多状态胶囊/右栏 Descriptions 这类组合在中小断点下更容易触发布局异常。

## 已落地的流程升级

### 1) 新增“几何级视觉门禁”

- 对关键页面（dashboard/notifications/members/bookings/courses/settings/finance）执行桌面+移动双断点截图。
- 自动采集：
  - `document.documentElement.scrollWidth - window.innerWidth`
  - 关键节点 bbox 重叠面积（如标题 vs 标签、正文 vs 按钮）
- 判定规则：
  - 横向溢出 > 0 直接标红
  - 关键区域 overlap > 0 直接标红

### 2) 通知卡片布局约束升级（已执行）

- 两栏卡片改为显式栅格区间，避免右栏反向挤压左栏。
- 右栏 `Descriptions` 统一 `table-layout: fixed` + `word-break`。
- 标题/标签/正文/操作区做分层约束，禁止互相挤压。

### 3) 移动端横向溢出专项扫描（已执行）

- 本轮扫描发现 finance 页面在 `390x844` 下出现 `docOverflow=42`。
- 根因为 `statusMetaWrap` 在移动端不换行导致摘要胶囊横向超出。
- 已修复为 finance 局部类在移动端 `width:100% + flex-wrap:wrap`。

## 后续固定清单（每轮必跑）

1. 代码门禁：`lint` / `typecheck` / `smoke-test` / `build`
2. 视觉门禁：关键页面双断点截图 + overflow 指标
3. 几何断言：关键卡片标题/标签、正文/按钮 overlap 必须为 0
4. 文档闭环：每轮 bug 列表、修复动作、回归证据必须同步

## 验证证据

- 通知卡片修复后几何结果：
  - `overlapTypeTitle = 0`
  - `overlapPreviewActions = 0`
- finance 移动端修复后：
  - `scrollWidth - innerWidth <= 0`（不再横向溢出）
