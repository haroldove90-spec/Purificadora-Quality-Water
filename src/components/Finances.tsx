import React from 'react';
import { motion } from 'motion/react';
import { 
  DollarSign, 
  TrendingUp, 
  Download, 
  AlertCircle, 
  Truck, 
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const SALES_DATA = [
  { day: 'Lun', sales: 4500 },
  { day: 'Mar', sales: 5200 },
  { day: 'Mie', sales: 4800 },
  { day: 'Jue', sales: 6100 },
  { day: 'Vie', sales: 5900 },
  { day: 'Sab', sales: 7200 },
  { day: 'Dom', sales: 4000 },
];

const CHANNEL_DATA = [
  { name: 'WhatsApp', value: 45, color: '#0ea5e9' },
  { name: 'Ruta 1 (Norte)', value: 25, color: '#6366f1' },
  { name: 'Ruta 2 (Sur)', value: 20, color: '#8b5cf6' },
  { name: 'Mostrador', value: 10, color: '#f43f5e' },
];

export default function Finances() {
  const liquidations = [
    { driver: 'Carlos Ruiz', route: 'Ruta 1', out: 120, delivered: 115, inTruck: 5, expectedCash: 5175, actualCash: 5175, status: 'ok' },
    { driver: 'Mario Santos', route: 'Ruta 2', out: 95, delivered: 88, inTruck: 4, expectedCash: 3960, actualCash: 3915, status: 'faltante' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Cierre de Día y Finanzas</h1>
          <p className="text-slate-500 mt-1 italic italic flex items-center gap-2">
            Control de misión: Liquidación de rutas y salud financiera
          </p>
        </div>
        
        <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl hover:bg-slate-800 transition-all active:scale-95 shadow-slate-200">
          <Download size={18} />
          Descargar Reporte PDF
        </button>
      </div>

      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos Totales', value: '$14,580', icon: DollarSign, trend: '+12%', color: 'text-emerald-600' },
          { label: 'Ganancia Neta', value: '$8,240', icon: TrendingUp, trend: '+5%', color: 'text-sky-600' },
          { label: 'Efectivo en Caja', value: '$12,100', icon: DollarSign, trend: '--', color: 'text-slate-600' },
          { label: 'Faltante de Ruta', value: '-$45.00', icon: AlertCircle, trend: 'Crit.', color: 'text-rose-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
              <stat.icon size={16} className={stat.color} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{stat.value}</span>
              <span className={`text-[10px] font-bold ${stat.trend === 'Crit.' ? 'text-rose-500' : 'text-emerald-500'}`}>
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-sky-500" />
              Ventas Últimos 7 Días
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SALES_DATA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="sales" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Liquidación de Choferes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Truck size={18} className="text-slate-400" />
                Liquidación de Choferes
              </h3>
            </div>
            
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Chofer / Ruta</th>
                    <th className="px-6 py-4">Inventario (S / E+C)</th>
                    <th className="px-6 py-4">Efectivo (Exp / Real)</th>
                    <th className="px-6 py-4 text-right">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {liquidations.map((liqi, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-[13px]">
                        <span className="font-bold text-slate-800 block">{liqi.driver}</span>
                        <span className="text-slate-400 text-[11px]">{liqi.route}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-[13px]">
                          <span className="font-bold text-slate-900">{liqi.out}</span>
                          <span className="text-slate-300">vs</span>
                          <span className="font-bold text-sky-600">{liqi.delivered + liqi.inTruck}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                            {liqi.out === (liqi.delivered + liqi.inTruck) ? 'OK' : 'Diff'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-slate-800">${liqi.actualCash}</span>
                          <span className="text-[11px] text-slate-400">Exp: ${liqi.expectedCash}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {liqi.status === 'ok' ? (
                          <span className="bg-emerald-50 text-emerald-600 p-1.5 rounded-full inline-block">
                            <CheckCircle2 size={16} />
                          </span>
                        ) : (
                          <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded text-[10px] font-black uppercase">
                            Faltante: ${liqi.expectedCash - liqi.actualCash}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {liquidations.map((liqi, idx) => (
                <div key={idx} className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-slate-800">{liqi.driver}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{liqi.route}</p>
                    </div>
                    {liqi.status === 'ok' ? (
                      <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg text-[9px] font-black uppercase">OK</span>
                    ) : (
                      <span className="text-rose-500 bg-rose-50 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter">Faltante: ${liqi.expectedCash - liqi.actualCash}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Inventario (S/E)</p>
                      <p className="text-sm font-black text-slate-800">{liqi.out} / {liqi.delivered + liqi.inTruck}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Efectivo ($)</p>
                      <p className="text-sm font-black text-sky-600">${liqi.actualCash}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Mini panels Column */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <PieChartIcon size={18} className="text-sky-500" />
              Ventas por Canal
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={CHANNEL_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {CHANNEL_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {CHANNEL_DATA.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-500 font-medium">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-800">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Maintenance Section */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl shadow-slate-200 border border-slate-800 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Filter size={80} />
            </div>
            
            <h3 className="font-bold text-white mb-6 flex items-center gap-2 relative z-10">
              <AlertTriangle size={18} className="text-amber-400" />
              Mantenimiento
            </h3>

            <div className="space-y-6 relative z-10">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtro Carbón Activado</span>
                  <span className="text-xs font-bold text-amber-400">85% vida útil</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full w-[85%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ósmosis Inversa</span>
                  <span className="text-xs font-bold text-emerald-400">92% salud</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full w-[92%]" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center gap-4">
                <div className="p-2 bg-slate-800 rounded-lg">
                  <Calendar size={16} className="text-sky-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Próx. Lavado de Cisterna</p>
                  <p className="text-sm font-bold mt-1 text-white">24 Mayo, 2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
