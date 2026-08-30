export interface iPhone {
  id: string;
  model: string;
  storage: string;
  ram?: string;
  color: string;
  buy_price: number;
  sell_price?: number;
  cost_price?: number;
  battery_health?: number | string;
  imei?: string;
  supplier_id?: string;
  supplier?: string;
  buy_date?: string;
  status: 'disponivel' | 'vendido';
  condition: 'lacrado_3m' | 'lacrado_6m' | 'lacrado_1ano' | 'lacrado' | 'seminovo_3m' | 'seminovo_6m' | 'seminovo_1ano' | 'seminovo' | string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  cpf?: string;
  birth_date?: string;
  email?: string;
  address?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  city?: string;
  state?: string;
  documento_url?: string;
  assinatura_base64?: string;
  token_cadastro?: string;
  token_utilizado?: boolean;
  token_expira_em?: string;
  security_uuid?: string;
  security_ip?: string;
  security_browser?: string;
  security_os?: string;
  security_device?: string;
  security_user?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  cnpj?: string;
  cpf?: string;
  ie?: string;
  type?: string;
}

export interface Console {
  id: string;
  name?: string;
  model: string;
  version?: string;
  ram?: string;
  buy_price: number;
  sell_price?: number;
  cost_price?: number;
  serial_number?: string;
  supplier?: string;
  supplier_id?: string;
  buy_date?: string;
  status: 'disponivel' | 'vendido';
  condition: 'lacrado_3m' | 'lacrado_6m' | 'lacrado_1ano' | 'lacrado' | 'seminovo_3m' | 'seminovo_6m' | 'seminovo_1ano' | 'seminovo' | string;
  category?: string;
}

export interface Sale {
  id: string;
  iphone_id?: string;
  console_id?: string;
  client_id: string;
  client_name?: string;
  client?: any;
  sell_price: number;
  payment_method: string;
  sale_date: string;
  installments?: number;
  installment_frequency?: 'Semanal' | 'Quinzenal' | 'Mensal';
  down_payment?: number;
  first_installment_date?: string;
  signature_data?: string;
  signed_at?: string;
  signed_ip?: string;
  installments_paid?: number;
  custom_payments?: string | Record<number, number>;
  witness1_name?: string;
  witness1_cpf?: string;
  witness1_signature?: string;
  witness2_name?: string;
  witness2_cpf?: string;
  witness2_signature?: string;
}

export interface PriceTableItem {
  id: string;
  category: 'iphone' | 'console';
  model: string;
  version?: string;
  storage: string;
  color?: string;
  condition?: string;
  price: number;
  price_usd?: number;
}

export interface GiftOrAccessory {
  id: string;
  name: string;
  category: 'capas' | 'peliculas' | 'carregadores' | 'fones' | 'mimos' | 'cabos' | 'outros' | string;
  type: 'brinde' | 'acessorio' | 'ambos';
  stock_quantity: number;
  cost_price: number;
  sell_price: number;
  supplier?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GiftPurchase {
  id: string;
  item_id?: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  payment_source: 'saldo_vendas' | 'caixa_loja' | 'outro' | string;
  purchase_date: string;
  supplier?: string;
  notes?: string;
  created_at?: string;
}

export interface GiftDispatch {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  client_id?: string;
  client_name?: string;
  sale_id?: string;
  unit_cost: number;
  total_cost: number;
  dispatch_date: string;
  notes?: string;
  created_at?: string;
}

export interface AccessorySale {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
  unit_sell_price: number;
  total_price: number;
  total_profit: number;
  client_id?: string;
  client_name?: string;
  payment_method: string;
  sale_date: string;
  notes?: string;
  created_at?: string;
}

export interface ProductPhoto {
  id: string;
  name: string;
  data_url: string;
  created_at?: string;
  category?: string;
  blend_mode?: 'none' | 'screen' | 'lighten' | string;
}

