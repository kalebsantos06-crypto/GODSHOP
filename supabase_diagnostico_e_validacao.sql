-- ==============================================================================
-- GODSHOP - SCRIPT DE DIAGNÓSTICO, VALIDAÇÃO & CHECKLIST GERAL (SUPABASE)
-- ==============================================================================
-- Execute no SQL Editor do seu Supabase Dashboard (https://supabase.com/dashboard)
-- Este script faz um Raio-X completo no seu banco e retorna uma tabela com:
-- 1. Status de cada tabela (Existente ou Faltando)
-- 2. Total de registros salvos em cada tabela
-- 3. Status de segurança (Row Level Security - RLS ativo ou inativo)
-- 4. Status das tabelas na sincronização em tempo real (Realtime)
-- 5. Status dos Buckets de Armazenamento (Storage)
-- ==============================================================================

-- 1. RELATÓRIO DE TABELAS, CONTAGEM E RLS
SELECT 
  c.relname AS "Tabela",
  CASE 
    WHEN c.relrowsecurity THEN 'Ativo (Seguro)'
    ELSE 'Inativo'
  END AS "RLS (Segurança)",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = c.relname
    ) THEN 'Ativo (Sincroniza Instantâneo)'
    ELSE 'Pendente'
  END AS "Realtime",
  (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', n.nspname, c.relname), false, true, '')))[1]::text::int AS "Qtd. Registros"
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relkind = 'r'
  AND c.relname IN (
    'iphones', 
    'consoles', 
    'sales', 
    'clients', 
    'suppliers', 
    'prices', 
    'system_users', 
    'user_profiles', 
    'gifts', 
    'gift_purchases', 
    'gift_dispatches', 
    'accessory_sales', 
    'purchases', 
    'products', 
    'product_units', 
    'sale_items', 
    'fiscal_documents', 
    'fiscal_configs', 
    'notes', 
    'note_checklist_items', 
    'note_audio', 
    'product_photos', 
    'public_sales', 
    'public_clients', 
    'public_tokens', 
    'store_settings', 
    'background_sync_logs'
  )
ORDER BY c.relname ASC;

-- 2. VERIFICAÇÃO DOS BUCKETS DO STORAGE
SELECT 
  id AS "ID do Bucket",
  name AS "Nome",
  CASE WHEN public THEN 'Público (Leitura Rápida)' ELSE 'Privado (Seguro)' END AS "Visibilidade",
  created_at AS "Data de Criação"
FROM storage.buckets
WHERE id IN ('product_photos', 'product-photos', 'client_documents', 'store_branding', 'note_audio', 'fiscal_docs')
ORDER BY id ASC;

-- 3. VERIFICAÇÃO DOS GATILHOS (TRIGGERS) ATIVOS
SELECT 
  event_object_table AS "Tabela",
  trigger_name AS "Nome do Gatilho",
  action_timing AS "Momento",
  event_manipulation AS "Evento"
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
