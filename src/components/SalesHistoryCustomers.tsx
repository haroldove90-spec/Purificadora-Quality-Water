import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Calendar, 
  Download, 
  FileText, 
  X, 
  AlertCircle, 
  TrendingUp, 
  ShoppingBag, 
  User, 
  ChevronRight, 
  Filter, 
  RefreshCw,
  Sparkles,
  Loader2,
  DollarSign,
  Users,
  Truck,
  Store,
  MessageSquare,
  Phone,
  Award
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip
} from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { exportToPDF } from '../utils/pdfExport';
import { namesMatch } from '../utils/nameHelper';

interface Order {
  id: string;
  customer_name: string;
  address: string;
  items: string;
  total_price: number;
  status: string;
  source?: string;
  assigned_to_name?: string;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  tier?: string;
  created_at: string;
}

export default function SalesHistoryCustomers({ userRole }: { userRole: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection & filtering
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Default 30 days ago
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [metricsTab, setMetricsTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: custData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (custError) throw custError;
      setCustomers(custData || []);

      const { data: ordData, error: ordError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordError) throw ordError;
      setOrders(ordData || []);
    } catch (e: any) {
      console.error('Error fetching initial data for clients:', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to map DB source string to clear human label
  const getSourceLabel = (source?: string, assignedTo?: string) => {
    const src = (source || '').toLowerCase();
    if (src === 'whatsapp') return 'WhatsApp';
    if (src === 'phone') return 'Llamada';
    
    // Check if it was handled by a driver/delivery (Repartición)
    if (assignedTo && !namesMatch(assignedTo, 'Mostrador') && !namesMatch(assignedTo, 'Planta') && assignedTo.trim() !== '') {
      return 'Reparto/Ruta';
    }
    
    return 'Planta/Mostrador';
  };

  // Helper to render channel icon/badge
  const renderChannelBadge = (source?: string, assignedTo?: string) => {
    const label = getSourceLabel(source, assignedTo);
    if (label === 'WhatsApp') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
          <MessageSquare size={10} className="fill-current text-emerald-600" /> WhatsApp
        </span>
      );
    }
    if (label === 'Reparto/Ruta') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-50 text-sky-600 border border-sky-100">
          <Truck size={10} /> Reparto
        </span>
      );
    }
    if (label === 'Llamada') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-violet-50 text-violet-600 border border-violet-100">
          <Phone size={10} /> Llamada
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
        <Store size={10} /> Planta
      </span>
    );
  };

  // Extract unique customer list from BOTH customers table and orders table
  const getCombinedCustomerList = () => {
    const listMap = new Map<string, { name: string; phone?: string; address?: string; tier?: string; isRegistered: boolean }>();

    customers.forEach(c => {
      listMap.set(c.name.toLowerCase().trim(), {
        name: c.name,
        phone: c.phone || 'No registrado',
        address: c.address || 'No registrada',
        tier: c.tier || 'Frecuente',
        isRegistered: true
      });
    });

    orders.forEach(o => {
      let rawName = o.customer_name;
      if (rawName?.startsWith('🔄 [RECOGER] ')) {
        rawName = rawName.replace('🔄 [RECOGER] ', '');
      }
      if (!rawName) return;
      const cleanedKey = rawName.toLowerCase().trim();
      if (!listMap.has(cleanedKey)) {
        listMap.set(cleanedKey, {
          name: rawName,
          phone: 'No registrado',
          address: o.address || 'No registrada',
          tier: 'Nuevo',
          isRegistered: false
        });
      }
    });

    const combinedList = Array.from(listMap.values());

    if (!searchQuery) return combinedList;
    
    const query = searchQuery.toLowerCase().trim();
    return combinedList.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.phone?.toLowerCase().includes(query) ||
      item.address?.toLowerCase().includes(query)
    );
  };

  // Get orders specifically filtered
  const getFilteredOrders = () => {
    return orders.filter(o => {
      // Filter by customer if one is selected
      if (selectedCustomerName) {
        let orderName = o.customer_name || '';
        if (orderName.startsWith('🔄 [RECOGER] ')) {
          orderName = orderName.replace('🔄 [RECOGER] ', '');
        }
        if (!namesMatch(orderName, selectedCustomerName)) return false;
      } else {
        // Smart search query in global view
        if (searchQuery) {
          const query = searchQuery.toLowerCase().trim();
          const custName = (o.customer_name || '').toLowerCase();
          const id = (o.id || '').toLowerCase();
          const items = (o.items || '').toLowerCase();
          const addr = (o.address || '').toLowerCase();
          const driver = (o.assigned_to_name || '').toLowerCase();

          const matchesQuery = custName.includes(query) ||
                               id.includes(query) ||
                               items.includes(query) ||
                               addr.includes(query) ||
                               driver.includes(query);
          if (!matchesQuery) return false;
        }
      }

      // Filter by date range
      const orderDate = o.created_at?.split('T')[0];
      if (orderDate && (orderDate < startDate || orderDate > endDate)) return false;

      // Filter by status
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;

      // Filter by sales channel (Reparto, Planta, WhatsApp, Llamada)
      if (channelFilter !== 'all') {
        const actualChannel = getSourceLabel(o.source, o.assigned_to_name);
        if (channelFilter === 'reparto' && actualChannel !== 'Reparto/Ruta') return false;
        if (channelFilter === 'planta' && actualChannel !== 'Planta/Mostrador') return false;
        if (channelFilter === 'whatsapp' && actualChannel !== 'WhatsApp') return false;
        if (channelFilter === 'llamada' && actualChannel !== 'Llamada') return false;
      }

      return true;
    });
  };

  const selectedOrders = getFilteredOrders();

  // Selected customer or global analytics
  const calculateStats = () => {
    const totalPurchases = selectedOrders.length;
    const totalAmount = selectedOrders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
    const avgTicket = totalPurchases > 0 ? totalAmount / totalPurchases : 0;
    
    // Calculate favorite item
    const itemCounts: { [key: string]: number } = {};
    selectedOrders.forEach(o => {
      const itemsList = (o.items || '').split(',').map(i => i.trim());
      itemsList.forEach(item => {
        if (!item || item.includes('[RECOGER') || item.includes('[SALDO')) return;
        itemCounts[item] = (itemCounts[item] || 0) + 1;
      });
    });

    let favoriteItem = 'Ninguno';
    let maxCount = 0;
    Object.entries(itemCounts).forEach(([item, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteItem = item;
      }
    });

    // Favorite Channel
    const channelCounts: { [key: string]: number } = {};
    selectedOrders.forEach(o => {
      const label = getSourceLabel(o.source, o.assigned_to_name);
      channelCounts[label] = (channelCounts[label] || 0) + 1;
    });
    let favoriteChannel = 'Ninguno';
    let maxChannelCount = 0;
    Object.entries(channelCounts).forEach(([ch, count]) => {
      if (count > maxChannelCount) {
        maxChannelCount = count;
        favoriteChannel = ch;
      }
    });

    const lastPurchase = selectedOrders.length > 0 
      ? new Date(selectedOrders[0].created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'N/A';

    return { totalPurchases, totalAmount, avgTicket, favoriteItem, favoriteChannel, lastPurchase };
  };

  const stats = calculateStats();

  // Grouped temporal data for chart
  const getTemporalData = () => {
    const groups: { [key: string]: number } = {};
    selectedOrders.forEach(o => {
      const day = o.created_at?.split('T')[0];
      if (day) {
        groups[day] = (groups[day] || 0) + (Number(o.total_price) || 0);
      }
    });
    return Object.entries(groups)
      .map(([date, total]) => ({ name: date, total }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(-15); // Show last 15 days of active logs
  };

  const temporalChartData = getTemporalData();

  // EXPORT TO PDF
  const handleExportPDF = () => {
    const titleText = selectedCustomerName 
      ? `Historial de Consumo de Cliente: ${selectedCustomerName.toUpperCase()}`
      : `Historial Global de Ventas por Clientes`;
    const subtitleText = selectedCustomerName
      ? `Periodo: ${startDate} al ${endDate} | Total Consumido: $${stats.totalAmount.toFixed(2)} pesos`
      : `Periodo: ${startDate} al ${endDate} | Facturación Total: $${stats.totalAmount.toFixed(2)} pesos`;

    const columns = ['Fecha/Hora', 'Cliente', 'Folio', 'Artículos', 'Atendió', 'Canal/Origen', 'Estado', 'Total'];
    const data = selectedOrders.map(o => [
      new Date(o.created_at).toLocaleString('es-MX'),
      o.customer_name,
      o.id.slice(0, 8).toUpperCase(),
      o.items,
      o.assigned_to_name || 'Mostrador / Planta',
      getSourceLabel(o.source, o.assigned_to_name),
      o.status === 'delivered' ? 'Entregado' : o.status === 'assigned' ? 'En Ruta' : o.status === 'pending' ? 'Pendiente' : o.status,
      `$${Number(o.total_price).toFixed(2)}`
    ]);

    exportToPDF({
      title: titleText,
      subtitle: subtitleText,
      columns,
      data,
      filename: selectedCustomerName 
        ? `Historial_Cliente_${selectedCustomerName.replace(/\s+/g, '_')}`
        : `Ventas_Clientes_${startDate}_a_${endDate}`
    });
  };

  // EXPORT TO EXCEL (CSV with UTF-8 BOM)
  const handleExportExcel = () => {
    const headers = ['Fecha/Hora', 'Cliente', 'Folio Pedido', 'Articulos', 'Atendio/Entrego', 'Canal de Venta', 'Estado', 'Monto Total'];
    const rows = selectedOrders.map(o => [
      new Date(o.created_at).toLocaleString('es-MX'),
      o.customer_name,
      o.id.toUpperCase(),
      o.items.replace(/"/g, '""'), // escape quotes
      o.assigned_to_name || 'Mostrador / Planta',
      getSourceLabel(o.source, o.assigned_to_name),
      o.status === 'delivered' ? 'Completado' : o.status === 'assigned' ? 'En Ruta' : o.status === 'pending' ? 'Pendiente' : o.status,
      Number(o.total_price).toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const filename = selectedCustomerName
      ? `Historial_Cliente_${selectedCustomerName.replace(/\s+/g, '_')}_${startDate}_al_${endDate}.csv`
      : `Ventas_Clientes_${startDate}_al_${endDate}.csv`;
      
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeCustomerList = getCombinedCustomerList();

  return (
    <div className="space-y-6" id="sales_history_customers_module">
      
      {/* Module Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden border border-indigo-500/10">
        <div className="absolute right-0 top-0 w-[400px] h-[400px] bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 border border-indigo-400/20">
              <Sparkles size={12} className="text-indigo-400" /> AUDITORÍA CLIENTES
            </span>
            <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight leading-none">
              Historial de <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Ventas por Clientes</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-xl font-medium leading-relaxed">
              Consulte el expediente detallado de consumo por cliente. Filtre por canales operativos (reparto, mostrador, WhatsApp) y exporte a formatos profesionales para conciliación.
            </p>
          </div>
          <button 
            onClick={fetchInitialData}
            className="self-start md:self-center bg-slate-800/80 border border-slate-700/50 text-slate-300 hover:text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 hover:bg-slate-800 flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Sincronizar
          </button>
        </div>
      </div>

      {/* Main Multi-panel view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Directory Sidebar */}
        <div className="lg:col-span-4 bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm flex flex-col h-[750px]">
          
          {/* Main selection toggle for Vista General */}
          <button
            onClick={() => {
              setSelectedCustomerName(null);
              setSearchQuery('');
            }}
            className={`w-full mb-5 text-left p-4 rounded-2xl border transition-all duration-250 flex items-center gap-3.5 cursor-pointer ${
              selectedCustomerName === null 
                ? 'bg-gradient-to-br from-indigo-900 to-slate-900 border-indigo-950 text-white shadow-lg shadow-indigo-900/10' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-700'
            }`}
          >
            <div className={`p-2.5 rounded-xl ${selectedCustomerName === null ? 'bg-indigo-500/20 text-sky-400' : 'bg-slate-200/80 text-slate-500'}`}>
              <Users size={18} />
            </div>
            <div className="space-y-0.5">
              <p className="font-black text-xs uppercase tracking-wider">🌎 Ver Historial Global</p>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${selectedCustomerName === null ? 'text-sky-300' : 'text-slate-400'}`}>
                Todas las ventas registradas
              </p>
            </div>
          </button>

          <div className="space-y-4 mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Search size={14} className="text-slate-400" /> Directorio de Clientes
            </h3>
            <div className="relative">
              <input 
                type="text"
                placeholder={selectedCustomerName === null ? "Buscar en todo el historial..." : "Buscar por nombre, tel o dir..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 placeholder-slate-400"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Customer list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                <Loader2 className="animate-spin" size={16} />
                <span>Cargando directorio...</span>
              </div>
            ) : activeCustomerList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12 text-center space-y-2">
                <AlertCircle size={24} className="text-slate-300" />
                <p className="font-black text-xs uppercase tracking-wider">Sin Coincidencias</p>
                <p className="text-[11px] text-slate-400 font-medium px-4">No se encontraron clientes.</p>
              </div>
            ) : (
              activeCustomerList.map((cust) => {
                const isSelected = selectedCustomerName === cust.name;
                return (
                  <button
                    key={cust.name}
                    onClick={() => {
                      setSelectedCustomerName(cust.name);
                      setSearchQuery(''); // Reset sidebar search on click
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-250 flex items-center justify-between group cursor-pointer ${
                      isSelected 
                        ? 'bg-gradient-to-r from-indigo-50 to-sky-50/50 border-indigo-200 shadow-md shadow-indigo-100/30' 
                        : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="space-y-1 flex-1 min-w-0 pr-2">
                      <p className={`font-black text-[13px] uppercase truncate ${isSelected ? 'text-indigo-900' : 'text-slate-700 group-hover:text-slate-900'}`}>
                        {cust.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 truncate">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${cust.isRegistered ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                          {cust.isRegistered ? 'Directorio' : 'Temporal'}
                        </span>
                        <span>•</span>
                        <span>{cust.phone || 'Sin teléfono'}</span>
                      </p>
                    </div>
                    <ChevronRight size={16} className={`transition-transform duration-200 ${isSelected ? 'text-indigo-500 translate-x-1' : 'text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5'}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Selected Customer History OR Global View */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main Action Header & Export Options */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-2.5 py-1 rounded-full tracking-widest border border-indigo-100">
                  {selectedCustomerName ? 'EXPEDIENTE INDIVIDUAL DE CLIENTE' : 'EXPEDIENTE GLOBAL DE VENTAS'}
                </span>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase italic">
                  {selectedCustomerName ? selectedCustomerName : 'Ventas Globales Clientes'}
                </h2>
                {selectedCustomerName && (
                  <p className="text-[10px] text-slate-400 font-black uppercase">
                    Dirección habitual: <span className="text-slate-600 normal-case font-bold">{
                      activeCustomerList.find(c => c.name === selectedCustomerName)?.address || 'No especificada'
                    }</span>
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportPDF}
                  disabled={selectedOrders.length === 0}
                  className="bg-slate-900 hover:bg-slate-850 text-white font-black text-[10px] uppercase tracking-widest px-4 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  <FileText size={14} /> Exportar PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={selectedOrders.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-4 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Download size={14} /> Exportar Excel
                </button>
              </div>
            </div>

            {/* Smart Filters Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Fecha Inicio</label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white p-3 border-none rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Fecha Fin</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white p-3 border-none rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Canal/Origen</label>
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="w-full bg-white p-3 border-none rounded-xl font-bold text-[10px] focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600 appearance-none uppercase"
                >
                  <option value="all">TODOS LOS CANALES</option>
                  <option value="reparto">🚚 REPARTO / RUTA</option>
                  <option value="planta">🏪 PLANTA / MOSTRADOR</option>
                  <option value="whatsapp">💬 WHATSAPP</option>
                  <option value="llamada">📞 PEDIDO TELEFÓNICO</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Estado de Pedido</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-white p-3 border-none rounded-xl font-bold text-[10px] focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600 appearance-none uppercase"
                >
                  <option value="all">TODOS LOS ESTADOS</option>
                  <option value="delivered">COMPLETADOS (ENTREGADO)</option>
                  <option value="assigned">EN RUTA</option>
                  <option value="pending">PENDIENTES</option>
                  <option value="cancelled">CANCELADOS</option>
                </select>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Monto Facturado</span>
                <span className="text-lg font-black text-indigo-900 font-sans block mt-1.5">${stats.totalAmount.toFixed(2)}</span>
                <span className="text-[8px] font-bold text-indigo-500 uppercase mt-0.5 block">Moneda: MXN</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Ventas Totales</span>
                <span className="text-lg font-black text-slate-800 font-sans block mt-1.5">{stats.totalPurchases}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 block">Entregas & Servicios</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Ticket Promedio</span>
                <span className="text-lg font-black text-slate-800 font-sans block mt-1.5">${stats.avgTicket.toFixed(2)}</span>
                <span className="text-[8px] font-bold text-emerald-600 uppercase mt-0.5 block">Por pedido</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Canal Favorito</span>
                <span className="text-xs font-black text-slate-700 uppercase block mt-2 truncate">{stats.favoriteChannel}</span>
                <span className="text-[8px] font-bold text-indigo-500 uppercase mt-0.5 block">Mayor recurrencia</span>
              </div>
            </div>

            {/* Favorite product info */}
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-700">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-wider">Producto de Mayor Consumo</h4>
                  <p className="text-xs font-bold text-indigo-700 uppercase mt-0.5">{stats.favoriteItem}</p>
                </div>
              </div>
              <div className="text-left md:text-right">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Último Pedido Registrado</span>
                <span className="text-xs font-bold text-slate-700 font-sans block mt-0.5">{stats.lastPurchase}</span>
              </div>
            </div>
          </div>

          {/* Graphics over time card */}
          {temporalChartData.length > 0 && (
            <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-indigo-500" /> Tendencia Temporal de Ventas ($)
              </h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={temporalChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotalClient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '10px', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotalClient)" name="Total ($)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Detailed Orders Table List */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex-1 min-h-[300px]">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Listado Completo de Pedidos ({selectedOrders.length})</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Haga uso de los filtros rápidos superiores para segmentar y auditar la información</p>
            </div>
            
            {selectedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 italic text-center space-y-2">
                <AlertCircle size={24} className="text-slate-300" />
                <p className="text-xs font-black uppercase tracking-wider">No se registran ventas</p>
                <p className="text-[10px] text-slate-400 font-bold px-6">No existen pedidos para este cliente o bajo el rango de filtros configurado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[450px] overflow-y-auto pr-1">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4">Fecha/Hora</th>
                      <th className="px-6 py-4">Folio</th>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Atendió/Entregó</th>
                      <th className="px-6 py-4 text-center">Canal/Origen</th>
                      <th className="px-6 py-4 text-center">Estatus</th>
                      <th className="px-6 py-4">Detalle / Artículos</th>
                      <th className="px-6 py-4 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-semibold uppercase">
                    {selectedOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-[10px] font-mono text-slate-400 lowercase leading-tight">
                          {new Date(o.created_at).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-[10px] font-mono text-indigo-500 font-bold">
                          #{o.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 text-slate-800 font-black truncate max-w-[120px]">
                          {o.customer_name}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-500">
                          {o.assigned_to_name || 'Mostrador / Planta'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {renderChannelBadge(o.source, o.assigned_to_name)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider border ${
                            o.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            o.status === 'assigned' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                            o.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {o.status === 'delivered' ? 'Entregado' : o.status === 'assigned' ? 'En Ruta' : o.status === 'pending' ? 'Pendiente' : o.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-[160px] truncate normal-case font-medium text-slate-500">
                          {o.items}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-800 font-sans">
                          ${Number(o.total_price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
