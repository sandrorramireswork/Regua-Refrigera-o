UPDATE public.patterns
SET name = 'Repetido - Terminal menos 1',
    rule = '{"type":"repeat_terminal_gap","count":12}'::jsonb,
    enabled = true,
    updated_at = now()
WHERE code = 'P6';

INSERT INTO public.patterns (code, name, targets, rule, enabled, position)
SELECT 'P6', 'Repetido - Terminal menos 1', '', '{"type":"repeat_terminal_gap","count":12}'::jsonb, true, 6
WHERE NOT EXISTS (SELECT 1 FROM public.patterns WHERE code = 'P6');