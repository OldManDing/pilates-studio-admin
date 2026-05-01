# Round 7 UI 测试记录（2026-04-30）

## 测试范围

- 详情态专项（优先抽屉打开态）
- 页面：notifications / members / bookings / courses / finance / settings
- 断点：mobile（390）+ desktop（1366）
- 指标：抽屉内容可见性、页面横向溢出、详情区统计卡可读性

## 结果摘要

- 状态：完成
- 发现问题数：1
- 已修复：1

## Bug 列表

| ID | 严重级别 | 页面/模块 | 问题 | 复现步骤 | 状态 |
|---|---|---|---|---|---|
| R7-001 | Medium | 会员详情抽屉 `/members` | 会员概览统计区在桌面抽屉宽度下为 3 列，文本拥挤，可读性下降 | 桌面打开“查看详情”，观察“会员概览”中的“加入时间/当前会籍”卡片 | 已修复 |

## 修复动作

- `src/pages/members/index.module.css`
  - `profileHeroMeta`：从 3 列改为 2 列。
  - `profileStatGrid`：从 3 列改为 2 列。

## 回归结果

- 抽屉打开态复测：
  - members desktop：统计区两列展示，未见重叠或挤压。
  - members mobile：统计区单列展示，内容可读，无横向溢出。
- 详情态横向溢出指标（本轮重点页）：未出现正值。

- 自动化门禁：
  - `npm run lint` 通过
  - `npm run typecheck` 通过
  - `npm run smoke-test` 通过（11/11）
  - `npm run build` 通过
