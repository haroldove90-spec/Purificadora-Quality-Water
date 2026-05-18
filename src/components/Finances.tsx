import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabaseClient';
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
  PieChart as PieChartIcon,
  Users,
  ShoppingBag,
  History,
  Store,
  ChevronRight,
  MoreVertical,
  Plus,
  ShieldCheck,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Loader2
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
  Cell
} from 'recharts';

const SALES_DATA = [
  { day: 'Lun', sales: 4500, orders: 42 },
  { day: 'Mar', sales: 5200, orders: 48 },
  { day: 'Mie', sales: 4800, orders: 45 },
  { day: 'Jue', sales: 6100, orders: 55 },
  { day: 'Vie', sales: 5900, orders: 53 },
  { day: 'Sab', sales: 7200, orders: 65 },
  { day: 'Dom', sales: 4000, orders: 38 },
];

const CHANNEL_DATA = [
  { name: 'WhatsApp', value: 45, color: '#0ea5e9' },
  { name: 'Ruta 1 (Norte)', value: 25, color: '#6366f1' },
  { name: 'Ruta 2 (Sur)', value: 20, color: '#8b5cf6' },
  { name: 'Mostrador', value: 10, color: '#f43f5e' },
];

const GLOBAL_SALES = [
  { id: 'T-9821', customer: 'Abarrotes Doña Mari', amount: 450, method: 'Efectivo', time: '14:20', items: '10 Garrafones' },
  { id: 'T-9822', customer: 'Residencial Latitud', amount: 1250, method: 'Transferencia', time: '14:45', items: '25 Garrafones' },
  { id: 'T-9823', customer: 'Gimnasio Sport City', amount: 360, method: 'Efectivo', time: '15:10', items: '8 Garrafones' },
  { id: 'T-9824', customer: 'Venta Mostrador', amount: 90, method: 'Efectivo', time: '15:30', items: '2 Garrafones' },
  { id: 'T-9825', customer: 'Oficinas BBVA', amount: 2400, method: 'Transferencia', time: '16:00', items: '50 Garrafones' },
];

const SELLER_PERFORMANCE = [
  { name: 'Carlos Ruiz', sales: 8420, orders: 24, efficiency: '98%', status: 'active' },
  { name: 'Mario Santos', sales: 7150, orders: 19, efficiency: '94%', status: 'active' },
  { name: 'Ana Lopez', sales: 4200, orders: 12, efficiency: '100%', status: 'on_break' },
];

const CLIENT_MANAGEMENT = [
  { id: 'C1', name: 'Residencial Latitud', neighborhood: 'Santa Fe', tier: 'VIP', totalOrders: 145, lastActivity: 'Hoy' },
  { id: 'C2', name: 'Abarrotes Doña Mari', neighborhood: 'Polanco', tier: 'Frecuente', totalOrders: 82, lastActivity: 'Ayer' },
  { id: 'C3', name: 'Gimnasio Sport City', neighborhood: 'Roma Norte', tier: 'Frecuente', totalOrders: 45, lastActivity: 'Hace 3 días' },
  { id: 'C4', name: 'Oficinas BBVA', neighborhood: 'Juarez', tier: 'VIP', totalOrders: 12, lastActivity: 'Hoy' },
];

type Tab = 'metrics' | 'sales' | 'customers' | 'driver_sales' | 'plant_cut';

interface FinancesProps {
  initialTab?: Tab;
}

export default function Finances({ initialTab = 'metrics' }: FinancesProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [isExporting, setIsExporting] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isFinalizingCut, setIsFinalizingCut] = useState(false);
  const [customersList, setCustomersList] = useState<any[]>([]);

  useEffect(() => {
    setActiveTab(initialTab);
    if (activeTab === 'customers') {
      fetchCustomers();
    }
  }, [initialTab, activeTab]);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setCustomersList(data);
    }
  };

  const handleExport = (type: string) => {
    setIsExporting(true);
    // Simulating PDF generation
    setTimeout(() => {
      setIsExporting(false);
    }, 2000);
  };

  const handleNewCustomerSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingCustomer(true);
    
    const formData = new FormData(e.currentTarget);
    const newCustomer = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      tier: (formData.get('tier') as string)?.toLowerCase() || 'frequent',
      geolocation_url: formData.get('geolocation_url') as string,
    };

    try {
      const { error } = await supabase
        .from('customers')
        .insert([newCustomer]);

      if (error) throw error;
      
      await fetchCustomers();
      setShowNewCustomerModal(false);
    } catch (error: any) {
      console.error('Error saving customer:', error.message);
      alert('Error al guardar cliente: ' + error.message);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleFinalizeCut = () => {
    setIsFinalizingCut(true);
    setTimeout(() => {
      setIsFinalizingCut(false);
    }, 2000);
  };

  const liquidations = [
    { driver: 'Carlos Ruiz', route: 'Ruta 1', out: 120, delivered: 115, inTruck: 5, expectedCash: 5175, actualCash: 5175, status: 'ok', orders: 18 },
    { driver: 'Mario Santos', route: 'Ruta 2', out: 95, delivered: 88, inTruck: 4, expectedCash: 3960, actualCash: 3915, status: 'faltante', orders: 15 },
    { driver: 'Ana Lopez', route: 'Ruta 3', out: 50, delivered: 50, inTruck: 0, expectedCash: 2250, actualCash: 2250, status: 'ok', orders: 10 },
  ];

  return (
    <div className="space-y-6 pb-24 lg:pb-12">
      {/* Header with Title and Global Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none italic uppercase">
            Quality <span className="text-sky-500">Admin</span>
          </h1>
          <p className="text-slate-500 mt-2 font-bold flex items-center gap-2 text-sm italic">
            <ShieldCheck size={16} className="text-sky-500" />
            Control de Misión &bull; 13 de Mayo, 2026
          </p>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <button 
            onClick={() => handleExport('Ventas Mensuales')}
            disabled={isExporting}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] shadow-xl hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-widest shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            PDF Mensual
          </button>
        </div>
      </div>

      {/* Tabs handled by sidebar navigation */}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Volumen Total', value: '1,240', sub: 'Galones', icon: ShoppingBag, color: 'text-sky-600', trend: '+15%', trendUp: true },
                  { label: 'Ventas Hoy', value: '$14,580', sub: 'Calculado', icon: DollarSign, color: 'text-emerald-600', trend: '+8%', trendUp: true },
                  { label: 'Ticket Prom.', value: '$240', sub: 'MXN', icon: TrendingUp, color: 'text-indigo-600', trend: '-2%', trendUp: false },
                  { label: 'Nuevos', value: '12', sub: 'Registros', icon: Users, color: 'text-amber-600', trend: '+4', trendUp: true },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                        <stat.icon size={16} className={stat.color} />
                      </div>
                      <span className={`text-[10px] font-black flex items-center gap-0.5 ${stat.trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {stat.trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {stat.trend}
                      </span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 leading-none">{stat.value}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                  <h3 className="font-black text-slate-800 mb-6 uppercase text-[10px] tracking-widest">Rendimiento Histórico (Ventas x Día)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={SALES_DATA}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="sales" fill="#0ea5e9" radius={[6, 6, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col items-center">
                  <h3 className="font-black text-slate-800 mb-6 uppercase text-[10px] tracking-widest w-full">Canales de Pedido</h3>
                  <div className="h-48 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={CHANNEL_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={75} dataKey="value" paddingAngle={4}>
                          {CHANNEL_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 w-full">
                    {CHANNEL_DATA.map((item, idx) => (
                      <div key={idx} className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-[10px] font-black uppercase text-slate-400">{item.name}</span>
                        </div>
                        <span className="text-sm font-black text-slate-800">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="space-y-6">
              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Registro de Ventas Globales</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Buscar folio o cliente..." 
                      className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Ref / Hora</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Items</th>
                        <th className="px-6 py-4">Método</th>
                        <th className="px-6 py-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {GLOBAL_SALES.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <p className="font-black text-sky-500 text-xs">{sale.id}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{sale.time}</p>
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-slate-800">{sale.customer}</td>
                          <td className="px-6 py-4 text-[10px] text-slate-500 font-bold uppercase">{sale.items}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase">{sale.method}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <p className="font-black text-slate-900">${sale.amount}.00</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Base de Datos de Clientes</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleExport('Cartera de Clientes')}
                    className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    <Download size={14} /> Exportar
                  </button>
                  <button 
                    onClick={() => setShowNewCustomerModal(true)}
                    className="flex items-center gap-2 bg-sky-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-sky-500/20 active:scale-95 transition-all shrink-0"
                  >
                    <Plus size={16} /> Alta de Cliente
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Nombre / Zona</th>
                      <th className="px-6 py-4">Suscripción</th>
                      <th className="px-6 py-4">Acumulado</th>
                      <th className="px-6 py-4">Ultimo Pedido</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {customersList.length > 0 ? customersList.map((client) => (
                      <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-black text-slate-800 text-sm">{client.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{client.address || 'Sin zona'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                            client.tier?.toUpperCase() === 'VIP' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                          }`}>
                            {client.tier || 'Frecuente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-black text-slate-800">0 Entregas</td>
                        <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase italic">Hoy</td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-slate-300 hover:text-sky-500 transition-colors">
                            <MoreVertical size={18} />
                          </button>
                        </td>
                      </tr>
                    )) : CLIENT_MANAGEMENT.map((client) => (
                      <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-black text-slate-800 text-sm">{client.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{client.neighborhood}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                            client.tier === 'VIP' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                          }`}>
                            {client.tier}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-black text-slate-800">{client.totalOrders} Entregas</td>
                        <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase italic">{client.lastActivity}</td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-slate-300 hover:text-sky-500 transition-colors">
                            <MoreVertical size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'driver_sales' && (
            <div className="space-y-6">
              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Ventas por Repartidor</h3>
                  <button 
                    onClick={() => handleExport('Ventas por Repartidor')}
                    className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    <Download size={14} /> Reporte PDF
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Repartidor / Ruta</th>
                        <th className="px-6 py-4">Entregas</th>
                        <th className="px-6 py-4">Efectivo Cobrado</th>
                        <th className="px-6 py-4 text-right">Emeticiencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {liquidations.map((liqi, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <p className="font-black text-slate-800 text-sm">{liqi.driver}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{liqi.route}</p>
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-slate-800">{liqi.delivered} Unidades ({liqi.orders} pedidos)</td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-black text-slate-900">${liqi.actualCash}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase italic">Esperado: ${liqi.expectedCash}</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                                liqi.status === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                              }`}>
                                {liqi.status === 'ok' ? 'Óptimo' : 'Faltante'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'plant_cut' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-8">
                  <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest flex items-center gap-2">
                    <Store size={18} className="text-sky-500" />
                    Corte de Caja en Planta
                  </h3>
                  <button 
                    onClick={() => handleExport('Corte de Caja')}
                    className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-sky-500 transition-colors"
                  >
                    <Download size={18} />
                  </button>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Mostrador Hoy</p>
                      <p className="text-3xl font-black text-slate-800">$1,850.00</p>
                    </div>
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                      <ShoppingBag size={24} className="text-sky-500" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>Llenado de Garrafón</span>
                      <span className="text-slate-800">42 Und.</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>Envase Nuevo 20L</span>
                      <span className="text-slate-800">5 Und.</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-100 pt-4">
                      <span>Efectivo en Caja Planta</span>
                      <span className="text-emerald-500 font-black">$1,850.00</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleFinalizeCut}
                    disabled={isFinalizingCut}
                    className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-slate-800 transition-all active:scale-95 mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFinalizingCut ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Conciliando...
                      </>
                    ) : (
                      'Finalizar Corte y Conciliar'
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-sky-600 to-indigo-700 p-8 rounded-[40px] text-white shadow-xl shadow-sky-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-10">
                    <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
                      <AlertCircle size={32} />
                    </div>
                    <span className="bg-white/20 text-white px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest">Insights IA</span>
                  </div>
                  <h4 className="text-2xl font-black leading-tight mb-4">La Ruta 1 está reportando mayor eficiencia que la Ruta 2.</h4>
                  <p className="text-sky-100/70 text-sm font-bold leading-relaxed italic">
                    "Detectamos que el tiempo promedio de entrega en Carlos Ruiz es 12% menor. Considera optimizar la asignación de clientes VIP en esa zona."
                  </p>
                </div>
                
                <div className="flex items-center gap-4 mt-8 bg-white/10 p-5 rounded-3xl backdrop-blur-sm">
                  <TrendingUp size={24} className="text-emerald-400" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">Mejora Estimada</p>
                    <p className="text-lg font-black leading-none">+$3,150.00 / Mensual</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {showNewCustomerModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingCustomer && setShowNewCustomerModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase italic">Alta de <span className="text-sky-500">Cliente</span></h3>
                <button 
                  onClick={() => setShowNewCustomerModal(false)}
                  disabled={isSavingCustomer}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-0"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleNewCustomerSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                  <input name="name" required type="text" placeholder="Ej. Residencial Palmas" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Colonia / Zona</label>
                  <input name="address" required type="text" placeholder="Ej. Santa Fe" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                    <input name="phone" required type="tel" placeholder="55 1234 5678" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nivel</label>
                    <select name="tier" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold appearance-none">
                      <option value="frequent">Frecuente</option>
                      <option value="vip">VIP</option>
                      <option value="company">Empresa</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Link de Ubicación (Google Maps / Waze)</label>
                  <input 
                    name="geolocation_url"
                    type="url" 
                    placeholder="https://maps.google.com/..." 
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" 
                  />
                </div>

                <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 mt-2">
                  <p className="text-[9px] text-sky-600 font-bold uppercase tracking-tight leading-relaxed italic">
                    Al guardar este cliente, se le asignará automáticamente un folio de seguimiento y se activará su historial de pedidos.
                  </p>
                </div>

                <button 
                  type="submit"
                  disabled={isSavingCustomer}
                  className="w-full bg-sky-500 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-sky-500/20 hover:bg-sky-600 transition-all active:scale-95 mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingCustomer ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    'Guardar Cliente'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
