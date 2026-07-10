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
- **Accounting tab** replaced the old Reports tab; `pgAccounting()` landing page with 4 KPI cards, AR aging tiles, activity data table, quick-action footer
- **Sidebar** restructured into 3 grouped sections (Overview, TRANSACTIONS, REPORTS) with section labels; `buildSB()` skips empty labels
- **Button system**: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-success`, `.btn-destructive`, `.btn-sm`, `.btn-xs` CSS classes; 64 inline button strings replaced
- **Bug fixes**: removed duplicate "Add Invoice" link (#3); added `.sr` CSS class for 90+ day/unpaid badges (#5); added `fmtC()` compact formatter (#9)
- **Print fixes**: scrollbars hidden in print via `overflow:visible`; payroll print uses `table-layout:fixed` + colgroup; production print no longer wraps in `overflow-x:auto` div; status badges clipped to cell with `overflow:hidden`
- **Delivery/Design Fees**: `delFee` and `designFee` on invoices, included in grand total, shown in table/preview/print
- **Terms & Bank Details**: auto-expanding textarea; bank details shown in form, preview, and print
- **Monthly Sales Report**: filter (All / With Balance / Part Payment / Full Payment), print + Excel export
- **Production**: Completed Jobs + All Jobs with filter dropdowns and payroll-style print layout
- **Dark mode**: auto-detects `prefers-color-scheme` on first load
- **Supabase URL**: hardcoded in `index.html:4402` — **currently points to LIVE project** (`ujblogfdxxktendnzjlg`). Do NOT change to dev project unless testing locally against dev data.
- **Staff users live in LIVE project**. Admin user was created in DEV previously. The commit `8142bd0` accidentally switched the URL to DEV, breaking staff login. Fixed in `ce1f118`.
- **All Invoices page** now shows total frame Qty (sum of `qty` across line items) instead of line item count. Column header: **Qty**.

## Active / To-Do
- (none currently)

## How to Deploy Changes
1. Edit files locally
2. Commit + push to GitHub (`git add -A; git commit -m "msg"; git push`)
3. Vercel auto-deploys the new `index.html`
4. If SQL changed, user pastes migration in Supabase SQL Editor
