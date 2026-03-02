alter table public.cards
add column if not exists card_holder_name text;

create index if not exists idx_cards_user_card_holder_name
  on public.cards (user_id, card_holder_name);
