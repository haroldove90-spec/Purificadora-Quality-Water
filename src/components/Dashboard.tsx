import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  ArrowRightLeft,
  Download,
  Loader2,
  UserPlus,
  Send,
  X
} from 'lucide-react';
import { exportToPDF } from '../utils/pdfExport';
import { supabase } from '../lib/supabaseClient';

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface Order {
  id: string;
  customer_name: string;
  address: string;
  items: string;
  total_price: number;
  status: string;
  assigned_to?: string;
  assigned_to_name?: string;
  created_at: string;
}

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
  };

  const fetchDrivers = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, name, role')
      .eq('role', 'driver')
      .eq('status', 'active');
    if (data) setDrivers(data);
  };

  useEffect(() => {
    fetchOrders();
    fetchDrivers();
    setLoading(false);

    const channel = supabase
      .channel('dashboard_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAssignOrder = async (driverId: string, driverName: string) => {
    if (!selectedOrder) return;
    setIsAssigning(true);
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'assigned',
          assigned_to: driverId,
          assigned_to_name: driverName
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      // Crear notificación para el repartidor
      await supabase.from('notifications_log').insert([{
        title: 'Nuevo Pedido Asignado',
        message: `Se te ha asignado el pedido de ${selectedOrder.customer_name}`,
        type: 'order_assigned',
        user_role: 'driver'
      }]);

      setSelectedOrder(null);
      fetchOrders();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const stats = [
    { label: 'Pedidos Hoy', value: orders.length.toString(), subValue: 'Total', color: 'text-slate-900' },
    { label: 'Pdtes de Asignar', value: orders.filter(o => o.status === 'pending').length.toString(), subValue: '! Acción Requerida', color: 'text-amber-600', trendColor: 'text-amber-600' },
    { label: 'En Ruta', value: orders.filter(o => o.status === 'assigned').length.toString(), subValue: 'Activos', color: 'text-sky-600' },
  ];

  const filteredOrders = orders.filter(order => 
    order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const simulateWhatsAppOrder = async () => {
    const { error } = await supabase.from('orders').insert([{
      customer_name: 'Simulado WA',
      address: 'Calle Falsa 123, Iztapalapa',
      items: '2x Garrafón 20L',
      total_price: 110.00,
      status: 'pending'
    }]);

    if (!error) {
       await supabase.from('notifications_log').insert([{
        title: 'Nuevo Pedido WhatsApp',
        message: 'Has recibido un nuevo pedido desde WhatsApp (+52 ...)',
        type: 'whatsapp_order',
        user_role: 'operator'
      }]);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase italic leading-none">Gestión de <span className="text-sky-500">Pedidos</span></h1>
          <p className="text-slate-500 mt-2 font-bold italic uppercase text-[10px] tracking-wider">Centro de despacho y asignación en tiempo real</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={simulateWhatsAppOrder}
            className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all active:scale-95 shrink-0"
          >
            <Send size={18} /> Simular WA
          </button>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por cliente o dirección..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all shadow-sm font-bold text-sm"
            />
          </div>
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
            className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm overflow-hidden relative group"
          >
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
              <span className={`text-[10px] font-black uppercase ${stat.trendColor || 'text-slate-500/50'}`}>
                {stat.subValue}
              </span>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-125 transition-transform">
              <Package size={80} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-black text-slate-800 uppercase italic flex items-center gap-3">
            <Truck size={20} className="text-sky-500" />
            Control de Despacho
          </h2>
          <span className="text-[10px] bg-slate-800 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest">
            {filteredOrders.length} Resultados
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 uppercase text-[9px] font-black tracking-[0.2em] border-b border-slate-50">
              <tr>
                <th className="px-8 py-5">Cliente / Detalle</th>
                <th className="px-8 py-5">Productos</th>
                <th className="px-8 py-5">Repartidor</th>
                <th className="px-8 py-5">Estatus</th>
                <th className="px-8 py-5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-sky-50/20 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-800 uppercase italic leading-none">{order.customer_name}</p>
                    <p className="text-[11px] text-slate-400 font-bold mt-2 flex items-center gap-1.5 leading-tight">
                      <MapPin size={12} className="text-rose-400" /> {order.address}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-bold text-slate-500 italic max-w-[200px] truncate">{order.items}</p>
                  </td>
                  <td className="px-8 py-6">
                    {order.assigned_to_name ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-sky-100 rounded-full flex items-center justify-center text-sky-600">
                          <Users size={14} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-tight text-slate-700">{order.assigned_to_name}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] inline-flex items-center gap-2 ${
                      order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                      order.status === 'assigned' ? 'bg-sky-100 text-sky-700' :
                      'bg-slate-100 text-slate-500 animate-pulse'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${order.status === 'delivered' ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                      {order.status === 'assigned' ? 'En Ruta' : order.status === 'delivered' ? 'Entregado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {order.status === 'pending' ? (
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="bg-sky-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-sky-200 hover:bg-sky-600 transition-all active:scale-95 flex items-center gap-2 ml-auto"
                      >
                        <UserPlus size={14} /> Asignar
                      </button>
                    ) : (
                      <button className="text-slate-300 hover:text-sky-500 p-2 transition-colors">
                        <ChevronRight size={20} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[48px] shadow-2xl z-[101] overflow-hidden"
            >
              <div className="p-10 pb-0 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase italic">Despachar <span className="text-sky-500">Pedido</span></h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Cliente: {selectedOrder.customer_name}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-rose-500">
                  <X />
                </button>
              </div>

              <div className="p-10 pt-8 space-y-6">
                <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Choferes Activos</span>
                    <span className="text-lg font-black text-slate-800">{drivers.length}</span>
                  </div>
                  <Truck size={32} className="text-sky-500 opacity-20" />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Seleccionar Repartidor</label>
                  <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {drivers.map(driver => (
                      <button
                        key={driver.id}
                        disabled={isAssigning}
                        onClick={() => handleAssignOrder(driver.id, driver.name)}
                        className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-sky-500 hover:shadow-lg hover:shadow-sky-500/10 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                            <Users size={18} />
                          </div>
                          <span className="font-bold text-slate-700 italic uppercase">{driver.name}</span>
                        </div>
                        <Send size={16} className="text-slate-300 group-hover:text-sky-500 transition-colors" />
                      </button>
                    ))}
                    {drivers.length === 0 && (
                      <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-3xl mt-4">
                         <Users size={32} className="mx-auto mb-3 opacity-20 text-slate-400" />
                         <p className="text-[10px] font-black uppercase tracking-widest">No hay choferes disponibles</p>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="w-full p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50 mt-4"
                >
                  Cancelar Operación
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
