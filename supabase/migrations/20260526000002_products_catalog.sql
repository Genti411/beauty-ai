-- Public makeup catalog + the try-on-enabled shade subset.
create table public.products (
  id              uuid primary key default gen_random_uuid(),
  source          text not null,
  external_id     text not null,
  brand           text not null,
  name            text not null,
  category        text not null,
  shade_name      text,
  image_url       text,
  price           numeric(10,2),
  currency        text not null default 'USD',
  buy_url         text not null,
  popularity_score int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (source, external_id)
);

create index products_category_idx on public.products (category);
create index products_popularity_idx on public.products (popularity_score desc);

create table public.tryon_shades (
  product_id uuid primary key references public.products (id) on delete cascade,
  hex        text not null,
  region     text not null,
  finish     text
);

alter table public.products enable row level security;
alter table public.tryon_shades enable row level security;

-- Catalog is public: anyone may read. No client write policy — writes happen
-- only via the service role during ingestion.
create policy "products_public_read" on public.products for select using (true);
create policy "tryon_shades_public_read" on public.tryon_shades for select using (true);
