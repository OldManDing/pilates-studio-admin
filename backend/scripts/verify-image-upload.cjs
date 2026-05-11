const crypto = require('crypto');
const sharp = require('sharp');

function readOption(name, envName, fallback = '') {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  if (arg) {
    return arg.slice(prefix.length).trim();
  }

  return (process.env[envName] || fallback).trim();
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '');
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function createUploadBuffer() {
  const width = 1800;
  const height = 1200;
  const raw = crypto.randomBytes(width * height * 3);
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 94 })
    .toBuffer();
}

async function main() {
  const baseUrl = normalizeBaseUrl(readOption('base-url', 'API_BASE_URL', 'http://127.0.0.1:3000/api'));
  const email = readOption('email', 'ADMIN_EMAIL');
  const password = readOption('password', 'ADMIN_PASSWORD');
  const maxBytes = Number(readOption('max-bytes', 'IMAGE_MAX_OUTPUT_BYTES', '512000'));

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required for upload verification.');
  }

  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await readJsonResponse(loginResponse);
  const token = loginBody?.data?.accessToken;
  if (!loginResponse.ok || !token) {
    throw new Error(`Login failed with HTTP ${loginResponse.status}: ${JSON.stringify(loginBody)}`);
  }

  const inputBuffer = await createUploadBuffer();
  const form = new FormData();
  form.append('file', new Blob([inputBuffer], { type: 'image/jpeg' }), 'image-upload-smoke.jpg');

  const uploadResponse = await fetch(`${baseUrl}/uploads/images?purpose=courseCover`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const uploadBody = await readJsonResponse(uploadResponse);
  const uploaded = uploadBody?.data;
  if (!uploadResponse.ok || !uploaded?.url) {
    throw new Error(`Upload failed with HTTP ${uploadResponse.status}: ${JSON.stringify(uploadBody)}`);
  }

  if (uploaded.url.startsWith('data:image/')) {
    throw new Error('Upload returned an inline data URL instead of an object-storage URL.');
  }

  const objectResponse = await fetch(uploaded.url);
  const downloaded = Buffer.from(await objectResponse.arrayBuffer());
  if (!objectResponse.ok) {
    throw new Error(`Uploaded object is not publicly readable: HTTP ${objectResponse.status}`);
  }

  const metadata = await sharp(downloaded).metadata();
  if (uploaded.size > maxBytes || downloaded.length > maxBytes) {
    throw new Error(`Optimized image exceeds ${maxBytes} bytes: api=${uploaded.size}, downloaded=${downloaded.length}`);
  }

  console.log(JSON.stringify({
    inputBytes: inputBuffer.length,
    outputBytes: uploaded.size,
    downloadedBytes: downloaded.length,
    format: uploaded.format,
    width: uploaded.width,
    height: uploaded.height,
    metadataFormat: metadata.format,
    urlPrefix: uploaded.url.split('/images/')[0],
    objectName: uploaded.objectName,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
