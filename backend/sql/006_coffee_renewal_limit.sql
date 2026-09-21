ALTER TABLE licenses
  ADD COLUMN IF NOT EXISTS coffee_renewals_remaining INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coffee_entitlement_started_at TIMESTAMPTZ;

-- Best-effort backfill: estimate renewals already consumed from created_at (30-day periods, max 11)
UPDATE licenses
SET coffee_renewals_remaining = GREATEST(
      0,
      11 - LEAST(
        11,
        FLOOR(EXTRACT(EPOCH FROM (NOW() - created_at)) / (30 * 86400))::int
      )
    ),
    coffee_entitlement_started_at = COALESCE(coffee_entitlement_started_at, created_at)
WHERE plan = 'coffee';
