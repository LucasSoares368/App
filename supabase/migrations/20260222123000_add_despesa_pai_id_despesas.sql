alter table public.despesas
  add column if not exists despesa_pai_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'despesas_despesa_pai_id_fkey'
  ) then
    alter table public.despesas
      add constraint despesas_despesa_pai_id_fkey
      foreign key (despesa_pai_id)
      references public.despesas (id)
      on delete cascade;
  end if;
end $$;

create unique index if not exists idx_despesas_pai_data_unique
  on public.despesas (despesa_pai_id, data)
  where despesa_pai_id is not null;
