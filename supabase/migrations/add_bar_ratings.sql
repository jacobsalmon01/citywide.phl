-- 1. Add rating count column to bars
alter table bars add column if not exists citywide_rating_count integer not null default 0;

-- 2. Create bar_ratings table
create table if not exists bar_ratings (
  id          uuid primary key default gen_random_uuid(),
  bar_id      uuid not null references bars(id) on delete cascade,
  session_id  uuid not null,
  rating      smallint not null check (rating between 1 and 5),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (bar_id, session_id)
);

-- 3. Trigger to keep bars.citywide_rating + citywide_rating_count in sync
create or replace function refresh_bar_rating()
returns trigger language plpgsql as $$
declare
  target_bar_id uuid;
begin
  target_bar_id := coalesce(new.bar_id, old.bar_id);
  update bars
  set
    citywide_rating       = (select coalesce(round(avg(rating)::numeric, 2), 0) from bar_ratings where bar_id = target_bar_id),
    citywide_rating_count = (select count(*) from bar_ratings where bar_id = target_bar_id)
  where id = target_bar_id;
  return null;
end;
$$;

create trigger trg_refresh_bar_rating
after insert or update or delete on bar_ratings
for each row execute function refresh_bar_rating();

-- 4. RLS — anon users can upsert ratings
alter table bar_ratings enable row level security;

create policy "anon can upsert ratings"
  on bar_ratings
  for all
  to anon
  using (true)
  with check (true);
