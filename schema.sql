CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,                 -- ISO timestamp
  rand INTEGER NOT NULL,            -- index picked (0-based)
  form_url TEXT NOT NULL,           -- chosen URL
  req_url TEXT NOT NULL,            -- full request URL
  params_json TEXT NOT NULL,        -- URLSearchParams -> JSON
  ua TEXT NOT NULL,                 -- user-agent
  ip_hash TEXT,                     -- anonymized IP (nullable if feature disabled)
  country TEXT,
  region TEXT,
  city TEXT,
  timezone TEXT
);
