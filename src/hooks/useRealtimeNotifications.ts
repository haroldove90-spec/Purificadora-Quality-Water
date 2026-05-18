
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Order, AppNotification } from '../lib/types.supabase';

export function useRealtimeNotifications(userRole: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
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
    const today = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('notifications_log')
      .select('*')
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false });

    // Filtrar por rol si no es admin
    if (userRole !== 'admin') {
      query = query.eq('user_role', userRole);
    }

    const { data } = await query.limit(50);
    
    if (data) {
      const formatted: AppNotification[] = data.map(log => ({
        id: log.id,
        title: log.title,
        message: log.message,
        type: log.type as any,
        read: log.is_read,
        created_at: log.created_at
      }));
      setNotifications(formatted);
      
      const count = formatted.filter(n => !n.read).length;
      setUnreadCount(count);
    }
  };

  const markAllAsRead = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('notifications_log')
      .update({ is_read: true })
      .eq('is_read', false)
      .gte('created_at', `${today}T00:00:00`);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (!userRole) return;

    fetchNotificationLogs();

    const psqlChannel = supabase.channel(`notifs_psql_${crypto.randomUUID().slice(0, 8)}`);

    psqlChannel
      // 1. Escuchar Historial de Notificaciones (Tablas directas)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications_log' }, (payload) => {
        const newLog = payload.new;
        
        // Filtrar por rol
        // Si no es admin y el rol no coincide, ignorar
        if (userRole !== 'admin' && newLog.user_role !== userRole) {
          return;
        }

        // Formatear para el estado local
        const formatted: AppNotification = {
          id: newLog.id,
          title: newLog.title,
          message: newLog.message,
          type: newLog.type as any,
          read: newLog.is_read,
          created_at: newLog.created_at
        };

        setNotifications(prev => [formatted, ...prev]);
        if (!formatted.read) {
          setUnreadCount(prev => prev + 1);
        }
        playNotificationSound();

        // Native Browser Notification (Using global Window.Notification)
        if (typeof window !== 'undefined' && "Notification" in window && window.Notification.permission === "granted") {
          new window.Notification(formatted.title, {
            body: formatted.message,
            icon: '/favicon.ico'
          });
        }

        addToast({
          title: formatted.title,
          message: formatted.message,
          type: formatted.type
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications_log' }, (payload) => {
        const updatedLog = payload.new;
        
        // Si no es admin y el rol no coincide, ignorar
        if (userRole !== 'admin' && updatedLog.user_role !== userRole) {
          return;
        }

        setNotifications(prev => {
          const oldIndex = prev.findIndex(n => n.id === updatedLog.id);
          if (oldIndex === -1) return prev;
          
          const oldNotif = prev[oldIndex];
          const newNotifs = [...prev];
          newNotifs[oldIndex] = {
            ...oldNotif,
            read: updatedLog.is_read
          };

          // Sincronizar contador de no leídos basándose en el nuevo estado
          const newCount = newNotifs.filter(n => !n.read).length;
          setUnreadCount(newCount);

          return newNotifs;
        });
      })
      .subscribe();

    // 2. Escuchar Broadcast de Asistencia en un canal separado (Staff Monitor)
    const broadcastChannel = supabase.channel(`staff_bcast_${crypto.randomUUID().slice(0, 8)}`);
    // Note: To receive broadcasts sent by others, we must listen to the same channel name.
    // Wait, if I use a unique name, I won't hear them if they send to a specific name.
    // But broadcast is sent to WHATEVER channel name the sender specified.
    
    const sharedBroadcast = supabase.channel('asistencias_en_vivo');
    sharedBroadcast
      .on('broadcast', { event: 'attendance_event' }, (payload) => {
        const { usuario_id, nombre_empleado, rol_empleado, tipo_evento, timestamp } = payload.payload;
        setStaffStatus(prev => ({
          ...prev,
          [usuario_id]: {
            name: nombre_empleado,
            role: rol_empleado,
            last_event: tipo_evento,
            time: timestamp
          }
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(psqlChannel);
      supabase.removeChannel(sharedBroadcast);
    };
  }, [userRole]);

  const markAsRead = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (notif && !notif.read) {
      setNotifications(prev => {
        const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
        setUnreadCount(updated.filter(x => !x.read).length);
        return updated;
      });
      await supabase.from('notifications_log').update({ is_read: true }).eq('id', id);
    }
  };

  const clearUnread = () => setUnreadCount(0);

  return { 
    notifications, 
    latestOrder, 
    unreadCount, 
    toasts, 
    staffStatus,
    markAsRead, 
    markAllAsRead,
    clearUnread, 
    fetchNotificationLogs 
  };
}
