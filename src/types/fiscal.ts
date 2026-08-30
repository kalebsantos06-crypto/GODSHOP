
export type FiscalStatus = 'autorizada' | 'rejeitada' | 'cancelada' | 'processando' | 'contingencia';

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  document: string; // CPF or CNPJ
  state_registration?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  type: 'PF' | 'PJ';
  created_at?: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  supplier_id: string;
  purchase_date: string;
  has_invoice: boolean;
  invoice_number?: string;
  invoice_series?: string;
  access_key?: string;
  total_amount: number;
  xml_url?: string;
  pdf_url?: string;
  receipt_url?: string;
  status: 'concluida' | 'cancelada';
  created_at?: string;
}

export type ProductCategory = 'iPhone' | 'Smartphone' | 'PlayStation' | 'Xbox' | 'Nintendo' | 'Jogos' | 'Acessórios' | 'Outros';

export interface Product {
  id: string;
  user_id: string;
  name: string;
  category: ProductCategory;
  brand?: string;
  model?: string;
  sku?: string;
  ean?: string;
  ncm?: string;
  cfop?: string;
  cest?: string;
  unit: string;
  purchase_price: number;
  sale_price: number;
  current_stock: number;
  min_stock: number;
  image_url?: string;
  created_at?: string;
}

export interface ProductUnit {
  id: string;
  user_id: string;
  product_id: string;
  purchase_id?: string;
  imei_1?: string;
  imei_2?: string;
  serial_number?: string;
  color?: string;
  storage?: string;
  condition: 'Novo' | 'Seminovo' | 'Usado';
  battery_health?: number;
  warranty_until?: string;
  status: 'Em estoque' | 'Vendido' | 'Bloqueado' | 'Aguardando regularização';
  fiscal_status: 'Regularizado' | 'Sem Nota' | 'Pendente';
  created_at?: string;
}

export interface FiscalDocument {
  id: string;
  user_id: string;
  sale_id: string;
  document_type: 'NF-e' | 'NFC-e';
  number: string;
  series: string;
  access_key: string;
  status: FiscalStatus;
  protocol?: string;
  xml_url?: string;
  pdf_url?: string;
  authorization_date?: string;
  rejection_code?: string;
  rejection_message?: string;
  created_at?: string;
}

export interface FiscalConfig {
  id: string;
  user_id: string;
  corporate_name: string;
  fantasy_name: string;
  cnpj: string;
  state_registration: string;
  tax_regime: 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real';
  uf: string;
  city: string;
  address: string;
  environment: 'homologacao' | 'producao';
  certificate_configured: boolean;
  api_provider?: string;
  updated_at?: string;
}
