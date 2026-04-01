-- 1. Create Suppliers table
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  cpf TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create iPhones table
CREATE TABLE iphones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model TEXT NOT NULL,
  storage TEXT NOT NULL,
  color TEXT NOT NULL,
  buy_price DECIMAL(10, 2) NOT NULL,
  imei TEXT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  buy_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'vendido')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  iphone_id UUID REFERENCES iphones(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  sell_price DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  installments INTEGER DEFAULT 1,
  installment_frequency TEXT DEFAULT 'Mensal' CHECK (installment_frequency IN ('Semanal', 'Mensal')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Prices table (Price Table feature)
CREATE TABLE prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model TEXT NOT NULL,
  storage TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Optional but recommended)
-- For now, we'll just create the tables.
