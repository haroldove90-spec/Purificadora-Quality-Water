
-- ==========================================
-- SCRIPT FINAL DE BASE DE DATOS QUALITYWATER
-- ==========================================
-- Instrucciones: Copia y pega TODO este script en el SQL EDITOR de Supabase
-- y presiona "RUN". Esto reseteará las tablas y aplicará los permisos correctos.

-- 1. LIMPIEZA
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.daily_attendance CASCADE;
DROP TABLE IF EXISTS public.quality_logs CASCADE;
DROP TABLE IF EXISTS public.notifications_log CASCADE;

-- 2. TABLAS

-- Empleados (Capital Humano)
CREATE TABLE public.employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'admin', 'operator', 'driver'
  phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Clientes
CREATE TABLE public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT UNIQUE,
  tier TEXT DEFAULT 'frequent',
  geolocation_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Pedidos (Ventas)
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  address TEXT NOT NULL,
  items TEXT NOT NULL,
  total_price DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending', 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Asistencia (Historial Completo)
CREATE TABLE public.daily_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID, 
  user_name TEXT NOT NULL,
  user_role TEXT,
  work_date DATE DEFAULT CURRENT_DATE,
  check_in TIMESTAMP WITH TIME ZONE,
  break_start TIMESTAMP WITH TIME ZONE,
  break_end TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  last_location JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_name, work_date) 
);

-- Calidad
CREATE TABLE public.quality_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supervisor_name TEXT NOT NULL,
  volume_received DECIMAL(10,2),
  chlorine_dosage DECIMAL(10,2),
  pipeline_status TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Registro de Sistema
CREATE TABLE public.notifications_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT,
  user_role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. PERMISOS TOTALES (Bypass RLS y Grant All)
-- Deshabilitamos RLS en todas las tablas
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log DISABLE ROW LEVEL SECURITY;

-- Otorgamos todos los permisos a todos los roles posibles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 4. REALTIME (Configuración Robusta)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quality_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications_log;

-- 5. REFRESCAR SISTEMA
NOTIFY pgrst, 'reload schema';
