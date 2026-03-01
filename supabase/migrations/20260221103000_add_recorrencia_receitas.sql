alter table public.receitas
  add column if not exists recorrente boolean not null default false,
  add column if not exists dia_recorrencia smallint,
  add column if not exists receita_pai_id uuid;

alter table public.receitas
  add constraint receitas_dia_recorrencia_check
  check (dia_recorrencia is null or (dia_recorrencia >= 1 and dia_recorrencia <= 31));

alter table public.receitas
  add constraint receitas_recorrencia_consistencia_check
  check (
    (recorrente = true and dia_recorrencia is not null and receita_pai_id is null) or
    (recorrente = false)
  );

alter table public.receitas
  add constraint receitas_receita_pai_id_fkey
  foreign key (receita_pai_id)
  references public.receitas (id)
  on delete cascade;

create unique index if not exists receitas_lancamento_recorrente_unico_idx
  on public.receitas (receita_pai_id, data)
  where receita_pai_id is not null;
