# Round 5 UI 测试记录（2026-04-30）

## 测试范围

- 交互态优先复测：详情抽屉打开态、图表中断点可读性
- 页面：finance / notifications（重点）
- 断点：390 / 769 / 820 / 900 / 1024

## 结果摘要

- 状态：完成
- 发现问题数：1
- 已修复：1
- 关键结论：
  - finance 详情抽屉已补齐移动端响应式宽度约束
  - finance 趋势图在 769~1024 未出现刻度相邻重叠

## Bug 列表

| ID | 严重级别 | 页面/模块 | 问题 | 复现步骤 | 状态 |
|---|---|---|---|---|---|
| R5-001 | High | 财务报表 `/finance`（详情抽屉） | 抽屉未接入响应式 wrapper，窄屏下存在超视口风险 | 390x844 打开“核对详情”抽屉，检查抽屉右边界 | 已修复 |

## 修复动作

- `src/pages/finance/index.tsx`
  - 详情抽屉增加 `rootClassName={pageCls.responsiveDetailDrawer}`。

## 回归结果

- 抽屉打开态复测（390x844）：
  - `docOverflow = 0`
  - 抽屉宽度约 `374px`
  - 抽屉右边界未越过视口

- finance 趋势图中断点可读性（769/820/900/1024）：
  - X 轴相邻刻度重叠数：0

- 自动化门禁：
  - `npm run lint` 通过
  - `npm run typecheck` 通过
  - `npm run smoke-test` 通过（11/11）
  - `npm run build` 通过
