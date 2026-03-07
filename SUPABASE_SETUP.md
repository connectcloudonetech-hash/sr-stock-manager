# Supabase Setup Guide

To integrate Supabase with your project, follow these steps:

## 1. Create Tables
Run the following SQL in your Supabase SQL Editor:

```sql
-- Create Customers table
CREATE TABLE customers (
  id TEXT PRIMARY KEY, -- Changed from UUID to TEXT for compatibility
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Suppliers table
CREATE TABLE suppliers (
  id TEXT PRIMARY KEY, -- Changed from UUID to TEXT for compatibility
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Categories table
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Stock Movements table
CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY, -- Changed from UUID to TEXT for compatibility
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
  category TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL, -- Changed to TEXT
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL, -- Changed to TEXT
  qty INTEGER NOT NULL,
  nos INTEGER NOT NULL,
  unit_price DECIMAL,
  weight DECIMAL,
  amount DECIMAL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- Create Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin
INSERT INTO users (id, username, full_name, role, password)
VALUES ('1', 'ADMIN', 'ADMINISTRATOR', 'admin', '123')
ON CONFLICT (username) DO NOTHING;
```

## 2. Environment Variables
Add your Supabase credentials to your environment variables (e.g., in `.env` or your deployment platform):

- `VITE_SUPABASE_URL`: Your Supabase Project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
