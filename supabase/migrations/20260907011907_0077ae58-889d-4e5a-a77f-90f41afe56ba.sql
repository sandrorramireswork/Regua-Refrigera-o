CREATE TABLE public.spins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  number SMALLINT NOT NULL CHECK (number >= 0 AND number <= 36),
  color TEXT NOT NULL,
  dozen SMALLINT NOT NULL,
  column_idx SMALLINT NOT NULL,
  sector TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spins TO authenticated;
GRANT ALL ON public.spins TO service_role;

ALTER TABLE public.spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own spins" ON public.spins FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX spins_user_created_idx ON public.spins (user_id, created_at DESC);