
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
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('notifications_log')
      .select('*')
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) {
      const formatted: Notification[] = data.map(log => ({
        id: log.id,
        title: log.title,
        message: log.message,
        type: log.type as any,
        read: log.is_read,
        created_at: log.created_at
      }));
      setNotifications(formatted);
      
      const unreadCount = formatted.filter(n => !n.read).length;
      setUnreadCount(unreadCount);
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

    const channelName = `notifications_realtime_${crypto.randomUUID().slice(0, 8)}`;
    const channel = supabase.channel(channelName);

    channel
      // 1. Escuchar Historial de Notificaciones (Tablas directas)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications_log' }, (payload) => {
        const newLog = payload.new;
        
        // Formatear para el estado local
        const formatted: Notification = {
          id: newLog.id,
          title: newLog.title,
          message: newLog.message,
          type: newLog.type as any,
          read: newLog.is_read,
          created_at: newLog.created_at
        };

        setNotifications(prev => [formatted, ...prev]);
        setUnreadCount(prev => prev + 1);
        playNotificationSound();
        addToast({
          title: formatted.title,
          message: formatted.message,
          type: formatted.type
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await supabase.from('notifications_log').update({ is_read: true }).eq('id', id);
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
