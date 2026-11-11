import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sliders, 
  Check, 
  Save, 
  RotateCcw, 
  Smartphone, 
  Clock, 
  Truck, 
  PackageCheck, 
  CreditCard, 
  DollarSign, 
  BookOpen, 
  Bell, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export interface DriverModuleDef {
  id: string;
  name: string;
  desc: string;
  icon: any;
  color: string;
  badge: string;
}

export const AVAILABLE_DRIVER_MODULES: DriverModuleDef[] = [
  {
    id: 'attendance',
    name: 'Asistencia con Geolocalización GPS',
    desc: 'Reloj checador móvil para registrar Entrada, Salida a Comer, Regreso y Salida con GPS satelital.',
    icon: Clock,
    color: 'emerald',
    badge: 'Requerido para checar'
  },
  {
    id: 'route',
    name: 'Mi Ruta de Reparto y Entregas',
    desc: 'Lista de paradas, pedidos asignados y confirmación de entregas con efectivo o transferencias.',
    icon: Truck,
    color: 'sky',
    badge: 'Operación en calle'
  },
  {
    id: 'borrowed_jugs',
    name: 'Control de Garrafones Fiados',
    desc: 'Registro de envases prestados y recuperación de cobros anteriores sin inflar la venta diaria.',
    icon: PackageCheck,
    color: 'amber',
    badge: 'Préstamos y fiados'
  },
  {
    id: 'transfer_sales',
    name: 'Mis Transferencias Bancarias',
    desc: 'Registro de ventas pagadas por transferencia electrónica con folio SPEI y validación bancaria.',
    icon: CreditCard,
    color: 'indigo',
    badge: 'Cobro digital'
  },
  {
    id: 'cash_float',
    name: 'Cierre de Caja y Liquidación Diaria',
    desc: 'Corte contable del turno: desglose de efectivo en mano, cobro de fiados y comprobante PDF.',
    icon: DollarSign,
    color: 'teal',
    badge: 'Liquidación en mano'
  },
  {
    id: 'manual',
    name: 'Manual de Usuario y Guía',
    desc: 'Manual interactivo con instrucciones de uso de la app para los colaboradores.',
    icon: BookOpen,
    color: 'slate',
    badge: 'Capacitación'
  },
  {
    id: 'notifications',
    name: 'Notificaciones y Avisos de Ruta',
    desc: 'Alertas en tiempo real de nuevos pedidos asignados o mensajes de administración.',
    icon: Bell,
    color: 'rose',
    badge: 'Alertas push'
  }
];

export const DEFAULT_DRIVER_MODULES = [
  'attendance',
  'route',
  'borrowed_jugs',
  'transfer_sales',
  'cash_float',
  'manual',
  'notifications'
];

export default function DriverPermissions() {
  const [enabledModules, setEnabledModules] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('qw_driver_enabled_modules');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_DRIVER_MODULES;
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // Escuchar si Supabase o broadcast cambia los módulos
  useEffect(() => {
    const fetchRemoteConfig = async () => {
      try {
        const { data } = await supabase
          .from('notifications_log')
          .select('*')
          .eq('type', 'driver_permissions_config')
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0 && data[0].message) {
          const parsed = JSON.parse(data[0].message);
          if (Array.isArray(parsed)) {
            setEnabledModules(parsed);
            localStorage.setItem('qw_driver_enabled_modules', JSON.stringify(parsed));
          }
        }
      } catch (e) {
        console.warn('Error fetching driver permissions:', e);
      }
    };
    fetchRemoteConfig();
  }, []);

  const handleToggle = (moduleId: string) => {
    setEnabledModules(prev => {
      if (prev.includes(moduleId)) {
        // Evitar dejar sin ningún módulo: si es el último, no permitir quitarlo
        if (prev.length === 1) {
          alert('Debes mantener al menos 1 módulo activo para los repartidores (por ejemplo Asistencia).');
          return prev;
        }
        return prev.filter(id => id !== moduleId);
      } else {
        return [...prev, moduleId];
      }
    });
  };

  const handleApplyPreset = (presetModules: string[]) => {
    setEnabledModules(presetModules);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Guardar localmente
      localStorage.setItem('qw_driver_enabled_modules', JSON.stringify(enabledModules));

      // 2. Notificar a la app en el cliente actual
      window.dispatchEvent(new CustomEvent('driver-permissions-changed', { detail: enabledModules }));

      // 3. Publicar en Supabase para sincronización remota en celulares
      try {
        await supabase.from('notifications_log').insert([
          {
            title: '⚙️ Configuración de Módulos de Repartidor Actualizada',
            message: JSON.stringify(enabledModules),
            type: 'driver_permissions_config',
            user_role: 'admin',
            is_read: true
          }
        ]);
      } catch (_) {}

      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3500);
    } catch (e: any) {
      alert('Error guardando configuración: ' + (e.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-2">
            <Sliders size={12} />
            Control de Acceso Administrativo
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase italic">
            Permisos de <span className="text-sky-500">Módulos para Repartidores</span>
          </h2>
          <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-wide">
            Activa o desactiva qué pantallas pueden ver y utilizar los choferes en sus celulares.
          </p>
        </div>

        {/* Botón de Guardar en Header */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-950/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50 shrink-0"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
          <span>Guardar y Aplicar Permisos</span>
        </button>
      </div>

      {/* Alerta de Éxito Flotante */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} />
              <span>¡Permisos guardados con éxito! Los celulares de los repartidores ahora solo mostrarán los módulos activos.</span>
            </div>
            <button onClick={() => setSuccessMsg(false)} className="text-white hover:opacity-80">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Presets Rápidos (Accesos de 1 Clic) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" />
            Configuraciones Rápidas de 1 Clic (Presets)
          </h3>
          <p className="text-[11px] font-bold text-slate-400 mt-0.5">
            Selecciona un perfil predefinido para aplicar de inmediato sin configurar módulo por módulo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Preset 1: Solo Asistencia */}
          <button
            onClick={() => handleApplyPreset(['attendance'])}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              enabledModules.length === 1 && enabledModules.includes('attendance')
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider">🎯 Recomendado Ahora</span>
              <Clock size={16} />
            </div>
            <p className="font-black text-sm uppercase italic">Solo Asistencia</p>
            <p className="text-[10px] opacity-80 mt-1 font-bold">
              Desactiva rutas y cajas. El chofer solo ve el reloj checador GPS.
            </p>
          </button>

          {/* Preset 2: Ruta Completa */}
          <button
            onClick={() => handleApplyPreset(DEFAULT_DRIVER_MODULES)}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              enabledModules.length === DEFAULT_DRIVER_MODULES.length
                ? 'bg-sky-500 text-white border-sky-600 shadow-lg shadow-sky-500/20'
                : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider">📦 Todos Activos</span>
              <Truck size={16} />
            </div>
            <p className="font-black text-sm uppercase italic">Ruta Completa</p>
            <p className="text-[10px] opacity-80 mt-1 font-bold">
              Habilita los 7 módulos (Ruta, Fiados, Transferencias, Caja, etc.).
            </p>
          </button>

          {/* Preset 3: Asistencia + Ruta (Sin Caja) */}
          <button
            onClick={() => handleApplyPreset(['attendance', 'route', 'borrowed_jugs', 'transfer_sales'])}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              enabledModules.length === 4 && enabledModules.includes('route') && !enabledModules.includes('cash_float')
                ? 'bg-indigo-500 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider">🚚 Reparto & Cobro</span>
              <DollarSign size={16} />
            </div>
            <p className="font-black text-sm uppercase italic">Ruta sin Caja</p>
            <p className="text-[10px] opacity-80 mt-1 font-bold">
              Asistencia, entregas y cobros (cierre de caja se hace en oficina).
            </p>
          </button>
        </div>

        {/* Aviso de Operación de Ventas */}
        {!enabledModules.includes('route') && (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Atención:</strong> El módulo "Mi Ruta" está desactivado. Tus repartidores <strong>NO</strong> podrán ver pedidos pendientes ni registrar ventas directas hasta que actives "Mi Ruta".
              </span>
            </div>
            <button
              onClick={() => handleToggle('route')}
              className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl shrink-0 cursor-pointer shadow-sm"
            >
              + Activar Mi Ruta
            </button>
          </div>
        )}
      </div>

      {/* Vista Previa Móvil: Lo que verá el Chofer */}
      <div className="p-5 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <Smartphone size={24} className="text-sky-400" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-sky-400 block">
              Vista Previa de Celular
            </span>
            <p className="text-xs font-black uppercase italic">
              Actualmente el repartidor verá {enabledModules.length} de {AVAILABLE_DRIVER_MODULES.length} módulos:
            </p>
          </div>
        </div>

        {/* Píldoras de módulos activos */}
        <div className="flex flex-wrap items-center gap-1.5">
          {AVAILABLE_DRIVER_MODULES.filter(m => enabledModules.includes(m.id)).map(m => (
            <span 
              key={m.id} 
              className="px-2.5 py-1 rounded-xl bg-white/10 text-white text-[10px] font-bold uppercase tracking-tight flex items-center gap-1 border border-white/10"
            >
              <m.icon size={12} className="text-sky-300" />
              <span>{m.name.split(' ')[0]}</span>
            </span>
          ))}
          <span className="px-2 py-1 rounded-xl bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-tight">
            + Perfil
          </span>
        </div>
      </div>

      {/* Lista de Módulos con Switches Individuales */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Módulos Individuales ({enabledModules.length} Activos)
          </h3>
          <span className="text-[10px] font-bold text-slate-400">
            Haz clic en cualquier tarjeta para encender o apagar
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {AVAILABLE_DRIVER_MODULES.map(module => {
            const isEnabled = enabledModules.includes(module.id);
            const Icon = module.icon;

            return (
              <div
                key={module.id}
                onClick={() => handleToggle(module.id)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isEnabled
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:border-sky-400'
                    : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200/50 dark:border-slate-900 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                    isEnabled 
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' 
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-800'
                  }`}>
                    <Icon size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-black uppercase tracking-tight truncate ${
                        isEnabled ? 'text-slate-800 dark:text-white' : 'text-slate-500'
                      }`}>
                        {module.name}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0 ${
                        isEnabled 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-800'
                      }`}>
                        {module.badge}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 mt-1 line-clamp-1">
                      {module.desc}
                    </p>
                  </div>
                </div>

                {/* Switch Toggle Visual */}
                <div className="shrink-0 flex items-center gap-3">
                  <span className={`text-[10px] font-black uppercase tracking-wider hidden sm:block ${
                    isEnabled ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {isEnabled ? 'Activo en Celular' : 'Oculto'}
                  </span>
                  <div className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${
                    isEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}>
                    <motion.div
                      layout
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="bg-white w-6 h-6 rounded-full shadow-md flex items-center justify-center"
                    >
                      {isEnabled ? (
                        <Check size={12} className="text-emerald-600 font-black" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      )}
                    </motion.div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón Flotante / Footer de Guardado */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide text-center sm:text-left">
          Los cambios se sincronizan en tiempo real con las sesiones móviles de los repartidores.
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-950/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
          <span>Guardar Cambios</span>
        </button>
      </div>
    </div>
  );
}
