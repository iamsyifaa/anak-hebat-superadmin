// fe-proxy.js : proxy lokal untuk tim FE supaya bisa memanggil backend di Vercel Preview.
// Kenapa perlu: Preview dilindungi Deployment Protection (butuh header x-vercel-protection-bypass),
// dan browser tidak boleh memegang rahasia itu. Proxy ini jalan di laptop developer, menambahkan
// header bypass dari variabel lingkungan, dan menangani CORS untuk localhost. Tanpa instalasi apa pun
// (hanya modul bawaan Node 18 ke atas).
//
// Pemakaian (Windows cmd):
//   set "TARGET=https://anaktumbuh-xxxxxxxx-nisrina1.vercel.app"
//   set "BYPASS=<secret-bypass>"
//   node fe-proxy.js
// Lalu di FE, base URL API = http://127.0.0.1:8787/api/v1
//
// Variabel opsional: PORT (bawaan 8787). Hanya melayani path /api/ dan /up.
// Tidak mencatat header, token, atau isi body.

const http = require('http');
const https = require('https');
const { URL } = require('url');

const TARGET = process.env.TARGET;
const BYPASS = process.env.BYPASS;
const PORT = Number(process.env.PORT || 8787);

if (!TARGET || !BYPASS) {
  console.error('Isi dulu TARGET dan BYPASS (lihat komentar di bagian atas berkas).');
  process.exit(1);
}
const target = new URL(TARGET);
const client = target.protocol === 'http:' ? http : https;
const agent = new client.Agent({ keepAlive: false }); // hindari soket lama yang sudah ditutup server (ECONNRESET)

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/i;

function corsHeaders(origin) {
  if (!origin || !LOCAL_ORIGIN.test(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With',
    'Access-Control-Expose-Headers': 'Content-Disposition, Retry-After',
    'Access-Control-Max-Age': '600',
  };
}

function sendJson(res, status, body, extra) {
  const data = JSON.stringify(body);
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }, extra || {}));
  res.end(data);
}

const server = http.createServer(function (req, res) {
  const started = Date.now();
  const origin = req.headers.origin;
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }

  if (!(req.url.startsWith('/api/') || req.url === '/up')) {
    return sendJson(res, 404, { error: 'proxy hanya meneruskan /api/ dan /up' }, cors);
  }

  const headers = Object.assign({}, req.headers);
  delete headers.origin;       // backend production tidak mengizinkan origin localhost; proxy yang menangani CORS
  delete headers.referer;
  delete headers.connection;
  headers.host = target.host;
  headers['x-vercel-protection-bypass'] = BYPASS;

  const upstream = client.request({
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port || (target.protocol === 'http:' ? 80 : 443),
    method: req.method,
    path: req.url,
    headers: headers,
    agent: agent,
    timeout: 330000,
  }, function (up) {
    const loc = String(up.headers.location || '');
    if (up.statusCode >= 300 && up.statusCode < 400 && loc.indexOf('vercel.com/sso-api') !== -1) {
      up.resume();
      console.log(req.method + ' ' + req.url.split('?')[0] + ' -> 502 (BYPASS salah atau kadaluarsa) ' + (Date.now() - started) + ' ms');
      return sendJson(res, 502, { error: 'Vercel menolak: BYPASS salah, atau TARGET bukan deployment project ini' }, cors);
    }
    const out = Object.assign({}, up.headers, cors);
    delete out['set-cookie'];
    res.writeHead(up.statusCode, out);
    up.pipe(res);
    up.on('end', function () {
      console.log(req.method + ' ' + req.url.split('?')[0] + ' -> ' + up.statusCode + ' ' + (Date.now() - started) + ' ms');
    });
  });

  upstream.on('timeout', function () { upstream.destroy(new Error('timeout')); });
  upstream.on('error', function (err) {
    console.log(req.method + ' ' + req.url.split('?')[0] + ' -> 502 (' + err.message + ') ' + (Date.now() - started) + ' ms');
    if (!res.headersSent) sendJson(res, 502, { error: 'proxy gagal menghubungi backend: ' + err.message }, cors);
    else res.destroy();
  });
  req.on('aborted', function () { upstream.destroy(); });
  req.pipe(upstream);
});

server.listen(PORT, '127.0.0.1', function () {
  console.log('Proxy FE aktif: http://127.0.0.1:' + PORT + '  ->  ' + target.origin);
  console.log('Base URL API untuk FE: http://127.0.0.1:' + PORT + '/api/v1');
});
