-- EXECUTE ESTE SCRIPT NO SQL EDITOR DO SEU PROJETO SUPABASE
-- PARA CORRIGIR O ERRO PGRST205 (Tabela não encontrada)

-- 1. Adicionar colunas necessárias na tabela 'sales'
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS warranty_term_id TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS delivery_checklist JSONB;

-- 2. Criar a tabela 'warranty_history' para o Histórico de Assistência
CREATE TABLE IF NOT EXISTS public.warranty_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    entry_date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    technical_evaluation TEXT,
    diagnosis TEXT,
    resolution TEXT,
    status TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar Row Level Security (Segurança de Linha)
ALTER TABLE public.warranty_history ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de acesso para a tabela 'warranty_history'
-- Permite que o usuário gerencie apenas seus próprios registros
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'warranty_history' AND policyname = 'Users can manage their own warranty history'
    ) THEN
        CREATE POLICY "Users can manage their own warranty history" 
        ON public.warranty_history 
        FOR ALL 
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

-- 5. Garantir permissões para a role 'anon' e 'authenticated' (opcional dependendo da sua config)
GRANT ALL ON public.warranty_history TO authenticated;
GRANT ALL ON public.warranty_history TO service_role;

-- 6. Recarregar o cache do PostgREST (Opcional, geralmente automático após DDL)
NOTIFY pgrst, 'reload schema';
