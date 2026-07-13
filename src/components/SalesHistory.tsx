import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Calendar, 
  Trash2, 
  Download, 
  FileText, 
  CheckCircle, 
  Clock, 
  Truck, 
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
  Award,
  CalendarDays,
  CalendarRange,
  Users
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell,
  Legend
} from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { exportToPDF } from '../utils/pdfExport';
import { namesMatch, normalizeEmployeeName } from '../utils/nameHelper';

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

export default function SalesHistory({ userRole }: { userRole: string }) {
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
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [metricsTab, setMetricsTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Modals / Actions
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch both customers and orders to have unique list of clients
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
      console.error('Error fetching initial data:', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to map DB source string to clear human label
  const getSourceLabel = (source?: string) => {
    if (!source) return 'Venta Local';
    switch (source.toLowerCase()) {
      case 'pos': return 'Punto de Venta (Ruta/Planta)';
      case 'local': return 'Venta Mostrador';
      case 'whatsapp': return 'WhatsApp';
      case 'phone': return 'Pedido Telefónico';
      default: return source;
    }
  };

  // Extract unique customer list from BOTH customers table and orders table (to ensure we cover un-registered but ordered customers)
  const getCombinedCustomerList = () => {
    const listMap = new Map<string, { name: string; phone?: string; address?: string; tier?: string; isRegistered: boolean }>();

    // 1. Add from registered customers
    customers.forEach(c => {
      listMap.set(c.name.toLowerCase().trim(), {
        name: c.name,
        phone: c.phone || 'No registrado',
        address: c.address || 'No registrada',
        tier: c.tier || 'Frecuente',
        isRegistered: true
      });
    });

    // 2. Add from orders (if they ordered and are not in registered customers)
    orders.forEach(o => {
      // Clean status prefix 🔄 [RECOGER] if present
      let rawName = o.customer_name;
      if (rawName.startsWith('🔄 [RECOGER] ')) {
        rawName = rawName.replace('🔄 [RECOGER] ', '');
      }
      const cleanedKey = rawName.toLowerCase().trim();
      if (!listMap.has(cleanedKey) && rawName) {
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

    // Apply sidebar search query filter (only active when searching sidebar)
    if (!searchQuery) return combinedList;
    
    const query = searchQuery.toLowerCase().trim();
    return combinedList.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.phone?.toLowerCase().includes(query) ||
      item.address?.toLowerCase().includes(query)
    );
  };

  // Get orders specifically for selected customer
  const getFilteredCustomerOrders = () => {
    if (!selectedCustomerName) return [];

    return orders.filter(o => {
      // Strip pickup indicator for name match
      let orderName = o.customer_name;
      if (orderName.startsWith('🔄 [RECOGER] ')) {
        orderName = orderName.replace('🔄 [RECOGER] ', '');
      }

      const matchName = namesMatch(orderName, selectedCustomerName);
      if (!matchName) return false;

      // Filter by date range
      const orderDate = o.created_at.split('T')[0];
      if (orderDate < startDate || orderDate > endDate) return false;

      // Filter by status
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;

      // Filter by source
      if (sourceFilter !== 'all') {
        if (sourceFilter === 'local') {
          if (o.source !== 'local' && o.source !== 'pos') return false;
        } else {
          if (o.source !== sourceFilter) return false;
        }
      }

      return true;
    });
  };

  // Get ALL orders filtered globally (Auditor's Smart Search View)
  const getFilteredGlobalOrders = () => {
    return orders.filter(o => {
      // Filter by date range
      const orderDate = o.created_at.split('T')[0];
      if (orderDate < startDate || orderDate > endDate) return false;

      // Filter by status
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;

      // Filter by source
      if (sourceFilter !== 'all') {
        if (sourceFilter === 'local') {
          if (o.source !== 'local' && o.source !== 'pos') return false;
        } else {
          if (o.source !== sourceFilter) return false;
        }
      }

      // Smart Search filter across Customer, ID, Items, Address, and Driver Name
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const custName = o.customer_name?.toLowerCase() || '';
        const id = o.id?.toLowerCase() || '';
        const items = o.items?.toLowerCase() || '';
        const addr = o.address?.toLowerCase() || '';
        const driver = o.assigned_to_name?.toLowerCase() || '';

        return (
          custName.includes(query) ||
          id.includes(query) ||
          items.includes(query) ||
          addr.includes(query) ||
          driver.includes(query)
        );
      }

      return true;
    });
  };

  const selectedOrders = selectedCustomerName ? getFilteredCustomerOrders() : getFilteredGlobalOrders();

  // Selected customer analytics
  const calculateCustomerStats = () => {
    const totalPurchases = selectedOrders.length;
    const totalAmount = selectedOrders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
    const avgTicket = totalPurchases > 0 ? totalAmount / totalPurchases : 0;
    
    // Calculate favorite item
    const itemCounts: { [key: string]: number } = {};
    selectedOrders.forEach(o => {
      const items = o.items.split(',').map(i => i.trim());
      items.forEach(item => {
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

    const lastPurchase = selectedOrders.length > 0 
      ? new Date(selectedOrders[0].created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'N/A';

    return { totalPurchases, totalAmount, avgTicket, favoriteItem, lastPurchase };
  };

  // Grouped temporal data for the selected client chart
  const getTemporalData = () => {
    if (metricsTab === 'daily') {
      const groups: { [key: string]: number } = {};
      selectedOrders.forEach(o => {
        const day = o.created_at.split('T')[0];
        groups[day] = (groups[day] || 0) + (Number(o.total_price) || 0);
      });
      return Object.entries(groups)
        .map(([date, total]) => ({ name: date, total }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(-15); // Show last 15 days of active logs
    } else if (metricsTab === 'weekly') {
      const groups: { [key: string]: number } = {};
      selectedOrders.forEach(o => {
        const d = new Date(o.created_at);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff)).toISOString().split('T')[0];
        groups[monday] = (groups[monday] || 0) + (Number(o.total_price) || 0);
      });
      return Object.entries(groups)
        .map(([week, total]) => ({ name: `Sem ${week.slice(5)}`, total }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(-8); // Show last 8 active weeks
    } else {
      const groups: { [key: string]: number } = {};
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      selectedOrders.forEach(o => {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        groups[key] = (groups[key] || 0) + (Number(o.total_price) || 0);
      });
      return Object.entries(groups)
        .map(([key, total]) => {
          const [year, month] = key.split('-');
          const monthName = monthNames[parseInt(month) - 1];
          return { name: `${monthName} ${year}`, total, rawKey: key };
        })
        .sort((a, b) => a.rawKey.localeCompare(b.rawKey))
        .slice(-12); // Show last 12 active months
    }
  };

  // Global sales analytics (for entire team/shop)
  const calculateGlobalStats = () => {
    const totalOrders = selectedOrders.filter(o => o.status === 'delivered').length;
    const totalRevenue = selectedOrders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Find best performing driver by revenue
    const driverRevenue: { [key: string]: number } = {};
    selectedOrders.filter(o => o.status === 'delivered').forEach(o => {
      const driver = o.assigned_to_name || 'Mostrador / Planta';
      driverRevenue[driver] = (driverRevenue[driver] || 0) + (Number(o.total_price) || 0);
    });

    let topDriver = 'Mostrador / Planta';
    let maxRevenue = 0;
    Object.entries(driverRevenue).forEach(([driver, rev]) => {
      if (rev > maxRevenue && driver !== 'Mostrador / Planta' && !driver.includes('Mostrador')) {
        maxRevenue = rev;
        topDriver = driver;
      }
    });

    return { totalOrders, totalRevenue, avgTicket, topDriver };
  };

  // Prepare chart data of sales by driver (top 6)
  const getDriverChartData = () => {
    const driverRevenue: { [key: string]: number } = {};
    selectedOrders.filter(o => o.status === 'delivered').forEach(o => {
      const driver = o.assigned_to_name || 'Mostrador';
      driverRevenue[driver] = (driverRevenue[driver] || 0) + (Number(o.total_price) || 0);
    });
    return Object.entries(driverRevenue)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  };

  // Prepare chart data of sales by channel
  const getChannelChartData = () => {
    const channels: { [key: string]: number } = {
      'WhatsApp': 0,
      'Teléfono': 0,
      'POS Planta/Ruta': 0,
      'Venta Local': 0
    };

    selectedOrders.filter(o => o.status === 'delivered').forEach(o => {
      const src = o.source?.toLowerCase() || '';
      if (src === 'whatsapp') {
        channels['WhatsApp'] += Number(o.total_price) || 0;
      } else if (src === 'phone') {
        channels['Teléfono'] += Number(o.total_price) || 0;
      } else if (src === 'pos') {
        channels['POS Planta/Ruta'] += Number(o.total_price) || 0;
      } else {
        channels['Venta Local'] += Number(o.total_price) || 0;
      }
    });

    return Object.entries(channels).map(([name, value]) => ({ name, value }));
  };

  const customerStats = calculateCustomerStats();
  const globalStats = calculateGlobalStats();

  const handleDeleteClick = (order: Order) => {
    setOrderToDelete(order);
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderToDelete.id);

      if (error) throw error;

      // Log notification
      await supabase.from('notifications_log').insert([{
        title: '🗑️ Compra de Cliente Eliminada',
        message: `El registro de venta de ${orderToDelete.customer_name} por $${orderToDelete.total_price} fue eliminado por un administrador.`,
        type: 'sale',
        user_role: 'admin'
      }]);

      // Remove local copy
      setOrders(orders.filter(o => o.id !== orderToDelete.id));
      setOrderToDelete(null);
      alert('Registro de compra eliminado con éxito.');
    } catch (e: any) {
      alert('Error al eliminar registro: ' + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // EXPORT TO PDF
  const handleExportPDF = () => {
    const titleText = selectedCustomerName 
      ? `Historial de Consumo: ${selectedCustomerName.toUpperCase()}`
      : `Historial de Ventas Global - Quality Water`;
    const subtitleText = selectedCustomerName
      ? `Periodo: ${startDate} al ${endDate} | Total Consumido: $${customerStats.totalAmount.toFixed(2)} pesos`
      : `Periodo: ${startDate} al ${endDate} | Facturación Total: $${globalStats.totalRevenue.toFixed(2)} pesos`;

    const columns = ['Fecha/Hora', 'Cliente', 'ID Pedido', 'Artículos', 'Atendió', 'Origen', 'Estado', 'Total'];
    const data = selectedOrders.map(o => [
      new Date(o.created_at).toLocaleString('es-MX'),
      o.customer_name,
      o.id.slice(0, 8).toUpperCase(),
      o.items,
      o.assigned_to_name || 'Mostrador / Planta',
      getSourceLabel(o.source),
      o.status === 'delivered' ? 'Entregado' : o.status === 'assigned' ? 'En Ruta' : o.status === 'pending' ? 'Pendiente' : o.status,
      `$${Number(o.total_price).toFixed(2)}`
    ]);

    exportToPDF({
      title: titleText,
      subtitle: subtitleText,
      columns,
      data,
      filename: selectedCustomerName 
        ? `Historial_${selectedCustomerName.replace(/\s+/g, '_')}`
        : `Historial_Global_Ventas_${startDate}_a_${endDate}`
    });
  };

  // EXPORT TO EXCEL (CSV with UTF-8 BOM)
  const handleExportExcel = () => {
    const headers = ['Fecha/Hora', 'Cliente', 'ID Pedido', 'Artículos', 'Atendió/Entregó', 'Origen/Canal', 'Estado', 'Monto Total'];
    const rows = selectedOrders.map(o => [
      new Date(o.created_at).toLocaleString('es-MX'),
      o.customer_name,
      o.id.toUpperCase(),
      o.items.replace(/"/g, '""'), // escape quotes
      o.assigned_to_name || 'Mostrador / Planta',
      getSourceLabel(o.source),
      o.status === 'delivered' ? 'Completado' : o.status === 'assigned' ? 'En Ruta' : o.status === 'pending' ? 'Pendiente' : o.status,
      Number(o.total_price).toFixed(2)
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Add UTF-8 BOM so Excel opens accented characters properly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const filename = selectedCustomerName
      ? `Historial_${selectedCustomerName.replace(/\s+/g, '_')}_${startDate}_al_${endDate}.csv`
      : `Historial_Global_Ventas_${startDate}_al_${endDate}.csv`;
      
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeCustomerList = getCombinedCustomerList();
  const temporalChartData = selectedCustomerName ? getTemporalData() : [];

  const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-6" id="sales_history_module">
      
      {/* Module Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden border border-indigo-500/10">
        <div className="absolute right-0 top-0 w-[400px] h-[400px] bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 border border-indigo-400/20">
              <Sparkles size={12} className="text-indigo-400" /> PANEL DE AUDITORÍA Y VENTAS
            </span>
            <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight leading-none">
              Historial de <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Ventas y Clientes</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-xl font-medium leading-relaxed">
              Consulte y audite las ventas de la purificadora. Seleccione un cliente específico en el panel izquierdo para ver su rendimiento temporal (por fecha, semana y mes) o navegue por la Vista General de auditoría.
            </p>
          </div>
          <button 
            onClick={fetchInitialData}
            className="self-start md:self-center bg-slate-800/80 border border-slate-700/50 text-slate-300 hover:text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 hover:bg-slate-800 flex items-center gap-2 shadow-lg cursor-pointer animate-none"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Sincronizar Datos
          </button>
        </div>
      </div>

      {/* Main Multi-panel view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Directory Sidebar */}
        <div className="lg:col-span-4 bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm flex flex-col h-[700px]">
          
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
              <p className="font-black text-xs uppercase tracking-wider">🌎 Ver Historial General</p>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${selectedCustomerName === null ? 'text-sky-300' : 'text-slate-400'}`}>
                Vista de Auditoría de todas las ventas
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
                <p className="text-[11px] text-slate-400 font-medium px-4">No se encontraron clientes con el criterio de búsqueda.</p>
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
          
          {selectedCustomerName ? (
            /* CLIENT DRILLDOWN VIEW */
            <>
              {/* Customer Banner & Stats Cards */}
              <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm space-y-6">
                
                {/* Header info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-2.5 py-1 rounded-full tracking-widest border border-indigo-100">
                      EXPEDIENTE DE CLIENTE
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase italic">
                      {selectedCustomerName}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase">
                      Dirección habitual: <span className="text-slate-600 normal-case font-bold">{
                        activeCustomerList.find(c => c.name === selectedCustomerName)?.address || 'No especificada'
                      }</span>
                    </p>
                  </div>
                  
                  {/* Export buttons */}
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

                {/* Filter Controls Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Fecha Inicio</label>
                    <div className="relative">
                      <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-white p-3 border-none rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Fecha Fin</label>
                    <div className="relative">
                      <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-white p-3 border-none rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Estatus</label>
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-white p-3 border-none rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600 appearance-none"
                    >
                      <option value="all">TODOS</option>
                      <option value="delivered">COMPLETADOS</option>
                      <option value="assigned">EN RUTA</option>
                      <option value="pending">PENDIENTES</option>
                      <option value="cancelled">CANCELADOS</option>
                      <option value="pickup_pending">RECOJO PENDIENTE</option>
                      <option value="pickup_assigned">RECOJO EN RUTA</option>
                      <option value="pickup_confirmed">RECOJO RECIBIDO</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Origen / Canal</label>
                    <select 
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      className="w-full bg-white p-3 border-none rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600 appearance-none"
                    >
                      <option value="all">TODOS</option>
                      <option value="pos">PLANTA / CHOFERES (POS)</option>
                      <option value="local">VENTA LOCAL (MOSTRADOR)</option>
                      <option value="whatsapp">WHATSAPP</option>
                      <option value="phone">PEDIDO TELEFÓNICO</option>
                    </select>
                  </div>
                </div>

                {/* Bento Statistics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Compras Totales</p>
                    <p className="text-xl font-black text-indigo-900 leading-tight">{customerStats.totalPurchases} pedidos</p>
                    <p className="text-[9px] text-slate-400 font-bold">Frecuencia en periodo</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Inversión Total</p>
                    <p className="text-xl font-black text-indigo-900 leading-tight">${customerStats.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Pesos MXN facturados</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 min-w-0">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Ticket Promedio</p>
                    <p className="text-xl font-black text-indigo-900 leading-tight">${customerStats.avgTicket.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Valor medio por compra</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Producto Favorito</p>
                    <p className="text-[11px] font-black text-indigo-900 leading-tight py-1 truncate uppercase" title={customerStats.favoriteItem}>
                      {customerStats.favoriteItem}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold">Mayor cantidad</p>
                  </div>
                </div>
              </div>

              {/* Client Temporal Breakdown Graph */}
              <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-indigo-500" /> Historial de Consumo Temporal
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Ventas realizadas agrupadas por fecha, semana o mes</p>
                  </div>
                  
                  {/* Selector de periodo temporal */}
                  <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                    <button
                      onClick={() => setMetricsTab('daily')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${metricsTab === 'daily' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                      <CalendarDays size={10} /> Diario
                    </button>
                    <button
                      onClick={() => setMetricsTab('weekly')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${metricsTab === 'weekly' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                      <CalendarRange size={10} /> Semanal
                    </button>
                    <button
                      onClick={() => setMetricsTab('monthly')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${metricsTab === 'monthly' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                      <Calendar size={10} /> Mensual
                    </button>
                  </div>
                </div>

                {temporalChartData.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase">
                    Sin datos financieros suficientes para graficar en este rango
                  </div>
                ) : (
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={temporalChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="clientColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip 
                          contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                          formatter={(v) => [`$${Number(v).toFixed(2)} pesos`, 'Consumido']}
                        />
                        <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#clientColor)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Purchase Details Table Card */}
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[350px]">
                <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" /> Registro Detallado de Compras del Cliente
                  </h3>
                  <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full uppercase">
                    {selectedOrders.length} Resultados
                  </span>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-50 bg-slate-50/30 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                        <th className="px-6 py-4">Fecha</th>
                        <th className="px-6 py-4">ID / Tipo</th>
                        <th className="px-6 py-4">Productos / Artículos</th>
                        <th className="px-6 py-4">Atendió / Entregó</th>
                        <th className="px-6 py-4 text-center">Estatus</th>
                        <th className="px-6 py-4 text-right">Total</th>
                        {(userRole === 'admin' || userRole === 'supervisor') && (
                          <th className="px-6 py-4 text-center">Acciones</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {selectedOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                            <div className="flex flex-col items-center gap-2">
                              <AlertCircle size={20} className="text-slate-300" />
                              <p className="text-[11px] font-bold uppercase tracking-wider">No se encontraron compras</p>
                              <p className="text-[10px] text-slate-400">Modifica los filtros o el rango de fechas para buscar otros registros.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        selectedOrders.map((order) => {
                          const orderDate = new Date(order.created_at);
                          const isPickup = order.status.startsWith('pickup_') || order.customer_name.startsWith('🔄 [RECOGER] ');
                          
                          return (
                            <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="space-y-0.5">
                                  <p className="text-xs font-black text-slate-700">
                                    {orderDate.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                  </p>
                                  <p className="text-[9px] text-slate-400 font-medium">
                                    {orderDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                <div className="space-y-0.5">
                                  <p className="text-xs font-mono font-bold text-slate-600">
                                    #{order.id.slice(0, 8).toUpperCase()}
                                  </p>
                                  <p className="text-[8px] font-black uppercase flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      order.source === 'whatsapp' ? 'bg-emerald-500' :
                                      order.source === 'pos' ? 'bg-sky-500' :
                                      order.source === 'phone' ? 'bg-blue-500' : 'bg-indigo-500'
                                    }`} />
                                    {getSourceLabel(order.source)}
                                  </p>
                                </div>
                              </td>

                              <td className="px-6 py-4 max-w-xs">
                                <p className="text-xs font-bold text-slate-600 leading-normal truncate" title={order.items}>
                                  {order.items}
                                </p>
                              </td>

                              <td className="px-6 py-4">
                                <p className="text-xs font-bold text-slate-600">
                                  {order.assigned_to_name || 'Mostrador / Planta'}
                                </p>
                              </td>

                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                  order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                  order.status === 'assigned' || order.status === 'pickup_assigned' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                                  order.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                  'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                  {order.status === 'delivered' ? 'Entregado' : 
                                   order.status === 'assigned' ? 'En Ruta' : 
                                   order.status === 'pending' ? 'Pendiente' : 
                                   order.status === 'cancelled' ? 'Cancelado' : order.status.toUpperCase()}
                                </span>
                              </td>

                              <td className="px-6 py-4 text-right">
                                <p className={`text-xs font-black ${isPickup ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                  ${Number(order.total_price).toFixed(2)}
                                </p>
                              </td>

                              {(userRole === 'admin' || userRole === 'supervisor') && (
                                <td className="px-6 py-4 text-center">
                                  <button
                                    onClick={() => handleDeleteClick(order)}
                                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 active:scale-90 cursor-pointer"
                                    title="Eliminar registro de venta"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            /* GLOBAL AUDITOR'S VIEW */
            <>
              {/* Global General Metrics */}
              <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full tracking-widest border border-indigo-100 uppercase">
                      VISTA DE AUDITORÍA GENERAL
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase italic">
                      Consola de Control de Ventas
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      Análisis global de facturación, repartos en ruta y ventas de planta en mostrador
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleExportPDF}
                      disabled={selectedOrders.length === 0}
                      className="bg-slate-900 hover:bg-slate-850 text-white font-black text-[10px] uppercase tracking-widest px-4 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <FileText size={14} /> Reporte Global PDF
                    </button>
                    <button
                      onClick={handleExportExcel}
                      disabled={selectedOrders.length === 0}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-4 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Download size={14} /> Reporte Excel (CSV)
                    </button>
                  </div>
                </div>

                {/* Filters */}
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
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Estatus de Ventas</label>
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-white p-3 border-none rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600 appearance-none"
                    >
                      <option value="all">TODOS</option>
                      <option value="delivered">ENTREGADO / COBRADO</option>
                      <option value="assigned">EN RUTA</option>
                      <option value="pending">PENDIENTE DE DESPACHO</option>
                      <option value="cancelled">CANCELADOS</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Origen / Canal</label>
                    <select 
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      className="w-full bg-white p-3 border-none rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600 appearance-none"
                    >
                      <option value="all">TODOS</option>
                      <option value="pos">PLANTA / CHOFERES (POS)</option>
                      <option value="local">VENTA LOCAL (MOSTRADOR)</option>
                      <option value="whatsapp">WHATSAPP</option>
                      <option value="phone">PEDIDO TELEFÓNICO</option>
                    </select>
                  </div>
                </div>

                {/* Global Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/40 space-y-1">
                    <div className="flex justify-between items-center text-indigo-500">
                      <p className="text-[8px] font-black uppercase tracking-widest">Facturación Total</p>
                      <DollarSign size={14} />
                    </div>
                    <p className="text-xl font-black text-indigo-950 leading-tight">${globalStats.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Monto entregado</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100/40 space-y-1">
                    <div className="flex justify-between items-center text-emerald-600">
                      <p className="text-[8px] font-black uppercase tracking-widest">Ventas Completas</p>
                      <CheckCircle size={14} />
                    </div>
                    <p className="text-xl font-black text-emerald-950 leading-tight">{globalStats.totalOrders} entregas</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Pedidos liquidados</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-sky-50/40 border border-sky-100/40 space-y-1">
                    <div className="flex justify-between items-center text-sky-500">
                      <p className="text-[8px] font-black uppercase tracking-widest">Ticket Promedio</p>
                      <TrendingUp size={14} />
                    </div>
                    <p className="text-xl font-black text-sky-950 leading-tight">${globalStats.avgTicket.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Media por ticket</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-100/40 space-y-1">
                    <div className="flex justify-between items-center text-amber-500">
                      <p className="text-[8px] font-black uppercase tracking-widest">Chofer Estrella</p>
                      <Award size={14} />
                    </div>
                    <p className="text-[11.5px] font-black text-amber-950 py-1 leading-tight truncate uppercase">{globalStats.topDriver}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Mayor volumen ruta</p>
                  </div>
                </div>
              </div>

              {/* General Interactive Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Sales by channel chart */}
                <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">📊 Venta por Canales</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Participación económica por canal de venta</p>
                  </div>
                  <div className="h-[200px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getChannelChartData()} layout="vertical" margin={{ top: 10, right: 10, left: 15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} tickFormatter={(v) => `$${v}`} />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#475569', fontWeight: 'bold' }} />
                        <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} formatter={(v) => [`$${Number(v).toFixed(2)} pesos`, 'Ventas']} />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={22}>
                          {getChannelChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sales by driver chart */}
                <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">🚚 Venta por Colaboradores / Choferes</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Ventas entregadas en ruta por cada repartidor</p>
                  </div>
                  <div className="h-[200px] w-full flex items-center justify-center">
                    {getDriverChartData().length === 0 ? (
                      <p className="text-slate-400 text-xs font-black uppercase">Sin ventas registradas en ruta hoy</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getDriverChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#475569', fontWeight: 'bold' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} tickFormatter={(v) => `$${v}`} />
                          <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} formatter={(v) => [`$${Number(v).toFixed(2)} pesos`, 'Entregado']} />
                          <Bar dataKey="total" fill="#4f46e5" radius={[8, 8, 0, 0]} maxBarSize={22} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

              </div>

              {/* Unified Global Sales Table */}
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" /> Registro Histórico Global de Ventas (Auditoría)
                  </h3>
                  <div className="flex items-center gap-2">
                    {searchQuery && (
                      <span className="text-[9px] font-black bg-sky-50 text-sky-600 px-2.5 py-1 rounded-full uppercase">
                        🔍 Búsqueda Inteligente Activa
                      </span>
                    )}
                    <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full uppercase">
                      {selectedOrders.length} Resultados
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-50 bg-slate-50/30 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                        <th className="px-6 py-4">Fecha</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">ID / Tipo</th>
                        <th className="px-6 py-4">Productos / Artículos</th>
                        <th className="px-6 py-4">Atendió / Entregó</th>
                        <th className="px-6 py-4 text-center">Estatus</th>
                        <th className="px-6 py-4 text-right">Total</th>
                        {(userRole === 'admin' || userRole === 'supervisor') && (
                          <th className="px-6 py-4 text-center">Acciones</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {selectedOrders.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                            <div className="flex flex-col items-center gap-2">
                              <AlertCircle size={20} className="text-slate-300" />
                              <p className="text-[11px] font-bold uppercase tracking-wider">No se encontraron ventas registradas</p>
                              <p className="text-[10px] text-slate-400">Prueba con otro término de búsqueda o modifica el rango de fechas.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        selectedOrders.map((order) => {
                          const orderDate = new Date(order.created_at);
                          const isPickup = order.status.startsWith('pickup_') || order.customer_name.startsWith('🔄 [RECOGER] ');
                          
                          return (
                            <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="space-y-0.5">
                                  <p className="text-xs font-black text-slate-700">
                                    {orderDate.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                  </p>
                                  <p className="text-[9px] text-slate-400 font-medium">
                                    {orderDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                <p className="text-xs font-black text-slate-700 uppercase italic">
                                  {order.customer_name}
                                </p>
                                <p className="text-[8.5px] text-slate-400 font-bold truncate max-w-[150px]">
                                  {order.address}
                                </p>
                              </td>

                              <td className="px-6 py-4">
                                <div className="space-y-0.5">
                                  <p className="text-xs font-mono font-bold text-slate-600">
                                    #{order.id.slice(0, 8).toUpperCase()}
                                  </p>
                                  <p className="text-[8px] font-black uppercase flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      order.source === 'whatsapp' ? 'bg-emerald-500' :
                                      order.source === 'pos' ? 'bg-sky-500' :
                                      order.source === 'phone' ? 'bg-blue-500' : 'bg-indigo-500'
                                    }`} />
                                    {getSourceLabel(order.source)}
                                  </p>
                                </div>
                              </td>

                              <td className="px-6 py-4 max-w-xs">
                                <p className="text-xs font-bold text-slate-600 leading-normal truncate" title={order.items}>
                                  {order.items}
                                </p>
                              </td>

                              <td className="px-6 py-4">
                                <p className="text-xs font-bold text-slate-600">
                                  {order.assigned_to_name || 'Mostrador / Planta'}
                                </p>
                              </td>

                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                  order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                  order.status === 'assigned' || order.status === 'pickup_assigned' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                                  order.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                  'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                  {order.status === 'delivered' ? 'Entregado' : 
                                   order.status === 'assigned' ? 'En Ruta' : 
                                   order.status === 'pending' ? 'Pendiente' : 
                                   order.status === 'cancelled' ? 'Cancelado' : order.status.toUpperCase()}
                                </span>
                              </td>

                              <td className="px-6 py-4 text-right">
                                <p className={`text-xs font-black ${isPickup ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                  ${Number(order.total_price).toFixed(2)}
                                </p>
                              </td>

                              {(userRole === 'admin' || userRole === 'supervisor') && (
                                <td className="px-6 py-4 text-center">
                                  <button
                                    onClick={() => handleDeleteClick(order)}
                                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 active:scale-90 cursor-pointer"
                                    title="Eliminar registro de venta"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {orderToDelete && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setOrderToDelete(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-[32px] shadow-2xl z-[201] p-6 space-y-6 border border-slate-100"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-3 bg-rose-50 rounded-2xl">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic leading-none">¿Eliminar Registro?</h3>
                  <p className="text-[10px] font-black text-rose-400 tracking-wider uppercase mt-1">Acción Irreversible de Auditoría</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl text-xs font-bold text-slate-600 space-y-2">
                <p><span className="text-slate-400 uppercase text-[9px] block">Cliente:</span> {orderToDelete.customer_name}</p>
                <p><span className="text-slate-400 uppercase text-[9px] block">Fecha:</span> {new Date(orderToDelete.created_at).toLocaleString()}</p>
                <p><span className="text-slate-400 uppercase text-[9px] block">Artículos:</span> {orderToDelete.items}</p>
                <p><span className="text-slate-400 uppercase text-[9px] block">Total:</span> ${Number(orderToDelete.total_price).toFixed(2)} pesos</p>
              </div>

              <p className="text-[11px] text-slate-400 font-medium">
                Esta acción eliminará permanentemente la venta seleccionada del registro histórico de la distribuidora. Se notificará a los administradores de este ajuste.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setOrderToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-100 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Borrando...</span>
                    </>
                  ) : (
                    <span>Confirmar Borrado</span>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
