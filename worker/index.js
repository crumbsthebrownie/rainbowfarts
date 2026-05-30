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

    if (path === '/api/scores') {
      if (request.method === 'GET') {
        const raw = await env.SCOREBOARD.get('scores', { type: 'text' });
        const scores = raw ? JSON.parse(raw) : [];
        return new Response(JSON.stringify(scores), { headers: corsHeaders });
      }

      if (request.method === 'POST') {
        try {
          const body = await request.json();
          const { name, score } = body;

          if (typeof score !== 'number' || score <= 0 || !Number.isInteger(score)) {
            return new Response(JSON.stringify({ error: 'Invalid score' }), {
              status: 400,
              headers: corsHeaders,
            });
          }

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
