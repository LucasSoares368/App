alter table public.despesas
  add column if not exists status_pagamento text not null default 'pendente',
  add column if not exists tipo_despesa text not null default 'variavel';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'despesas_status_pagamento_check'
  ) then
    alter table public.despesas
      add constraint despesas_status_pagamento_check
      check (status_pagamento in ('pago', 'pendente'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'despesas_tipo_despesa_check'
  ) then
    alter table public.despesas
      add constraint despesas_tipo_despesa_check
      check (tipo_despesa in ('fixa', 'variavel'));
  end if;
end $$;

create index if not exists idx_despesas_status_pagamento
  on public.despesas (status_pagamento);

create index if not exists idx_despesas_tipo_despesa
  on public.despesas (tipo_despesa);

create index if not exists idx_despesas_data
  on public.despesas (data);

update public.despesas
set status_pagamento = coalesce(status_pagamento, 'pendente')
where status_pagamento is null;

update public.despesas
set tipo_despesa = coalesce(tipo_despesa, 'variavel')
where tipo_despesa is null;
