CREATE TABLE public.public_live_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number smallint NOT NULL CHECK (number BETWEEN 0 AND 36),
  device_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.public_live_spins TO anon;
GRANT SELECT, INSERT ON public.public_live_spins TO authenticated;
GRANT ALL ON public.public_live_spins TO service_role;

ALTER TABLE public.public_live_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read live spins"
ON public.public_live_spins
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public can add valid live spins"
ON public.public_live_spins
FOR INSERT
TO anon, authenticated
WITH CHECK (number BETWEEN 0 AND 36);

CREATE INDEX public_live_spins_created_idx ON public.public_live_spins (created_at DESC);
ALTER TABLE public.public_live_spins REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.public_live_spins;