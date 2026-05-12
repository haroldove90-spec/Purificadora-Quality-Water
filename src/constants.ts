import { Order, CustomerBalance } from './types';

export const MOCK_ORDERS: Order[] = [
  {
    id: '1',
    client: 'María García',
    address: 'Av. Paseo de la Reforma 222, Juárez',
    quantity: 3,
    status: 'en_camino',
    time: '10:30 AM'
  },
  {
    id: '2',
    client: 'Restaurante El Cardenal',
    address: 'Calle de la Palma 23, Centro Histórico',
    quantity: 10,
    status: 'pendiente',
    time: '11:15 AM'
  },
  {
    id: '3',
    client: 'Jorge Alberto',
    address: 'Aristóteles 123, Polanco',
    quantity: 2,
    status: 'entregado',
    time: '09:45 AM'
  },
  {
    id: '4',
    client: 'Gimnasio Smart Fit',
    address: 'Insurgentes Sur 456, Roma Norte',
    quantity: 5,
    status: 'en_camino',
    time: '11:00 AM'
  },
  {
    id: '5',
    client: 'Ana Sofía Villeda',
    address: 'Ámsterdam 89, Condesa',
    quantity: 1,
    status: 'pendiente',
    time: '11:45 AM'
  }
];

export const MOCK_CUSTOMER_BALANCES: CustomerBalance[] = [
  { id: 'c1', name: 'Héctor Jiménez', neighborhood: 'Coyoacán', jugBalance: 4 },
  { id: 'c2', name: 'Laura Estévez', neighborhood: 'Santa Fe', jugBalance: 2 },
  { id: 'c3', name: 'Oficinas WeWork', neighborhood: 'Nápoles', jugBalance: 12 },
  { id: 'c4', name: 'Consultorio Dental Drs.', neighborhood: 'Del Valle', jugBalance: 3 },
  { id: 'c5', name: 'Ricardo Medina', neighborhood: 'Narvarte', jugBalance: 5 },
  { id: 'c6', name: 'Carmen Rojas', neighborhood: 'Tlalpan', jugBalance: 2 },
];
