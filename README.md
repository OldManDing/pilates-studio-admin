# Pilates Studio - 普拉提工作室管理系统

完整的普拉提工作室管理解决方案，包含管理后台、后端 API 和小程序端。

## 系统架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Admin Frontend │────▶│   NestJS API    │────▶│   MySQL 8.0     │
│  React + Umi 4  │     │   Node.js 20    │     │   Database      │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
┌─────────────────┐              │
│  Mini Program   │──────────────┘
│  Taro 3.6       │     RESTful API
└─────────────────┘
```

## 技术栈

- **管理后台**: React 18 + Umi 4 + Ant Design 5 + TypeScript + Recharts
- **后端 API**: NestJS 10 + Prisma 5 + MySQL 8.0 + JWT Auth
- **小程序**: Taro 3.6 + React 18 + TypeScript + SCSS
- **部署**: Docker + Docker Compose + Nginx

## 快速开始

### 使用 Docker Compose（推荐）

```bash
# 1. 克隆代码
git clone <repository-url>
cd pilates-studio-admin

# 2. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env，设置强密码和 JWT Secret

# 3. 编译前端
npm install
npm run build

# 4. 启动服务
docker-compose up -d

# 5. 运行数据库迁移
docker-compose exec backend npx prisma migrate deploy

# 6. 访问系统
# 管理后台: http://localhost
# API 文档: http://localhost/api/docs
# 健康检查: http://localhost:3000/api/health
```

### 手动部署

详见 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 项目结构

```
pilates-studio-admin/
├── backend/                 # NestJS 后端
│   ├── src/
│   │   ├── modules/        # 功能模块 (auth, members, courses, bookings...)
│   │   ├── common/         # 拦截器、过滤器、守卫、DTO
│   │   └── config/         # 配置文件
│   ├── prisma/
│   │   ├── schema.prisma   # 数据库模型
│   │   └── seed.ts         # 种子数据
│   ├── Dockerfile          # 容器配置
│   ├── docker-compose.yml  # 服务编排
│   └── .env.example        # 环境变量模板
├── src/                    # Umi 前端
│   ├── pages/              # 页面
│   ├── components/         # 组件
│   └── services/           # API 服务
├── docker-compose.yml      # Docker 编排 (根目录)
├── nginx.conf              # Nginx 配置
├── DEPLOYMENT.md           # 部署文档
├── SECURITY.md             # 安全清单
└── README.md               # 本文件

pilates-studio-mini/        # 小程序 (独立目录)
├── src/
│   ├── pages/              # 9 个页面
│   ├── components/         # 共享组件
│   ├── api/                # API 封装
│   └── constants/          # 品牌色、枚举
├── RELEASE.md              # 发布指南
└── .env.example            # 环境变量模板
```

## 管理后台页面

1. 仪表盘 - 运营总览、今日动态、异常优先处理、近期排程与运营诊断
2. 会员管理 - 会员 CRUD、会籍状态
3. 课程管理 - 课程卡片、排期
4. 预约管理 - 预约列表、签到确认
5. 教练管理 - 教练资料、排班
6. 财务报表 - 收支 KPI、交易记录
7. 数据分析 - 课程热度、雷达图
8. 系统设置 - 门店配置、通知设置、安全设置与数据管理
9. 角色权限 - RBAC 权限矩阵

## 小程序页面

1. 首页 - 快捷入口、会员卡状态、精选课程/教练
2. 课程列表 - 类型/难度筛选
3. 课程详情 - 教练介绍、课程安排、预约
4. 教练列表 - 专业标签、授课程
5. 教练详情 - 简介、认证、近期排课
6. 会员卡 - 我的会员卡/购买卡片
7. 我的预约 - 状态筛选、取消预约
8. 个人中心 - 统计、菜单导航
9. 消费记录 - 累计消费、交易明细

## 环境要求

- Node.js 20+
- MySQL 8.0+
- Docker 20.10+ (推荐)

## 开发命令

```bash
# 后端
cd backend
npm install
npm run dev              # 开发模式 (http://localhost:3000)
npm run build            # 构建
npm run prisma:migrate:dev  # 数据库迁移
npm run seed             # 注入种子数据

# 前端
cd pilates-studio-admin
npm install
npm run dev              # 开发服务器 (http://localhost:8000)
npm run typecheck        # TypeScript 类型检查
npm run lint             # ESLint 代码检查
npm run smoke-test       # 页面级 smoke 测试
npm run build            # 生产构建

# 小程序
cd pilates-studio-mini
npm install
npm run dev:weapp        # 微信开发模式
npm run build:weapp      # 生产构建
```

## 部署检查清单

部署前请务必完成 [SECURITY.md](./SECURITY.md) 中的所有检查项。

关键事项：
- [ ] 修改所有默认密码
- [ ] 生成强 JWT Secret
- [ ] 配置 HTTPS
- [ ] 限制 CORS 域名
- [ ] 启用数据库备份

## API 文档

启动后端后访问 `http://localhost:3000/api/docs` 查看 Swagger 文档。

## 数据库

### 迁移

```bash
# 开发
docker-compose exec backend npx prisma migrate dev

# 生产
docker-compose exec backend npx prisma migrate deploy
```

### 备份与恢复

```bash
# 备份
docker-compose exec mysql mysqldump -u root -p pilates_studio > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复
docker-compose exec -T mysql mysql -u root -p pilates_studio < backup.sql
```

## 监控与健康检查

```bash
# API 健康
curl http://localhost:3000/api/health

# 数据库连接
curl http://localhost:3000/api/health/db

# 日志
docker-compose logs -f backend
```

## 更新流程

```bash
# 1. 备份
docker-compose exec mysql mysqldump -u root -p pilates_studio > backup.sql

# 2. 更新代码并重建
git pull
docker-compose down
docker-compose up --build -d

# 3. 运行迁移
docker-compose exec backend npx prisma migrate deploy

# 4. 验证
curl http://localhost:3000/api/health
```

## 文档导航

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 详细部署指南
- [SECURITY.md](./SECURITY.md) - 生产安全清单
- [backend/prisma/schema.prisma](./backend/prisma/schema.prisma) - 数据库模型
- [pilates-studio-mini/RELEASE.md](../pilates-studio-mini/RELEASE.md) - 小程序发布指南

## 许可证

[MIT](LICENSE)
