import express from 'express';

const router = express.Router();

const STUN_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:stun.cloudflare.com:3478' }
];

let cache = { servers: null, expires: 0 };

async function fetchMetered() {
  const key = process.env.METERED_API_KEY;
  const domain = process.env.METERED_DOMAIN; // e.g. yourapp.metered.live
  if (!key || !domain) return null;
  const res = await fetch(`https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error(`Metered ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : null;
}

async function fetchCloudflare() {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN;
  if (!keyId || !token) return null;
  const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: 86400 })
  });
  if (!res.ok) throw new Error(`Cloudflare ${res.status}`);
  const data = await res.json();
  const list = data.iceServers;
  return Array.isArray(list) ? list : list ? [list] : null;
}

function staticTurn() {
  const urls = process.env.TURN_URLS; // comma separated
  if (!urls) return null;
  return [{
    urls: urls.split(',').map(u => u.trim()).filter(Boolean),
    username: process.env.TURN_USERNAME,
    credential: process.env.TURN_CREDENTIAL
  }];
}

export async function getIceServers() {
  if (cache.servers && Date.now() < cache.expires) return cache.servers;
  let turn = null;
  for (const provider of [fetchCloudflare, fetchMetered]) {
    try {
      turn = await provider();
      if (turn && turn.length) break;
    } catch (e) {
      console.warn('[ICE] TURN provider failed:', e.message);
    }
  }
  if (!turn || !turn.length) turn = staticTurn();
  if (!turn || !turn.length) {
    console.warn('[ICE] ⚠️ No TURN server configured. Calls across different networks will fail. Set CLOUDFLARE_TURN_* or METERED_* or TURN_URLS in backend/.env');
    return STUN_SERVERS;
  }
  const servers = [...STUN_SERVERS, ...turn];
  cache = { servers, expires: Date.now() + 60 * 60 * 1000 };
  return servers;
}

router.get('/', async (req, res) => {
  const iceServers = await getIceServers();
  res.json({ success: true, iceServers });
});

export default router;
