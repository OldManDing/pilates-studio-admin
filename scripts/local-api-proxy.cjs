const http = require('http');

const LISTEN_HOST = '127.0.0.1';
const LISTEN_PORT = Number(process.env.LOCAL_API_PROXY_PORT || 80);
const TARGET_HOST = process.env.LOCAL_API_TARGET_HOST || '127.0.0.1';
const TARGET_PORT = Number(process.env.LOCAL_API_TARGET_PORT || 3000);

const server = http.createServer((req, res) => {
  if (!req.url?.startsWith('/api/')) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: 'Local API proxy only serves /api/*' }));
    return;
  }

  const proxyRequest = http.request(
    {
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${TARGET_HOST}:${TARGET_PORT}`,
      },
    },
    (proxyResponse) => {
      res.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
      proxyResponse.pipe(res);
    },
  );

  proxyRequest.on('error', (error) => {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        success: false,
        message: 'Failed to reach local backend',
        detail: error.message,
      }),
    );
  });

  req.pipe(proxyRequest);
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(`Local API proxy listening on http://${LISTEN_HOST}:${LISTEN_PORT} -> http://${TARGET_HOST}:${TARGET_PORT}`);
});
