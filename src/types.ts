export interface Order {
  id: string;
  client: string;
  address: string;
  quantity: number;
  status: 'pendiente' | 'en_camino' | 'entregado';
  time: string;
}

export interface CustomerBalance {
  id: string;
  name: string;
  neighborhood: string;
  jugBalance: number;
}

export interface Message {
  id: string;
  text: string;
  sender: 'client' | 'system';
  timestamp: Date;
}
