-- ============================================================
-- DecorCity ERP — Supabase Auth + RLS + Profiles Setup
-- Run this entire script in the Supabase SQL Editor.
-- ============================================================

-- 1. PROFILES TABLE
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  role text not null default 'sales' check (role in ('admin', 'sales')),
  name text,
  created_at timestamptz default now()
);

-- Fix: add email column if table already existed without it
alter table profiles add column if not exists email text;
alter table profiles add column if not exists name text;

alter table profiles enable row level security;

-- Admin can read all profiles
create policy "profiles_admin_select"
  on profiles for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Users can read own profile
create policy "profiles_self_select"
  on profiles for select
  using (id = auth.uid());

-- Admin can insert/update profiles
create policy "profiles_admin_insert"
  on profiles for insert
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "profiles_admin_update"
  on profiles for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- 2. AUTO-CREATE PROFILE ON SIGNUP
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'sales'),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 3. RLS ON app_data (main data store — JSON blobs per key)
alter table app_data enable row level security;

-- Admin: full CRUD
create policy "app_data_admin_all"
  on app_data for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Sales: read only
create policy "app_data_sales_select"
  on app_data for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'sales'));

-- 4. RLS ON INDIVIDUAL TABLES (for future granular access)
-- These tables may not exist yet — safe to run, they'll apply when created.

do $$
declare
  tbl text;
  tables text[] := array['quotes', 'items', 'customers', 'receipts', 'productions', 'payperiods', 'outstanding'];
begin
  foreach tbl in array tables
  loop
    if exists (select 1 from information_schema.tables where table_name = tbl) then
      execute format('alter table %I enable row level security;', tbl);

      -- Admin full access
      execute format('
        drop policy if exists %I on %I;
        create policy %I on %I for all
          using (exists (select 1 from profiles where id = auth.uid() and role = ''admin''))
          with check (exists (select 1 from profiles where id = auth.uid() and role = ''admin''));',
        'admin_all_' || tbl, tbl, 'admin_all_' || tbl, tbl);

      -- Sales select
      execute format('
        drop policy if exists %I on %I;
        create policy %I on %I for select
          using (true);',
        'sales_sel_' || tbl, tbl, 'sales_sel_' || tbl, tbl);

      -- Sales insert (own records only, if table has created_by)
      if exists (select 1 from information_schema.columns
                 where table_name = tbl and column_name = 'created_by') then
        execute format('
          drop policy if exists %I on %I;
          create policy %I on %I for insert
            with check (
              exists (select 1 from profiles where id = auth.uid() and role = ''sales'')
              and created_by = auth.uid());',
          'sales_ins_' || tbl, tbl, 'sales_ins_' || tbl, tbl);
      end if;
    end if;
  end loop;
end;
$$;

-- 5. HELPER: PROMOTE A USER TO ADMIN (run this after creating a user in auth)
-- Replace 'user-email@example.com' with the actual email
-- select promote_to_admin('admin@decorcity.com');

create or replace function promote_to_admin(target_email text)
returns void
language plpgsql
security definer
as $$
begin
  update profiles
  set role = 'admin'
  where email = target_email;
end;
$$;

-- 6. HELPER: LIST ALL USERS AND THEIR ROLES
create or replace view user_roles as
  select p.id, p.email, p.role, p.name, p.created_at
  from profiles p
  order by p.created_at desc;
