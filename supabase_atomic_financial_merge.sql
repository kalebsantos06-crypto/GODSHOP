-- 1. Remoção segura
DROP FUNCTION IF EXISTS public.rpc_merge_sale_payments(UUID, JSONB, TEXT, TIMESTAMPTZ, TEXT);

-- 2. Stored Procedure RPC robusta
CREATE OR REPLACE FUNCTION public.rpc_merge_sale_payments(
  p_sale_id UUID,
  p_new_payments JSONB,
  p_signature_data TEXT DEFAULT NULL,
  p_signed_at TIMESTAMPTZ DEFAULT NULL,
  p_signed_ip TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sale_owner_id UUID;
  v_existing_payments JSONB;
  v_merged_payments JSONB;
  v_new_paid_count INT;
  v_key TEXT;
  v_val JSONB;
BEGIN
  -- A. Validações iniciais de parâmetros
  IF p_new_payments IS NULL OR jsonb_typeof(p_new_payments) != 'object' THEN
    RAISE EXCEPTION 'p_new_payments deve ser um objeto JSONB.';
  END IF;

  -- B. Bloqueio pessimista
  SELECT user_id, custom_payments 
  INTO v_sale_owner_id, v_existing_payments
  FROM public.sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda inexistente.' USING ERRCODE = 'P0002';
  END IF;

  IF auth.uid() IS NULL OR v_sale_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Acesso não autorizado.' USING ERRCODE = '42501';
  END IF;

  v_existing_payments := COALESCE(v_existing_payments, '{}'::jsonb);
  v_merged_payments := v_existing_payments;

  FOR v_key, v_val IN SELECT * FROM jsonb_each(p_new_payments)
  LOOP
    -- UUID das chaves e estrutura do pagamento
    IF NOT (v_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            AND jsonb_typeof(v_val) = 'object' 
            AND v_val ? 'paid' AND v_val ? 'amount' 
            AND jsonb_typeof(v_val->'paid') = 'boolean' 
            AND jsonb_typeof(v_val->'amount') = 'number'
            AND (v_val->>'amount')::numeric >= 0) THEN
      RAISE EXCEPTION 'Pagamento inválido (UUID, estrutura, tipo ou valor negativo) na chave: %', v_key;
    END IF;

    -- Conflito usando IS DISTINCT FROM
    IF v_merged_payments ? v_key AND (v_merged_payments -> v_key) IS DISTINCT FROM v_val THEN
      RAISE EXCEPTION 'Conflito de dados financeiros: UUID % já registrado com valor diferente.', v_key;
    ELSE
      v_merged_payments := jsonb_set(v_merged_payments, ARRAY[v_key], v_val, true);
    END IF;
  END LOOP;

  SELECT COUNT(*) INTO v_new_paid_count
  FROM jsonb_each(v_merged_payments) AS j(key, value)
  WHERE (value->>'paid')::boolean = true;

  UPDATE public.sales
  SET custom_payments = v_merged_payments,
      installments_paid = v_new_paid_count,
      signature_data = COALESCE(p_signature_data, signature_data),
      signed_at = COALESCE(p_signed_at, signed_at),
      signed_ip = COALESCE(p_signed_ip, signed_ip),
      updated_at = NOW()
  WHERE id = p_sale_id;

  RETURN jsonb_build_object('success', true, 'installments_paid', v_new_paid_count);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_merge_sale_payments(UUID, JSONB, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_merge_sale_payments(UUID, JSONB, TEXT, TIMESTAMPTZ, TEXT) TO authenticated;
