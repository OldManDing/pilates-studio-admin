# Pilates Studio 生产上线实施计划

## 1. 发布冻结

- 冻结后台、小程序和后端 API 候选版本，确认所有改动已提交并打发布 tag。
- 清理开发期截图、日志和临时文件，确认 `git status --short` 只剩计划内文件。
- 明确发布窗口、发布负责人、回滚负责人、数据库负责人和小程序提交负责人。

## 2. 自动化门禁

生产主机上先从样板创建真实配置：

```powershell
Copy-Item production.env.example .env
```

然后填入真实域名、数据库密码、JWT secret、微信配置和支付配置。发布前执行：

```powershell
npm.cmd run release:check -- -MiniRoot F:\pilates-studio-mini -BackendEnvPath .env -MiniEnvPath F:\pilates-studio-mini\.env
```

部署后执行 API smoke：

```powershell
npm.cmd run release:check -- -MiniRoot F:\pilates-studio-mini -BackendEnvPath .env -MiniEnvPath F:\pilates-studio-mini\.env -RunApiSmoke -ApiBaseUrl https://api.example.com/api
```

门禁失败不得上线。`-AllowDirtyWorktree` 仅允许本地演练，不允许生产发布使用。

## 3. 生产环境配置

- 根目录 `.env` 是 Docker Compose 的生产配置来源，必须使用 `NODE_ENV=production`。
- 必填真实值：`DATABASE_URL`、`MYSQL_ROOT_PASSWORD`、`MYSQL_PASSWORD`、`JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET`、`CORS_ORIGINS`。
- `CORS_ORIGINS` 只能配置生产 HTTPS 域名，不能使用 `*`、`localhost` 或 `127.0.0.1`。
- 小程序 `.env` 必须设置 `APP_ENV=production` 或 `MINI_RELEASE=true`，`API_BASE_URL` 必须指向生产 HTTPS API。
- 小程序发布必须关闭 `ALLOW_INSECURE_REAL_DEVICE_API` 和 `USE_MINI_OPEN_ID_LOGIN`。
- 微信 AppID、微信登录密钥、订阅消息模板、客服电话和客服邮箱必须使用生产值。

## 4. 容器与数据库部署

1. 创建生产 MySQL，限制公网访问，仅允许应用服务通过内网访问。当前生产 compose 不再暴露 MySQL 3306 到宿主机。
2. 上线前执行并校验一次备份：
   ```bash
   docker-compose exec mysql mysqldump -u root -p pilates_studio > backup_pre_launch.sql
   ```
3. 构建并启动容器：
   ```bash
   npm ci
   npm run build
   docker-compose up --build -d
   ```
4. 执行迁移：
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```
5. 首次上线才执行种子数据，并立即修改或轮换初始管理员密码：
   ```bash
   docker-compose exec backend npx prisma db seed
   ```

## 5. 外部平台配置

- 仓库内 `nginx.conf` 仍是本地/容器内 HTTP 配置；生产可参考 `nginx.production.example.conf` 或由云网关统一终止 TLS。
- 微信公众平台必须配置 request 合法域名，域名必须备案、HTTPS、无端口号。
- 如启用真实微信支付，必须配置商户号、证书/密钥、API v3 key、平台公钥和 HTTPS 回调地址，并设置 `WECHAT_PAY_MOCK=false`。
- 如果首版采用线下收款或人工确认支付，必须在运营 SOP 中明确支付闭环不依赖微信支付自动回调。

## 6. 上线验收

后台验收：

- 登录、刷新 token、退出登录、角色权限、会员、会员卡、课程、教练、排课、预约、签到、财务、退款、通知、设置备份恢复。

小程序验收：

- 微信登录、首页展示、课程查看、教练查看、预约、取消预约、晚取消扣次、会员续费、支付或人工支付确认、消费记录、个人中心、注销申请。

双端联动：

- 后台新增/编辑/上下架课程和排课后，小程序展示正确。
- 小程序预约、取消、支付、注销申请后，后台列表、详情、统计和状态正确同步。

异常场景：

- 接口失败、弱网、重复提交、无权限、无数据、支付回调重复、余位并发冲突、通知发送失败。

## 7. 回滚与发布后观察

- 回滚触发条件：登录不可用、预约主链路失败、支付/退款状态错乱、数据库迁移异常、核心页面 5xx 持续出现。
- 回滚顺序：停止新流量，保留日志，回滚应用镜像或静态资源，必要时按备份恢复数据库。
- 发布后 24 小时观察：API 健康检查、错误日志、慢接口、登录失败率、预约成功率、支付回调成功率、通知失败数。
- 发布后复盘：记录问题、修复负责人、是否需要 hotfix tag，并把修复合回主分支。
