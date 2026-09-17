const http = require('http');

http.get('http://localhost:3005/login', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const matches = data.match(/src="(\/_next\/static\/chunks\/[^"]+)"/g);
    console.log('Server Status:', res.statusCode);
    if (matches && matches.length) {
      console.log('Found chunk scripts:', matches.length);
      const firstChunk = matches[0].replace('src="', '').replace('"', '');
      http.get('http://localhost:3005' + firstChunk, (chunkRes) => {
        console.log('✓ Chunk', firstChunk, 'Status:', chunkRes.statusCode, '(200 OK SUCCESS)');
      });
    }
  });
});
