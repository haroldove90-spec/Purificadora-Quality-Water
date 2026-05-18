
-- 1. Enums para estados y roles (Evita duplicados)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'planta', 'repartidor');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('pending', 'assigned', 'delivered', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer');
    END IF;
END$$;

-- 2. Tabla de Usuarios (Extiende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name TEXT,
  role user_role DEFAULT 'repartidor',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Productos
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  unit TEXT DEFAULT 'unidad', -- e.g., '20L'
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Tabla de Clientes
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT UNIQUE,
  tier TEXT DEFAULT 'frequent', -- frequent, vip, company
  location POINT, -- Coordenadas para logística
  geolocation_url TEXT, -- Link de Google Maps/Waze
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Tabla de Pedidos (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
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

-- 6. Tabla de Asistencia (Daily Attendance)
CREATE TABLE IF NOT EXISTS public.daily_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT,
  user_role TEXT,
  work_date DATE DEFAULT CURRENT_DATE,
  check_in TIMESTAMP WITH TIME ZONE,
  break_start TIMESTAMP WITH TIME ZONE,
  break_end TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  last_location JSONB, -- { lat, lng }
  UNIQUE(user_id, work_date)
);

-- 7. Tabla de Notificaciones (Log)
CREATE TABLE IF NOT EXISTS public.notifications_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  payload JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Bitácoras de Calidad
CREATE TABLE IF NOT EXISTS public.quality_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL,
  supervisor_name TEXT,
  pipeline_status TEXT, 
  volume_received DECIMAL(10, 2) NOT NULL,
  chlorine_dosage DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. Funciones y Triggers (REPLACE siempre actualiza la función)
CREATE OR REPLACE FUNCTION public.fn_log_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    v_title := 'Nuevo Pedido WA';
    v_message := 'Pedido entrante de ' || NEW.customer_name;
    v_type := 'order';
  ELSIF TG_TABLE_NAME = 'daily_attendance' THEN
    v_title := 'Movimiento de Personal';
    v_type := 'attendance';
    IF (TG_OP = 'INSERT') THEN
      v_message := NEW.user_name || ' marcó Entrada';
    ELSE
      IF NEW.check_out IS DISTINCT FROM OLD.check_out THEN v_message := NEW.user_name || ' marcó Salida Final';
      ELSIF NEW.break_end IS DISTINCT FROM OLD.break_end THEN v_message := NEW.user_name || ' volvió de Comer';
      ELSIF NEW.break_start IS DISTINCT FROM OLD.break_start THEN v_message := NEW.user_name || ' salió a Comer';
      ELSIF NEW.check_in IS DISTINCT FROM OLD.check_in THEN v_message := NEW.user_name || ' marcó Entrada';
      ELSE RETURN NEW;
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'quality_logs' THEN
    v_title := 'Bitácora de Calidad';
    v_message := NEW.supervisor_name || ' auditó ' || NEW.volume_received || 'L';
    v_type := 'quality';
  END IF;

  INSERT INTO public.notifications_log (title, message, type, payload)
  VALUES (v_title, v_message, v_type, row_to_json(NEW));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dropping before creating to avoid "already exists" errors
DROP TRIGGER IF EXISTS tr_log_order_notification ON public.orders;
CREATE TRIGGER tr_log_order_notification
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.fn_log_notification();

DROP TRIGGER IF EXISTS tr_log_attendance_notification ON public.daily_attendance;
CREATE TRIGGER tr_log_attendance_notification
AFTER INSERT OR UPDATE ON public.daily_attendance
FOR EACH ROW EXECUTE FUNCTION public.fn_log_notification();

DROP TRIGGER IF EXISTS tr_log_quality_notification ON public.quality_logs;
CREATE TRIGGER tr_log_quality_notification
AFTER INSERT ON public.quality_logs
FOR EACH ROW EXECUTE FUNCTION public.fn_log_notification();

-- 10. Habilitar Realtime (Manejo de errores si ya existe en la publicación)
DO $$
BEGIN
  -- Intenta añadir las tablas a la publicación de realtime
  -- Ignora si falla porque ya están añadidas
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE daily_attendance';
EXCEPTION WHEN OTHERS THEN 
  RAISE NOTICE 'Table daily_attendance already in publication or publication missing';
END$$;

DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE notifications_log';
EXCEPTION WHEN OTHERS THEN 
  RAISE NOTICE 'Table notifications_log already in publication';
END$$;

DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE quality_logs';
EXCEPTION WHEN OTHERS THEN 
  RAISE NOTICE 'Table quality_logs already in publication';
END$$;
