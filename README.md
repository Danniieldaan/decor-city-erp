# Decor City ERP

Full-stack production management system for Decor City Frame Workshop & Art Studio.

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (email/password)
- **Hosting:** Vercel (free)

## Setup Instructions

### 1. Clone & Install

```bash
cd decor-city-erp
npm install
```

### 2. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Create a new project
3. Once created, go to **Project Settings → API** and copy:
   - `Project URL` (your `VITE_SUPABASE_URL`)
   - `anon public` key (your `VITE_SUPABASE_ANON_KEY`)

### 3. Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Open `supabase/schema.sql` from this project
3. Copy the entire contents and paste into the SQL Editor
4. Click **Run** to create all tables and policies

### 4. Configure Environment

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Enable Auth (Email/Password)

1. In Supabase dashboard, go to **Authentication → Providers**
2. Ensure **Email** is enabled
3. (Optional) Disable "Confirm email" for testing so users can sign up instantly

### 6. Create Your First User

1. Go to **Authentication → Users** in Supabase
2. Click **Add User** and create an admin account
3. Or start the app locally and use the sign-up flow

### 7. Run Locally

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### 8. Deploy to Vercel (Free)

1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign up (free, connect GitHub)
3. Click **Add New → Project** and select your repo
4. Add environment variables:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**
6. Your app is live at `https://your-project.vercel.app`

## Project Structure

```
src/
├── lib/
│   ├── supabase.js      # Supabase client
│   ├── db.js            # Database CRUD operations
│   ├── utils.js         # Utility functions (fmt, fd, calcPrice, etc.)
│   └── constants.js     # Frame types, stages, tier definitions
├── context/
│   └── AuthContext.jsx  # Auth state management
├── components/
│   ├── Layout.jsx       # App shell (navbar + hamburger sidebar)
│   └── Modal.jsx        # Reusable modal dialog
├── pages/
│   ├── Dashboard.jsx
│   ├── Customers.jsx / CustomerForm.jsx
│   ├── Invoices.jsx / InvoiceForm.jsx
│   ├── Receipts.jsx / ReceiptForm.jsx
│   ├── Production.jsx / ProductionForm.jsx
│   ├── AllJobs.jsx / CompletedJobs.jsx / DatesLog.jsx
│   ├── Payroll.jsx / Workers.jsx / Performance.jsx
│   ├── reports/
│   │   ├── DaysOutstanding.jsx
│   │   ├── SalesByCustomer.jsx
│   │   └── Transactions.jsx
│   └── Settings.jsx
├── App.jsx              # Routes & navigation
├── main.jsx             # Entry point
└── index.css            # Tailwind + custom CSS classes
```

## Features

- Customer management with balance tracking
- Invoice creation, printing, and emailing
- Receipt processing with invoice allocation
- Production job tracking with stage matrix
- Artisan management and commission tracking
- Weekly payroll calculation
- Performance analytics
- Reporting (days outstanding, sales by customer, transactions)
- Dark mode (toggle in top navbar)
- Hamburger sidebar navigation
- Role-based access control (admin / sales rep)
