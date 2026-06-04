-- Opt-in saved looks: a per-user gallery of rendered with-makeup images.
alter table public.profiles
  add column if not exists saved_looks_consented_at timestamptz;

create table public.saved_looks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  image_path  text not null,
  picks       jsonb not null,
  created_at  timestamptz not null default now()
);
create index saved_looks_user_created_idx on public.saved_looks (user_id, created_at desc);

alter table public.saved_looks enable row level security;

create policy "saved_looks_select_own"
  on public.saved_looks for select
  using (auth.uid() = user_id);

create policy "saved_looks_insert_own"
  on public.saved_looks for insert
  with check (auth.uid() = user_id);

create policy "saved_looks_delete_own"
  on public.saved_looks for delete
  using (auth.uid() = user_id);

-- Private Storage bucket for rendered look images.
insert into storage.buckets (id, name, public)
values ('look-images', 'look-images', false)
on conflict (id) do nothing;

-- Per-user prefix isolation on storage.objects for this bucket.
-- The object key is '<user_id>/<look_id>.png'.
create policy "look_images_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'look-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "look_images_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'look-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "look_images_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'look-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
