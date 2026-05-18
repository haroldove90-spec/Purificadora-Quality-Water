
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, CheckCircle2, AlertCircle, Loader2, ArrowRight, LogOut, Coffee, Users, Search } from 'lucide-react';
import { useAttendanceEngine, AttendanceAction } from '../hooks/useAttendanceEngine';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

interface AttendanceProps {
  userRole?: 'admin' | 'operator' | 'driver' | 'client' | null;
}

export default function Attendance({ userRole }: AttendanceProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastAction, setLastAction] = useState<string | null>(null);
  
  const { registrarAsistencia, registrarSalidaComer, registrarRegresoComer, registrarSalidaDefinitiva } = useAttendanceEngine();
  const { staffStatus } = useRealtimeNotifications(userRole || null);

  // Determinar si estamos en modo monitor (Admin) o modo marcado (Empleado)
  const isMonitorMode = userRole === 'admin';

  // Datos de sesión - Prioriza localStorage para coherencia entre módulos
  const [userData, setUserData] = useState({
    user_id: userRole === 'admin' ? 'admin-id' : '00000000-0000-0000-0000-000000000000',
    user_name: userRole === 'admin' ? 'Administrador' : 'Empleado Demo',
    user_role: userRole || 'repartidor'
  });

  useEffect(() => {
    const savedSession = localStorage.getItem('qw_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.user_role === userRole || (!userRole && session.user_role)) {
          setUserData(session);
        }
      } catch (e) {}
    }
  }, [userRole]);

  const handleAction = async (actionType: AttendanceAction) => {
    setStatus('loading');
    
    try {
      let location = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (e) {
        console.warn('Geolocation blocked');
      }

      const actionMap = {
        check_in: registrarAsistencia,
        break_start: registrarSalidaComer,
        break_end: registrarRegresoComer,
        check_out: registrarSalidaDefinitiva
      };

      const result = await actionMap[actionType](userData, location);

      if (result.success) {
        setStatus('success');
        const labels: Record<AttendanceAction, string> = {
          check_in: 'Entrada',
          break_start: 'Comida (Salida)',
          break_end: 'Comida (Regreso)',
          check_out: 'Salida Turno'
        };
        setLastAction(`${labels[actionType]} - ${new Date().toLocaleTimeString()}`);
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        throw new Error('Action failed');
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 italic uppercase">
            {isMonitorMode ? 'Monitor de ' : 'Control de '}
            <span className="text-sky-500">Asistencia</span>
          </h2>
          <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">
            {isMonitorMode ? 'Estado de la Plantilla en Tiempo Real' : 'Sincronizado en tiempo real con Administrador'}
          </p>
        </div>
        
        {isMonitorMode && (
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
            <Users size={16} className="text-sky-500" />
            <span className="text-xs font-black text-slate-600 uppercase tracking-tight">Activos: {Object.keys(staffStatus).length}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {!isMonitorMode ? (
          <>
            {/* Action Card para Empleados */}
            <div className="lg:col-span-2 bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <Clock size={28} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">Sesión de: {userData.user_name}</p>
                    <p className="text-lg font-black text-slate-800 italic uppercase">Logueado como {userData.user_role}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={() => handleAction('check_in')}
                    disabled={status === 'loading'}
                    className="w-full flex items-center justify-between p-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={18} />
                      <span>Entrada Al Turno</span>
                    </div>
                    <ArrowRight size={16} />
                  </button>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleAction('break_start')}
                      disabled={status === 'loading'}
                      className="flex items-center justify-between p-5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <Coffee size={18} />
                        <span>Ir Comer</span>
                      </div>
                    </button>
                    <button 
                      onClick={() => handleAction('break_end')}
                      disabled={status === 'loading'}
                      className="flex items-center justify-between p-5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-sky-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <Clock size={16} />
                        <span>Volver</span>
                      </div>
                    </button>
                  </div>

                  <button 
                    onClick={() => handleAction('check_out')}
                    disabled={status === 'loading'}
                    className="w-full flex items-center justify-between p-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <LogOut size={18} />
                      <span>Salida Definitiva</span>
                    </div>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {/* Status Overlay */}
              <AnimatePresence>
                {status !== 'idle' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 size={64} className="text-sky-500 animate-spin mb-6" />
                        <p className="text-xl font-black text-slate-800 uppercase italic">Procesando <span className="text-sky-500">Registro...</span></p>
                      </>
                    ) : status === 'success' ? (
                      <>
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                          <CheckCircle2 size={48} />
                        </div>
                        <p className="text-2xl font-black text-slate-800 uppercase italic">¡Notificado al <span className="text-emerald-500">Admin!</span></p>
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-6">
                          <AlertCircle size={48} />
                        </div>
                        <p className="text-2xl font-black text-slate-800 uppercase italic">Error en <span className="text-rose-500">Registro</span></p>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-slate-100 rounded-full group-hover:scale-110 transition-transform duration-700 opacity-50" />
            </div>
          </>
        ) : (
          /* Monitor Mode (Admin) */
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Personal Activo Hoy</span>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar empleado..." 
                    className="pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>
              
              <div className="divide-y divide-slate-50">
                {Object.keys(staffStatus).length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-sm font-bold text-slate-300 italic">No hay movimientos registrados hoy</p>
                  </div>
                ) : (
                  Object.entries(staffStatus).map(([id, info]: [string, any]) => (
                    <motion.div 
                      key={id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white ${
                          id.includes('chofer') ? 'bg-emerald-500' : 'bg-sky-500'
                        }`}>
                          {info.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800 leading-none">{info.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{info.role}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          info.last_event === 'Llegada' ? 'bg-emerald-100 text-emerald-600' :
                          info.last_event === 'Salida a Comer' ? 'bg-amber-100 text-amber-600' :
                          info.last_event === 'Regreso de Comer' ? 'bg-sky-100 text-sky-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {info.last_event}
                        </span>
                        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                          {new Date(info.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] mb-6">Estado del Sistema</h4>
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[24px] bg-white/10 text-white flex items-center justify-center backdrop-blur-md shadow-inner">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-xs font-black text-white uppercase italic tracking-widest">GPS Gateway</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1 uppercase">
                    Protocolo Realtime Activo
                  </p>
                </div>
              </div>
              {!isMonitorMode && lastAction && (
                <div className="mt-8 pt-8 border-t border-white/10">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">Último marcado:</p>
                  <p className="text-sm font-bold text-white mt-1">{lastAction}</p>
                </div>
              )}
            </div>
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl" />
          </div>

          {isMonitorMode && (
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Resumen del Día</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase">En Turno</span>
                  <span className="font-black text-slate-800">12</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase">En Comida</span>
                  <span className="font-black text-amber-500">2</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-4 border-t border-slate-50">
                  <span className="font-bold text-slate-500 uppercase">Sin Marcar</span>
                  <span className="font-black text-rose-500">1</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
