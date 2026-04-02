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
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  cpf?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
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
  installment_frequency?: 'Semanal' | 'Mensal';
  down_payment?: number;
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
}
