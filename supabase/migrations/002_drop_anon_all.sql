-- Drop overly permissive anon_all policy (created by dashboard, likely restrictive)
drop policy if exists anon_all on app_data;

-- Replace admin_all + sales_select with a single policy for all authenticated users
-- (this is a single-tenant SMB app, all authenticated users share the same data)
drop policy if exists "app_data_admin_all" on app_data;
drop policy if exists "app_data_sales_select" on app_data;

create policy "app_data_all_authenticated"
  on app_data for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
