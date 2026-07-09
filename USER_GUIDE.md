# Decor City ERP — User Guide

## Overview
An all-in-one **Enterprise Resource Planning (ERP)** system designed for Decor City Workshop. Manage customers, invoices, receipts, production jobs, payroll, and reports — all in one place, synced across all devices.

**Stack:** Cloud-hosted (Supabase database + Vercel hosting). Login from any device and see the same data instantly after refresh.

---

## 1. Login & Roles

### Login
- Visit the site URL, enter your **email** and **password**
- Passwords are managed via Supabase Auth (admin can create/reset users)

### Roles
| Role | Access |
|------|--------|
| **Admin** | Full access — all pages, user management, settings |
| **Sales** | Dashboard, Customers, Invoices, Receipts, Reports |

Your role is shown next to your name in the top bar after login.

---

## 2. Dashboard

The first page you see after login. Shows:

| Metric | Description |
|--------|-------------|
| **Total Revenue** | Sum of all completed invoices |
| **Outstanding** | Total unpaid balance across all customers |
| **This Week Payroll** | Total commission earned by artisans this week |
| **Active Jobs** | Number of production jobs currently in progress |

**Deadline Alerts:** Red/amber cards at the top show overdue jobs and jobs due this week.

**Quick Actions:** Grid of shortcuts to Process Invoice, New Receipt, Weekly Payroll, Add Customer, Active Jobs, Commission Matrix, and All Invoices.

---

## 3. Customers

- **View:** Table of all customers with name, phone, email, balance, status
- **Add:** Click "Add Customer" — fill in name, phone, email, address, category, credit limit
- **Edit:** Click any customer row to edit their details
- **Bulk Actions:** Select multiple customers to delete, mark active/inactive
- **Search/Filter:** Search by name, filter by category or status

---

## 4. Invoices (Quotes)

- **View All Invoices:** Table with invoice number, customer, date, items, total, deposit, balance, status
- **Process Invoice:** Select a customer, add line items (description, quantity, price), set deposit/status
- **Statuses:** Draft, In Progress, Completed, Cancelled
- **Invoice Details:** Click any invoice to view full breakdown, print, or delete

Each invoice calculates:
- Subtotal (sum of line items)
- Grand total
- Balance = grand total minus payments received

---

## 5. Receipts

- **View All Receipts:** Table with receipt number, customer, date, amount, method, reference invoice
- **New Receipt:** Select customer, enter amount, choose payment method (Cash, Transfer, POS, Cheque), link to invoice
- Receipts automatically update the customer's outstanding balance

---

## 6. Production

Manage frame-making jobs from start to completion.

### New Job
- Select **customer**, **frame type**, enter **dimensions** (width × height)
- The system auto-selects the production stages based on frame type
- Assign **artisans** to each stage and set **commission amounts**
- Commission matrix provides suggested rates per stage based on size tier (Small/Medium/Large)

### Active Jobs
- All jobs currently in production (not yet completed)
- **Mark stages done** as work progresses (date-stamped per stage)
- **Deadline tracking** — set due dates, overdue jobs are highlighted on Dashboard

### All Jobs
- Complete list of every production job ever created
- Filter by status (active/completed), frame type, or date range
- Bulk archive or delete

### Completed Jobs
- Jobs where all production stages are finished
- Printable log for records

### Dates Log
- Calendar-style view showing which stages were worked on which dates
- Useful for tracking productivity and verifying payroll

---

## 7. Payroll

Weekly commission-based payroll for artisans.

### Weekly Payslips
- Navigate between weeks (Prev / Next)
- **Table shows:** each artisan's earnings broken down by production stage
- **Shop Total** row at the bottom
- **Job Breakdown:** detailed view of which jobs contributed to each artisan's pay
- **Mark Paid** button to lock a week as processed
- **Print Week** — formatted printout of the weekly job sheet
- **Export CSV** — download payroll data as spreadsheet

### Outstanding Commissions
- When stages are logged to an already-paid week, the commission moves here
- "Pay All Outstanding" clears the balance in bulk

### Workers
- Performance metrics per artisan: weekly earnings, monthly earnings, outstanding balance
- Overview of all active artisans

### Performance
- Visual comparison of artisan productivity over time

---

## 8. Reports

### Days Outstanding (Aging Report)
- Lists all unpaid invoices sorted by age
- Color-coded: Current (green), 30 days (yellow), 60 days (orange), 90+ days (red)
- Shows total outstanding balance

### Sales by Customer
- Each customer's total sales, amount paid, and balance outstanding
- Sorted by highest total first

### Customer Transactions
- Select a customer to see all invoices and receipts in chronological order
- Combined view of everything that happened with that customer

---

## 9. Settings

### Company Profile
- Company name, tagline, address, phone, email, website, VAT number, logo

### Bank Details & Terms
- Bank name, account number, account name
- Default payment terms shown on invoices

### Sales Reps
- Add/remove sales representatives (linked to invoices)

### Artisans
- Add/remove artisans (linked to production stages and payroll)

### Commission Matrix
- Edit piece-rate commission amounts per stage per size tier
- Changes apply to all new production jobs

### Frame Types
- View production stage sequences for each frame type

### User Management (Admin only)
- Add new users (name, email, password, role)
- Edit or delete existing users
- Users are created in Supabase Auth and get a profile automatically

---

## 10. Data & Sync

- **All data is stored in Supabase** (cloud database)
- **localStorage** on your browser is only a cache for speed
- After any change, data is saved to Supabase automatically
- **Refresh the page** to see changes made by other users
- Clearing your browser cache will not lose data — it will reload from Supabase

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Click column headers | Sort table |
| Type in search fields | Filter table in real-time |
| Click row | Select/open record |

---

## Support

For issues or feature requests, contact the system administrator.
