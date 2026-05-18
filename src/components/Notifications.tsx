import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bell, Clock, MessageSquare, CheckCircle2 } from 'lucide-react';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

interface NotificationsProps {
  userRole: string | null;
}

export default function Notifications({ userRole }: NotificationsProps) {
  const { notifications: logs, markAsRead, markAllAsRead } = useRealtimeNotifications(userRole);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => !l.read);

  const getIcon = (type: string) => {
    switch(type) {
      case 'sale': return <CheckCircle2 size={18} className="text-emerald-500" />;
      case 'order': return <MessageSquare size={18} className="text-sky-500" />;
      case 'attendance': return <Clock size={18} className="text-amber-500" />;
      default: return <Bell size={18} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight uppercase italic leading-none">Historial de <span className="text-sky-500">Notificaciones</span></h1>
          <p className="text-slate-500 mt-2 font-bold italic uppercase text-[9px] md:text-[10px] tracking-wider">Registros de actividad del día: {new Date().toLocaleDateString()}</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
          <button 
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            Todas
          </button>
          <button 
            onClick={() => setFilter('unread')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === 'unread' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            No Leídas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="flex justify-end">
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-500 hover:text-sky-600 transition-colors"
          >
            Marcar todas como leídas
          </button>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="bg-white p-20 rounded-[48px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
             <Bell size={48} className="text-slate-200 mb-4" />
             <h3 className="text-xl font-black text-slate-800 uppercase italic">Sin notificaciones</h3>
             <p className="text-sm font-bold text-slate-400 mt-2 italic">Aún no hay registros para el día de hoy.</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <motion.div
              layout
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => markAsRead(log.id)}
              className={`bg-white p-4 md:p-6 rounded-[24px] md:rounded-[32px] border cursor-pointer ${log.read ? 'border-slate-50' : 'border-sky-100 shadow-lg shadow-sky-500/5'} flex items-start gap-4 md:gap-6 group transition-all`}
            >
              <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${
                log.read ? 'bg-slate-50 text-slate-400' : 'bg-sky-50 text-sky-500'
              }`}>
                {getIcon(log.type)}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <h3 className={`font-black uppercase italic tracking-tight ${log.read ? 'text-slate-600' : 'text-slate-900 group-hover:text-sky-500 transition-colors'}`}>
                      {log.title}
                    </h3>
                  </div>
                  {!log.read && (
                    <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                  )}
                </div>
                <p className="text-slate-500 text-xs font-bold mt-2 leading-relaxed italic">
                  {log.message}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
