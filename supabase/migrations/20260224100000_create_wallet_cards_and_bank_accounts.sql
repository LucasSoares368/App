create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  issuer_bank text,
  credit_limit numeric(14, 2) not null default 0,
  closing_day integer not null,
  due_day integer not null,
  provider text,
  external_id text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cards_closing_day_check check (closing_day between 1 and 28),
  constraint cards_due_day_check check (due_day between 1 and 28),
  constraint cards_credit_limit_check check (credit_limit >= 0)
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  bank_name text not null,
  account_type text not null,
  balance numeric(14, 2) not null default 0,
  balance_reference_date date,
  provider text,
  external_id text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_accounts_account_type_check check (account_type in ('corrente', 'poupanca', 'investimento'))
);

create index if not exists idx_cards_user_id on public.cards (user_id);
create index if not exists idx_cards_user_name on public.cards (user_id, name);
create index if not exists idx_bank_accounts_user_id on public.bank_accounts (user_id);
create index if not exists idx_bank_accounts_user_name on public.bank_accounts (user_id, name);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'despesas'
      and column_name = 'cartao_id'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'despesas_cartao_id_fkey'
  ) then
    alter table public.despesas
      add constraint despesas_cartao_id_fkey
      foreign key (cartao_id)
      references public.cards (id)
      on delete set null;
  end if;
end $$;

create or replace function public.set_wallet_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_cards_updated_at on public.cards;
create trigger set_cards_updated_at
before update on public.cards
for each row
execute function public.set_wallet_updated_at();

drop trigger if exists set_bank_accounts_updated_at on public.bank_accounts;
create trigger set_bank_accounts_updated_at
before update on public.bank_accounts
for each row
execute function public.set_wallet_updated_at();

alter table public.cards enable row level security;
alter table public.bank_accounts enable row level security;

drop policy if exists "Users can view own cards" on public.cards;
create policy "Users can view own cards"
  on public.cards for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own cards" on public.cards;
create policy "Users can insert own cards"
  on public.cards for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own cards" on public.cards;
create policy "Users can update own cards"
  on public.cards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own cards" on public.cards;
create policy "Users can delete own cards"
  on public.cards for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own bank_accounts" on public.bank_accounts;
create policy "Users can view own bank_accounts"
  on public.bank_accounts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own bank_accounts" on public.bank_accounts;
create policy "Users can insert own bank_accounts"
  on public.bank_accounts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own bank_accounts" on public.bank_accounts;
create policy "Users can update own bank_accounts"
  on public.bank_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own bank_accounts" on public.bank_accounts;
create policy "Users can delete own bank_accounts"
  on public.bank_accounts for delete
  using (auth.uid() = user_id);

