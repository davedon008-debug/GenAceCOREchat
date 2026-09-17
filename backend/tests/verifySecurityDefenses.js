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
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => resolve({ error: err.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

const runSecurityTests = async () => {
  console.log('=== STARTING DONCHAT COMPREHENSIVE SECURITY DEFENSE VERIFICATION ===\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${details}`);
      failed++;
    }
  };

  try {
    // 1. Create User A
    const userARes = await makeRequest('/auth/register', 'POST', {
      email: `userA_${Date.now()}@donchat.com`,
      password: 'Password123!',
      masterName: 'User A',
      username: `usera_${Date.now().toString().slice(-4)}`,
      displayName: 'User A'
    });
    assert(userARes.status === 201 && userARes.body?.token, '1. Create Authenticated User A');
    const tokenA = userARes.body?.token;

    // 2. Create User B
    const userBRes = await makeRequest('/auth/register', 'POST', {
      email: `userB_${Date.now()}@donchat.com`,
      password: 'Password123!',
      masterName: 'User B',
      username: `userb_${Date.now().toString().slice(-4)}`,
      displayName: 'User B'
    });
    assert(userBRes.status === 201 && userBRes.body?.token, '2. Create Authenticated User B');
    const tokenB = userBRes.body?.token;

    // 3. User B creates a private conversation
    const convBRes = await makeRequest('/conversations', 'POST', {
      type: 'direct',
      name: 'User B Private Secret Notes'
    }, tokenB);
    const convBId = convBRes.body?.conversation?._id;
    assert(convBId, '3. User B Creates Private Conversation');

    // 4. User B sends a message in User B's conversation
    const msgBRes = await makeRequest('/messages', 'POST', {
      conversationId: convBId,
      content: 'User B Confidential Message'
    }, tokenB);
    const msgBId = msgBRes.body?.message?._id;
    assert(msgBId, '4. User B Posts Message to Conversation');

    // 5. TEST IDOR: User A attempts to send message to User B's private conversation -> Must return 403
    const idorSendRes = await makeRequest('/messages', 'POST', {
      conversationId: convBId,
      content: 'Unauthorized Injection Attack Attempt by User A'
    }, tokenA);
    assert(idorSendRes.status === 403, '5. IDOR Protection: User A cannot post to User B\'s conversation (Returns 403)', `Got ${idorSendRes.status}`);

    // 6. TEST IDOR: User A attempts to react to User B's private message -> Must return 403
    const idorReactRes = await makeRequest(`/${msgBId}/reaction`, 'POST', { emoji: '👍' }, tokenA);
    const idorReactRes2 = await makeRequest(`/messages/${msgBId}/reaction`, 'POST', { emoji: '👍' }, tokenA);
    assert(idorReactRes2.status === 403, '6. IDOR Protection: User A cannot react to User B\'s private message (Returns 403)', `Got ${idorReactRes2.status}`);

    // 7. TEST IDOR: User A attempts to burn User B's message -> Must return 403
    const idorBurnRes = await makeRequest(`/messages/${msgBId}/burn`, 'POST', {}, tokenA);
    assert(idorBurnRes.status === 403, '7. IDOR Protection: User A cannot burn User B\'s private message (Returns 403)', `Got ${idorBurnRes.status}`);

    // 8. User B creates a private Fluid Space
    const spaceBRes = await makeRequest('/spaces', 'POST', {
      title: 'User B Private Vault Space',
      visibility: 'private'
    }, tokenB);
    const spaceBId = spaceBRes.body?.space?._id;
    assert(spaceBId, '8. User B Creates Private Space');

    // 9. User B creates a task in User B's space
    const taskBRes = await makeRequest(`/spaces/${spaceBId}/tasks`, 'POST', {
      title: 'User B Private Task'
    }, tokenB);
    const taskBId = taskBRes.body?.task?._id;
    assert(taskBId, '9. User B Creates Task in Private Space');

    // 10. TEST IDOR: User A attempts to update User B's space task -> Must return 403
    const idorTaskRes = await makeRequest(`/spaces/tasks/${taskBId}`, 'PATCH', { status: 'completed' }, tokenA);
    assert(idorTaskRes.status === 403, '10. IDOR Protection: User A cannot update task in User B\'s private space (Returns 403)', `Got ${idorTaskRes.status}`);

    // 11. User B creates a poll in User B's space
    const pollBRes = await makeRequest(`/spaces/${spaceBId}/polls`, 'POST', {
      question: 'User B Secret Vote',
      options: ['Option 1', 'Option 2']
    }, tokenB);
    const pollBId = pollBRes.body?.poll?._id;
    assert(pollBId, '11. User B Creates Poll in Private Space');

    // 12. TEST IDOR: User A attempts to vote in User B's private space poll -> Must return 403
    const idorPollRes = await makeRequest(`/spaces/polls/${pollBId}/vote`, 'POST', { optionIndex: 0 }, tokenA);
    assert(idorPollRes.status === 403, '12. IDOR Protection: User A cannot vote in poll of User B\'s private space (Returns 403)', `Got ${idorPollRes.status}`);

    // 13. TEST IDOR: User A attempts to invite arbitrary members to User B's space -> Must return 403
    const idorInviteRes = await makeRequest(`/spaces/${spaceBId}/invite`, 'POST', { personaIds: [userARes.body?.activePersona?._id] }, tokenA);
    assert(idorInviteRes.status === 403, '13. IDOR Protection: User A cannot invite members to User B\'s private space (Returns 403)', `Got ${idorInviteRes.status}`);

    // 14. TEST MALFORMED OBJECT ID VALIDATION: Passing invalid string -> Must return 400 Bad Request
    const invalidIdRes = await makeRequest('/messages/conversation/invalid-mongo-id-string', 'GET', null, tokenA);
    assert(invalidIdRes.status === 400, '14. Input Validation: Invalid ObjectId returns 400 Bad Request', `Got ${invalidIdRes.status}`);

    // 15. TEST UNAUTHENTICATED TOKEN REJECTION: Invalid Bearer token -> Must return 401 Unauthorized
    const unauthRes = await makeRequest('/conversations', 'GET', null, 'invalid_jwt_token_string');
    assert(unauthRes.status === 401, '15. Authentication: Invalid JWT token rejected (Returns 401)', `Got ${unauthRes.status}`);

    // 16. TEST MISSING TOKEN REJECTION: No Authorization header -> Must return 401 Unauthorized
    const missingTokenRes = await makeRequest('/conversations', 'GET', null, null);
    assert(missingTokenRes.status === 401, '16. Authentication: Missing JWT token rejected (Returns 401)', `Got ${missingTokenRes.status}`);

    // 17. TEST CORE FUNCTIONALITY REGRESSION: Legitimate message sending by participant
    const legitMsgRes = await makeRequest('/messages', 'POST', {
      conversationId: convBId,
      content: 'Legitimate participant message'
    }, tokenB);
    assert(legitMsgRes.status === 201, '17. Regression Check: Participant can send legitimate message (Returns 201)');

    // 18. TEST CORE FUNCTIONALITY REGRESSION: Passcode Setup & Status
    const passcodeRes = await makeRequest('/auth/chat-passcode', 'POST', { passcode: '9876' }, tokenA);
    const statusRes = await makeRequest('/auth/passcode-status', 'GET', null, tokenA);
    assert(passcodeRes.status === 200 && statusRes.body?.hasPasscode === true, '18. Regression Check: Passcode setup & status function properly');

    console.log(`\n==================================================`);
    console.log(`SECURITY VERIFICATION SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log(`==================================================\n`);

  } catch (err) {
    console.error('Security test runner error:', err);
  }
};

runSecurityTests();
