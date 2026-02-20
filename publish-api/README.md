# Publish API (Cloudflare Worker)

This worker provides secure publish for `site-config.json`.

## 1) Install and login
```bash
npm i -g wrangler
wrangler login
```

## 2) Set secrets
```bash
cd publish-api
wrangler secret put GITHUB_TOKEN
wrangler secret put DEVELOPER_PASSWORD
```

## 3) Set vars
Create/edit `wrangler.toml` and add:
```toml
[vars]
GITHUB_OWNER = "mustafa22023"
GITHUB_REPO = "omranelkhaleej"
GITHUB_BRANCH = "main"
CONFIG_PATH = "site-config.json"
```

## 4) Deploy
```bash
wrangler deploy
```

Copy the Worker URL and use it in site `?developer=1` when you press "نشر للجميع".

## Security notes
- Never put `GITHUB_TOKEN` in frontend.
- Use a strong `DEVELOPER_PASSWORD`.
- Rotate secrets if exposed.
