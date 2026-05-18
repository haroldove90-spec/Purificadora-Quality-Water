-- SCRIPT DE ACCESO TOTAL (Copia y pega en Supabase SQL Editor)

-- 1. Asegurar que la tabla existe con la estructura correcta
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT UNIQUE,
  tier TEXT DEFAULT 'frequent',
  geolocation_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Activar RLS (Seguridad de Fila)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 3. Borrar políticas viejas para evitar conflictos
DROP POLICY IF EXISTS "Acceso publico total" ON public.customers;

-- 4. CREAR POLÍTICA DE ACCESO TOTAL (Esto permite INSERTAR sin errores)
CREATE POLICY "Acceso publico total" 
ON public.customers 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 5. Dar permisos de tabla al rol anónimo (el que usa Vite)
GRANT ALL ON public.customers TO anon;
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.customers TO postgres;
GRANT USAGE ON SCHEMA public TO anon;

-- 6. Refrescar el cache de la API para que reconozca los cambios
NOTIFY pgrst, 'reload schema';
