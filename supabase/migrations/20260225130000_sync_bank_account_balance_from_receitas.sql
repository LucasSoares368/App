create or replace function public.sync_bank_account_balance_from_receitas()
returns trigger
language plpgsql
as $$
begin
  -- Remove impacto anterior quando a linha antiga contribuia para saldo
  if tg_op in ('UPDATE', 'DELETE')
     and old.bank_account_id is not null
     and old.status_recebimento = 'recebido' then
    update public.bank_accounts
    set balance = balance - old.valor
    where id = old.bank_account_id;
  end if;

  -- Aplica novo impacto quando a linha nova contribui para saldo
  if tg_op in ('INSERT', 'UPDATE')
     and new.bank_account_id is not null
     and new.status_recebimento = 'recebido' then
    update public.bank_accounts
    set balance = balance + new.valor,
        balance_reference_date = coalesce(new.data::date, balance_reference_date)
    where id = new.bank_account_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_bank_account_balance_from_receitas on public.receitas;

create trigger trg_sync_bank_account_balance_from_receitas
after insert or update or delete on public.receitas
for each row
execute function public.sync_bank_account_balance_from_receitas();
