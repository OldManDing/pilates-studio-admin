# MinIO 图片存储上线执行说明

## 目的

把后台上传的课程图、教练图、门店图和小程序页面图统一压缩后存入 MinIO，避免继续把大体积 base64 图片写入数据库和接口响应。

## 上线前确认

- 服务器可以拉取 `origin/master` 最新代码。
- 生产 `.env` 保留现有 MySQL、JWT、微信配置，不要用本地草稿整体覆盖。
- 生产 `.env` 至少补齐这些图片存储配置：

```bash
IMAGE_MAX_OUTPUT_BYTES=512000
IMAGE_UPLOAD_MAX_BYTES=10485760
MINIO_IMAGE=minio/minio:RELEASE.2025-09-07T16-13-09Z
MINIO_ACCESS_KEY=<生产 MinIO access key>
MINIO_SECRET_KEY=<生产 MinIO secret key>
MINIO_BUCKET=pilates-images
MINIO_REGION=us-east-1
MINIO_SET_PUBLIC_READ=true
MINIO_PUBLIC_BASE_URL=https://api.xmlga.top/pilates-images
```

- Nginx 需要把 `https://api.xmlga.top/pilates-images/...` 代理到 MinIO bucket。仓库里的 `nginx.production.example.conf` 已包含参考配置。
- 微信小程序后台的 request/downloadFile 合法域名需要包含 `https://api.xmlga.top`。

## 推荐执行方式

在生产服务器执行：

```bash
cd /opt/pilates-studio-admin
export ADMIN_EMAIL=<可登录后台且有上传权限的账号>
export ADMIN_PASSWORD=<对应密码>
sh scripts/deploy-production-minio.sh
```

脚本会执行：

- 拉取 `origin/master`
- 构建后台前端
- `docker compose up --build -d`
- `prisma migrate deploy`
- `npm run migrate:inline-images-to-minio`
- 检查 `GET /api/health`
- 检查 `/api/uploads/images` 不再是 404
- 如提供 `ADMIN_EMAIL`/`ADMIN_PASSWORD`，执行真实图片上传 smoke

如果生产仓库路径不是 `/opt/pilates-studio-admin`：

```bash
REPO_DIR=/your/repo/path sh scripts/deploy-production-minio.sh
```

## 手工验证命令

如果不跑部署脚本，可以手工执行：

```bash
docker compose up --build -d
docker compose exec -T backend npx prisma migrate deploy
docker compose exec -T backend npm run migrate:inline-images-to-minio
curl -fsS https://api.xmlga.top/api/health
curl -sS -o /tmp/upload-check.txt -w "%{http_code}" -X POST https://api.xmlga.top/api/uploads/images
```

上传接口未带登录和文件时可以返回 `400` 或 `401`，但不能是 `404`。如果仍是 `404`，说明线上后端没有部署到包含上传接口的镜像。

带登录的完整上传验证：

```bash
docker compose exec -T \
  -e API_BASE_URL=https://api.xmlga.top/api \
  -e ADMIN_EMAIL=<后台账号> \
  -e ADMIN_PASSWORD=<后台密码> \
  backend npm run verify:image-upload
```

验证成功时会输出原图大小、压缩后大小、对象存储 URL 前缀和 objectName。压缩后大小必须小于等于 `512000` 字节。

## 回滚

如果部署后核心 API 异常：

```bash
git checkout <上一个稳定提交>
docker compose up --build -d
docker compose logs --tail=100 backend
curl -fsS https://api.xmlga.top/api/health
```

本次变更不删除原有数据库字段。已经迁移到 MinIO 的图片 URL 会继续指向对象存储；如需彻底回滚图片访问，需要保留 MinIO 服务或手工恢复上线前数据库备份。
