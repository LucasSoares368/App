alter table public.receitas
  add column if not exists forma_pagamento text,
  add column if not exists status_recebimento text not null default 'recebido';

alter table public.receitas
  add constraint receitas_status_recebimento_check
  check (status_recebimento in ('recebido', 'pendente'));
