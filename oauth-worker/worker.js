/**
 * 逆天言论HUB - GitHub OAuth 设备流代理 Worker
 * 
 * 为什么需要它：GitHub 的设备流接口 (github.com/login/device/code 和
 * /login/oauth/access_token) 不支持 CORS，纯 GitHub Pages 网站无法直接调用。
 * 这个 Worker 作为代理，转发设备流请求，解决跨域问题。
 * 
 * 注意：设备流换 token 用 client_id 即可（不需要 client_secret），
 * 所以这个 Worker 不需要存任何密钥，可以放心部署。
 * 
 * 部署：wrangler deploy 或粘贴到 Cloudflare Workers 控制台
 */

// 允许的来源（你的 Pages 网站地址）
const ALLOWED_ORIGIN = 'https://chenray-team.github.io';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(origin),
        status: 204,
      });
    }

    // 只允许来自我们网站的跨域请求
    if (origin && origin !== ALLOWED_ORIGIN) {
      return new Response(JSON.stringify({ error: 'origin_not_allowed' }), {
        status: 403,
        headers: corsHeaders(origin),
      });
    }

    // 路由
    if (url.pathname === '/device/code' && request.method === 'POST') {
      return proxy(request, 'https://github.com/login/device/code', origin);
    }
    if (url.pathname === '/access_token' && request.method === 'POST') {
      return proxy(request, 'https://github.com/login/oauth/access_token', origin);
    }

    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404,
      headers: corsHeaders(origin),
    });
  },
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  };
}

async function proxy(request, targetUrl, origin) {
  try {
    const body = await request.text();
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'inward-yanlun-hub/1.0',
      },
      body,
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'proxy_failed', message: e.message }), {
      status: 500,
      headers: corsHeaders(origin),
    });
  }
}
