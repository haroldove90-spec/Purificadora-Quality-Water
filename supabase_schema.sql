
-- ======================================================
-- SCRIPT DEFINITIVO DE BASE DE DATOS QUALITYWATER (ULTRA-FIXED)
-- ======================================================
-- Instrucciones: 
-- 1. Copia TODO este código (desde la línea 1 hasta el final).
-- 2. Ve al SQL Editor en Supabase.
-- 3. Crea un "New Query" (Botón + New Query).
-- 4. Borra cualquier código que aparezca y pega este.
-- 5. Presiona el botón "RUN" (o Ctrl+Enter).

-- 1. LIMPIEZA TOTAL
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.daily_attendance CASCADE;
DROP TABLE IF EXISTS public.quality_logs CASCADE;
DROP TABLE IF EXISTS public.notifications_log CASCADE;

-- 2. CREACIÓN DE TABLAS

CREATE TABLE public.employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL, 
  phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT UNIQUE,
  tier TEXT DEFAULT 'frequent',
  geolocation_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  address TEXT NOT NULL,
  items TEXT NOT NULL,
  total_price DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending', 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

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

CREATE TABLE public.quality_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supervisor_name TEXT NOT NULL,
  volume_received DECIMAL(10,2),
  chlorine_dosage DECIMAL(10,2),
  pipeline_status TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.notifications_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT,
  user_role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. PERMISOS Y RLS (Bypass completo para desarrollo)
-- Deshabilitar RLS es lo más importante para evitar el error "violates row-level security"
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log DISABLE ROW LEVEL SECURITY;

-- Otorgar permisos masivos
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 4. CONFIGURACIÓN DE REALTIME (Versión Simplificada)
-- Borrar y recrear la publicación para asegurar que incluya todas las tablas
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.employees, 
    public.customers, 
    public.orders, 
    public.daily_attendance, 
    public.quality_logs, 
    public.notifications_log;

-- 5. RECARGAR SCHEMA CACHE (Para que PostgREST reconozca los cambios)
NOTIFY pgrst, 'reload schema';
