import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  DollarSign, 
  AlertTriangle, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Package 
} from 'lucide-react';
import { MOCK_ORDERS } from '../constants';

export default function Dashboard() {
  const stats = [
    { label: 'Garrafones en Calle', value: '842', subValue: '/ 1200', color: 'text-slate-900' },
    { label: 'Venta del Día', value: '$14,580.00', subValue: '+12%', color: 'text-slate-900', trendColor: 'text-emerald-600' },
    { label: 'Alertas Mantenimiento', value: '2', subValue: 'Críticas', color: 'text-rose-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard de Operación</h1>
        <p className="text-slate-500 mt-1">Resumen en tiempo real de tu distribución en CDMX</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-5 rounded-xl border border-slate-200"
          >
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              {stat.subValue && (
                <span className={`text-xs font-medium ${stat.trendColor || 'text-slate-400'}`}>
                  {stat.subValue}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-800">Pedidos Activos</h2>
          <button className="text-sky-600 font-bold text-xs hover:underline uppercase tracking-wider">
            Ver mapa
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#f8fafc] text-[#64748b] uppercase text-[11px] font-bold tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Dirección</th>
                <th className="px-6 py-3">Cant</th>
                <th className="px-6 py-3">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic font-medium">
              {MOCK_ORDERS.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors text-[13px]">
                  <td className="px-6 py-3 text-slate-800">{order.client}</td>
                  <td className="px-6 py-3 text-slate-500">{order.address}</td>
                  <td className="px-6 py-3 text-slate-800">{order.quantity}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      order.status === 'entregado' ? 'bg-[#f0fdf4] text-[#15803d]' :
                      order.status === 'en_camino' ? 'bg-[#fff7ed] text-[#c2410c]' :
                      'bg-[#f1f5f9] text-[#475569]'
                    }`}>
                      {order.status === 'en_camino' ? 'En Ruta' : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
