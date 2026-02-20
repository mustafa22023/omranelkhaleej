export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    try {
      const body = await request.json();
      const { password, config } = body || {};

      if (!password || password !== env.DEVELOPER_PASSWORD) {
        return json({ error: 'Unauthorized' }, 401);
      }

      if (!config || typeof config !== 'object') {
        return json({ error: 'Invalid config' }, 400);
      }

      const owner = env.GITHUB_OWNER;
      const repo = env.GITHUB_REPO;
      const branch = env.GITHUB_BRANCH || 'main';
      const path = env.CONFIG_PATH || 'site-config.json';
      const token = env.GITHUB_TOKEN;

      if (!owner || !repo || !token) {
        return json({ error: 'Missing server env vars' }, 500);
      }

      const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'imran-publish-worker'
      };

      let sha;
      const getRes = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, { headers });
      if (getRes.ok) {
        const existing = await getRes.json();
        sha = existing.sha;
      } else if (getRes.status !== 404) {
        const errBody = await safeJson(getRes);
        return json({ error: errBody.message || 'Unable to read config file' }, getRes.status);
      }

      const payload = {
        message: 'Publish site config from developer panel',
        content: btoa(unescape(encodeURIComponent(JSON.stringify(config, null, 2)))),
        branch
      };
      if (sha) payload.sha = sha;

      const putRes = await fetch(api, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      if (!putRes.ok) {
        const errBody = await safeJson(putRes);
        return json({ error: errBody.message || 'Failed to write config file' }, putRes.status);
      }

      return json({ ok: true }, 200);
    } catch (err) {
      return json({ error: err.message || 'Unexpected error' }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...cors() }
  });
}

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type'
  };
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch (_) {
    return {};
  }
}
