
-- ==========================================
-- MÓDULO FISCAL E ESTOQUE AVANÇADO
-- ==========================================

-- 1. Extensão para busca (opcional, mas recomendada)
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 2. Tabela de Compras (purchases)
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  has_invoice BOOLEAN DEFAULT FALSE,
  invoice_number TEXT,
  invoice_series TEXT,
  access_key TEXT,
  total_amount DECIMAL(10, 2) NOT NULL,
  xml_url TEXT,
  pdf_url TEXT,
  receipt_url TEXT,
  status TEXT DEFAULT 'concluida', -- 'concluida', 'cancelada'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Produtos (Base)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'iPhone', 'Smartphone', 'PlayStation', 'Xbox', 'Nintendo', 'Jogos', 'Acessórios', 'Outros'
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

-- 4. Unidades de Produto (Controle Individual por IMEI/Serial)
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
  condition TEXT, -- 'Novo', 'Seminovo', 'Usado'
  battery_health INTEGER,
  warranty_until TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'Em estoque', -- 'Em estoque', 'Vendido', 'Bloqueado', 'Aguardando regularização'
  fiscal_status TEXT DEFAULT 'Pendente', -- 'Regularizado', 'Sem Nota'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Itens da Venda (Relacionamento com unidades específicas)
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_unit_id UUID REFERENCES product_units(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL
);

-- 6. Documentos Fiscais
CREATE TABLE IF NOT EXISTS fiscal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  document_type TEXT DEFAULT 'NF-e', -- 'NF-e', 'NFC-e'
  number TEXT,
  series TEXT,
  access_key TEXT,
  status TEXT DEFAULT 'processando', -- 'autorizada', 'rejeitada', 'cancelada', 'processando'
  protocol TEXT,
  xml_url TEXT,
  pdf_url TEXT,
  authorization_date TIMESTAMP WITH TIME ZONE,
  rejection_code TEXT,
  rejection_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Configurações Fiscais da Empresa
CREATE TABLE IF NOT EXISTS fiscal_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  corporate_name TEXT,
  fantasy_name TEXT,
  cnpj TEXT,
  state_registration TEXT,
  tax_regime TEXT, -- 'Simples Nacional', 'Lucro Presumido', 'Lucro Real'
  uf TEXT,
  city TEXT,
  address TEXT,
  environment TEXT DEFAULT 'homologacao', -- 'homologacao', 'producao'
  certificate_configured BOOLEAN DEFAULT FALSE,
  api_provider TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS em todas
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_configs ENABLE ROW LEVEL SECURITY;

-- Políticas Básicas (Acesso por user_id)
CREATE POLICY "purchases_owner" ON purchases FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "products_owner" ON products FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "product_units_owner" ON product_units FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fiscal_documents_owner" ON fiscal_documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fiscal_configs_owner" ON fiscal_configs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
