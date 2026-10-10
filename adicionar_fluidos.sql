CREATE TABLE public.refrigerants (
  id text PRIMARY KEY,
  name text NOT NULL,
  has_glide boolean NOT NULL DEFAULT false,
  glide_k numeric NOT NULL DEFAULT 0,
  color text NOT NULL,
  t1 numeric NOT NULL,
  p1 numeric NOT NULL,
  t2 numeric NOT NULL,
  p2 numeric NOT NULL,
  t3 numeric NOT NULL,
  p3 numeric NOT NULL,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.refrigerants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on refrigerants" 
ON public.refrigerants 
FOR SELECT 
USING (true);

INSERT INTO public.refrigerants (id, name, has_glide, glide_k, color, t1, p1, t2, p2, t3, p3) VALUES
('R-410A', 'R-410A', true, 0.1, 'bg-rose-500', -20, 3.996, 10, 10.86, 40, 24.20),
('R-32', 'R-32', false, 0, 'bg-orange-500', -20, 4.25, 10, 11.07, 40, 24.78),
('R-134a', 'R-134a', false, 0, 'bg-blue-400', -20, 1.327, 10, 4.146, 40, 10.165),
('R-404A', 'R-404A', true, 0.5, 'bg-orange-600', -20, 3.008, 10, 8.246, 40, 18.42),
('R-22', 'R-22', false, 0, 'bg-green-500', -20, 2.448, 10, 6.807, 40, 15.335),
('R-407C', 'R-407C', true, 5.0, 'bg-orange-400', -20, 2.45, 10, 7.35, 40, 17.50),
('R-290', 'R-290 (Propane)', false, 0, 'bg-zinc-300', -20, 2.44, 10, 6.36, 40, 13.67),
('R-1234yf', 'R-1234yf', false, 0, 'bg-zinc-400', -20, 1.43, 10, 4.35, 40, 10.15),
('R-744', 'R-744 (CO2)', false, 0, 'bg-slate-500', -40, 10.05, -10, 26.49, 20, 57.29);
