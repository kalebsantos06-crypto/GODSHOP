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
