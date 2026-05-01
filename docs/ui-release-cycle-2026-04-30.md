# UI 上线前测试修复主跟踪（2026-04-30）

- 目标：执行 3 轮 UI 测试 → 记录 bug → 修复 → 回归，直到达到上线标准。
- 口径：每轮必须有独立 md 文档；即使 0 bug，也必须留下测试证据与结论。

## 轮次总览

| 轮次 | 文档 | 发现问题数 | 已修复 | 回归状态 |
|---|---|---:|---:|---|
| Round 1 | `docs/ui-release-round1-2026-04-30.md` | 1 | 1 | 通过 |
| Round 2 | `docs/ui-release-round2-2026-04-30.md` | 0 | 0 | 通过 |
| Round 3 | `docs/ui-release-round3-2026-04-30.md` | 2 | 2 | 通过 |
| Round 4 | `docs/ui-release-round4-2026-04-30.md` | 2 | 2 | 通过 |
| Round 5 | `docs/ui-release-round5-2026-04-30.md` | 1 | 1 | 通过 |
| Round 6 | `docs/ui-release-round6-2026-04-30.md` | 0 | 0 | 通过 |
| Round 7 | `docs/ui-release-round7-2026-04-30.md` | 1 | 1 | 通过 |
| Round 8 | `docs/ui-release-round8-2026-04-30.md` | 2 | 2 | 通过 |
| Round 9 | `docs/ui-release-round9-2026-05-01.md` | 24 | 24 | 通过 |
| Round 10 | `docs/ui-release-round10-2026-05-01.md` | 29 | 29 | 通过 |
| Round 11 | `docs/ui-release-round11-2026-05-01.md` | 22 | 22 | 通过 |
| 补测（布局错乱专项） | 本文档补充记录 | 14 | 14 | 通过 |

## 上线门禁

- `npm run lint`
- `npm run typecheck`
- `npm run smoke-test`
- `npm run build`
- 核心页面无控制台 error / 失败请求
- 关键交互链路可完成（登录、筛选、详情、状态动作、分页、弹窗/抽屉）

## 本周期结论

- 本周期从“通知队列问题修复完成后的基线”重新起测。
- 八轮 UI 测试与专项补测累计定位 14 个可复现问题（5 个详情抽屉移动端溢出、1 个通知接收对象长文本撑布局、2 个通知队列中宽屏布局挤压相关问题、3 个 finance 移动端布局问题、1 个会员详情统计区拥挤问题、1 个教练详情统计区拥挤问题、1 个课程详情首卡片宽度失衡问题）。
- 以上 14 项均已完成代码修复并通过门禁回归；Round8 完成课程/教练详情态收口。
- 详情页专项终审（bookings/roles）已补跑，3 个历史 High 全部闭合，当前 **High/Blocker 残留 = 0**。
- 新增三轮功能深测（Round9~Round11）累计新增问题 75 项（24 + 29 + 22），已全部修复并回归通过。
- 当前补测结论可作为上线依据之一。
