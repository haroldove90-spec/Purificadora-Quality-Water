
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Droplets, Thermometer, ShieldCheck, ClipboardList, Plus, Search, CheckCircle2 } from 'lucide-react';

export default function QualityLog() {
  const [logs] = useState([
    { id: 1, type: 'Cloro', value: '0.8 ppm', status: 'optimal', time: '08:00 AM', tech: 'Juan P.' },
    { id: 2, type: 'Dureza', value: '2 mg/L', status: 'optimal', time: '09:30 AM', tech: 'Maria S.' },
    { id: 3, type: 'PH', value: '7.2', status: 'optimal', time: '11:00 AM', tech: 'Juan P.' },
    { id: 4, type: 'Ósmosis', value: '15 TDS', status: 'warning', time: '12:30 PM', tech: 'Maria S.' },
  ]);

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-3xl font-black text-slate-800 italic uppercase">Bitácoras de <span className="text-sky-500">Calidad</span></h2>
          <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest italic">Monitoreo Físico-Químico • NORMA-127-SSA1</p>
        </div>
        <button className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
          <Plus size={18} /> Nuevo Registro
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Log Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest flex items-center gap-2">
                <ClipboardList size={18} className="text-sky-500" />
                Registros del Día
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input type="text" placeholder="Buscar parámetro..." className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500/10 transition-all font-bold" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  <tr>
                    <th className="px-8 py-6">Parámetro</th>
                    <th className="px-8 py-6">Valor</th>
                    <th className="px-8 py-6">Estatus</th>
                    <th className="px-8 py-6">Técnico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 group">
                      <td className="px-8 py-6">
                        <p className="font-black text-slate-800 text-sm italic">{log.type}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{log.time}</p>
                      </td>
                      <td className="px-8 py-6 font-black text-slate-900 text-sm">
                        {log.value}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                          log.status === 'optimal' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-slate-500 italic">
                        {log.tech}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <div className="bg-sky-500 p-8 rounded-[40px] text-white shadow-2xl shadow-sky-500/20">
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 opacity-80">Cumplimiento Normativo</h4>
            <div className="flex items-center gap-6 mb-8">
              <div className="text-5xl font-black">98%</div>
              <div className="text-[10px] font-black uppercase leading-tight opacity-80">Promedio<br/>Mensual</div>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div className="bg-white h-full" style={{ width: '98%' }} />
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Próxima Prueba</h4>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center">
                <Thermometer size={24} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800 uppercase italic">Test de PH</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">En 45 minutos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
