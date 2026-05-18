
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

-- 6. Tabla de Asistencia (Attendance)
CREATE TABLE public.staff_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT CHECK (type IN ('clock_in', 'clock_out')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  photo_url TEXT,
  location POINT
);

-- 7. Tabla de Notificaciones (Log para historial)
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id), -- NULL si es para todos
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  read BOOLEAN DEFAULT false,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS (Row Level Security) - Ejemplos básicos
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on orders"
ON public.orders FOR ALL TO authenticated
USING ( 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Drivers can view their assigned orders"
ON public.orders FOR SELECT TO authenticated
USING ( driver_id = auth.uid() );

-- Habilitar Realtime para la tabla orders
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
