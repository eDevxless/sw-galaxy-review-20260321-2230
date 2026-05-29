const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/admin/api/sectors/backups',
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
