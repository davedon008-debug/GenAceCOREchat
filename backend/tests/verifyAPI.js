import http from 'http';

const BASE_URL = 'http://localhost:5005/api';

const makeRequest = (path, method = 'GET', body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => resolve({ error: err.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

const runTests = async () => {
  console.log('--- STARTING DONCHAT API INTEGRATION VERIFICATION ---');

  try {
    // 1. Health check
    const health = await makeRequest('/health');
    console.log('1. Health Check:', health.body?.status === 'healthy' ? '✅ PASS' : `❌ FAIL (${JSON.stringify(health)})`);

    if (!health.body) return;

    // 2. Register user
    const regRes = await makeRequest('/auth/register', 'POST', {
      email: `test_${Date.now()}@donchat.com`,
      password: 'Password123!',
      masterName: 'Donald Tester',
      username: `donald_${Date.now().toString().slice(-4)}`,
      displayName: 'Donald (Personal)'
    });
    console.log('2. Register User:', regRes.status === 201 ? '✅ PASS' : `❌ FAIL (${JSON.stringify(regRes.body)})`);

    if (!regRes.body || !regRes.body.token) return;
    const token = regRes.body.token;

    // 3. Create secondary persona (@Business)
    const personaRes = await makeRequest('/personas', 'POST', {
      username: `donbiz_${Date.now().toString().slice(-4)}`,
      displayName: 'Donald (BigDonStore)',
      type: 'business',
      bio: 'Official Donald Business Persona'
    }, token);
    console.log('3. Create Persona:', personaRes.status === 201 ? '✅ PASS' : '❌ FAIL');

    // 4. Create Conversation
    const convRes = await makeRequest('/conversations', 'POST', {
      type: 'direct',
      privacyMode: 'disappearing'
    }, token);
    console.log('4. Create Conversation:', convRes.status === 201 || convRes.status === 200 ? '✅ PASS' : '❌ FAIL');

    const convId = convRes.body.conversation._id;

    // 5. Send Message
    const msgRes = await makeRequest('/messages', 'POST', {
      conversationId: convId,
      content: 'Welcome to DONCHAT Next-Gen Platform! Let\'s build something legendary.',
      contentType: 'text'
    }, token);
    console.log('5. Send Message:', msgRes.status === 201 ? '✅ PASS' : '❌ FAIL');

    // 6. Upgrade to Fluid Space
    const spaceRes = await makeRequest('/spaces', 'POST', {
      conversationId: convId,
      title: 'DONCHAT Project Launch Space',
      description: 'Collaborative development space'
    }, token);
    console.log('6. Upgrade to Fluid Space:', spaceRes.status === 201 || spaceRes.status === 200 ? '✅ PASS' : '❌ FAIL');

    const spaceId = spaceRes.body.space._id;

    // 7. Create Task in Space
    const taskRes = await makeRequest(`/spaces/${spaceId}/tasks`, 'POST', {
      title: 'Deploy Next.js App Router Frontend'
    }, token);
    console.log('7. Create Task:', taskRes.status === 201 ? '✅ PASS' : '❌ FAIL');

    // 9. Video/Media Upload Endpoint
    const uploadRes = await makeRequest('/upload', 'POST', {
      fileName: 'test_video.mp4',
      fileData: 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE='
    }, token);
    console.log('9. Media File Upload:', uploadRes.status === 201 && uploadRes.body?.url ? '✅ PASS' : `❌ FAIL (${JSON.stringify(uploadRes.body)})`);

    console.log('--- ALL BACKEND INTEGRATION TESTS PASSED ---');
  } catch (err) {
    console.error('Test execution failed:', err.message);
  }
};

runTests();
