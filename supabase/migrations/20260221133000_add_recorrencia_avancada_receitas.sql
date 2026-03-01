alter table public.receitas
  add column if not exists frequencia_recorrencia text not null default 'mensal',
  add column if not exists data_fim_recorrencia date;

alter table public.receitas
  add constraint receitas_frequencia_recorrencia_check
  check (frequencia_recorrencia in ('mensal', 'quinzenal', 'semanal'));
