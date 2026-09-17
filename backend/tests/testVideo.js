import http from 'http';

const BASE_URL = 'http://127.0.0.1:5005/api';

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

const runTest = async () => {
  console.log('--- STARTING VIDEO PERSISTENCE & RELOAD TEST ---');

  // 1. Register test user
  const regRes = await makeRequest('/auth/register', 'POST', {
    email: `videotester_${Date.now()}@donchat.com`,
    password: 'Password123!',
    masterName: 'Video Tester',
    username: `vtest_${Date.now().toString().slice(-4)}`,
    displayName: 'Video Tester'
  });
  const token = regRes.body.token;
  console.log('1. User Registration:', token ? '✅ SUCCESS' : '❌ FAIL');

  // 2. Create conversation
  const convRes = await makeRequest('/conversations', 'POST', { type: 'direct' }, token);
  const convId = convRes.body.conversation._id;
  console.log('2. Conversation Created ID:', convId);

  // 3. Upload video file to /api/upload
  const uploadRes = await makeRequest('/upload', 'POST', {
    fileName: 'sample_clip.mp4',
    fileData: 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE='
  }, token);
  console.log('3. Upload Video Endpoint Result:', uploadRes.body?.url ? `✅ SUCCESS (${uploadRes.body.url})` : '❌ FAIL');

  const uploadedVideoUrl = uploadRes.body.url;

  // 4. Send video message
  const msgRes = await makeRequest('/messages', 'POST', {
    conversationId: convId,
    content: 'My Awesome Sample Video',
    contentType: 'video',
    mediaUrl: uploadedVideoUrl
  }, token);

  console.log('4. Send Video Message Result:', msgRes.status === 201 ? '✅ SUCCESS' : '❌ FAIL');
  const sentMsgId = msgRes.body.message._id;

  // 5. RELOAD SIMULATION: Fetch messages from DB via GET /messages/conversation/:convId
  const getRes = await makeRequest(`/messages/conversation/${convId}`, 'GET', null, token);
  console.log('5. Reload Simulation (GET /messages/conversation):', getRes.status === 200 ? '✅ SUCCESS' : '❌ FAIL');

  const fetchedMessages = getRes.body.messages || [];
  const foundVideoMsg = fetchedMessages.find(m => m._id === sentMsgId);

  if (foundVideoMsg) {
    console.log('6. Video Message Found After Reload! ✅');
    console.log('   - ContentType:', foundVideoMsg.contentType);
    console.log('   - MediaUrl:', foundVideoMsg.mediaUrl);
    console.log('   - Content:', foundVideoMsg.content);
    console.log('--- TEST PASSED PERFECTLY! VIDEO PERSISTS ON RELOAD! ---');
  } else {
    console.error('❌ FAIL: Video message not found after reload');
  }
};

runTest();
