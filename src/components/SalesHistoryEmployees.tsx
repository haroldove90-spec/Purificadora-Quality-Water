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
  Award,
  MapPin,
  Package
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
  Cell
} from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { exportToPDF } from '../utils/pdfExport';
import { namesMatch } from '../utils/nameHelper';
import { getOrderRoute } from '../utils/routeHelper';
import { getGarrafonesCount } from '../utils/garrafonHelper';

interface Order {
  id: string;
  customer_name: string;
  address: string;
  items: string;
  total_price: number;
  status: string;
  source?: string;
  assigned_to_name?: string;
  route?: string;
  assigned_route?: string;
  created_at: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  status: string;
  phone?: string;
  created_at: string;
}

export default function SalesHistoryEmployees({ userRole }: { userRole: string }) {
  const isDriver = userRole === 'driver' || userRole?.startsWith('driver');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection & filtering
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string | null>(null);
  
  // Role filter state (for employee directory dropdown)
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Dates: if driver, limit to last 2 days
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    if (isDriver) {
      d.setDate(d.getDate() - 2);
    } else {
      d.setDate(d.getDate() - 30); // Default 30 days ago for admin/supervisor
    }
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [routeFilter, setRouteFilter] = useState<string>('all');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });

      if (empError) throw empError;
      setEmployees(empData || []);

      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      // If driver, restrict at DB level to last 2 days for performance
      if (isDriver) {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        twoDaysAgo.setHours(0, 0, 0, 0);
        query = query.gte('created_at', twoDaysAgo.toISOString());
      }

      const { data: ordData, error: ordError } = await query;

      if (ordError) throw ordError;
      setOrders(ordData || []);
    } catch (e: any) {
      console.error('Error fetching initial data for employees:', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to map DB source string to clear human label
  const getSourceLabel = (source?: string, assignedTo?: string) => {
    const src = (source || '').toLowerCase();
    if (src === 'whatsapp' || src === 'whatsapp_chat') return 'WhatsApp';
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

  // Filtered employee list based on search bar & role dropdown
  const getFilteredEmployees = () => {
    let list = employees;

    // Filter by Role / Position dropdown
    if (roleFilter !== 'all') {
      if (roleFilter === 'driver') {
        list = list.filter(e => {
          const r = (e.role || '').toLowerCase();
          return r === 'driver' || r === 'chofer' || r === 'repartidor';
        });
      } else if (roleFilter === 'planta') {
        list = list.filter(e => {
          const r = (e.role || '').toLowerCase();
          return r === 'planta' || r === 'mostrador' || r === 'local';
        });
      } else if (roleFilter === 'supervisor') {
        list = list.filter(e => (e.role || '').toLowerCase() === 'supervisor');
      } else if (roleFilter === 'admin') {
        list = list.filter(e => (e.role || '').toLowerCase() === 'admin');
      }
    }

    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(e => 
      (e.name || '').toLowerCase().includes(q) ||
      (e.role || '').toLowerCase().includes(q) ||
      (e.phone || '').includes(q)
    );
  };

  // Filter orders based on assigned employee, dates, status, channel, and zone/route
  const getFilteredOrders = () => {
    // 2 days limit constraint for driver role
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    return orders.filter(o => {
      // Filter by employee
      if (selectedEmployeeName) {
        const assignedName = o.assigned_to_name || '';
        if (selectedEmployeeName === 'Planta' || selectedEmployeeName === 'Mostrador') {
          if (assignedName !== '' && assignedName !== 'Mostrador' && assignedName !== 'Planta' && assignedName !== 'Local') {
            return false;
          }
        } else {
          if (!namesMatch(assignedName, selectedEmployeeName)) return false;
        }
      } else {
        // Search query in global employee view
        if (searchQuery) {
          const q = searchQuery.toLowerCase().trim();
          const emp = (o.assigned_to_name || 'Mostrador / Planta').toLowerCase();
          const cust = (o.customer_name || '').toLowerCase();
          const items = (o.items || '').toLowerCase();
          const id = (o.id || '').toLowerCase();
          if (!emp.includes(q) && !cust.includes(q) && !items.includes(q) && !id.includes(q)) return false;
        }
      }

      // Filter by date range
      const orderDate = o.created_at?.split('T')[0];

      // Enforce last 2 days max limit for drivers
      if (isDriver) {
        if (orderDate && orderDate < twoDaysAgoStr) return false;
      }

      if (orderDate && (orderDate < startDate || orderDate > endDate)) return false;

      // Filter by status
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;

      // Filter by sales channel (Reparto, Planta, WhatsApp, Llamada)
      if (channelFilter !== 'all') {
        const actualChannel = getSourceLabel(o.source, o.assigned_to_name);
        const routeLabel = getOrderRoute(o);
        if (channelFilter === 'reparto' && actualChannel !== 'Reparto/Ruta') return false;
        if (channelFilter === 'planta' && actualChannel !== 'Planta/Mostrador') return false;
        if (channelFilter === 'whatsapp' && actualChannel !== 'WhatsApp' && routeLabel !== '6.- WhatsApp' && o.source !== 'whatsapp' && o.source !== 'whatsapp_chat') return false;
        if (channelFilter === 'llamada' && actualChannel !== 'Llamada' && routeLabel !== '5.- Llamadas Telefónicas' && o.source !== 'phone') return false;
      }

      // Filter by Assigned Zone / Route
      if (routeFilter !== 'all') {
        const orderRoute = getOrderRoute(o);
        if (orderRoute !== routeFilter) return false;
      }

      return true;
    });
  };

  const selectedOrders = getFilteredOrders();

  // Statistics calculation including total garrafones
  const calculateStats = () => {
    const totalPurchases = selectedOrders.length;
    const totalAmount = selectedOrders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
    const avgTicket = totalPurchases > 0 ? totalAmount / totalPurchases : 0;

    // Garrafones count total
    const totalGarrafones = selectedOrders.reduce((sum, o) => {
      if (o.status === 'cancelled') return sum;
      return sum + getGarrafonesCount(o.items);
    }, 0);
    
    // Delivered deliveries vs. pending
    const deliveredCount = selectedOrders.filter(o => o.status === 'delivered').length;
    const pendingCount = selectedOrders.filter(o => o.status === 'pending' || o.status === 'assigned').length;
    const successRate = totalPurchases > 0 ? (deliveredCount / totalPurchases) * 100 : 0;

    // Calculate favorite product handled
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

    return { totalPurchases, totalAmount, avgTicket, totalGarrafones, deliveredCount, pendingCount, successRate, favoriteItem };
  };

  const stats = calculateStats();

  // Helper to calculate total garrafones for a specific employee
  const getEmployeeGarrafones = (empName: string) => {
    const empOrders = orders.filter(o => {
      if (empName === 'Planta' || empName === 'Mostrador') {
        return !o.assigned_to_name || o.assigned_to_name === 'Mostrador' || o.assigned_to_name === 'Planta';
      }
      return namesMatch(o.assigned_to_name, empName);
    });
    return empOrders.reduce((sum, o) => {
      if (o.status === 'cancelled') return sum;
      return sum + getGarrafonesCount(o.items);
    }, 0);
  };

  // Grouped temporal data for Recharts
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
      .slice(-15);
  };

  const temporalChartData = getTemporalData();

  // EXPORT TO PDF
  const handleExportPDF = () => {
    const titleText = selectedEmployeeName 
      ? `Reporte de Ventas de Empleado: ${selectedEmployeeName.toUpperCase()}`
      : `Historial Global de Ventas por Empleados`;
    const subtitleText = selectedEmployeeName
      ? `Periodo: ${startDate} al ${endDate} | Recaudación: $${stats.totalAmount.toFixed(2)} | Garrafones Vendidos: ${stats.totalGarrafones}`
      : `Periodo: ${startDate} al ${endDate} | Recaudación Total: $${stats.totalAmount.toFixed(2)} | Total Garrafones: ${stats.totalGarrafones}`;

    const columns = ['Fecha/Hora', 'Atendió/Entregó', 'Cliente', 'Folio', 'Zona/Ruta', 'Garrafones', 'Canal', 'Estado', 'Total'];
    const data = selectedOrders.map(o => [
      new Date(o.created_at).toLocaleString('es-MX'),
      o.assigned_to_name || 'Mostrador / Planta',
      o.customer_name,
      o.id.slice(0, 8).toUpperCase(),
      getOrderRoute(o),
      getGarrafonesCount(o.items).toString(),
      getSourceLabel(o.source, o.assigned_to_name),
      o.status === 'delivered' ? 'Entregado' : o.status === 'assigned' ? 'En Ruta' : o.status === 'pending' ? 'Pendiente' : o.status,
      `$${Number(o.total_price).toFixed(2)}`
    ]);

    exportToPDF({
      title: titleText,
      subtitle: subtitleText,
      columns,
      data,
      filename: selectedEmployeeName 
        ? `Ventas_Empleado_${selectedEmployeeName.replace(/\s+/g, '_')}`
        : `Ventas_Empleados_${startDate}_a_${endDate}`
    });
  };

  // EXPORT TO EXCEL (CSV with UTF-8 BOM)
  const handleExportExcel = () => {
    const headers = ['Fecha/Hora', 'Empleado Atendio', 'Cliente', 'Folio Pedido', 'Ruta/Zona Asignada', 'Cant. Garrafones', 'Articulos', 'Canal de Venta', 'Estado', 'Monto Total'];
    const rows = selectedOrders.map(o => [
      new Date(o.created_at).toLocaleString('es-MX'),
      o.assigned_to_name || 'Mostrador / Planta',
      o.customer_name,
      o.id.toUpperCase(),
      getOrderRoute(o),
      getGarrafonesCount(o.items),
      o.items.replace(/"/g, '""'),
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
    
    const filename = selectedEmployeeName
      ? `Ventas_Empleado_${selectedEmployeeName.replace(/\s+/g, '_')}_${startDate}_al_${endDate}.csv`
      : `Ventas_Empleados_${startDate}_al_${endDate}.csv`;
      
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeEmployeeList = getFilteredEmployees();

  return (
    <div className="space-y-6" id="sales_history_employees_module">
      
      {/* Module Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden border border-emerald-500/10">
        <div className="absolute right-0 top-0 w-[400px] h-[400px] bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 border border-emerald-400/20">
                <Sparkles size={12} className="text-emerald-400" /> AUDITORÍA COLABORADORES
              </span>
              {isDriver && (
                <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 border border-amber-400/20">
                  <Calendar size={12} /> VISTA LIMITADA: ÚLTIMOS 2 DÍAS
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight leading-none">
              Historial de <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Ventas por Empleados</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-xl font-medium leading-relaxed">
              Supervise y evalúe el número de garrafones vendidos, zonas asignadas, pedidos de WhatsApp y recaudación de cada repartidor o personal de planta.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Role Filter Selector matching user UI spec */}
            <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-1.5 shadow-lg">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-transparent text-white font-black text-xs px-3 py-1.5 outline-none cursor-pointer uppercase"
              >
                <option value="all" className="bg-slate-900 text-white">⚡ Todos los Puestos</option>
                <option value="driver" className="bg-slate-900 text-white">🚚 Repartidores / Choferes</option>
                <option value="planta" className="bg-slate-900 text-white">🪴 Planta / Mostrador</option>
                <option value="supervisor" className="bg-slate-900 text-white">👮 Supervisores</option>
                <option value="admin" className="bg-slate-900 text-white">💼 Administradores</option>
              </select>
            </div>

            <button 
              onClick={fetchInitialData}
              className="bg-slate-800/80 border border-slate-700/50 text-slate-300 hover:text-white px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 hover:bg-slate-800 flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Sincronizar
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Multi-panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Directory: Employees List */}
        <div className="lg:col-span-4 bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm flex flex-col h-[780px]">
          
          {/* View All Toggler */}
          <button
            onClick={() => {
              setSelectedEmployeeName(null);
              setSearchQuery('');
            }}
            className={`w-full mb-4 text-left p-4 rounded-2xl border transition-all duration-250 flex items-center gap-3.5 cursor-pointer ${
              selectedEmployeeName === null 
                ? 'bg-gradient-to-br from-emerald-900 to-slate-900 border-emerald-950 text-white shadow-lg' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-700'
            }`}
          >
            <div className={`p-2.5 rounded-xl ${selectedEmployeeName === null ? 'bg-emerald-500/20 text-teal-300' : 'bg-slate-200/80 text-slate-500'}`}>
              <Users size={18} />
            </div>
            <div className="space-y-0.5">
              <p className="font-black text-xs uppercase tracking-wider">👷 Ver Todos los Empleados</p>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${selectedEmployeeName === null ? 'text-teal-300' : 'text-slate-400'}`}>
                Comparativa global ({activeEmployeeList.length} colaboradores)
              </p>
            </div>
          </button>

          <div className="space-y-3 mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-2"><Search size={14} className="text-slate-400" /> Directorio de Empleados</span>
              <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full">{activeEmployeeList.length}</span>
            </h3>
            
            <div className="relative">
              <input 
                type="text"
                placeholder={selectedEmployeeName === null ? "Buscar por nombre o puesto..." : "Buscar colaborador..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 text-xs placeholder-slate-400"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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

          {/* Directory list rendering */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                <Loader2 className="animate-spin" size={16} />
                <span>Cargando plantilla...</span>
              </div>
            ) : activeEmployeeList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12 text-center space-y-2">
                <AlertCircle size={24} className="text-slate-300" />
                <p className="font-black text-xs uppercase tracking-wider">Sin Empleados</p>
                <p className="text-[11px] text-slate-400 font-medium px-4">No se encontraron colaboradores bajo este filtro.</p>
              </div>
            ) : (
              <>
                {/* Fallback for counter sales */}
                <button
                  onClick={() => {
                    setSelectedEmployeeName('Planta');
                    setSearchQuery('');
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-250 flex items-center justify-between group cursor-pointer ${
                    selectedEmployeeName === 'Planta' 
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50/55 border-emerald-200 shadow-md shadow-emerald-100/30' 
                      : 'bg-white hover:bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0 pr-2">
                    <p className={`font-black text-[12px] uppercase truncate ${selectedEmployeeName === 'Planta' ? 'text-emerald-950 font-black' : 'text-slate-700'}`}>
                      🏪 Planta / Mostrador (Venta Directa)
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-emerald-600 font-bold">Oficina Principal</span>
                      <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        🧪 {getEmployeeGarrafones('Planta')} garrafones
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className={`transition-transform duration-200 ${selectedEmployeeName === 'Planta' ? 'text-emerald-500 translate-x-1' : 'text-slate-300'}`} />
                </button>

                {activeEmployeeList.map((emp) => {
                  const isSelected = selectedEmployeeName === emp.name;
                  const empJugCount = getEmployeeGarrafones(emp.name);

                  return (
                    <button
                      key={emp.id}
                      onClick={() => {
                        setSelectedEmployeeName(emp.name);
                        setSearchQuery('');
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-250 flex items-center justify-between group cursor-pointer ${
                        isSelected 
                          ? 'bg-gradient-to-r from-emerald-50 to-teal-50/55 border-emerald-200 shadow-md shadow-emerald-100/30' 
                          : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0 pr-2">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`font-black text-[12px] uppercase truncate ${isSelected ? 'text-emerald-950' : 'text-slate-700 group-hover:text-slate-900'}`}>
                            {emp.name}
                          </p>
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/60 shrink-0">
                            {empJugCount} garraf.
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1.5 truncate">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                            emp.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                            emp.role === 'supervisor' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                            'bg-teal-50 text-teal-600 border border-teal-100'
                          }`}>
                            {emp.role}
                          </span>
                          <span>•</span>
                          <span>{emp.status === 'active' ? '🟢 ACTIVO' : '🔴 INACTIVO'}</span>
                        </p>
                      </div>
                      <ChevronRight size={16} className={`transition-transform duration-200 ${isSelected ? 'text-emerald-500 translate-x-1' : 'text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5'}`} />
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Right Panel: Operations and sales details */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2.5 py-1 rounded-full tracking-widest border border-emerald-100">
                  {selectedEmployeeName ? 'DESEMPEÑO Y VENTAS INDIVIDUALES' : 'CONSOLIDADOS GENERALES POR EMPLEADO'}
                </span>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase italic">
                  {selectedEmployeeName ? selectedEmployeeName : 'Reportes de Colaboradores'}
                </h2>
                {selectedEmployeeName && (
                  <p className="text-[10px] text-slate-400 font-black uppercase">
                    Estatus laboral: <span className="text-emerald-600 font-bold">VINCULADO AL PANEL DE OPERACIONES</span>
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

            {/* Date and rapid filtering controls with Zone and WhatsApp dropdowns */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Fecha Inicio</label>
                <input 
                  type="date"
                  value={startDate}
                  disabled={isDriver}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white p-2.5 border-none rounded-xl font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-slate-600 disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Fecha Fin</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white p-2.5 border-none rounded-xl font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none text-slate-600"
                />
              </div>

              {/* Zona / Ruta Asignada Filter */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-1">
                  <MapPin size={10} className="text-emerald-500" /> Zona Asignada
                </label>
                <select
                  value={routeFilter}
                  onChange={(e) => setRouteFilter(e.target.value)}
                  className="w-full bg-white p-2.5 border-none rounded-xl font-bold text-[9px] focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 appearance-none uppercase"
                >
                  <option value="all">🗺️ TODAS LAS ZONAS</option>
                  <option value="1.- Santa Cruz">📍 Ruta 1: Santa Cruz</option>
                  <option value="2.- San Miguel-Centro">📍 Ruta 2: San Miguel - Centro</option>
                  <option value="3.- La Francia-Los Reyes">📍 Ruta 3: La Francia - Los Reyes</option>
                  <option value="4.- Planta o Local">🏪 Ruta 4: Planta / Mostrador</option>
                  <option value="5.- Llamadas Telefónicas">📞 Ruta 5: Llamadas Telefónicas</option>
                  <option value="6.- WhatsApp">💬 Ruta 6: Pedidos WhatsApp</option>
                </select>
              </div>

              {/* Canal de Venta Filter including WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Canal de Venta</label>
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="w-full bg-white p-2.5 border-none rounded-xl font-bold text-[9px] focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 appearance-none uppercase"
                >
                  <option value="all">TODOS LOS CANALES</option>
                  <option value="whatsapp">💬 VENTAS POR WHATSAPP</option>
                  <option value="reparto">🚚 REPARTO / RUTA</option>
                  <option value="planta">🏪 PLANTA / MOSTRADOR</option>
                  <option value="llamada">📞 PEDIDO TELEFÓNICO</option>
                </select>
              </div>

              {/* Estatus Entrega */}
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Estatus Entrega</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-white p-2.5 border-none rounded-xl font-bold text-[9px] focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 appearance-none uppercase"
                >
                  <option value="all">TODOS LOS ESTADOS</option>
                  <option value="delivered">COMPLETADO / ENTREGADO</option>
                  <option value="assigned">EN CAMINO (RUTA)</option>
                  <option value="pending">PENDIENTE</option>
                  <option value="cancelled">CANCELADO</option>
                </select>
              </div>
            </div>

            {/* Operational metrics blocks with Garrafones count prominence */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 shadow-sm">
                <span className="text-[8px] font-black text-emerald-800 uppercase tracking-widest block leading-none flex items-center gap-1">
                  <Package size={11} className="text-emerald-600" /> Garrafones Vendidos
                </span>
                <span className="text-2xl font-black text-emerald-950 font-sans block mt-1.5">{stats.totalGarrafones}</span>
                <span className="text-[8px] font-bold text-emerald-700 uppercase mt-0.5 block">Piezas Entregadas</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Monto Recaudado</span>
                <span className="text-lg font-black text-emerald-900 font-sans block mt-1.5">${stats.totalAmount.toFixed(2)}</span>
                <span className="text-[8px] font-bold text-emerald-600 uppercase mt-0.5 block">Ventas Netas</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Servicios Totales</span>
                <span className="text-lg font-black text-slate-800 font-sans block mt-1.5">{stats.totalPurchases}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 block">Asignados</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Tasa de Éxito</span>
                <span className="text-lg font-black text-teal-600 font-sans block mt-1.5">{stats.successRate.toFixed(1)}%</span>
                <span className="text-[8px] font-bold text-emerald-600 uppercase mt-0.5 block">Entregados</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 col-span-2 md:col-span-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Ticket Promedio</span>
                <span className="text-lg font-black text-slate-800 font-sans block mt-1.5">${stats.avgTicket.toFixed(2)}</span>
                <span className="text-[8px] font-bold text-indigo-500 uppercase mt-0.5 block">Por servicio</span>
              </div>
            </div>

            {/* Favorite product info */}
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-wider">Producto Más Entregado / Vendido</h4>
                  <p className="text-xs font-bold text-emerald-700 uppercase mt-0.5">{stats.favoriteItem}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider bg-emerald-100 px-3 py-1 rounded-full">
                  Total Garrafones: {stats.totalGarrafones} u.
                </span>
              </div>
            </div>
          </div>

          {/* Temporal charts */}
          {temporalChartData.length > 0 && (
            <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-emerald-500" /> Rendimiento de Recaudación Diaria ($)
              </h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={temporalChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotalEmp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '10px', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotalEmp)" name="Total Recaudado ($)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Complete database list */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex-1 min-h-[300px]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Servicios y Transacciones ({selectedOrders.length})</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                  Auditoría detallada por colaborador, zona asignada y número de garrafones
                </p>
              </div>
              <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl">
                🥛 {stats.totalGarrafones} Garrafones en lista
              </span>
            </div>
            
            {selectedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 italic text-center space-y-2">
                <AlertCircle size={24} className="text-slate-300" />
                <p className="text-xs font-black uppercase tracking-wider">No se registran transacciones</p>
                <p className="text-[10px] text-slate-400 font-bold px-6">No existen pedidos asociados a este colaborador o bajo los filtros de zona/canal aplicados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[450px] overflow-y-auto pr-1">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-4">Fecha/Hora</th>
                      <th className="px-5 py-4">Folio</th>
                      <th className="px-5 py-4">Empleado</th>
                      <th className="px-5 py-4">Cliente</th>
                      <th className="px-5 py-4">Zona / Ruta</th>
                      <th className="px-5 py-4 text-center">Garrafones</th>
                      <th className="px-5 py-4 text-center">Canal/Origen</th>
                      <th className="px-5 py-4 text-center">Estatus</th>
                      <th className="px-5 py-4">Artículos</th>
                      <th className="px-5 py-4 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-semibold uppercase">
                    {selectedOrders.map((o) => {
                      const jugQty = getGarrafonesCount(o.items);
                      const routeName = getOrderRoute(o);

                      return (
                        <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4 text-[10px] font-mono text-slate-400 lowercase leading-tight">
                            {new Date(o.created_at).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-4 text-[10px] font-mono text-emerald-600 font-bold">
                            #{o.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="px-5 py-4 text-slate-800 font-black truncate max-w-[110px]">
                            {o.assigned_to_name || 'Mostrador / Planta'}
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-500 truncate max-w-[110px]">
                            {o.customer_name}
                          </td>
                          <td className="px-5 py-4 text-[10px] font-bold text-slate-600 truncate max-w-[120px]">
                            <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                              <MapPin size={10} className="text-emerald-500" />
                              {routeName}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100/70 text-emerald-900 border border-emerald-200">
                              <Package size={11} className="text-emerald-700" /> {jugQty}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            {renderChannelBadge(o.source, o.assigned_to_name)}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider border ${
                              o.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              o.status === 'assigned' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                              o.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                              {o.status === 'delivered' ? 'Entregado' : o.status === 'assigned' ? 'En Ruta' : o.status === 'pending' ? 'Pendiente' : o.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 max-w-[150px] truncate normal-case font-medium text-slate-500">
                            {o.items}
                          </td>
                          <td className="px-5 py-4 text-right font-black text-slate-800 font-sans">
                            ${Number(o.total_price).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
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

