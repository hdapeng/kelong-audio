export default {
  async fetch(req, env) {
    const allowOrigin = 'https://hdapeng.github.io';
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': allowOrigin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400'
        }
      });
    }
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    const upstream = await fetch('https://ai.gitee.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GITEE_API_KEY}`
      },
      body: await req.text()
    });
    const headers = new Headers(upstream.headers);
    headers.set('Access-Control-Allow-Origin', allowOrigin);
    headers.delete('set-cookie');
    return new Response(upstream.body, { status: upstream.status, headers });
  }
};
