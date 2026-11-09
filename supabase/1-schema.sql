-- Blinks Bakery admin backend
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- It is safe to run more than once.
-- The site talks to these tables only through its Netlify Function,
-- which uses the service role key. Nobody else can read or write them.

-- ---------- Tables ----------

create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  hidden boolean not null default false,
  pin integer,
  is_new boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  hidden boolean not null default false,
  sort integer,
  updated_at timestamptz not null default now()
);

create table if not exists public.history (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  tbl text not null,
  row_key text,
  action text not null,
  old jsonb,
  new jsonb
);

create table if not exists public.snapshot (
  id integer primary key check (id = 1),
  data jsonb not null default '{}'::jsonb,
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.snapshot (id) values (1) on conflict (id) do nothing;

-- ---------- Keep the updated time ----------

create or replace function public.stamp_row() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists stamp_settings on public.settings;
create trigger stamp_settings before insert or update on public.settings
  for each row execute function public.stamp_row();
drop trigger if exists stamp_products on public.products;
create trigger stamp_products before insert or update on public.products
  for each row execute function public.stamp_row();
drop trigger if exists stamp_categories on public.categories;
create trigger stamp_categories before insert or update on public.categories
  for each row execute function public.stamp_row();

-- ---------- Change history ----------

create or replace function public.log_history() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  o jsonb;
  n jsonb;
  k text;
begin
  if tg_op = 'DELETE' then
    o := to_jsonb(old);
  elsif tg_op = 'UPDATE' then
    o := to_jsonb(old);
    n := to_jsonb(new);
    if (o - 'updated_at') = (n - 'updated_at') then
      return null;
    end if;
  else
    n := to_jsonb(new);
  end if;
  k := coalesce(n->>'id', n->>'key', o->>'id', o->>'key');
  insert into public.history (tbl, row_key, action, old, new)
  values (tg_table_name, k, lower(tg_op), o, n);
  delete from public.history where id < (select max(id) from public.history) - 500;
  return null;
end $$;

drop trigger if exists log_settings on public.settings;
create trigger log_settings after insert or update or delete on public.settings
  for each row execute function public.log_history();
drop trigger if exists log_products on public.products;
create trigger log_products after insert or update or delete on public.products
  for each row execute function public.log_history();
drop trigger if exists log_categories on public.categories;
create trigger log_categories after insert or update or delete on public.categories
  for each row execute function public.log_history();

-- ---------- Public snapshot (the only thing visitors can read) ----------

create or replace function public.rebuild_snapshot() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.snapshot set
    data = jsonb_build_object(
      'settings', coalesce((select jsonb_object_agg(key, value) from public.settings), '{}'::jsonb),
      'products', coalesce((select jsonb_agg(
          data || jsonb_build_object('id', id, 'hidden', hidden, 'pin', pin, 'isNew', is_new)
          order by id) from public.products), '[]'::jsonb),
      'categories', coalesce((select jsonb_agg(
          data || jsonb_build_object('id', id, 'hidden', hidden, 'sort', sort)
          order by sort nulls last, id) from public.categories), '[]'::jsonb)
    ),
    version = version + 1,
    updated_at = now()
  where id = 1;
  return null;
end $$;

drop trigger if exists snap_settings on public.settings;
create trigger snap_settings after insert or update or delete on public.settings
  for each statement execute function public.rebuild_snapshot();
drop trigger if exists snap_products on public.products;
create trigger snap_products after insert or update or delete on public.products
  for each statement execute function public.rebuild_snapshot();
drop trigger if exists snap_categories on public.categories;
create trigger snap_categories after insert or update or delete on public.categories
  for each statement execute function public.rebuild_snapshot();

-- ---------- Lock everything (only the service role key can use these) ----------

alter table public.settings enable row level security;
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.history enable row level security;
alter table public.snapshot enable row level security;

revoke all on public.settings, public.products, public.categories, public.history, public.snapshot from anon, authenticated;

-- ---------- Photo storage (public read, uploads go through the Function) ----------

insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do update set public = true;
