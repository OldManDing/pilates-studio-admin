# Round 2 测试与修复记录

## 测试范围

- 核心页面交互链路手测（筛选、打开抽屉/详情、状态动作）
- 控制台错误与失败请求巡检（7 个核心页面）
- 自动化回归：`lint` / `typecheck` / `smoke-test`

## 结果摘要

- 控制台错误：0
- 失败请求：0
- 自动化：全部通过

## Bug 列表

本轮针对通知队列追加专项测试后，发现 1 个问题并在当轮修复：

| ID | 严重级别 | 标题 | 复现 | 影响 | 状态 |
|---|---|---|---|---|---|
| R2-001 | Medium | 通知队列筛选区与卡片操作区在中小断点信息密度偏高 | 768/1200 断点查看通知队列，筛选控件与按钮区域拥挤 | 可读性与触达性下降 | 已修复 |

### 修复内容

- `src/pages/notifications/index.tsx`
  - 筛选区改为通知页专用布局类：`queueFilters` / `queueFilterSelect` / `queueQuickAction`
  - 分页区增加 `notificationPagination`，强化与卡片列表分隔
- `src/pages/notifications/index.module.css`
  - 筛选区改为网格布局（桌面 3+1，992 下 2 列，768 下 1 列）
  - 操作按钮间距与移动端排列优化（768 下纵向全宽）
  - 元信息行间距微调，提升卡片可读性

### 修复后验证

- `notifications-768-after-fix.png`：PASS（筛选区不再拥挤，卡片层次更清晰）
- `notifications-1200-after-fix.png`：PASS（筛选区与操作区布局自然）
- `lint` / `typecheck` / `smoke-test` / `build`：全部通过

## 回归结论

- Round 2 问题已闭环，通知队列在中小断点下可读性与触达性达到上线要求。
