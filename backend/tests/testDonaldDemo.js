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

const runDonaldTest = async () => {
  console.log('--- STARTING DONALD TO DEMO USER TEST ---');

  // Register user Donald
  const donaldReg = await makeRequest('/auth/register', 'POST', {
    email: `donald_${Date.now()}@donchat.com`,
    password: 'Password123!',
    masterName: 'Donald',
    username: `bigdon_${Date.now().toString().slice(-4)}`,
    displayName: 'Donald'
  });
  const donaldToken = donaldReg.body.token;

  // Register user Demo User
  const demoReg = await makeRequest('/auth/register', 'POST', {
    email: `demouser_${Date.now()}@donchat.com`,
    password: 'Password123!',
    masterName: 'Demo User',
    username: `demouser_${Date.now().toString().slice(-4)}`,
    displayName: 'Demo User'
  });
  const demoPersonaId = demoReg.body.activePersona._id;

  // Donald starts direct chat with Demo User
  const convRes = await makeRequest('/conversations', 'POST', {
    targetPersonaId: demoPersonaId,
    type: 'direct'
  }, donaldToken);
  const convId = convRes.body.conversation._id;
  console.log('Conversation created ID:', convId);

  // Upload video
  const uploadRes = await makeRequest('/upload', 'POST', {
    fileName: 'donald_clip.mp4',
    fileData: 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE='
  }, donaldToken);

  const videoUrl = uploadRes.body.url;
  console.log('Uploaded video URL:', videoUrl);

  // Send video message from Donald to Demo User
  const sendRes = await makeRequest('/messages', 'POST', {
    conversationId: convId,
    content: 'Video clip for Demo User',
    contentType: 'video',
    mediaUrl: videoUrl
  }, donaldToken);

  console.log('Send message status:', sendRes.status, 'ID:', sendRes.body?.message?._id);

  // Fetch messages from conversation (simulating reload)
  const getRes = await makeRequest(`/messages/conversation/${convId}`, 'GET', null, donaldToken);
  console.log('Get messages status:', getRes.status, 'Total count:', getRes.body?.messages?.length);

  const messages = getRes.body?.messages || [];
  const videoMsg = messages.find(m => m.contentType === 'video');

  if (videoMsg) {
    console.log('SUCCESS: Video message found for Donald -> Demo User! ✅');
    console.log('MediaUrl:', videoMsg.mediaUrl);
  } else {
    console.error('FAIL: Video message not found in conversation ❌');
  }
};

runDonaldTest();
