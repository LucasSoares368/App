alter table public.despesas
  add column if not exists forma_pagamento text,
  add column if not exists cartao_id uuid,
  add column if not exists numero_parcelas integer,
  add column if not exists data_primeira_parcela date,
  add column if not exists data_vencimento date,
  add column if not exists data_pagamento date,
  add column if not exists recorrente boolean not null default false,
  add column if not exists frequencia_recorrencia text not null default 'mensal',
  add column if not exists dia_recorrencia integer,
  add column if not exists data_fim_recorrencia date;

update public.despesas
set data_vencimento = coalesce(data_vencimento, data::date)
where data_vencimento is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'despesas_forma_pagamento_check'
  ) then
    alter table public.despesas
      add constraint despesas_forma_pagamento_check
      check (
        forma_pagamento is null or
        forma_pagamento in (
          'Dinheiro',
          'Pix',
          'Debito',
          'Credito',
          'Transferencia',
          'Outro'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'despesas_numero_parcelas_check'
  ) then
    alter table public.despesas
      add constraint despesas_numero_parcelas_check
      check (numero_parcelas is null or numero_parcelas >= 1);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'despesas_frequencia_recorrencia_check'
  ) then
    alter table public.despesas
      add constraint despesas_frequencia_recorrencia_check
      check (frequencia_recorrencia in ('mensal', 'quinzenal', 'semanal'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'despesas_dia_recorrencia_check'
  ) then
    alter table public.despesas
      add constraint despesas_dia_recorrencia_check
      check (dia_recorrencia is null or (dia_recorrencia between 1 and 31));
  end if;
end $$;

create index if not exists idx_despesas_forma_pagamento
  on public.despesas (forma_pagamento);

create index if not exists idx_despesas_data_vencimento
  on public.despesas (data_vencimento);

create index if not exists idx_despesas_data_pagamento
  on public.despesas (data_pagamento);

create index if not exists idx_despesas_recorrente
  on public.despesas (recorrente);

create index if not exists idx_despesas_cartao_id
  on public.despesas (cartao_id);
