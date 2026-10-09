CREATE TABLE public.sheet_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  spreadsheet_id text NOT NULL,
  sheet_name text NOT NULL DEFAULT 'Roleta',
  start_row integer NOT NULL DEFAULT 48,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sheet_config TO authenticated;
GRANT ALL ON public.sheet_config TO service_role;

ALTER TABLE public.sheet_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sheet config" ON public.sheet_config
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_sheet_config_updated
  BEFORE UPDATE ON public.sheet_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.sheet_config (user_id, spreadsheet_id)
SELECT id, '1WtYb1nSR32Np5kBu7ZGaxw_e5c5yqI2MDo5muXE5briM'
FROM auth.users
WHERE email = 'sandrorramireswork@gmail.com'
ON CONFLICT (user_id) DO NOTHING;