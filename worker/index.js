export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (path === '/api/start-session' && request.method === 'POST') {
      const token = await createSessionToken(env);
      return new Response(JSON.stringify({ token }), { headers: corsHeaders });
    }

    if (path === '/api/scores') {
      if (request.method === 'GET') {
        const raw = await env.SCOREBOARD.get('scores', { type: 'text' });
        const scores = raw ? JSON.parse(raw) : [];
        return new Response(JSON.stringify(scores), { headers: corsHeaders });
      }

      if (request.method === 'POST') {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const rateKey = `ratelimit:${ip}`;
        const recent = await env.SCOREBOARD.get(rateKey);
        if (recent) {
          return new Response(JSON.stringify({ error: 'Too many submissions. Wait a moment.' }), {
            status: 429,
            headers: corsHeaders,
          });
        }

        try {
          const body = await request.json();
          const { name, score, token } = body;

          if (typeof score !== 'number' || score <= 0 || !Number.isInteger(score)) {
            return new Response(JSON.stringify({ error: 'Invalid score' }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          const startTime = token ? await verifySessionToken(token, env) : null;
          if (!startTime) {
            return new Response(JSON.stringify({ error: 'Invalid session. Start a new game to submit.' }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          const elapsed = (Date.now() - startTime) / 1000;
          const maxPossible = Math.floor(elapsed * 120) + 1000;

          if (score > maxPossible) {
            return new Response(JSON.stringify({ error: 'Score exceeds what is possible for this session.' }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          if (score > 50000) {
            return new Response(JSON.stringify({ error: 'Score too high' }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          await env.SCOREBOARD.put(rateKey, '1', { expirationTtl: 60 });

          const displayName =
            typeof name === 'string' && name.trim().length > 0
              ? name.trim().slice(0, 20)
              : 'Anonymous';

          const raw = await env.SCOREBOARD.get('scores', { type: 'text' });
          const scores = raw ? JSON.parse(raw) : [];

          scores.push({
            name: displayName,
            score,
            date: new Date().toISOString().split('T')[0],
          });

          scores.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
          const top = scores.slice(0, 10);

          await env.SCOREBOARD.put('scores', JSON.stringify(top));

          const rank = top.findIndex(
            (s) => s.name === displayName && s.score === score
          );

          return new Response(
            JSON.stringify({ success: true, rank: rank + 1 }),
            { headers: corsHeaders }
          );
        } catch (e) {
          return new Response(JSON.stringify({ error: 'Bad request' }), {
            status: 400,
            headers: corsHeaders,
          });
        }
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};

async function createSessionToken(env) {
  const startTime = Date.now();
  const key = await getHmacKey(env);
  const data = new TextEncoder().encode(startTime.toString());
  const sig = await crypto.subtle.sign('HMAC', key, data);
  const sigHex = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return btoa(JSON.stringify({ t: startTime, s: sigHex }));
}

async function verifySessionToken(tokenStr, env) {
  try {
    const { t, s } = JSON.parse(atob(tokenStr));
    if (typeof t !== 'number' || typeof s !== 'string' || !/^[0-9a-f]{64}$/.test(s)) {
      return null;
    }
    const key = await getHmacKey(env);
    const data = new TextEncoder().encode(t.toString());
    const sigBytes = new Uint8Array(
      s.match(/.{1,2}/g).map(b => parseInt(b, 16))
    );
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, data);
    return valid ? t : null;
  } catch {
    return null;
  }
}

let hmacKeyCache = null;

async function getHmacKey(env) {
  if (hmacKeyCache) return hmacKeyCache;
  const secret = env.SCORE_SECRET || 'fart-rocket-fallback-secret';
  hmacKeyCache = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  return hmacKeyCache;
}
