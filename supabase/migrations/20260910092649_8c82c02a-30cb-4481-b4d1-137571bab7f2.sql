CREATE TABLE IF NOT EXISTS public.sheet_webhook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sheet_webhook TO authenticated;
GRANT ALL ON public.sheet_webhook TO service_role;
ALTER TABLE public.sheet_webhook ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Logged users read webhook token" ON public.sheet_webhook;
CREATE POLICY "Logged users read webhook token" ON public.sheet_webhook FOR SELECT TO authenticated USING (true);
INSERT INTO public.sheet_webhook (singleton) VALUES (true) ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.sheet_pings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rodada integer,
  numero integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sheet_pings TO authenticated;
GRANT ALL ON public.sheet_pings TO service_role;
ALTER TABLE public.sheet_pings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Logged users read sheet pings" ON public.sheet_pings;
CREATE POLICY "Logged users read sheet pings" ON public.sheet_pings FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS sheet_pings_created_idx ON public.sheet_pings (created_at DESC);

ALTER TABLE public.sheet_pings REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sheet_pings'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.sheet_pings';
  END IF;
END $$;