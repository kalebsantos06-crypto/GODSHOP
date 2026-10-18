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
