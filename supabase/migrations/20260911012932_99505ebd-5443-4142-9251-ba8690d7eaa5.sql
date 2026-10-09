CREATE TABLE public.game_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pattern_code text NOT NULL,
  bet numeric NOT NULL,
  result numeric NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_entries TO authenticated;
GRANT ALL ON public.game_entries TO service_role;
ALTER TABLE public.game_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own games" ON public.game_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX game_entries_user_created_idx ON public.game_entries (user_id, created_at DESC);
CREATE TRIGGER trg_game_entries_updated BEFORE UPDATE ON public.game_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sheet_webhook ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.sheet_pings ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS sheet_webhook_user_idx ON public.sheet_webhook (user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sheet_webhook_token_idx ON public.sheet_webhook (token);
CREATE INDEX IF NOT EXISTS sheet_pings_user_created_idx ON public.sheet_pings (user_id, created_at DESC);
GRANT INSERT ON public.sheet_webhook TO authenticated;
DROP POLICY IF EXISTS "Logged users read webhook token" ON public.sheet_webhook;
CREATE POLICY "Users read own or legacy webhook" ON public.sheet_webhook FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users create own webhook" ON public.sheet_webhook FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Logged users read sheet pings" ON public.sheet_pings;
CREATE POLICY "Users read own or legacy sheet pings" ON public.sheet_pings FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);