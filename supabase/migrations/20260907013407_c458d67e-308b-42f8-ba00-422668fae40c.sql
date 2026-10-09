CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Jogadores
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own players" ON public.players FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_players_updated BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lançamentos (entradas/saídas)
CREATE TABLE public.player_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_player_entries_player ON public.player_entries(player_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_entries TO authenticated;
GRANT ALL ON public.player_entries TO service_role;
ALTER TABLE public.player_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own entries" ON public.player_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Padrões configuráveis
CREATE TABLE public.patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  targets text NOT NULL DEFAULT '',
  rule jsonb NOT NULL DEFAULT '{"type":"colors","sequence":[]}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  position smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.patterns TO authenticated;
GRANT ALL ON public.patterns TO service_role;
ALTER TABLE public.patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read patterns" ON public.patterns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage patterns" ON public.patterns FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_patterns_updated BEFORE UPDATE ON public.patterns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Setores do cilindro
CREATE TABLE public.sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  numbers smallint[] NOT NULL DEFAULT '{}',
  position smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sectors TO authenticated;
GRANT ALL ON public.sectors TO service_role;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read sectors" ON public.sectors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage sectors" ON public.sectors FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_sectors_updated BEFORE UPDATE ON public.sectors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Regras de puxa
CREATE TABLE public.pull_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  min_count smallint NOT NULL DEFAULT 1,
  top_n smallint NOT NULL DEFAULT 10,
  window_size smallint NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pull_rules TO authenticated;
GRANT ALL ON public.pull_rules TO service_role;
ALTER TABLE public.pull_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read pull rules" ON public.pull_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage pull rules" ON public.pull_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_pull_rules_updated BEFORE UPDATE ON public.pull_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.pull_rules (singleton) VALUES (true);

INSERT INTO public.sectors (name, numbers, position) VALUES
  ('Voisins', '{22,18,29,7,28,12,35,3,26,0,32,15,19,4,21,2,25}', 1),
  ('Tiers', '{27,13,36,11,30,8,23,10,5,24,16,33}', 2),
  ('Orphelins', '{1,20,14,31,9,17,34,6}', 3);

INSERT INTO public.patterns (code, name, targets, rule, position) VALUES
  ('P1','Alternância de Cor Dupla','19, 29, 17, 7, 15','{"type":"colors","sequence":["red","black","red"]}', 1),
  ('P2','Dúzia Repetida','Menor 0, Maior 30','{"type":"repeat_dozen","count":2}', 2),
  ('P3','Tiers → Voisins','0, 10, 20, 30, 28, 19, 26, 32','{"type":"sectors","sequence":["Tiers","Voisins"]}', 3),
  ('P4','Gatilho do Zero','19, 4, 21, 2, 25, 17, 34','{"type":"numbers","sequence":[0]}', 4);