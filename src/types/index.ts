export interface iPhone {
  id: string;
  model: string;
  storage: string;
  color: string;
  buy_price: number;
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

export interface Sale {
  id: string;
  iphone_id: string;
  client_id: string;
  sell_price: number;
  payment_method: 'PIX' | 'Dinheiro' | 'Cartão';
  sale_date: string;
}
