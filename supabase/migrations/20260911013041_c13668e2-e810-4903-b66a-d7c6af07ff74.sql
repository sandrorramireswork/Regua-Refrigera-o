ALTER TABLE public.sheet_webhook DROP CONSTRAINT IF EXISTS sheet_webhook_singleton_key;
CREATE UNIQUE INDEX IF NOT EXISTS sheet_webhook_legacy_singleton_idx ON public.sheet_webhook (singleton) WHERE singleton = true;

ALTER TABLE public.spins ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app';
ALTER TABLE public.spins ADD COLUMN IF NOT EXISTS sheet_round integer;
CREATE UNIQUE INDEX IF NOT EXISTS spins_user_sheet_round_idx ON public.spins (user_id, sheet_round) WHERE source = 'sheet' AND sheet_round IS NOT NULL;