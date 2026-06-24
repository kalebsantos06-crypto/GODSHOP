-- HABILITAR EXTENSÃO DE UUID (Necessário para geração automática de IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABELA DE FORNECEDORES (suppliers)
-- ==========================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Fornecedores
CREATE POLICY "Permitir acesso total ao próprio usuário" ON suppliers
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 2. TABELA DE CLIENTES (clients)
-- ==========================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  cpf TEXT,
  email TEXT,
  address TEXT,
  street TEXT,
  number TEXT,
  neighborhood TEXT,
  complement TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Clientes
CREATE POLICY "Permitir acesso total ao próprio usuário" ON clients
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 3. TABELA DE IPHONES (iphones)
-- ==========================================
CREATE TABLE IF NOT EXISTS iphones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  storage TEXT NOT NULL,
  color TEXT NOT NULL,
  buy_price DECIMAL(10, 2) NOT NULL,
  imei TEXT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  buy_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'vendido')),
  condition TEXT DEFAULT 'seminovo' CHECK (condition IN ('lacrado', 'seminovo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE iphones ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para iPhones
CREATE POLICY "Permitir acesso total ao próprio usuário" ON iphones
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 4. TABELA DE CONSOLES (consoles)
-- ==========================================
CREATE TABLE IF NOT EXISTS consoles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  version TEXT NOT NULL,
  buy_price DECIMAL(10, 2) NOT NULL,
  buy_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'vendido')),
  condition TEXT DEFAULT 'seminovo' CHECK (condition IN ('lacrado', 'seminovo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE consoles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Consoles
CREATE POLICY "Permitir acesso total ao próprio usuário" ON consoles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 5. TABELA DE VENDAS (sales)
-- ==========================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  iphone_id UUID REFERENCES iphones(id) ON DELETE SET NULL,
  console_id UUID REFERENCES consoles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  sell_price DECIMAL(10, 2) NOT NULL,
  down_payment DECIMAL(10, 2) DEFAULT 0,
  payment_method TEXT NOT NULL,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  installments INTEGER DEFAULT 1,
  installment_frequency TEXT DEFAULT 'Mensal' CHECK (installment_frequency IN ('Semanal', 'Mensal')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Vendas
CREATE POLICY "Permitir acesso total ao próprio usuário" ON sales
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 6. TABELA DE PREÇOS (prices)
-- ==========================================
CREATE TABLE IF NOT EXISTS prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'iphone' CHECK (category IN ('iphone', 'console')),
  model TEXT NOT NULL,
  version TEXT,
  storage TEXT NOT NULL,
  color TEXT,
  condition TEXT,
  price DECIMAL(10, 2) NOT NULL,
  price_usd DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Tabela de Preços
CREATE POLICY "Permitir acesso total ao próprio usuário" ON prices
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
