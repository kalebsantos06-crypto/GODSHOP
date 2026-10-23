-- ============================================================================
-- GODSHOP: SCRIPT DE CONFIGURAÇÃO DE SUPABASE E REALTIME MULTI-DISPOSITIVOS
-- Execute este script no SQL Editor do seu projeto no Supabase para garantir
-- que o computador (.exe) e o aplicativo celular (APK) sincronizem em tempo real.
-- ============================================================================

-- 1. Desativar RLS (Row Level Security) nas tabelas principais para permitir
-- acesso compartilhado contínuo entre o PC e o APK Android.
ALTER TABLE IF EXISTS sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS iphones DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS consoles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_units DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fiscal_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fiscal_configs DISABLE ROW LEVEL SECURITY;

-- 2. Garantir que as tabelas estejam habilitadas na publicação Realtime do Supabase
-- para propagação instantânea de inserções, atualizações e exclusões entre dispositivos.
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE iphones;
ALTER PUBLICATION supabase_realtime ADD TABLE consoles;
ALTER PUBLICATION supabase_realtime ADD TABLE gifts;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE product_units;
ALTER PUBLICATION supabase_realtime ADD TABLE purchases;
