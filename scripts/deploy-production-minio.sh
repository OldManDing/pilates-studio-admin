#!/usr/bin/env sh
set -eu

REPO_DIR="${REPO_DIR:-/opt/pilates-studio-admin}"
BRANCH="${BRANCH:-master}"
API_BASE_URL="${API_BASE_URL:-https://api.xmlga.top/api}"
ENV_FILE="${ENV_FILE:-.env}"

compose() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo "docker compose or docker-compose is required." >&2
    exit 1
  fi
}

require_env_key() {
  key="$1"
  if ! grep -Eq "^${key}=" "$ENV_FILE"; then
    echo "Missing ${key} in ${ENV_FILE}." >&2
    exit 1
  fi
}

cd "$REPO_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Production env file not found: $REPO_DIR/$ENV_FILE" >&2
  exit 1
fi

require_env_key "MINIO_ACCESS_KEY"
require_env_key "MINIO_SECRET_KEY"
require_env_key "MINIO_BUCKET"
require_env_key "MINIO_PUBLIC_BASE_URL"
require_env_key "IMAGE_MAX_OUTPUT_BYTES"

echo "Fetching latest ${BRANCH}..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "Building admin frontend..."
npm ci
npm run build

echo "Building and restarting production containers..."
compose up --build -d

echo "Running database migrations..."
compose exec -T backend npx prisma migrate deploy

echo "Migrating inline images to MinIO..."
compose exec -T backend npm run migrate:inline-images-to-minio

echo "Checking API health..."
curl -fsS "${API_BASE_URL}/health" >/dev/null

echo "Checking upload route exists..."
upload_status="$(curl -sS -o /tmp/pilates-upload-route-check.txt -w "%{http_code}" -X POST "${API_BASE_URL}/uploads/images" || true)"
if [ "$upload_status" = "404" ]; then
  echo "Upload route is still 404. Backend did not deploy the MinIO upload build." >&2
  cat /tmp/pilates-upload-route-check.txt >&2 || true
  exit 1
fi
echo "Upload route returned HTTP ${upload_status}; route is present."

if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  echo "Running authenticated image upload smoke..."
  compose exec -T \
    -e API_BASE_URL="$API_BASE_URL" \
    -e ADMIN_EMAIL="$ADMIN_EMAIL" \
    -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
    backend npm run verify:image-upload
else
  echo "Skipping authenticated upload smoke. Set ADMIN_EMAIL and ADMIN_PASSWORD to enable it."
fi

echo "Production MinIO rollout completed."
