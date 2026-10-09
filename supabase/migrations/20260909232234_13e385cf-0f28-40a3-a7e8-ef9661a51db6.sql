INSERT INTO public.patterns (code, name, targets, rule, enabled, position)
SELECT 'P' || g, 'Padrão ' || g || ' (a configurar)', '', '{"type":"colors","sequence":[]}'::jsonb, false, g
FROM generate_series(5, 35) AS g
WHERE NOT EXISTS (SELECT 1 FROM public.patterns p WHERE p.code = 'P' || g);