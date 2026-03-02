alter table public.bank_accounts
add column if not exists account_holder_name text;

create index if not exists idx_bank_accounts_user_account_holder_name
  on public.bank_accounts (user_id, account_holder_name);
