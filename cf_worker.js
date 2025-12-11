export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // CORS 配置：允许 GitHub Pages 和 本地开发环境
    const origin = req.headers.get('Origin');
    const allowOrigin = (origin && (origin.includes('github.io') || origin.includes('localhost') || origin.includes('127.0.0.1'))) 
                        ? origin 
                        : 'https://hdapeng.github.io';

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    };

    // 处理预检请求
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    let targetUrl = '';
    const method = req.method;

    // 路由分发逻辑
    // 1. 异步生成接口 (v1.1)
    if (path.endsWith('/async/audio/speech') && method === 'POST') {
        targetUrl = 'https://ai.gitee.com/v1/async/audio/speech';
    } 
    // 2. 任务查询接口 (v1.1)
    else if ((path.includes('/task/') || path.includes('/tasks/')) && method === 'GET') {
        const parts = path.split('/');
        const taskId = parts[parts.length - 1];
        const resource = 'tasks';
        if (taskId) {
            targetUrl = `https://ai.gitee.com/v1/${resource}/${taskId}`;
        }
    } 
    // 3. 同步生成接口 (v1.0 & 默认)
    // 匹配 /audio/speech 或者根路径 / (为了兼容旧版直接调用 worker 根地址的情况)
    else if ((path.endsWith('/audio/speech') || path === '/') && method === 'POST') {
        targetUrl = 'https://ai.gitee.com/v1/audio/speech';
    }

    if (!targetUrl) {
        return new Response('Not Found or Method Not Allowed', { status: 404, headers: corsHeaders });
    }

    try {
        const upstreamResponse = await fetch(targetUrl, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.GITEE_API_KEY}`
            },
            body: method === 'POST' ? await req.text() : null
        });

        const newHeaders = new Headers(upstreamResponse.headers);
        // 覆盖 CORS 头
        Object.keys(corsHeaders).forEach(key => newHeaders.set(key, corsHeaders[key]));
        newHeaders.delete('set-cookie');

        return new Response(upstreamResponse.body, {
            status: upstreamResponse.status,
            headers: newHeaders
        });
    } catch (err) {
        return new Response(err.message, { status: 500, headers: corsHeaders });
    }
  }
};
