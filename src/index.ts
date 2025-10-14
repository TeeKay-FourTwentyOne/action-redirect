export interface Env {
    URLS_KV: KVNamespace;
    LOG_DB: D1Database;
  
    DEFAULT_URL: string;
    POOL_TTL_MS?: string;
  
    // feature flags (string "true"/"false")
    PRIVACY_GEO_ENABLED?: string;
    PRIVACY_HASH_IP?: string;
  }
  
  let cachedPool: { urls: string[]; expiresAt: number } | null = null;
  
  export default {
    async fetch(req: Request, env: Env, ctx: ExecutionContext) {
      const now = Date.now();
  
      // 1) Pool from KV with in-memory cache per isolate
      const ttl = Number(env.POOL_TTL_MS ?? "300000");
      if (!cachedPool || cachedPool.expiresAt < now) {
        const raw = await env.URLS_KV.get("form_urls", "json") as unknown;
        const urls = Array.isArray(raw) ? (raw as string[]).filter(Boolean) : [];
        cachedPool = { urls, expiresAt: now + ttl };
      }
  
      const pool = cachedPool.urls;
      const defaultUrl = env.DEFAULT_URL;
  
      // 2) Choose URL
      const rand = pool.length ? Math.floor(Math.random() * pool.length) : -1;
      const chosenUrl = pool.length ? pool[rand] : defaultUrl;
  
      // 3) Collect request details
      const u = new URL(req.url);
      const paramsObj = Object.fromEntries(u.searchParams.entries());
      const ua = req.headers.get("user-agent") || "";
  
      // Privacy flags (default true)
      const GEO_ENABLED = (env.PRIVACY_GEO_ENABLED ?? "true").toLowerCase() === "true";
      const HASH_IP     = (env.PRIVACY_HASH_IP ?? "true").toLowerCase() === "true";
  
      // IP hashing (never store raw IP)
      let ip_hash: string | null = null;
      if (HASH_IP) {
        const ip = req.headers.get("cf-connecting-ip") || "";
        ip_hash = await sha256Hex(ip);
      }
  
      // Coarse geo via Cloudflare
      let country: string | null = null;
      let region: string | null = null;
      let city: string | null = null;
      let timezone: string | null = null;
  
      if (GEO_ENABLED) {
        const cf: any = (req as any).cf || {};
        country  = cf?.country ?? null;
        region   = cf?.region ?? null;
        city     = cf?.city ?? null;
        timezone = cf?.timezone ?? null;
      }
  
      const ts = new Date().toISOString();
  
      // 4) Fire-and-forget logging (don’t block redirect)
      ctx.waitUntil(logAsync(env, {
        ts,
        rand: rand < 0 ? 0 : rand,
        form_url: chosenUrl,
        req_url: req.url,
        params_json: JSON.stringify(paramsObj),
        ua,
        ip_hash,
        country,
        region,
        city,
        timezone
      }));
  
      // 5) Redirect
      return Response.redirect(chosenUrl, 302);
    }
  };
  
  async function logAsync(env: Env, row: {
    ts: string; rand: number; form_url: string; req_url: string;
    params_json: string; ua: string; ip_hash: string | null;
    country: string | null; region: string | null; city: string | null; timezone: string | null;
  }) {
    try {
      await env.LOG_DB
        .prepare(
          `INSERT INTO logs
          (ts, rand, form_url, req_url, params_json, ua, ip_hash, country, region, city, timezone)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          row.ts, row.rand, row.form_url, row.req_url, row.params_json, row.ua,
          row.ip_hash, row.country, row.region, row.city, row.timezone
        )
        .run();
    } catch {
      // ignore log failures; redirect must succeed
    }
  }
  
  async function sha256Hex(s: string) {
    const enc = new TextEncoder().encode(s);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  