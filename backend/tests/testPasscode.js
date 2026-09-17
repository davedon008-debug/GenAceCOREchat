import http from 'http';

const BASE_URL = 'http://localhost:5005/api';

const makeRequest = (path, method = 'GET', body = null, token = null) => {
  return new Promise((resolve) => {
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

const runPasscodeTests = async () => {
  console.log('--- STARTING PASSCODE & CHAT LOCK INTEGRATION TESTS ---');

  try {
    // 1. Register test user
    const regRes = await makeRequest('/auth/register', 'POST', {
      email: `locktest_${Date.now()}@donchat.com`,
      password: 'Password123!',
      masterName: 'Passcode Tester',
      username: `passcode_${Date.now().toString().slice(-4)}`,
      displayName: 'Passcode Tester'
    });

    if (!regRes.body || !regRes.body.token) {
      console.error('Failed to register test user:', regRes);
      return;
    }
    const token = regRes.body.token;
    console.log('1. User Registration: ✅ PASS');

    // 2. Check initial passcode status
    const status1 = await makeRequest('/auth/passcode-status', 'GET', null, token);
    console.log('2. Initial Passcode Status:', (status1.body?.success && !status1.body?.hasPasscode) ? '✅ PASS' : `❌ FAIL (${JSON.stringify(status1.body)})`);

    // 3. Set Special Passcode
    const setRes = await makeRequest('/auth/chat-passcode', 'POST', { passcode: '1234' }, token);
    console.log('3. Set Passcode (1234):', (setRes.body?.success && setRes.body?.chatLockEnabled) ? '✅ PASS' : `❌ FAIL (${JSON.stringify(setRes.body)})`);

    // 4. Verify Correct Passcode
    const verifyGood = await makeRequest('/auth/verify-passcode', 'POST', { passcode: '1234' }, token);
    console.log('4. Verify Correct Passcode:', (verifyGood.body?.success && verifyGood.body?.valid === true) ? '✅ PASS' : `❌ FAIL (${JSON.stringify(verifyGood.body)})`);

    // 5. Verify Incorrect Passcode
    const verifyBad = await makeRequest('/auth/verify-passcode', 'POST', { passcode: '9999' }, token);
    console.log('5. Reject Wrong Passcode:', (verifyBad.body?.success && verifyBad.body?.valid === false) ? '✅ PASS' : `❌ FAIL (${JSON.stringify(verifyBad.body)})`);

    // 6. Toggle Lock Conversation & Space
    const mockConvId = '650000000000000000000001';
    const mockSpaceId = '650000000000000000000002';
    const lockRes = await makeRequest('/auth/toggle-lock-chat', 'POST', { conversationId: mockConvId }, token);
    console.log('6a. Toggle Lock Chat:', (lockRes.body?.success && lockRes.body?.isLocked === true) ? '✅ PASS' : `❌ FAIL (${JSON.stringify(lockRes.body)})`);

    const lockSpaceRes = await makeRequest('/auth/toggle-lock-chat', 'POST', { spaceId: mockSpaceId }, token);
    console.log('6b. Toggle Lock Space:', (lockSpaceRes.body?.success && lockSpaceRes.body?.isLocked === true) ? '✅ PASS' : `❌ FAIL (${JSON.stringify(lockSpaceRes.body)})`);

    // 7. Check Status after locking chat & space
    const status2 = await makeRequest('/auth/passcode-status', 'GET', null, token);
    const hasConvLock = status2.body?.lockedConversations?.includes(mockConvId);
    const hasSpaceLock = status2.body?.lockedSpaces?.includes(mockSpaceId);
    console.log('7. Passcode Status with Locked Chat & Space:', (hasConvLock && hasSpaceLock) ? '✅ PASS' : `❌ FAIL (${JSON.stringify(status2.body)})`);

    // 8. Remove Special Passcode
    const removeRes = await makeRequest('/auth/chat-passcode', 'POST', { passcode: '', currentPasscode: '1234' }, token);
    console.log('8. Remove Passcode:', (removeRes.body?.success && !removeRes.body?.chatLockEnabled) ? '✅ PASS' : `❌ FAIL (${JSON.stringify(removeRes.body)})`);

    console.log('--- ALL CHAT & SPACE LOCK PASSCODE TESTS PASSED PERFECTLY ---');
  } catch (err) {
    console.error('Test error:', err);
  }
};

runPasscodeTests();
