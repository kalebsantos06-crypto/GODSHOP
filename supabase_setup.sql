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
DROP POLICY IF EXISTS "Permitir acesso total ao próprio usuário" ON suppliers;
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
  birth_date TEXT,
  email TEXT,
  address TEXT,
  street TEXT,
  number TEXT,
  neighborhood TEXT,
  complement TEXT,
  city TEXT,
  state TEXT,
  documento_url TEXT,
  assinatura_base64 TEXT,
  token_cadastro TEXT,
  token_utilizado BOOLEAN DEFAULT FALSE,
  token_expira_em TEXT,
  security_uuid TEXT,
  security_ip TEXT,
  security_browser TEXT,
  security_os TEXT,
  security_device TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Clientes
DROP POLICY IF EXISTS "Permitir acesso total ao próprio usuário" ON clients;
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
DROP POLICY IF EXISTS "Permitir acesso total ao próprio usuário" ON iphones;
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
DROP POLICY IF EXISTS "Permitir acesso total ao próprio usuário" ON consoles;
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
  installment_frequency TEXT DEFAULT 'Mensal' CHECK (installment_frequency IN ('Semanal', 'Quinzenal', 'Mensal')),
  first_installment_date TIMESTAMP WITH TIME ZONE,
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Vendas
DROP POLICY IF EXISTS "Permitir acesso total ao próprio usuário" ON sales;
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
DROP POLICY IF EXISTS "Permitir acesso total ao próprio usuário" ON prices;
CREATE POLICY "Permitir acesso total ao próprio usuário" ON prices
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 7. TABELA DE ASSINATURAS PÚBLICAS (public_sales)
-- ==========================================
CREATE TABLE IF NOT EXISTS public_sales (
  id UUID PRIMARY KEY,
  sale_data JSONB NOT NULL,
  signature_data TEXT,
  signed_at TEXT,
  signed_ip TEXT,
  client_name TEXT,
  witness1_name TEXT,
  witness1_cpf TEXT,
  witness1_signature TEXT,
  witness2_name TEXT,
  witness2_cpf TEXT,
  witness2_signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE public_sales ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Assinaturas Públicas (público total para leitura/gravação anônima)
DROP POLICY IF EXISTS "Permitir leitura pública" ON public_sales;
CREATE POLICY "Permitir leitura pública" ON public_sales
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção pública" ON public_sales;
CREATE POLICY "Permitir inserção pública" ON public_sales
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização pública" ON public_sales;
CREATE POLICY "Permitir atualização pública" ON public_sales
  FOR UPDATE USING (true);


-- ==========================================
-- 8. TABELA DE CLIENTES PÚBLICOS (public_clients)
-- ==========================================
CREATE TABLE IF NOT EXISTS public_clients (
  id TEXT PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  cpf TEXT,
  birth_date TEXT,
  email TEXT,
  address TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  documento_url TEXT,
  assinatura_base64 TEXT,
  token_cadastro TEXT,
  token_utilizado BOOLEAN DEFAULT FALSE,
  token_expira_em TEXT,
  security_uuid TEXT,
  security_ip TEXT,
  security_browser TEXT,
  security_os TEXT,
  security_device TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE public_clients ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Clientes Públicos (gravação e leitura anônimas para o fluxo público de cadastro)
DROP POLICY IF EXISTS "Permitir leitura de clientes públicos" ON public_clients;
CREATE POLICY "Permitir leitura de clientes públicos" ON public_clients
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção de clientes públicos" ON public_clients;
CREATE POLICY "Permitir inserção de clientes públicos" ON public_clients
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir deleção de clientes públicos" ON public_clients;
CREATE POLICY "Permitir deleção de clientes públicos" ON public_clients
  FOR DELETE USING (true);


-- ==========================================
-- 9. TABELA DE TOKENS PÚBLICOS (public_tokens)
-- ==========================================
CREATE TABLE IF NOT EXISTS public_tokens (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  expires_at TEXT,
  used_at TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE public_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Tokens Públicos (validação e uso anônimo no link)
DROP POLICY IF EXISTS "Permitir leitura de tokens públicos" ON public_tokens;
CREATE POLICY "Permitir leitura de tokens públicos" ON public_tokens
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção de tokens públicos" ON public_tokens;
CREATE POLICY "Permitir inserção de tokens públicos" ON public_tokens
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de tokens públicos" ON public_tokens;
CREATE POLICY "Permitir atualização de tokens públicos" ON public_tokens
  FOR UPDATE USING (true);

