
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Order, Notification } from '../lib/types.supabase';

export function useRealtimeNotifications(userRole: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<any[]>([]); // Alertas emergentes temporales

  const playNotificationSound = () => {
    console.log('--- SOUND PLACEHOLDER: Reproduciendo alerta de WhatsApp ---');
  };

  const addToast = (toast: any) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000); // El toast desaparece en 5 segundos
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
        read: true, // El historial se considera "visto"
        created_at: log.created_at,
        payload: log.payload
      }));
      setNotifications(formatted);
    }
  };

  useEffect(() => {
    // Si no es admin, no activamos la escucha pesada de alertas globales
    if (!userRole || userRole !== 'admin') return;

    // 1. Escuchar Nuevos Pedidos (INSERT en orders)
    const ordersSubscription = supabase
      .channel('admin_realtime')
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
      // 2. Escuchar Broadcast de Asistencia
      .on('broadcast', { event: 'attendance_alert' }, (payload) => {
        console.log('Attendance Alert Broadcast:', payload);
        setUnreadCount(prev => prev + 1);
        addToast({
          title: 'Alerta de Personal',
          message: `${payload.payload.empleado} (${payload.payload.rol}) marcó ${payload.payload.evento}`,
          type: 'attendance'
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
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
    markAsRead, 
    clearUnread, 
    fetchNotificationLogs 
  };
}
