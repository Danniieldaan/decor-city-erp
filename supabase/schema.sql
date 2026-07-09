-- Supabase SQL Schema for Decor City ERP
-- Run this in the Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================
-- CUSTOMERS
-- ============================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  mobile TEXT DEFAULT '',
  email TEXT DEFAULT '',
  a1 TEXT DEFAULT '',
  a2 TEXT DEFAULT '',
  a3 TEXT DEFAULT '',
  post TEXT DEFAULT '',
  vat TEXT DEFAULT '',
  credit NUMERIC DEFAULT 0,
  bal NUMERIC DEFAULT 0,
  rep TEXT DEFAULT '',
  category TEXT DEFAULT '',
  telephone TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- INVOICES
-- ============================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cid UUID REFERENCES customers(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  exp TEXT DEFAULT '',
  ref TEXT DEFAULT '',
  disc NUMERIC DEFAULT 0,
  msg TEXT DEFAULT '',
  rep TEXT DEFAULT '',
  del TEXT DEFAULT '',
  stat TEXT DEFAULT 'Issued',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- INVOICE ITEMS
-- ============================
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qid UUID REFERENCES invoices(id) ON DELETE CASCADE,
  ft TEXT DEFAULT '',
  w NUMERIC,
  h NUMERIC,
  qty NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'cm',
  "desc" TEXT DEFAULT '',
  price NUMERIC DEFAULT 0,
  disc NUMERIC DEFAULT 0,
  _manualPrice BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- RECEIPTS
-- ============================
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cid UUID REFERENCES customers(id) ON DELETE CASCADE,
  qid UUID REFERENCES invoices(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  method TEXT DEFAULT 'Bank Transfer',
  date TEXT NOT NULL,
  ref TEXT DEFAULT '',
  note TEXT DEFAULT '',
  "desc" TEXT DEFAULT '',
  bank TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- PRODUCTIONS
-- ============================
CREATE TABLE productions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jobId TEXT DEFAULT '',
  ft TEXT DEFAULT '',
  w NUMERIC,
  h NUMERIC,
  unit TEXT DEFAULT 'cm',
  qty NUMERIC DEFAULT 1,
  tier TEXT DEFAULT '',
  custName TEXT DEFAULT '',
  date TEXT DEFAULT '',
  due TEXT DEFAULT '',
  "desc" TEXT DEFAULT '',
  note TEXT DEFAULT '',
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'active',
  jid TEXT DEFAULT '',  -- links to invoice_item id
  parentId TEXT DEFAULT '',
  cid TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- PRODUCTION STAGES
-- ============================
CREATE TABLE production_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pid UUID REFERENCES productions(id) ON DELETE CASCADE,
  idx INTEGER DEFAULT 0,
  sk TEXT NOT NULL,  -- stage key
  artisans TEXT DEFAULT '',  -- comma-separated artisan names
  comm NUMERIC DEFAULT 0,
  date TEXT DEFAULT '',
  dateOverride TEXT DEFAULT '',
  weekLogged TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- OUTSTANDING (Artisan payments)
-- ============================
CREATE TABLE outstanding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artisan TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  source TEXT DEFAULT '',  -- 'stage' or 'manual'
  sourceId TEXT DEFAULT '',
  size TEXT DEFAULT '',
  weekLogged TEXT DEFAULT '',
  paid BOOLEAN DEFAULT false,
  paidDate TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- SETTINGS
-- ============================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT DEFAULT 'Decor City',
  tagline TEXT DEFAULT 'Frame Workshop & Art Studio',
  logo TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  website TEXT DEFAULT '',
  terms TEXT DEFAULT '',
  disc_pct NUMERIC DEFAULT 0,
  vat_rate NUMERIC DEFAULT 0,
  bank_terms TEXT DEFAULT '',
  currency TEXT DEFAULT 'Naira',
  -- Custom data stored as JSON
  frame_types JSONB DEFAULT '[]',
  stage_commissions JSONB DEFAULT '{}',
  artisans JSONB DEFAULT '[]',
  sales_reps JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- PROFILES (linked to Supabase Auth)
-- ============================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT DEFAULT '',
  role TEXT DEFAULT 'admin',
  grants JSONB DEFAULT '[]',
  rep_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- ROW LEVEL SECURITY
-- ============================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE outstanding ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write all tables
CREATE POLICY "Authenticated users can do everything" ON customers
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can do everything" ON invoices
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can do everything" ON invoice_items
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can do everything" ON receipts
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can do everything" ON productions
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can do everything" ON production_stages
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can do everything" ON outstanding
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can do everything" ON settings
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================
-- AUTO-UPDATE TIMESTAMPS
-- ============================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER productions_updated_at BEFORE UPDATE ON productions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER production_stages_updated_at BEFORE UPDATE ON production_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
