const http = require('http');

// First login as testalex@gmail.com
const postData = JSON.stringify({ email: 'admin@donchat.com', password: 'admin123' });

const req = http.request({
  hostname: 'localhost',
  port: 5005,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const data = JSON.parse(body);
    console.log('Login Response:', data.success, 'Token:', !!data.token, 'Role:', data.user?.role);
    if (data.token) {
      // Now fetch /api/admin/users
      const adminReq = http.request({
        hostname: 'localhost',
        port: 5005,
        path: '/api/admin/users',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      }, (adminRes) => {
        let adminBody = '';
        adminRes.on('data', chunk => adminBody += chunk);
        adminRes.on('end', () => {
          const adminData = JSON.parse(adminBody);
          console.log('Admin Users Response:', adminData.success, 'Users Count:', adminData.users ? adminData.users.length : 0);
        });
      });
      adminReq.end();
    }
  });
});

req.write(postData);
req.end();
