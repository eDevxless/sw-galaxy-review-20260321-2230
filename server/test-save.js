const http = require('http');

const data = JSON.stringify({ ts: Date.now(), territories: [{ id: 'test-sector', polygon: [[0.1,0.1],[0.2,0.1],[0.15,0.2]] }] });

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/admin/api/sectors/save',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'x-admin-token': process.env.ADMIN_TOKEN || 'dev-token'
  }
};

const req = http.request(options, (res) => {
  console.log('status', res.statusCode);
  let body = '';
  res.on('data', (d) => body += d);
  res.on('end', () => console.log('body', body));
});

req.on('error', (e) => console.error('error', e));
req.write(data);
req.end();
