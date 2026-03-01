alter table public.despesas
  add column if not exists installment_group_id uuid,
  add column if not exists installment_index integer,
  add column if not exists installments_total integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'despesas_installment_index_check'
  ) then
    alter table public.despesas
      add constraint despesas_installment_index_check
      check (installment_index is null or installment_index >= 1);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'despesas_installments_total_check'
  ) then
    alter table public.despesas
      add constraint despesas_installments_total_check
      check (installments_total is null or installments_total >= 1);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'despesas_installment_bounds_check'
  ) then
    alter table public.despesas
      add constraint despesas_installment_bounds_check
      check (
        installment_index is null or
        installments_total is null or
        installment_index <= installments_total
      );
  end if;
end $$;

create index if not exists idx_despesas_installment_group_id
  on public.despesas (installment_group_id);

create index if not exists idx_despesas_installment_position
  on public.despesas (installment_group_id, installment_index);
