-- Remove modulo de dividas
-- Faz drop da tabela de dividas e objetos dependentes (indices, policies, triggers)
DROP TABLE IF EXISTS public.dividas CASCADE;
