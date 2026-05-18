
-- 1. Asegurar Enums (Evita errores de duplicado)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('pending', 'assigned', 'delivered', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer');
    END IF;
END$$;

-- 2. Actualizar Tabla de Clientes (Agregar columna de ubicación si no existe)
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS geolocation_url TEXT;

-- 3. Tabla de Bitácoras de Calidad (Si no existe)
CREATE TABLE IF NOT EXISTS public.quality_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL,
  supervisor_name TEXT,
  pipeline_status TEXT, 
  volume_received DECIMAL(10, 2) NOT NULL,
  chlorine_dosage DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Tabla de Log de Notificaciones (Si no existe)
CREATE TABLE IF NOT EXISTS public.notifications_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  payload JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Función de Notificación Unificada
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

-- 6. Re-vincular Triggers (Garantiza que estén activos)
DROP TRIGGER IF EXISTS tr_log_order_notification ON public.orders;
CREATE TRIGGER tr_log_order_notification AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.fn_log_notification();

DROP TRIGGER IF EXISTS tr_log_quality_notification ON public.quality_logs;
CREATE TRIGGER tr_log_quality_notification AFTER INSERT ON public.quality_logs FOR EACH ROW EXECUTE FUNCTION public.fn_log_notification();

-- 7. Activar Realtime (A prueba de errores)
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE daily_attendance';
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'daily_attendance ya en publicacion';
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE notifications_log';
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'notifications_log ya en publicacion';
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE quality_logs';
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'quality_logs ya en publicacion';
  END;
END$$;
