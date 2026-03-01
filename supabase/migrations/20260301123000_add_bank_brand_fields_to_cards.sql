alter table public.cards
add column if not exists bank_name text,
add column if not exists bank_slug text,
add column if not exists brand_color text;

update public.cards
set bank_name = issuer_bank
where bank_name is null and issuer_bank is not null;

create index if not exists idx_cards_user_bank_slug
  on public.cards (user_id, bank_slug);
