import React from 'react';
import { Book, Shield, TestTube, Truck, Clock, User, Lightbulb } from 'lucide-react';
import { motion } from 'motion/react';

interface ManualProps {
  role: 'admin' | 'operator' | 'driver' | string | null;
}

export default function Manual({ role }: ManualProps) {
  const isSelected = (targetRole: string) => role === 'admin' || role === targetRole;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-sky-500/10 rounded-2xl flex items-center justify-center text-sky-500">
          <Book size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Manual del Usuario</h1>
          <p className="text-sm text-slate-500 font-medium italic">Guía de operación personalizada para tu rol</p>
        </div>
      </header>

      {role === 'admin' && (
        <section className="bg-sky-900 text-white p-6 rounded-3xl shadow-xl shadow-sky-900/20 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-xl">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">🛡️ Administrador Maestro</h2>
              <p className="text-sky-100 text-sm leading-relaxed mb-4">
                Tienes acceso total al sistema. Tu responsabilidad principal es la supervisión financiera, la gestión de personal y el análisis de métricas para la toma de decisiones estratégicas.
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <li className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
                  Dashboard de métricas financieras en tiempo real
                </li>
                <li className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
                  Control de ingresos, egresos y caja chica
                </li>
                <li className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
                  Alta y baja de empleados y clientes
                </li>
                <li className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
                  Validación de liquidaciones de ruta
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {isSelected('operator') && (
        <section className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <TestTube size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">🧪 Personal de Planta (Operador)</h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Garantiza la pureza del agua y el stock de insumos.
              </p>
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-800 text-sm uppercase mb-2">Módulo: Control de Calidad</h4>
                  <p className="text-xs text-slate-500 mb-2">Ingresa pH, Cloro, TDS y Dureza. Marca limpiezas de filtros.</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-800 text-sm uppercase mb-2">Módulo: Corte de Planta</h4>
                  <p className="text-xs text-slate-500 mb-2">Reporta el llenado diario de garrafones y botellas.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {isSelected('driver') && (
        <section className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
              <Truck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">🚚 Repartidor / Chofer</h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Distribución eficiente y atención al cliente en campo.
              </p>
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-800 text-sm uppercase mb-2">Módulo: Ruta de Entrega</h4>
                  <p className="text-xs text-slate-500 mb-2">Usa Google Maps para navegar y pulsa "Completar Venta" al entregar.</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-800 text-sm uppercase mb-2">Módulo: Auto-Liquidación</h4>
                  <p className="text-xs text-slate-500 mb-2">Verifica tu efectivo recolectado contra el registro de la app al final del día.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="text-slate-400" size={20} />
            <h3 className="font-bold text-slate-800 uppercase text-sm">Asistencia (Todos)</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Es obligatorio registrar el <strong>Check-In</strong> al llegar y el <strong>Check-Out</strong> al salir. El sistema guarda tu ubicación GPS para validez laboral.
          </p>
        </section>

        <section className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <User className="text-slate-400" size={20} />
            <h3 className="font-bold text-slate-800 uppercase text-sm">Perfil y Seguridad</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Mantén tu fotografía actualizada. Si olvidas tu contraseña o ves errores de permisos (RLS), contacta al Administrador.
          </p>
        </section>
      </div>

      <footer className="mt-12 p-6 bg-amber-50 border border-amber-100 rounded-3xl">
        <div className="flex items-center gap-3 mb-2 text-amber-700">
          <Lightbulb size={20} />
          <h4 className="font-black uppercase text-xs">Consejo Maestro</h4>
        </div>
        <p className="text-xs text-amber-600 font-medium">
          La precisión de los datos financieros depende de que cada venta se registre en el momento exacto que ocurre. ¡No dejes registros para después!
        </p>
      </footer>
    </div>
  );
}
