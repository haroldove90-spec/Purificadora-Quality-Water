-- 1. LIMPIEZA INICIAL
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;

-- 2. CREACIÓN DE TABLAS
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

-- 3. SEGURIDAD (DESHABILITAR RLS PARA PRUEBAS)
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- 4. PERMISOS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 5. CONFIGURACIÓN DE REALTIME (CORREGIDO)
DO $$
BEGIN
    -- Asegurar que existe la publicación
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    -- Intentar añadir tablas a la publicación
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Tabla customers ya estaba en tiempo real.';
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Tabla orders ya estaba en tiempo real.';
    END;
END $$;

-- 6. RECARGAR ESQUEMA PARA LA API
NOTIFY pgrst, 'reload schema';
