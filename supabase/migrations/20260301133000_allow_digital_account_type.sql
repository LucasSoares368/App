alter table public.bank_accounts
drop constraint if exists bank_accounts_account_type_check;

alter table public.bank_accounts
add constraint bank_accounts_account_type_check
check (account_type in ('corrente', 'poupanca', 'investimento', 'digital'));
