
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Order, AppNotification } from '../lib/types.supabase';

export function useRealtimeNotifications(userRole: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<any[]>([]); 
  const [staffStatus, setStaffStatus] = useState<Record<string, any>>({}); // { user_id: { name, role, last_event, time } }
  const shownIdsRef = useRef<Set<string>>(new Set());

  const playNotificationSound = () => {
    console.log('--- SOUND PLACEHOLDER: Reproduciendo alerta de interfaz tonal, positiva, ascendente y procesada ---');
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;

      // 1. Synth a ultra-clean, high-end "User Interface, Beep, Button, Tonal, Positive, Ascending, High, Processed" chime
      // Three pure ascending notes that create a modern, elegant SaaS notification chord (A5 -> C#6 -> E6 -> A6)
      const notes = [
        { freq: 880, delay: 0, duration: 0.15, volume: 0.15 },    // A5 (tonal positive base)
        { freq: 1109, delay: 0.05, duration: 0.15, volume: 0.15 }, // C#6 (major third - optimistic/positive)
        { freq: 1318, delay: 0.10, duration: 0.20, volume: 0.18 }, // E6 (perfect fifth - stable ascending)
        { freq: 1760, delay: 0.15, duration: 0.25, volume: 0.20 }  // A6 (high octave - processed peak sparkle)
      ];

      notes.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        // Pure sine wave combined with an exponential sweep/envelope to sound premium
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, now + note.delay);
        
        // Attack-Decay envelope
        gain.gain.setValueAtTime(0, now + note.delay);
        gain.gain.linearRampToValueAtTime(note.volume, now + note.delay + 0.01); // fast 10ms attack
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration); // smooth exponential release
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + note.delay);
        osc.stop(now + note.delay + note.duration + 0.05);
      });

      // 2. Synthesize a processed reverb/sparkle tail
      const sparklySparks = [2218, 2637, 3520]; // matching high-octave harmonics
      sparklySparks.forEach((freq, idx) => {
        const oscSpark = ctx.createOscillator();
        const gainSpark = ctx.createGain();
        
        oscSpark.type = 'sine';
        oscSpark.frequency.setValueAtTime(freq, now + 0.18 + (idx * 0.02));
        
        gainSpark.gain.setValueAtTime(0, now + 0.18 + (idx * 0.02));
        gainSpark.gain.linearRampToValueAtTime(0.02, now + 0.18 + (idx * 0.02) + 0.005);
        gainSpark.gain.exponentialRampToValueAtTime(0.0001, now + 0.18 + (idx * 0.02) + 0.08); // short delay ring
        
        oscSpark.connect(gainSpark);
        gainSpark.connect(ctx.destination);
        
        oscSpark.start(now + 0.18 + (idx * 0.02));
        oscSpark.stop(now + 0.18 + (idx * 0.02) + 0.10);
      });
    } catch (err) {
      console.warn('Web Audio synthesis failed, falling back to console log:', err);
    }
  };

  const addToast = (toast: any) => {
    const id = Math.random().toString(36).slice(2, 11);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const fetchNotificationLogs = async (triggerAlerts = false) => {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      let query = supabase
        .from('notifications_log')
        .select('*')
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .order('created_at', { ascending: false });

      // Filtrar por rol si no es admin
      if (userRole !== 'admin') {
        query = query.eq('user_role', userRole);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      
      if (data) {
        const formatted: AppNotification[] = data.map(log => ({
          id: log.id,
          title: log.title,
          message: log.message,
          type: log.type as any,
          read: log.is_read,
          created_at: log.created_at
        }));

        // Si se solicita alertar, mostramos toasts para notificaciones unread nuevas
        if (triggerAlerts) {
          formatted.forEach(notif => {
            if (!notif.read && !shownIdsRef.current.has(notif.id)) {
              shownIdsRef.current.add(notif.id);
              
              // Solo alertar si ocurrió hace menos de 45 segundos para evitar floods
              const ageMs = Date.now() - new Date(notif.created_at).getTime();
              if (ageMs < 45000) {
                addToast({
                  title: notif.title,
                  message: notif.message,
                  type: notif.type
                });
                playNotificationSound();
              }
            }
          });
        } else {
          // En consultas normales, agregar a mostrados para evitar repetir alertas
          formatted.forEach(notif => {
            shownIdsRef.current.add(notif.id);
          });
        }

        setNotifications(formatted);
        
        const count = formatted.filter(n => !n.read).length;
        setUnreadCount(count);
      }
    } catch (err: any) {
      console.warn('Fallo silencioso al recuperar notificaciones (posible problema de red):', err.message || err);
    }
  };

  const markAllAsRead = async () => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    try {
      console.log('Marking notifications from last 24h as read...');
      const { error } = await supabase
        .from('notifications_log')
        .update({ is_read: true })
        .eq('is_read', false)
        .gte('created_at', twentyFourHoursAgo.toISOString());

      if (error) {
        console.error('Persistence Error (markAllAsRead):', error);
        return;
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      console.log('Successfully marked all as read in DB and local state');
    } catch (err) {
      console.error('Critical failure in markAllAsRead:', err);
    }
  };

  useEffect(() => {
    if (!userRole) return;

    // Carga inicial sin disparar alertas repetidas
    fetchNotificationLogs(false);

    // Refuerzo de sincronización proactiva periódica (polling cada 8 segundos de respaldo)
    const backupInterval = setInterval(() => {
      fetchNotificationLogs(true);
    }, 8000);

    const psqlChannel = supabase.channel(`notifs_psql_${Math.random().toString(36).slice(2, 10)}`);

    psqlChannel
      // 1. Escuchar Historial de Notificaciones (Tablas directas)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications_log' }, (payload) => {
        const newLog = payload.new;
        
        // Filtrar por rol
        // Si no es admin y el rol no coincide, ignorar
        if (userRole !== 'admin' && newLog.user_role !== userRole) {
          return;
        }

        // Registrar inmediatamente en mostrados
        shownIdsRef.current.add(newLog.id);

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
    const broadcastChannel = supabase.channel(`staff_bcast_${Math.random().toString(36).slice(2, 10)}`);
    
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
      clearInterval(backupInterval);
      supabase.removeChannel(psqlChannel);
      supabase.removeChannel(sharedBroadcast);
    };
  }, [userRole]);

  const markAsRead = async (id: string) => {
    try {
      // 1. Actualizar estado local inmediatamente para UI responsiva
      setNotifications(prev => {
        const itemIndex = prev.findIndex(n => n.id === id);
        if (itemIndex === -1 || prev[itemIndex].read) return prev;
        
        const newNotifs = [...prev];
        newNotifs[itemIndex] = { ...newNotifs[itemIndex], read: true };
        setUnreadCount(newNotifs.filter(n => !n.read).length);
        return newNotifs;
      });

      // 2. Persistir en Base de Datos
      const { error, data } = await supabase
        .from('notifications_log')
        .update({ is_read: true })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Supabase update error (markAsRead):', error);
        // Podríamos revertir el estado local aquí si el error es crítico
      } else {
        console.log(`Notification ${id} marked as read in DB:`, data);
      }
    } catch (err) {
      console.error('Unexpected error in markAsRead:', err);
    }
  };

  const deleteNotifications = async (ids: string[]) => {
    try {
      // 1. Update local state
      setNotifications(prev => {
        const remaining = prev.filter(n => !ids.includes(n.id));
        setUnreadCount(remaining.filter(n => !n.read).length);
        return remaining;
      });

      // 2. Persistir en Base de Datos
      const { error } = await supabase
        .from('notifications_log')
        .delete()
        .in('id', ids);

      if (error) {
        console.error('Supabase delete error (deleteNotifications):', error);
      }
    } catch (err) {
      console.error('Unexpected error in deleteNotifications:', err);
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
    deleteNotifications,
    clearUnread, 
    fetchNotificationLogs 
  };
}
