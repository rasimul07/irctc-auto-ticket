-- Block Supabase PostgREST public API access. Express connects as postgres owner and bypasses RLS.
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bmc_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_usages ENABLE ROW LEVEL SECURITY;
