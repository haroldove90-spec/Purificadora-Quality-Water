import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export type AttendanceAction = 'check_in' | 'break_start' | 'break_end' | 'check_out';

interface UserSession {
  user_id: string;
  user_name: string;
  user_role: string;
}

export function useAttendanceEngine() {
  const [loading, setLoading] = useState(false);

  const performAttendanceAction = async (
    session: UserSession,
    action: AttendanceAction,
    location?: { lat: number; lng: number }
  ) => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();

    try {
      // 1. Lógica de Upsert en Supabase para mantener un solo registro por día
      const { data, error } = await supabase
        .from('daily_attendance')
        .upsert(
          {
            user_id: session.user_id,
            user_name: session.user_name,
            user_role: session.user_role,
            work_date: today,
            [action]: timestamp,
            last_location: location || null
          },
          { onConflict: 'user_id, work_date' }
        )
        .select()
        .single();

      if (error) throw error;

      // 2. Disparar Broadcast para Admin en tiempo real
      const labelMap: Record<AttendanceAction, string> = {
        check_in: 'Llegada',
        break_start: 'Salida a Comer',
        break_end: 'Regreso de Comer',
        check_out: 'Salida Final'
      };

      const channel = supabase.channel('asistencias_en_vivo');
      await channel.send({
        type: 'broadcast',
        event: 'attendance_event',
        payload: {
          usuario_id: session.user_id,
          nombre_empleado: session.user_name,
          rol_empleado: session.user_role,
          tipo_evento: labelMap[action],
          timestamp
        }
      });

      return { success: true, data };
    } catch (err: any) {
      console.error('Attendance Engine Error:', err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    registrarAsistencia: (s: UserSession, loc?: any) => performAttendanceAction(s, 'check_in', loc),
    registrarSalidaComer: (s: UserSession, loc?: any) => performAttendanceAction(s, 'break_start', loc),
    registrarRegresoComer: (s: UserSession, loc?: any) => performAttendanceAction(s, 'break_end', loc),
    registrarSalidaDefinitiva: (s: UserSession, loc?: any) => performAttendanceAction(s, 'check_out', loc),
    fetchHistory: async () => {
      const { data, error } = await supabase
        .from('daily_attendance')
        .select('*')
        .order('work_date', { ascending: false })
        .order('user_name', { ascending: true });
      return { success: !error, data, error };
    }
  };
}
