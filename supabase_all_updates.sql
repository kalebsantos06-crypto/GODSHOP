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
