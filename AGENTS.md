# DecorCity ERP — Project Context

## Stack
- Single-page app (`index.html`) — vanilla JS, Tailwind CSS (CDN), Supabase JS client
- **Hosting**: Vercel (auto-deploys from `git push` to `main`)
- **Database**: Supabase (Postgres, RLS, Edge Functions)
- **Auth**: Supabase Auth (email/password)

## Architecture
- **State**: All data lives in a global `DB` object in memory
- **Persistence**: 
  - `saveDB()` writes to localStorage + calls `sbSync()` which upserts each key into Supabase `app_data` table
  - `sbLoad()` on page load fetches all keys from Supabase and overwrites local state
  - Supabase is the source of truth; localStorage is just a cache
- **Auth flow**: `checkSession()` → `fetchProfile()` → `sbLoad()` → `initApp()`

## Key Files
- `index.html` — entire app (~4000 lines)
- `supabase/migrations/001_init.sql` — profiles table, RLS policies, `is_admin()` function
- `supabase/migrations/002_drop_anon_all.sql` — fixed RLS for app_data

## What Has Been Done
- Supabase Auth with email/password login
- `profiles` table with role (admin/sales), auto-created on signup via trigger
- `is_admin()` helper function (security definer, avoids recursion)
- RLS on `app_data`: single policy `app_data_all_authenticated` (all ops for any logged-in user)
- RLS on `profiles`: self-select + admin-select/insert/update/delete
- Edge Functions (8): create-invoice, create-customer, create-receipt, create-production, mark-stage-done, process-payroll, delete-record, manage-user
- sbLoad: overwrites local state with Supabase data (no merge logic)
- sbSync: no guard — all authenticated users push to Supabase
- Login flow works, role-based UI (admin sees full nav, sales sees limited)

## Known State
- Site works: data syncs across devices
- No real-time push (requires refresh to see other users' changes)
- Edge functions deployed but usage may need verification
- Tailwind CDN warning is cosmetic (fine for dev/SMB use)

## How to Deploy Changes
1. Edit files locally
2. Commit + push to GitHub (`git add -A; git commit -m "msg"; git push`)
3. Vercel auto-deploys the new `index.html`
4. If SQL changed, user pastes migration in Supabase SQL Editor
