import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  DollarSign, 
  AlertTriangle, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Package,
  Search,
  CheckCircle2,
  Truck,
  ArrowRightLeft
} from 'lucide-react';
import { MOCK_ORDERS } from '../constants';
import { Order } from '../types';

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [searchQuery, setSearchQuery] = useState('');

  const stats = [
    { label: 'Garrafones en Calle', value: '842', subValue: '/ 1200', color: 'text-slate-900' },
    { label: 'Venta del Día', value: '$14,580.00', subValue: '+12%', color: 'text-slate-900', trendColor: 'text-emerald-600' },
    { label: 'Alertas Mantenimiento', value: '2', subValue: 'Críticas', color: 'text-rose-600' },
  ];

  const handleStatusToggle = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId && order.status === 'pendiente' 
        ? { ...order, status: 'en_ruta' } 
        : order
    ));
  };

  const filteredOrders = orders.filter(order => 
    order.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.neighborhood.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard de Operación</h1>
          <p className="text-slate-500 mt-1 italic">Haciendo el agua más inteligente en CDMX</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Filtrar por cliente o colonia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"
          >
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              {stat.subValue && (
                <span className={`text-xs font-bold ${stat.trendColor || 'text-slate-400'}`}>
                  {stat.subValue}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table Area - Desktop Table / Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 px-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Truck size={18} className="text-sky-500" />
            Pedidos de la Jornada
          </h2>
          <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded font-black uppercase">
            {filteredOrders.length} Resultados
          </span>
        </div>
        
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Cliente / Colonia</th>
                <th className="px-6 py-4">Productos</th>
                <th className="px-6 py-4">Envases (E/R)</th>
                <th className="px-6 py-4">Estatus</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-sky-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800 leading-tight">{order.client}</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {order.address} ({order.neighborhood})
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {order.items.map((item, i) => (
                        <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          {item.quantity}x {item.name.split(' (')[0]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Ent.</span>
                        <span className="text-sm font-bold text-sky-600">{order.jugsDelivered}</span>
                      </div>
                      <ArrowRightLeft size={12} className="text-slate-300" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Rec.</span>
                        <span className="text-sm font-bold text-slate-600">{order.jugsReceived}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                      order.status === 'entregado' ? 'bg-emerald-100 text-emerald-700' :
                      order.status === 'en_ruta' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {order.status === 'entregado' ? <CheckCircle2 size={12} /> : <Truck size={12} />}
                      {order.status === 'en_ruta' ? 'En Ruta' : order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {order.status === 'pendiente' ? (
                      <button 
                        onClick={() => handleStatusToggle(order.id)}
                        className="text-[10px] font-black bg-sky-500 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-sky-600 active:scale-95 transition-all uppercase tracking-widest min-h-[32px]"
                      >
                        Despachar
                      </button>
                    ) : (
                      <span className="text-slate-300">
                        <ChevronRight size={18} />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Cards) */}
        <div className="md:hidden divide-y divide-slate-100 overflow-hidden">
          {filteredOrders.map((order) => (
            <div key={order.id} className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-black text-slate-800 text-lg leading-none">{order.client}</p>
                  <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-tight flex items-center gap-1">
                    <MapPin size={10} className="text-sky-500" /> {order.neighborhood}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                  order.status === 'entregado' ? 'bg-emerald-100 text-emerald-700' :
                  order.status === 'en_ruta' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {order.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {order.items.map((item, i) => (
                  <span key={i} className="text-[10px] bg-slate-50 text-slate-600 px-2 py-1 rounded-md font-bold border border-slate-100">
                    {item.quantity}x {item.name.split(' (')[0]}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Entregados</span>
                    <span className="text-lg font-black text-sky-600">{order.jugsDelivered}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Recibidos</span>
                    <span className="text-lg font-black text-slate-600">{order.jugsReceived}</span>
                  </div>
                </div>
                
                {order.status === 'pendiente' && (
                  <button 
                    onClick={() => handleStatusToggle(order.id)}
                    className="h-12 px-6 bg-sky-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-sky-500/20 active:scale-95 transition-all"
                  >
                    Despachar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
