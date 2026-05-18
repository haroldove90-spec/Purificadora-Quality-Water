
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Order, Notification } from '../lib/types.supabase';

export function useRealtimeNotifications(userRole: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<any[]>([]); 
  const [staffStatus, setStaffStatus] = useState<Record<string, any>>({}); // { user_id: { name, role, last_event, time } }

  const playNotificationSound = () => {
    console.log('--- SOUND PLACEHOLDER: Reproduciendo alerta de WhatsApp ---');
  };

  const addToast = (toast: any) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const fetchNotificationLogs = async () => {
    const { data, error } = await supabase
      .from('notifications_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) {
      const formatted = data.map(log => ({
        id: log.id,
        title: log.title,
        message: log.message,
        type: log.type,
        read: true,
        created_at: log.created_at,
        payload: log.payload
      }));
      setNotifications(formatted);
    }
  };

  useEffect(() => {
    if (!userRole || userRole !== 'admin') return;

    const channel = supabase.channel('admin_realtime_system');

    channel
      // 1. Escuchar Nuevos Pedidos
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        setLatestOrder(payload.new as Order);
        setUnreadCount(prev => prev + 1);
        playNotificationSound();
        addToast({
          title: 'Nuevo Pedido WA',
          message: `${payload.new.customer_name} solicita servicio`,
          type: 'order'
        });
      })
      // 2. Escuchar Broadcast de Asistencia Unificada
      .on('broadcast', { event: 'attendance_event' }, (payload) => {
        const { usuario_id, nombre_empleado, rol_empleado, tipo_evento, timestamp } = payload.payload;
        
        setUnreadCount(prev => prev + 1);
        
        // Actualizar estado reactivo de la plantilla
        setStaffStatus(prev => ({
          ...prev,
          [usuario_id]: {
            name: nombre_empleado,
            role: rol_empleado,
            last_event: tipo_evento,
            time: timestamp
          }
        }));

        addToast({
          title: 'Asistencia: ' + nombre_empleado,
          message: `${tipo_evento} a las ${new Date(timestamp).toLocaleTimeString()}`,
          type: 'attendance'
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearUnread = () => setUnreadCount(0);

  return { 
    notifications, 
    latestOrder, 
    unreadCount, 
    toasts, 
    staffStatus,
    markAsRead, 
    clearUnread, 
    fetchNotificationLogs 
  };
}
