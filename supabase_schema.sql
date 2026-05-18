
-- 1. Enums para estados y roles
CREATE TYPE user_role AS ENUM ('admin', 'planta', 'repartidor');
CREATE TYPE order_status AS ENUM ('pending', 'assigned', 'delivered', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer');

-- 2. Tabla de Usuarios (Extiende auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name TEXT,
  role user_role DEFAULT 'repartidor',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Productos
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  unit TEXT DEFAULT 'unidad', -- e.g., '20L'
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Tabla de Clientes
CREATE TABLE public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT UNIQUE,
  tier TEXT DEFAULT 'frequent', -- frequent, vip, company
  location POINT, -- Coordenadas para logística
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Tabla de Pedidos (Orders)
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL, -- Backup en caso de cliente no registrado
  address TEXT NOT NULL,
  items TEXT NOT NULL, -- e.g., "3 Garrafones"
  total_price DECIMAL(10, 2) NOT NULL,
  status order_status DEFAULT 'pending',
  payment_method payment_method DEFAULT 'cash',
  driver_id UUID REFERENCES auth.users(id),
  whatsapp_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 6. Tabla de Asistencia (Attendance) - Refactorizada para seguimiento diario opcional o log de eventos
-- Usaremos un log de eventos para máxima flexibilidad en Realtime
CREATE TABLE public.attendance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT,
  user_role TEXT,
  event_type TEXT NOT NULL, -- 'clock_in', 'clock_out', 'break_start', 'break_end'
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  location JSONB, -- { lat, lng }
  metadata JSONB
);

-- 7. Tabla de Notificaciones (Log unificado para historial)
CREATE TABLE public.notifications_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system', -- 'order', 'attendance', 'quality'
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar Realtime para estas tablas
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications_log;
