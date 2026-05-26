# 愈己 Pilates Studio 安全检查清单

本文档用于后台 Web、后台 API、小程序和生产部署的安全验收。发布前必须确认真实环境变量和服务器配置，不要只依赖本地构建通过。

## 当前已落地的安全措施

- 后台 API 使用 NestJS `ValidationPipe`，开启 `whitelist`、`forbidNonWhitelisted` 和类型转换，减少非法字段进入业务层。
- 后台 API 生产环境禁止 `CORS_ORIGINS=*`，避免任意来源携带凭证访问接口。
- 后台 API 使用 Helmet、JWT 鉴权、刷新令牌、bcrypt 密码哈希和登录限流。
- 后台 Web 的 nginx 配置已加入 `Content-Security-Policy`、`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy`，生产 HTTPS 配置加入 HSTS。
- 数据访问主要通过 Prisma ORM，常规业务代码不拼接 SQL。
- `.gitignore` 已忽略 `.env`、私钥、证书和本地日志文件。

## 发布前检查

1. 确认生产环境没有使用示例密码、默认数据库密码或本地调试密钥。
2. 执行前端和后端 `npm audit --omit=dev`，结果必须为 `found 0 vulnerabilities` 或有明确风险接受记录。
3. 执行构建和 smoke test，确认登录、课程、预约、上传、门店设置等关键页面可用。
4. 浏览器访问生产后台，确认控制台没有 CSP、资源加载、接口跨域或混合内容错误。
5. 用 `curl -I` 或浏览器网络面板确认生产响应头包含 CSP、HSTS、nosniff、frame 限制和权限策略。
6. 确认数据库、MinIO、Redis 等内部服务没有直接暴露公网端口。
7. 确认 Swagger 生产环境默认关闭，只有明确设置 `ENABLE_SWAGGER=true` 时才开放。

## 运行与运维要求

- 生产密钥长度至少 32 字符，数据库密码至少 16 字符，并定期轮换。
- 后台管理员账号必须使用强密码；离职或权限变更后及时禁用账号。
- 重要操作保留审计日志，包括登录、数据修改、删除、退款、通知发送和系统设置变更。
- 服务器只开放必要端口，通常只需要 80 和 443 对公网开放。
- 生产日志不得输出 JWT、密码、短信验证码、微信 openId 之外的敏感明文。
- 数据库和对象存储需要定期备份，并至少验证过一次恢复流程。

## 事件处理

1. 发现异常脚本、异常登录或恶意请求后，先保留进程、日志、命令行和时间线证据。
2. 立即隔离可疑入口，必要时临时下线后台或关闭对应账号。
3. 轮换 JWT 密钥、数据库密码、对象存储密钥和服务器登录凭证。
4. 检查最近发布包、服务器 crontab、systemd、nginx 配置、Docker 容器和 SSH 登录记录。
5. 修复根因后再恢复服务，并补充本文件或部署清单中的缺失项。
