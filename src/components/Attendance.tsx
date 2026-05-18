
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, Camera, CheckCircle2, AlertCircle, Loader2, ArrowRight, LogOut } from 'lucide-react';
import { useAttendanceLogic } from '../hooks/useAttendanceLogic';

export default function Attendance() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastAction, setLastAction] = useState<string | null>(null);
  
  const { handleClockIn, handleClockOut } = useAttendanceLogic();

  // Mock de datos de sesión (en producción vendrían de un AuthContext)
  const userData = {
    user_id: '00000000-0000-0000-0000-000000000000',
    user_name: 'Luis Repartidor',
    user_role: 'repartidor'
  };

  const handleAction = async (type: 'in' | 'out') => {
    setStatus('loading');
    
    try {
      // Obtener ubicación
      let location = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (e) {
        console.warn('Geolocation blocked');
      }

      const action = type === 'in' ? handleClockIn : handleClockOut;
      const result = await action({ ...userData, location });

      if (result.success) {
        setStatus('success');
        setLastAction(`${type === 'in' ? 'Entrada' : 'Salida'} - ${new Date().toLocaleTimeString()}`);
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
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-12">
        <h2 className="text-3xl font-black text-slate-800 italic uppercase">Control de <span className="text-sky-500">Asistencia</span></h2>
        <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">Sincronizado en tiempo real con Administrador</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Main Actions */}
        <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                <Clock size={28} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">Sesión de: {userData.user_name}</p>
                <p className="text-lg font-black text-slate-800 italic uppercase">Turno Activo</p>
              </div>
            </div>

            <div className="space-y-6">
              <button 
                onClick={() => handleAction('in')}
                disabled={status === 'loading'}
                className="w-full flex items-center justify-between p-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <span>Entrada / Clock-In</span>
                </div>
                <ArrowRight size={20} />
              </button>

              <button 
                onClick={() => handleAction('out')}
                disabled={status === 'loading'}
                className="w-full flex items-center justify-between p-6 bg-slate-900 hover:bg-slate-800 text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <LogOut size={24} />
                  </div>
                  <span>Salida / Clock-Out</span>
                </div>
                <ArrowRight size={20} />
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

        {/* Info & Logs */}
        <div className="space-y-6">
          <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Estado del Sensor</h4>
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-[24px] bg-sky-50 text-sky-500 flex items-center justify-center shadow-sm">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 uppercase italic">GPS Activo</p>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
                  Tu ubicación se envía automáticamente para validación de zona.
                </p>
              </div>
            </div>
            {lastAction && (
              <div className="mt-8 pt-8 border-t border-slate-200">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">Último marcado local:</p>
                <p className="text-sm font-bold text-slate-700">{lastAction}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
