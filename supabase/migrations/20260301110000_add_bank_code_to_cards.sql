alter table public.cards
add column if not exists bank_code text;

create index if not exists idx_cards_user_bank_code
  on public.cards (user_id, bank_code);
