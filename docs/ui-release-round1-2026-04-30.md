# Round 1 UI 测试记录（2026-04-30）

## 测试范围

- 自动化门禁：lint / typecheck / smoke-test / build
- 页面巡检：dashboard / settings / courses / members / bookings / finance / notifications / login / forgot-password
- 交互专项：筛选、分页、详情抽屉、状态按钮、通知队列

## 结果摘要

- 状态：完成
- `lint`：通过
- `typecheck`：通过
- `smoke-test`：通过（11/11）
- `build`：通过
- 核心页面控制台 error：0
- 核心页面失败请求：0
- 发现 1 个布局问题并当轮修复完成

## Bug 列表

| ID | 严重级别 | 页面/模块 | 问题 | 复现步骤 | 状态 |
|---|---|---|---|---|---|

| R1-001 | Medium | 财务报表（移动端） | 交易工作台卡片与操作区信息密度过高，页面视觉呈“拥挤/拉长” | 768 断点进入 `/finance`，观察交易卡片区与操作按钮堆叠 | 已修复 |

## 修复动作

- `src/pages/finance/index.tsx`
  - 引入 `finance/index.module.css`，为交易工具栏/卡片/动作区增加财务页专属布局类。
- `src/pages/finance/index.module.css`
  - 768 断点下优化卡片间距与动作区布局（2 列按钮网格），降低单卡高度与拥挤感。

## 回归结果

- 通过：自动化门禁全绿。
- 视觉复测：`finance-768-after-fix.png` 结果 PASS（无明显重叠、错位、横向溢出）。
