
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Order, Notification } from '../lib/types.supabase';

export function useRealtimeNotifications(userRole: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);

  const playNotificationSound = () => {
    console.log('--- SOUND PLACEHOLDER: Reproduciendo alerta de WhatsApp ---');
    // const audio = new Audio('/notification-sound.mp3');
    // audio.play();
  };

  useEffect(() => {
    if (!userRole || (userRole !== 'admin' && userRole !== 'repartidor')) return;

    // 1. Listen for new orders (Realtime DB changes)
    const ordersSubscription = supabase
      .channel('realtime_orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('New order received:', payload);
          setLatestOrder(payload.new as Order);
          playNotificationSound();
          
          const newNotif: Notification = {
            id: crypto.randomUUID(),
            title: 'Nuevo Pedido WhatsApp',
            message: `${payload.new.customer_name} solicita ${payload.new.items}`,
            type: 'order',
            read: false,
            created_at: new Date().toISOString(),
            payload: payload.new
          };
          setNotifications(prev => [newNotif, ...prev]);
        }
      )
      .subscribe();

    // 2. Listen for Broadcast messages (Realtime Broadcast)
    // This is useful for volatile alerts not necessarily stored in DB yet
    const broadcastChannel = supabase.channel('admin_alerts');
    
    broadcastChannel
      .on('broadcast', { event: 'assignment_push' }, (payload) => {
        console.log('Assignment push received:', payload);
        const alertNotif: Notification = {
          id: crypto.randomUUID(),
          title: 'Asignación Confirmada',
          message: payload.payload.message,
          type: 'system',
          read: false,
          created_at: new Date().toISOString()
        };
        setNotifications(prev => [alertNotif, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(broadcastChannel);
    };
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return { notifications, latestOrder, markAsRead, clearAll };
}
