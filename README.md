# Action Redirect

A Cloudflare Worker that randomly redirects to one of multiple form URLs stored in KV storage.

## Configuration

### Managing Form URLs

Instead of manually running the long `npx wrangler kv key put` command, you can now manage your form URLs through a simple configuration file.

#### 1. Edit the Configuration File

Edit `form-urls.json` to add, remove, or modify your form URLs:

```json
[
  "https://docs.google.com/forms/d/example1/viewform",
  "https://docs.google.com/forms/d/example2/viewform",
  "https://docs.google.com/forms/d/example3/viewform"
]
```

#### 2. Update KV Storage

After editing the configuration file, update your KV storage with one of these commands:

**For remote (production) KV storage:**
```bash
npm run update-urls
```

**For local development:**
```bash
npm run update-urls-local
```

**To view current URLs in KV storage:**
```bash
npm run get-urls
```

## Available Scripts

- `npm run dev` - Start local development server
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm run update-urls` - Update remote KV storage with URLs from form-urls.json
- `npm run update-urls-local` - Update local KV storage with URLs from form-urls.json
- `npm run get-urls` - View current URLs stored in remote KV storage
- `npm run d1` - Execute D1 database schema locally

## How It Works

1. The worker reads form URLs from KV storage (`URLS_KV` binding)
2. On each request, it randomly selects one URL from the pool
3. If no URLs are available, it falls back to the `DEFAULT_URL` environment variable
4. All redirects are logged to the D1 database for analytics

## Environment Variables

- `DEFAULT_URL` - Fallback URL when no form URLs are available
- `POOL_TTL_MS` - Cache TTL for form URLs (default: 300000ms = 5 minutes)
- `PRIVACY_GEO_ENABLED` - Enable/disable geographic logging (default: true)
- `PRIVACY_HASH_IP` - Enable/disable IP hashing (default: true)
