ALTER TABLE devices
  ALTER COLUMN trial_started_at DROP NOT NULL;

ALTER TABLE licenses
  ADD COLUMN IF NOT EXISTS tokens_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS token_period_end TIMESTAMPTZ;

UPDATE licenses
SET plan = CASE
  WHEN plan IN ('trial', 'coffee', 'basic', 'pro') THEN plan
  WHEN LOWER(plan) LIKE '%pro%' THEN 'pro'
  WHEN LOWER(plan) LIKE '%basic%' THEN 'basic'
  ELSE 'basic'
END
WHERE plan NOT IN ('trial', 'coffee', 'basic', 'pro');

CREATE TABLE IF NOT EXISTS token_usages (
  id SERIAL PRIMARY KEY,
  client_type TEXT NOT NULL,
  device_id TEXT NOT NULL,
  usage_key TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_type, device_id, usage_key)
);

CREATE INDEX IF NOT EXISTS idx_token_usages_email ON token_usages (email);
