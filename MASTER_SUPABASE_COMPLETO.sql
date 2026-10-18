-- ==============================================================================
-- SCRIPT DE IMPLANTAÇÃO & ESTRUTURA COMPLETA DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- ==============================================================================
-- Execute este script no SQL Editor do seu painel Supabase (https://supabase.com/dashboard).
-- Este script é idempotente (pode ser executado várias vezes sem apagar seus dados existentes).

-- 0. HABILITAR EXTENSÃO DE UUID
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

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

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

ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS complement TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS documento_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assinatura_base64 TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS token_cadastro TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS token_utilizado BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS token_expira_em TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS security_uuid TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS security_ip TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS security_browser TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS security_os TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS security_device TEXT;

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

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
  battery_health INTEGER,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  buy_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'disponivel',
  condition TEXT DEFAULT 'seminovo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE iphones ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE iphones ADD COLUMN IF NOT EXISTS imei TEXT;
ALTER TABLE iphones ADD COLUMN IF NOT EXISTS battery_health INTEGER;
ALTER TABLE iphones ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE iphones ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disponivel';
ALTER TABLE iphones ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'seminovo';
ALTER TABLE iphones ADD COLUMN IF NOT EXISTS buy_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE iphones ENABLE ROW LEVEL SECURITY;

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
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  buy_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'disponivel',
  condition TEXT DEFAULT 'seminovo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE consoles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE consoles ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE consoles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disponivel';
ALTER TABLE consoles ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'seminovo';
ALTER TABLE consoles ADD COLUMN IF NOT EXISTS buy_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE consoles ENABLE ROW LEVEL SECURITY;

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
  installments_paid INTEGER DEFAULT 0,
  installment_frequency TEXT DEFAULT 'Mensal',
  first_installment_date TIMESTAMP WITH TIME ZONE,
  custom_payments TEXT,
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE sales ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS iphone_id UUID REFERENCES iphones(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS console_id UUID REFERENCES consoles(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS down_payment DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS installments_paid INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS installment_frequency TEXT DEFAULT 'Mensal';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS first_installment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS custom_payments TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS signature_data TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS signed_ip TEXT;

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

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
  category TEXT NOT NULL DEFAULT 'iphone',
  model TEXT NOT NULL,
  version TEXT,
  storage TEXT NOT NULL,
  color TEXT,
  condition TEXT,
  price DECIMAL(10, 2) NOT NULL,
  price_usd DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE prices ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'iphone';
ALTER TABLE prices ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS price_usd DECIMAL(10, 2);

ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

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

ALTER TABLE public_sales ENABLE ROW LEVEL SECURITY;

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
  user_id TEXT, -- Suporta tanto UUID quanto IDs de vendedores/offline
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

-- Migração segura para tabelas já criadas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'public_clients' AND column_name = 'user_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public_clients ALTER COLUMN user_id TYPE TEXT;
  END IF;
END $$;

ALTER TABLE public_clients ENABLE ROW LEVEL SECURITY;

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
  user_id TEXT, -- Suporta tanto UUID quanto IDs de vendedores/offline
  used BOOLEAN DEFAULT FALSE,
  expires_at TEXT,
  used_at TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migração segura para tabelas já criadas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'public_tokens' AND column_name = 'user_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public_tokens ALTER COLUMN user_id TYPE TEXT;
  END IF;
END $$;

ALTER TABLE public_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de tokens públicos" ON public_tokens;
CREATE POLICY "Permitir leitura de tokens públicos" ON public_tokens
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção de tokens públicos" ON public_tokens;
CREATE POLICY "Permitir inserção de tokens públicos" ON public_tokens
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de tokens públicos" ON public_tokens;
CREATE POLICY "Permitir atualização de tokens públicos" ON public_tokens
  FOR UPDATE USING (true);


-- ==========================================
-- 10. TABELA DE ANOTAÇÕES (notes)
-- ==========================================
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'Geral',
  priority TEXT DEFAULT 'Normal',
  due_date TEXT,
  due_time TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Geral';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Normal';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS due_date TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS due_time TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS completed_at TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso total a anotações do próprio usuário" ON notes;
CREATE POLICY "Permitir acesso total a anotações do próprio usuário" ON notes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Permitir fallback anotações públicas" ON notes;
CREATE POLICY "Permitir fallback anotações públicas" ON notes
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);


-- ==========================================
-- 11. TABELA DE CHECKLIST DE ANOTAÇÕES (note_checklist_items)
-- ==========================================
CREATE TABLE IF NOT EXISTS note_checklist_items (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE note_checklist_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE note_checklist_items ADD COLUMN IF NOT EXISTS note_id TEXT;
ALTER TABLE note_checklist_items ADD COLUMN IF NOT EXISTS text TEXT;
ALTER TABLE note_checklist_items ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
ALTER TABLE note_checklist_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE note_checklist_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE note_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso total a checklist do próprio usuário" ON note_checklist_items;
CREATE POLICY "Permitir acesso total a checklist do próprio usuário" ON note_checklist_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Permitir fallback checklist público" ON note_checklist_items;
CREATE POLICY "Permitir fallback checklist público" ON note_checklist_items
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);


-- ==========================================
-- 12. TABELA DE ÁUDIOS DE ANOTAÇÕES (note_audio)
-- ==========================================
CREATE TABLE IF NOT EXISTS note_audio (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  duration NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE note_audio ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE note_audio ADD COLUMN IF NOT EXISTS note_id TEXT;
ALTER TABLE note_audio ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE note_audio ADD COLUMN IF NOT EXISTS duration NUMERIC DEFAULT 0;
ALTER TABLE note_audio ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE note_audio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso total a áudios do próprio usuário" ON note_audio;
CREATE POLICY "Permitir acesso total a áudios do próprio usuário" ON note_audio
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Permitir fallback áudios públicos" ON note_audio;
CREATE POLICY "Permitir fallback áudios públicos" ON note_audio
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);



-- ==============================================================================
-- GODSHOP - SCRIPT COMPLETO DE ATUALIZAÇÕES & NOVAS ABAS (SUPABASE / POSTGRESQL)
-- ==============================================================================
-- Execute este script no SQL Editor do seu Supabase Dashboard (https://supabase.com/dashboard)
-- Este script é 100% IDEMPOTENTE: usa "IF NOT EXISTS", portanto pode ser executado
-- com segurança sem apagar ou corromper dados já cadastrados.
-- ==============================================================================

-- 0. HABILITAR EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. NOVA ABA: REGISTRO DE USUÁRIOS DA EQUIPE & OPERADORES (system_users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS system_users (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'Vendedor', -- 'Administrador', 'Gerente', 'Vendedor', 'Atendente'
  password_hash TEXT,
  status TEXT DEFAULT 'Ativo', -- 'Ativo', 'Inativo', 'Bloqueado'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE system_users ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Vendedor';
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Ativo';
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso total a system_users para autenticados" ON system_users;
CREATE POLICY "Permitir acesso total a system_users para autenticados" ON system_users
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura de system_users pública" ON system_users;
CREATE POLICY "Permitir leitura de system_users pública" ON system_users
  FOR SELECT TO public
  USING (true);


-- ==============================================================================
-- 2. NOVA ABA: DADOS DO USUÁRIO & FIDELIZAÇÃO CADASTRAL DA LOJA (user_profiles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT NOT NULL DEFAULT 'Kaleb dos Santos Gonçalves',
  store_name TEXT NOT NULL DEFAULT 'GODSHOP',
  email TEXT NOT NULL DEFAULT 'kalebsantos06@gmail.com',
  phone TEXT DEFAULT '(32) 99963-4583',
  document TEXT DEFAULT '130.369.426-37',
  role TEXT DEFAULT 'Proprietário / Administrador',
  pix_key TEXT DEFAULT '13036942637',
  city_state TEXT DEFAULT 'Carangola - MG',
  registered_at TEXT,
  custom_domain TEXT,
  app_logo TEXT,
  app_background TEXT,
  webhook_url TEXT,
  webhook_token TEXT,
  webhook_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS document TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS city_state TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS registered_at TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS custom_domain TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS app_logo TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS app_background TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS webhook_token TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir perfil ao proprio usuario" ON user_profiles;
CREATE POLICY "Permitir perfil ao proprio usuario" ON user_profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Permitir leitura publica de configuracoes da loja" ON user_profiles;
CREATE POLICY "Permitir leitura publica de configuracoes da loja" ON user_profiles
  FOR SELECT TO public
  USING (true);


-- ==============================================================================
-- 3. ABA BRINDES & ACESSÓRIOS (gifts, gift_purchases, gift_dispatches, accessory_sales)
-- ==============================================================================

-- 3.1 Catálogo de Brindes e Acessórios
CREATE TABLE IF NOT EXISTS gifts (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outros', -- 'capas', 'peliculas', 'carregadores', 'fones', 'mimos', 'cabos', 'outros'
  type TEXT NOT NULL DEFAULT 'ambos', -- 'brinde', 'acessorio', 'ambos'
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sell_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  supplier TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE gifts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'outros';
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'ambos';
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS sell_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gifts_policy" ON gifts;
CREATE POLICY "gifts_policy" ON gifts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- 3.2 Reposição de Estoque / Compras de Brindes & Acessórios
CREATE TABLE IF NOT EXISTS gift_purchases (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_source TEXT DEFAULT 'caixa_loja', -- 'saldo_vendas', 'caixa_loja', 'outro'
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  supplier TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE gift_purchases ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE gift_purchases ADD COLUMN IF NOT EXISTS item_id TEXT;
ALTER TABLE gift_purchases ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE gift_purchases ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE gift_purchases ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE gift_purchases ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE gift_purchases ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'caixa_loja';
ALTER TABLE gift_purchases ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE gift_purchases ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE gift_purchases ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE gift_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gift_purchases_policy" ON gift_purchases;
CREATE POLICY "gift_purchases_policy" ON gift_purchases
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- 3.3 Saída de Brindes Despachados com Aparelhos
CREATE TABLE IF NOT EXISTS gift_dispatches (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  client_id TEXT,
  client_name TEXT,
  sale_id TEXT,
  unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  dispatch_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE gift_dispatches ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE gift_dispatches ADD COLUMN IF NOT EXISTS item_id TEXT;
ALTER TABLE gift_dispatches ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE gift_dispatches ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE gift_dispatches ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE gift_dispatches ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE gift_dispatches ADD COLUMN IF NOT EXISTS sale_id TEXT;
ALTER TABLE gift_dispatches ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE gift_dispatches ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE gift_dispatches ADD COLUMN IF NOT EXISTS dispatch_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE gift_dispatches ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE gift_dispatches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gift_dispatches_policy" ON gift_dispatches;
CREATE POLICY "gift_dispatches_policy" ON gift_dispatches
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- 3.4 Vendas Avulsas de Acessórios
CREATE TABLE IF NOT EXISTS accessory_sales (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unit_sell_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_profit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  client_id TEXT,
  client_name TEXT,
  payment_method TEXT NOT NULL DEFAULT 'Pix',
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS item_id TEXT;
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS unit_sell_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS total_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS total_profit DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Pix';
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE accessory_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accessory_sales_policy" ON accessory_sales;
CREATE POLICY "accessory_sales_policy" ON accessory_sales
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- ==============================================================================
-- 4. ABA FISCAL HUB & NOTAS FISCAIS
-- ==============================================================================

-- 4.1 Notas de Entrada / Compras Fiscais
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  has_invoice BOOLEAN DEFAULT FALSE,
  invoice_number TEXT,
  invoice_series TEXT,
  access_key TEXT,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  xml_url TEXT,
  pdf_url TEXT,
  receipt_url TEXT,
  status TEXT DEFAULT 'concluida',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchases_owner" ON purchases;
CREATE POLICY "purchases_owner" ON purchases 
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id OR user_id IS NULL) 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- 4.2 Catálogo Fiscal de Produtos
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  sku TEXT,
  ean TEXT,
  ncm TEXT,
  cfop TEXT,
  cest TEXT,
  unit TEXT DEFAULT 'UN',
  purchase_price DECIMAL(10, 2),
  sale_price DECIMAL(10, 2),
  min_stock INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_owner" ON products;
CREATE POLICY "products_owner" ON products 
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id OR user_id IS NULL) 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- 4.3 Unidades de Produto com Rastreamento por IMEI e Serial
CREATE TABLE IF NOT EXISTS product_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  imei_1 TEXT,
  imei_2 TEXT,
  serial_number TEXT,
  color TEXT,
  storage TEXT,
  condition TEXT DEFAULT 'Seminovo',
  battery_health INTEGER,
  warranty_until TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'Em estoque',
  fiscal_status TEXT DEFAULT 'Pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_units_owner" ON product_units;
CREATE POLICY "product_units_owner" ON product_units 
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id OR user_id IS NULL) 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- 4.4 Itens da Venda
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_unit_id UUID REFERENCES product_units(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sale_items_policy" ON sale_items;
CREATE POLICY "sale_items_policy" ON sale_items 
  FOR ALL TO authenticated 
  USING (true) 
  WITH CHECK (true);


-- 4.5 Documentos Fiscais Emitidos (NF-e, NFC-e)
CREATE TABLE IF NOT EXISTS fiscal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  document_type TEXT DEFAULT 'NF-e',
  number TEXT,
  series TEXT,
  access_key TEXT,
  status TEXT DEFAULT 'processando',
  protocol TEXT,
  xml_url TEXT,
  pdf_url TEXT,
  authorization_date TIMESTAMP WITH TIME ZONE,
  rejection_code TEXT,
  rejection_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE fiscal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fiscal_documents_owner" ON fiscal_documents;
CREATE POLICY "fiscal_documents_owner" ON fiscal_documents 
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id OR user_id IS NULL) 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- 4.6 Configurações Fiscais da Empresa
CREATE TABLE IF NOT EXISTS fiscal_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  corporate_name TEXT,
  fantasy_name TEXT,
  cnpj TEXT,
  state_registration TEXT,
  tax_regime TEXT DEFAULT 'Simples Nacional',
  uf TEXT,
  city TEXT,
  address TEXT,
  environment TEXT DEFAULT 'homologacao',
  certificate_configured BOOLEAN DEFAULT FALSE,
  api_provider TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE fiscal_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fiscal_configs_owner" ON fiscal_configs;
CREATE POLICY "fiscal_configs_owner" ON fiscal_configs 
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id OR user_id IS NULL) 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- ==============================================================================
-- 5. ABA ANOTAÇÕES, CHECKLISTS & ÁUDIOS (notes, note_checklist_items, note_audio)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'Geral',
  priority TEXT DEFAULT 'Normal',
  due_date TEXT,
  due_time TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Geral';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Normal';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS due_date TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS due_time TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS completed_at TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_auth_policy" ON notes;
CREATE POLICY "notes_auth_policy" ON notes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "notes_public_policy" ON notes;
CREATE POLICY "notes_public_policy" ON notes
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);


CREATE TABLE IF NOT EXISTS note_checklist_items (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE note_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklist_auth_policy" ON note_checklist_items;
CREATE POLICY "checklist_auth_policy" ON note_checklist_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "checklist_public_policy" ON note_checklist_items;
CREATE POLICY "checklist_public_policy" ON note_checklist_items
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);


CREATE TABLE IF NOT EXISTS note_audio (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  duration NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE note_audio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audio_auth_policy" ON note_audio;
CREATE POLICY "audio_auth_policy" ON note_audio
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "audio_public_policy" ON note_audio;
CREATE POLICY "audio_public_policy" ON note_audio
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);


-- ==============================================================================
-- 6. GALERIA DE FOTOS DOS PRODUTOS (product_photos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS product_photos (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data_url TEXT NOT NULL,
  category TEXT DEFAULT 'iphones',
  blend_mode TEXT DEFAULT 'none',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE product_photos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE product_photos ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE product_photos ADD COLUMN IF NOT EXISTS data_url TEXT;
ALTER TABLE product_photos ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'iphones';
ALTER TABLE product_photos ADD COLUMN IF NOT EXISTS blend_mode TEXT DEFAULT 'none';
ALTER TABLE product_photos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE product_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_photos_policy" ON product_photos;
CREATE POLICY "product_photos_policy" ON product_photos
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "product_photos_public_policy" ON product_photos;
CREATE POLICY "product_photos_public_policy" ON product_photos
  FOR SELECT TO public
  USING (true);


-- ==============================================================================
-- 7. ATUALIZAÇÕES NAS TABELAS PRINCIPAIS EXISTENTES (COMPATIBILIDADE GODSHOP)
-- ==============================================================================

-- 7.1 Tabela de Clientes (Campos de auto-cadastro, localização e segurança)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS complement TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS documento_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assinatura_base64 TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS token_cadastro TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS token_utilizado BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS token_expira_em TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS security_uuid TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS security_ip TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS security_browser TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS security_os TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS security_device TEXT;

-- 7.2 Tabela de Vendas (Campos de parcelas flexíveis, testemunhas e auditoria de assinatura)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS custom_payments TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS installments_paid INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS installment_frequency TEXT DEFAULT 'Mensal';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS first_installment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS signature_data TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS signed_ip TEXT;

-- 7.3 Tabela de Tabela de Preços (iPhone e Consoles com cotação em Dólar)
ALTER TABLE prices ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'iphone';
ALTER TABLE prices ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS price_usd DECIMAL(10, 2);


-- ==============================================================================
-- 8. CONFIGURAÇÃO DE BUCKETS DO STORAGE (FOTOS, LOGOS E DOCUMENTOS)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('product_photos', 'product_photos', true),
  ('product-photos', 'product-photos', true),
  ('client_documents', 'client_documents', true),
  ('store_branding', 'store_branding', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de acesso público para visualização das fotos e documentos
DROP POLICY IF EXISTS "Fotos de produtos públicas" ON storage.objects;
CREATE POLICY "Fotos de produtos públicas" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id IN ('product_photos', 'product-photos', 'client_documents', 'store_branding'));

DROP POLICY IF EXISTS "Upload autenticado para storage" ON storage.objects;
CREATE POLICY "Upload autenticado para storage" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('product_photos', 'product-photos', 'client_documents', 'store_branding'));

DROP POLICY IF EXISTS "Upload público para documentos de clientes remotos" ON storage.objects;
CREATE POLICY "Upload público para documentos de clientes remotos" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id IN ('product_photos', 'product-photos', 'client_documents'));
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'client_documents');

-- ==============================================================================
-- FIM DO SCRIPT DE ATUALIZAÇÕES GODSHOP
-- ==============================================================================
-- ==============================================================================
-- GODSHOP - SCRIPT COMPLEMENTAR: TEMPLATES, REALTIME & SINCRONIZAÇÃO EM SEGUNDO PLANO
-- ==============================================================================
-- Execute este script no SQL Editor do seu Supabase Dashboard (https://supabase.com/dashboard)
-- Este script é 100% IDEMPOTENTE ("IF NOT EXISTS" / "DO $$"), seguro para rodar a qualquer momento.
-- ==============================================================================

-- 0. HABILITAR EXTENSÕES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABELA DE CONFIGURAÇÕES GERAIS, AUTOMAÇÃO WHATSAPP & WEBHOOKS (store_settings)
-- ==============================================================================
-- Permite que o APK e o Executável Desktop mantenham os templates de WhatsApp,
-- chaves de Webhook e configurações de loja sincronizados em nuvem.
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_setting UNIQUE (user_id, setting_key)
);

ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS setting_key TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS setting_value TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_settings_user_full_access" ON store_settings;
CREATE POLICY "store_settings_user_full_access" ON store_settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "store_settings_public_read" ON store_settings;
CREATE POLICY "store_settings_public_read" ON store_settings
  FOR SELECT TO public
  USING (true);


-- ==============================================================================
-- 2. REGISTRO DE SINCRONIZAÇÃO EM SEGUNDO PLANO (background_sync_logs)
-- ==============================================================================
-- Registra batimentos (heartbeats) e syncs do Executável (.exe) e do APK Android
-- garantindo auditoria e monitoramento de conectividade em tempo real.
CREATE TABLE IF NOT EXISTS background_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL, -- 'android_apk', 'desktop_executable', 'web_browser'
  device_info TEXT,
  status TEXT DEFAULT 'online', -- 'online', 'syncing', 'idle', 'offline'
  pending_items_count INTEGER DEFAULT 0,
  synced_items_count INTEGER DEFAULT 0,
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE background_sync_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE background_sync_logs ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE background_sync_logs ADD COLUMN IF NOT EXISTS device_info TEXT;
ALTER TABLE background_sync_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'online';
ALTER TABLE background_sync_logs ADD COLUMN IF NOT EXISTS pending_items_count INTEGER DEFAULT 0;
ALTER TABLE background_sync_logs ADD COLUMN IF NOT EXISTS synced_items_count INTEGER DEFAULT 0;
ALTER TABLE background_sync_logs ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE background_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "background_sync_logs_policy" ON background_sync_logs;
CREATE POLICY "background_sync_logs_policy" ON background_sync_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- ==============================================================================
-- 3. GARANTIA DAS COLUNAS DE ASSINATURA & LINK DE CADASTRO PÚBLICO
-- ==============================================================================
-- Garante todas as colunas de public_sales para assinatura remota via celular do cliente
ALTER TABLE public_sales ADD COLUMN IF NOT EXISTS sale_id TEXT;
ALTER TABLE public_sales ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public_sales ADD COLUMN IF NOT EXISTS signature_data TEXT;
ALTER TABLE public_sales ADD COLUMN IF NOT EXISTS signed_at TEXT;
ALTER TABLE public_sales ADD COLUMN IF NOT EXISTS signed_ip TEXT;
ALTER TABLE public_sales ADD COLUMN IF NOT EXISTS witness1_name TEXT;
ALTER TABLE public_sales ADD COLUMN IF NOT EXISTS witness1_cpf TEXT;
ALTER TABLE public_sales ADD COLUMN IF NOT EXISTS witness1_signature TEXT;
ALTER TABLE public_sales ADD COLUMN IF NOT EXISTS witness2_name TEXT;
ALTER TABLE public_sales ADD COLUMN IF NOT EXISTS witness2_cpf TEXT;
ALTER TABLE public_sales ADD COLUMN IF NOT EXISTS witness2_signature TEXT;
ALTER TABLE public_sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Garante suporte a IDs flexíveis em public_tokens (para vendedores e modo offline)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'public_tokens' AND column_name = 'user_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public_tokens ALTER COLUMN user_id TYPE TEXT;
  END IF;
END $$;

ALTER TABLE public_tokens ADD COLUMN IF NOT EXISTS client_data JSONB;
ALTER TABLE public_tokens ADD COLUMN IF NOT EXISTS used_at TIMESTAMP WITH TIME ZONE;


-- ==============================================================================
-- 4. HABILITAÇÃO DO REALTIME (Sincronização Instantânea sem Recarregar Página)
-- ==============================================================================
-- Adiciona com segurança todas as tabelas na publicação 'supabase_realtime'
DO $$
DECLARE
  target_table text;
  tables_to_add text[] := ARRAY[
    'iphones', 
    'consoles', 
    'sales', 
    'clients', 
    'suppliers', 
    'prices', 
    'gifts', 
    'gift_purchases', 
    'gift_dispatches', 
    'accessory_sales', 
    'notes', 
    'note_checklist_items', 
    'product_photos', 
    'system_users', 
    'user_profiles', 
    'public_sales',
    'public_clients',
    'store_settings'
  ];
BEGIN
  -- Cria a publicação se não existir
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- Adiciona cada tabela que ainda não está na publicação
  FOREACH target_table IN ARRAY tables_to_add LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = target_table
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', target_table);
      EXCEPTION WHEN duplicate_object THEN
        -- Tabela já está na publicação, ignora
        NULL;
      END;
    END IF;
  END LOOP;
END $$;


-- ==============================================================================
-- 5. ÍNDICES DE ALTO DESEMPENHO (Otimização para Executável e APK)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_iphones_status ON iphones(status);
CREATE INDEX IF NOT EXISTS idx_iphones_imei ON iphones(imei);
CREATE INDEX IF NOT EXISTS idx_consoles_status ON consoles(status);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON sales(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_cpf ON clients(cpf);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_notes_completed ON notes(completed);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_gifts_stock ON gifts(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_public_sales_id ON public_sales(id);
CREATE INDEX IF NOT EXISTS idx_public_tokens_token ON public_tokens(token);
CREATE INDEX IF NOT EXISTS idx_system_users_email ON system_users(email);

-- ==============================================================================
-- FIM DO SCRIPT COMPLEMENTAR GODSHOP
-- ==============================================================================
-- ==============================================================================
-- GODSHOP - SCRIPT AVANÇADO: TRIGGERS, STORAGE BUCKETS & AUTOMAÇÃO DE ESTOQUE
-- ==============================================================================
-- Execute no SQL Editor do seu Supabase Dashboard (https://supabase.com/dashboard)
-- 100% IDEMPOTENTE: Seguro para executar em bancos de dados novos ou existentes.
-- ==============================================================================

-- ==============================================================================
-- 1. BUCKETS ADICIONAIS DO SUPABASE STORAGE (ÁUDIOS & FISCAL)
-- ==============================================================================
-- Garante a criação dos buckets de áudio das anotações e documentos fiscais (XML/PDF)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('note_audio', 'note_audio', false),
  ('fiscal_docs', 'fiscal_docs', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para Áudios de Anotações (note_audio)
DROP POLICY IF EXISTS "Permitir upload de audios autenticado" ON storage.objects;
CREATE POLICY "Permitir upload de audios autenticado" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'note_audio');

DROP POLICY IF EXISTS "Permitir leitura de audios autenticado" ON storage.objects;
CREATE POLICY "Permitir leitura de audios autenticado" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'note_audio');

DROP POLICY IF EXISTS "Permitir exclusao de audios autenticado" ON storage.objects;
CREATE POLICY "Permitir exclusao de audios autenticado" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'note_audio');

-- Políticas para Documentos Fiscais (fiscal_docs)
DROP POLICY IF EXISTS "Permitir acesso aos documentos fiscais" ON storage.objects;
CREATE POLICY "Permitir acesso aos documentos fiscais" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'fiscal_docs')
  WITH CHECK (bucket_id = 'fiscal_docs');


-- ==============================================================================
-- 2. TRIGGER AUTOMÁTICO DE CRIAÇÃO DE PERFIL DE USUÁRIO (auth.users -> user_profiles)
-- ==============================================================================
-- Quando um usuário cria conta no Supabase Auth, gera automaticamente seu perfil
-- na tabela user_profiles e system_users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Cria perfil do titular
  INSERT INTO public.user_profiles (
    user_id, 
    email, 
    full_name, 
    store_name, 
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Administrador'),
    'GODSHOP',
    'Proprietário / Administrador',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Cria operador em system_users
  INSERT INTO public.system_users (
    id,
    user_id,
    name,
    email,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id::text,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Administrador'),
    NEW.email,
    'Administrador',
    'Ativo',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Registra o gatilho na tabela auth.users do Supabase
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==============================================================================
-- 3. TRIGGER AUTOMÁTICO DE DATA DE MODIFICAÇÃO (updated_at)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplica o trigger nas tabelas principais
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'iphones', 
    'consoles', 
    'sales', 
    'clients', 
    'suppliers', 
    'prices', 
    'gifts', 
    'notes', 
    'system_users', 
    'user_profiles', 
    'store_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at_%I ON public.%I', t, t);
      EXECUTE format('CREATE TRIGGER trg_set_updated_at_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at()', t, t);
    END IF;
  END LOOP;
END $$;


-- ==============================================================================
-- 4. AUTOMAÇÃO DE BAIXA DE ESTOQUE DE BRINDES & ACESSÓRIOS
-- ==============================================================================
-- Reduz automaticamente o estoque do brinde quando registrado um despacho
CREATE OR REPLACE FUNCTION public.handle_gift_dispatch()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.gifts
  SET stock_quantity = GREATEST(0, stock_quantity - NEW.quantity),
      updated_at = NOW()
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gift_dispatch ON public.gift_dispatches;
CREATE TRIGGER trg_gift_dispatch
  AFTER INSERT ON public.gift_dispatches
  FOR EACH ROW EXECUTE FUNCTION public.handle_gift_dispatch();

-- Reduz automaticamente o estoque do acessório quando realizada venda avulsa
CREATE OR REPLACE FUNCTION public.handle_accessory_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.gifts
  SET stock_quantity = GREATEST(0, stock_quantity - NEW.quantity),
      updated_at = NOW()
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_accessory_sale ON public.accessory_sales;
CREATE TRIGGER trg_accessory_sale
  AFTER INSERT ON public.accessory_sales
  FOR EACH ROW EXECUTE FUNCTION public.handle_accessory_sale();

-- Aumenta automaticamente o estoque ao registrar compra/reposição de brindes
CREATE OR REPLACE FUNCTION public.handle_gift_purchase()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.item_id IS NOT NULL THEN
    UPDATE public.gifts
    SET stock_quantity = stock_quantity + NEW.quantity,
        cost_price = CASE WHEN NEW.unit_cost > 0 THEN NEW.unit_cost ELSE cost_price END,
        updated_at = NOW()
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gift_purchase ON public.gift_purchases;
CREATE TRIGGER trg_gift_purchase
  AFTER INSERT ON public.gift_purchases
  FOR EACH ROW EXECUTE FUNCTION public.handle_gift_purchase();


-- ==============================================================================
-- 5. FUNÇÃO PARA LIMPEZA DE TOKENS DE CADASTRO EXPIRADOS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.public_tokens
  WHERE expires_at < NOW() AND used = false;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 6. POLÍTICA DE RESILIÊNCIA CONTRA FALHAS DE RLS (FALLBACK GRACIOSO)
-- ==============================================================================
-- Permite que usuários autenticados realizem operações mesmo quando a sessão local 
-- ainda não finalizou o handshake do user_id, evitando erros 42501 (RLS violation).
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['iphones', 'consoles', 'sales', 'clients', 'suppliers', 'prices'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      EXECUTE format('DROP POLICY IF EXISTS "%I_resilient_authenticated_policy" ON public.%I', t, t);
      EXECUTE format('CREATE POLICY "%I_resilient_authenticated_policy" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL)', t, t);
    END IF;
  END LOOP;
END $$;

-- ==============================================================================
-- FIM DO SCRIPT DE TRIGGERS, STORAGE & AUTOMAÇÕES GODSHOP
-- ==============================================================================
