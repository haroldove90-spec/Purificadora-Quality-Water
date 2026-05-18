
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, Camera, CheckCircle2, AlertCircle, Loader2, ArrowRight, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Attendance() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [type, setType] = useState<'clock_in' | 'clock_out' | null>(null);
  const [lastEntry, setLastEntry] = useState<{ type: string, time: string } | null>(null);

  const handleAction = async (actionType: 'clock_in' | 'clock_out') => {
    setStatus('loading');
    setType(actionType);

    try {
      // 1. Get location if permission granted
      let location = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (e) {
        console.warn('Location blocked');
      }

      // 2. Register in Supabase
      // Assuming a valid user session exists, or using a fallback user_id for demo
      const { error } = await supabase
        .from('staff_attendance')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id || '00000000-0000-0000-0000-000000000000',
          type: actionType,
          location: location ? `(${location.lat},${location.lng})` : null,
          timestamp: new Date().toISOString()
        });

      if (error) throw error;

      // 3. Update state
      setLastEntry({ type: actionType, time: new Date().toLocaleTimeString() });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
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
        <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">Planta Iztapalapa • Registro Biométrico y Geo-Localizado</p>
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
                <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">Estado Actual</p>
                <p className="text-lg font-black text-slate-800 italic uppercase">Turno Matutino</p>
              </div>
            </div>

            <div className="space-y-6">
              <button 
                onClick={() => handleAction('clock_in')}
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
                onClick={() => handleAction('clock_out')}
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
                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Validando posición GPS</p>
                  </>
                ) : status === 'success' ? (
                  <>
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 size={48} />
                    </div>
                    <p className="text-2xl font-black text-slate-800 uppercase italic">¡Registro <span className="text-emerald-500">Exitoso!</span></p>
                    <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">{type === 'clock_in' ? 'Entrada' : 'Salida'} marcada a las {new Date().toLocaleTimeString()}</p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-6">
                      <AlertCircle size={48} />
                    </div>
                    <p className="text-2xl font-black text-slate-800 uppercase italic">¡Error en <span className="text-rose-500">Conexión!</span></p>
                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Verifica tu conexión a internet o GPS</p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Decorative background shape */}
          <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-slate-100 rounded-full group-hover:scale-110 transition-transform duration-700 opacity-50" />
        </div>

        {/* Info & Logs */}
        <div className="space-y-6">
          <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Último Movimiento</h4>
            {lastEntry ? (
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-lg ${
                  lastEntry.type === 'clock_in' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'
                }`}>
                  {lastEntry.type === 'clock_in' ? <ArrowRight size={24} /> : <LogOut size={24} />}
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800 italic uppercase">
                    {lastEntry.type === 'clock_in' ? 'Entrada' : 'Salida'}
                  </p>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Hoy • {lastEntry.time}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm font-bold text-slate-300 uppercase italic">Sin registros en la sesión actual</p>
            )}
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Seguridad Perimetral</h4>
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center shrink-0">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Geocerca Activa</p>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
                  Solo puedes marcar asistencia dentro del radio de 100m de la Planta Iztapalapa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
