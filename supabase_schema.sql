-- ======================================================
-- SCRIPT FINAL DE BASE DE DATOS QUALITYWATER (VERSIÓN SUPREMA)
-- ======================================================
-- Instrucciones: 
-- 1. Copia TODO el contenido de este archivo (desde esta línea hasta el final).
-- 2. Ve al SQL Editor en Supabase.
-- 3. Haz click en "+ New Query".
-- 4. Borra cualquier código que aparezca, pega este y presiona el botón "RUN".

-- 1. LIMPIEZA TOTAL (Reseteo profundo)
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.daily_attendance CASCADE;
DROP TABLE IF EXISTS public.quality_logs CASCADE;
DROP TABLE IF EXISTS public.notifications_log CASCADE;

-- 2. CREACIÓN DE TABLAS

-- Tabla de Empleados
CREATE TABLE public.employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL, 
  phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de Clientes
CREATE TABLE public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT, -- Sin UNIQUE para facilitar pruebas iniciales
  tier TEXT DEFAULT 'frequent',
  geolocation_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de Pedidos
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  address TEXT NOT NULL,
  items TEXT NOT NULL,
  total_price DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending', 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de Asistencia (Manejo de tiempos y GPS)
CREATE TABLE public.daily_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT, 
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

-- Tabla de Calidad de Agua
CREATE TABLE public.quality_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supervisor_name TEXT NOT NULL,
  volume_received DECIMAL(10,2),
  chlorine_dosage DECIMAL(10,2),
  pipeline_status TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de Log de Sistema
CREATE TABLE public.notifications_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT,
  user_role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. PERMISOS TOTALES (Bypass RLS)
-- Deshabilitamos RLS para evitar errores de permisos en desarrollo
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log DISABLE ROW LEVEL SECURITY;

-- Otorgamos todos los permisos a todos los roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 4. REALTIME (Configuración Simplificada)
-- Recreamos la publicación para que todo se sincronice al instante
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.employees, 
    public.customers, 
    public.orders, 
    public.daily_attendance, 
    public.quality_logs, 
    public.notifications_log;

-- 5. ACTUALIZAR CACHÉ
NOTIFY pgrst, 'reload schema';
