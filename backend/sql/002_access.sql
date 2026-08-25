CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  client_type TEXT NOT NULL,
  device_id TEXT NOT NULL,
  email TEXT,
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_type, device_id)
);

CREATE INDEX IF NOT EXISTS idx_devices_email ON devices (email);

CREATE TABLE IF NOT EXISTS licenses (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'paid',
  bmc_membership_id TEXT,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_active ON licenses (active);

CREATE TABLE IF NOT EXISTS bmc_events (
  id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
