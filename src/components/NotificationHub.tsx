
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, MessageSquare, Truck, Clock, CheckCircle2 } from 'lucide-react';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

interface NotificationHubProps {
  userRole: string | null;
}

export default function NotificationHub({ userRole }: NotificationHubProps) {
  const { notifications, unreadCount, toasts, markAsRead, clearUnread, fetchNotificationLogs } = useRealtimeNotifications(userRole);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotificationLogs();
      clearUnread();
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 focus:outline-none"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white ring-2 ring-white animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Floating Toasts (Pop-ups) */}
      <div className="fixed top-20 right-6 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border-l-4 border-sky-500 flex items-center gap-4 min-w-[280px]"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                {toast.type === 'order' ? <MessageSquare size={18} /> : <Clock size={18} />}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{toast.title}</p>
                <p className="text-xs font-medium text-slate-500 italic">{toast.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[2px] md:hidden"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10, x: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-3 w-[320px] md:w-[400px] z-50 bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">Panel de <span className="text-sky-500">Alertas</span></h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Historial de Notificaciones</p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[450px] overflow-y-auto no-scrollbar py-2">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <Bell size={24} />
                    </div>
                    <p className="text-sm font-bold text-slate-400 italic">No hay registros recientes</p>
                  </div>
                ) : (
                  <div className="space-y-1 px-4">
                    {notifications.map((notif) => (
                      <motion.div
                        layout
                        key={notif.id}
                        onClick={() => markAsRead(notif.id)}
                        className={`group p-4 rounded-2xl transition-all cursor-pointer border ${
                          notif.read 
                            ? 'bg-white border-transparent' 
                            : 'bg-sky-50/50 border-sky-100'
                        }`}
                      >
                        <div className="flex gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            notif.type === 'order' ? 'bg-emerald-100 text-emerald-600' :
                            notif.type === 'attendance' ? 'bg-amber-100 text-amber-600' :
                            'bg-sky-100 text-sky-600'
                          }`}>
                            {notif.type === 'order' ? <MessageSquare size={18} /> :
                             notif.type === 'attendance' ? <Clock size={18} /> :
                             <Bell size={18} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{notif.title}</p>
                              <span className="text-[9px] font-bold text-slate-400">
                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed italic">{notif.message}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-slate-50 bg-slate-50/50">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center">
                  Sincronizado vía Supabase Realtime
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
