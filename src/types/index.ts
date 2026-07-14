export interface iPhone {
  id: string;
  model: string;
  storage: string;
  color: string;
  buy_price: number;
  imei?: string;
  supplier_id: string;
  buy_date: string;
  status: 'disponivel' | 'vendido';
  condition: 'lacrado' | 'seminovo';
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
  contact: string;
}

export interface Console {
  id: string;
  model: string;
  version: string;
  buy_price: number;
  buy_date: string;
  status: 'disponivel' | 'vendido';
  condition: 'lacrado' | 'seminovo';
  category?: string;
}

export interface Sale {
  id: string;
  iphone_id?: string;
  console_id?: string;
  client_id: string;
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
