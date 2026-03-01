alter table public.receitas
  add column if not exists tipo_receita text not null default 'variavel';

alter table public.receitas
  add constraint receitas_tipo_receita_check
  check (tipo_receita in ('fixa', 'variavel'));
