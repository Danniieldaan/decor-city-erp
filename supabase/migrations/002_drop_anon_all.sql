-- Drop the overly permissive anon_all policy that allows anyone to do anything on app_data
drop policy if exists anon_all on app_data;
