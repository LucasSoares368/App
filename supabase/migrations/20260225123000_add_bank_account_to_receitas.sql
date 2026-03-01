alter table public.receitas
  add column if not exists bank_account_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'receitas_bank_account_id_fkey'
  ) then
    alter table public.receitas
      add constraint receitas_bank_account_id_fkey
      foreign key (bank_account_id)
      references public.bank_accounts (id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_receitas_user_bank_account
  on public.receitas (user_id, bank_account_id);
