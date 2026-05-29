const http = require('http');
const name = process.argv[2] || 'sectors-2026-05-29T16-20-15-793Z.json';
const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/admin/api/sectors/backup/' + encodeURIComponent(name),
  method: 'GET',
  headers: {
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
req.end();
