
export interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  tier: 'frequent' | 'vip' | 'company';
  created_at: string;
}

export interface Order {
  id: string;
  customer_id?: string;
  customer_name: string;
  address: string;
  items: string; // e.g. "2 Garrafones"
  status: 'pending' | 'assigned' | 'delivered' | 'cancelled' | 'pending_payment' | 'pickup_assigned' | 'pickup_pending' | 'pickup_confirmed' | string;
  driver_id?: string;
  total_price: number;
  payment_method: 'cash' | 'card' | 'transfer' | string;
  created_at: string;
  updated_at?: string;
  whatsapp_number?: string;
  neighborhood?: string;
  source?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_route?: string;
  is_borrowed?: boolean;
  borrowed_paid?: boolean;
  borrowed_paid_at?: string;
  borrowed_status?: string;
  transfer_validated?: boolean;
  transfer_validated_by?: string;
  transfer_validated_at?: string;
  transfer_reference?: string;
  delivery_lat?: number;
  delivery_lng?: number;
}

export interface Attendance {
  id: string;
  user_id: string;
  type: 'clock_in' | 'clock_out';
  timestamp: string;
  photo_url?: string;
  location?: { lat: number; lng: number };
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'attendance' | 'quality' | 'system' | 'sale';
  read: boolean;
  created_at: string;
  payload?: any;
}
