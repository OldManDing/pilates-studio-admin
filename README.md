# Pilates Studio Admin

一个基于 **React 18 + Umi 4 + Ant Design 5 + TypeScript + Recharts + CSS Modules** 构建的高保真 Pilates Studio SaaS 管理后台前端项目。

本项目根据一组 Pilates Studio 后台截图从 0 搭建，包含完整布局、8 个核心业务页面、统一设计系统、Mock 数据和可运行演示。

## 项目特性

- React 18 + Umi 4 路由方案
- Ant Design 5 组件体系
- TypeScript 严格类型
- Recharts 图表统一方案
- CSS Modules 样式隔离
- 高保真 SaaS 后台视觉风格
- 全局设计 Token 与统一交互态
- Mock 数据可直接演示

## 页面列表

1. 仪表盘
2. 会员管理
3. 课程管理
4. 预约管理
5. 教练管理
6. 财务报表
7. 数据分析
8. 系统设置

## 目录结构

```text
src/
  layouts/
  pages/
    dashboard/
    members/
    courses/
    bookings/
    coaches/
    finance/
    analytics/
    settings/
  components/
  styles/
  utils/
  mock/
```

## 本地运行

> Windows PowerShell 下建议使用 `npm.cmd`

```powershell
cd C:\Users\MrDing\pilates-studio-admin
npm.cmd install
npm.cmd run dev
```

默认访问地址：

- http://localhost:8000

## 常用命令

```powershell
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run build
```

## 设计说明

- 风格方向：高级、简洁、企业级 SaaS 后台
- 主色：薄荷绿 / 青绿色
- 辅助色：紫色 / 橙色 / 粉色 / 蓝色
- 布局：固定侧边导航 + 顶部标题说明 + 卡片化内容区
- 视觉特点：大圆角、轻阴影、暖白背景、柔和高亮、统一状态标签与按钮体系

## 当前状态

- 已完成完整前端搭建
- 已完成多轮高保真视觉微调
- 已通过类型检查与生产构建

## 技术栈

- React 18
- Umi 4
- Ant Design 5
- TypeScript
- Recharts
- CSS Modules

## 说明

本项目当前为前端演示版本，数据由本地 Mock 提供，便于后续快速接入真实 API。
