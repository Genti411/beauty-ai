-- Auto-maintain profiles.updated_at on every row update, so it reflects the last
-- change instead of staying equal to created_at (foundation review follow-up).
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
