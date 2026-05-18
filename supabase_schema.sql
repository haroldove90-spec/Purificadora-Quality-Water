-- SCHEMA COMPLETO E IDEMPOTENTE (Copia y pega todo esto)
-- No fallará incluso si las tablas o publicaciones ya existen.

-- 1. Tablas Base
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT UNIQUE,
  tier TEXT DEFAULT 'frequent',
  location POINT,
  geolocation_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Aseguramos que existan el resto de tablas necesarias
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  address TEXT NOT NULL,
  items TEXT NOT NULL,
  total_price DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Seguridad (RLS) - DESHABILITADA PARA PRUEBAS
-- Esto evita errores de permisos 403 o "insufficient permissions"
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- 3. Permisos explícitos a anon (Frontend sin login)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 4. Habilitar Realtime de forma segura
DO $$
BEGIN
  -- Bloque por tabla para que si una falla, las demás sigan
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
  EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE 'Tabla customers ya en publicación o error ignorado.';
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE 'Tabla orders ya en publicación o error ignorado.';
  END;
END$$;
