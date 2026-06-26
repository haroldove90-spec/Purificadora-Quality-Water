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
  Loader2
} from 'lucide-react';
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

    // Apply search query filter
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
      if (sourceFilter !== 'all' && o.source !== sourceFilter) return false;

      return true;
    });
  };

  const selectedOrders = getFilteredCustomerOrders();

  // Statistics for the selected customer (within selected parameters)
  const calculateStats = () => {
    const totalPurchases = selectedOrders.length;
    const totalAmount = selectedOrders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
    
    // Calculate favorite item
    const itemCounts: { [key: string]: number } = {};
    selectedOrders.forEach(o => {
      const items = o.items.split(',').map(i => i.trim());
      items.forEach(item => {
        if (!item) return;
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

    return { totalPurchases, totalAmount, favoriteItem, lastPurchase };
  };

  const customerStats = calculateStats();

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
    if (!selectedCustomerName) return;
    
    const columns = ['Fecha/Hora', 'ID Pedido', 'Artículos', 'Repartidor', 'Origen', 'Estado', 'Total'];
    const data = selectedOrders.map(o => [
      new Date(o.created_at).toLocaleString('es-MX'),
      o.id.slice(0, 8).toUpperCase(),
      o.items,
      o.assigned_to_name || 'Mostrador / Planta',
      o.source === 'local' ? 'Venta Local' : o.source === 'whatsapp' ? 'WhatsApp' : 'Teléfono',
      o.status === 'delivered' ? 'Completado' : o.status === 'assigned' ? 'En Ruta' : o.status === 'pending' ? 'Pendiente' : o.status,
      `$${Number(o.total_price).toFixed(2)}`
    ]);

    exportToPDF({
      title: `Historial de Consumo: ${selectedCustomerName.toUpperCase()}`,
      subtitle: `Periodo: ${startDate} al ${endDate} | Total Consumido: $${customerStats.totalAmount.toFixed(2)} pesos`,
      columns,
      data,
      filename: `Historial_${selectedCustomerName.replace(/\s+/g, '_')}`
    });
  };

  // EXPORT TO EXCEL (CSV with UTF-8 BOM)
  const handleExportExcel = () => {
    if (!selectedCustomerName) return;

    const headers = ['Fecha/Hora', 'ID Pedido', 'Artículos', 'Repartidor', 'Origen', 'Estado', 'Monto Total'];
    const rows = selectedOrders.map(o => [
      new Date(o.created_at).toLocaleString('es-MX'),
      o.id.toUpperCase(),
      o.items.replace(/"/g, '""'), // escape quotes
      o.assigned_to_name || 'Mostrador / Planta',
      o.source === 'local' ? 'Venta Local' : o.source === 'whatsapp' ? 'WhatsApp' : 'Teléfono',
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
    link.setAttribute('download', `Historial_${selectedCustomerName.replace(/\s+/g, '_')}_${startDate}_al_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeCustomerList = getCombinedCustomerList();

  return (
    <div className="space-y-6" id="sales_history_module">
      
      {/* Module Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden border border-indigo-500/10">
        <div className="absolute right-0 top-0 w-[400px] h-[400px] bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 border border-indigo-400/20">
              <Sparkles size={12} className="text-indigo-400" /> PANEL DE AUDITORÍA
            </span>
            <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight leading-none">
              Historial de <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Ventas y Clientes</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-xl font-medium leading-relaxed">
              Consulta, filtra y descarga los historiales de consumo individuales de tus clientes. Puedes buscar por nombre, teléfono o dirección, y depurar registros si es necesario.
            </p>
          </div>
          <button 
            onClick={fetchInitialData}
            className="self-start md:self-center bg-slate-800/80 border border-slate-700/50 text-slate-300 hover:text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 hover:bg-slate-800 flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Sincronizar Datos
          </button>
        </div>
      </div>

      {/* Main Multi-panel view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Search and Customer List */}
        <div className="lg:col-span-4 bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm flex flex-col h-[650px]">
          <div className="space-y-4 mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Search size={14} className="text-slate-400" /> Buscador Inteligente
            </h3>
            <div className="relative">
              <input 
                type="text"
                placeholder="Buscar por nombre, tel o dir..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 placeholder-slate-400"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-200 hover:bg-slate-350 text-slate-500 hover:text-slate-700 transition-colors"
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

        {/* Right column: Selected Customer History & Audit */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {selectedCustomerName ? (
            <>
              {/* Customer Banner & Stats Cards */}
              <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm space-y-6">
                
                {/* Header info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-2.5 py-1 rounded-full tracking-widest border border-indigo-100">
                      CLIENTE SELECCIONADO
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
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Origen</label>
                    <select 
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      className="w-full bg-white p-3 border-none rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600 appearance-none"
                    >
                      <option value="all">TODOS</option>
                      <option value="local">VENTA LOCAL</option>
                      <option value="whatsapp">WHATSAPP</option>
                      <option value="phone">TELÉFONO</option>
                    </select>
                  </div>
                </div>

                {/* Bento Statistics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Compras Registradas</p>
                    <p className="text-xl font-black text-indigo-900 leading-tight">{customerStats.totalPurchases} pedidos</p>
                    <p className="text-[9px] text-slate-400 font-bold">En el periodo seleccionado</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Inversión Total</p>
                    <p className="text-xl font-black text-indigo-900 leading-tight">${customerStats.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Pesos MXN facturados</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 min-w-0">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Producto Favorito</p>
                    <p className="text-xs font-black text-indigo-900 leading-tight truncate uppercase" title={customerStats.favoriteItem}>
                      {customerStats.favoriteItem}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold">Más recurrente</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Última Compra</p>
                    <p className="text-sm font-black text-indigo-900 leading-tight py-0.5 uppercase">{customerStats.lastPurchase}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Fecha registrada</p>
                  </div>
                </div>
              </div>

              {/* Purchase Details Table Card */}
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm flex-1 overflow-hidden flex flex-col min-h-[350px]">
                <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" /> Registro Detallado de Compras
                  </h3>
                  <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full uppercase">
                    {selectedOrders.length} Resultados
                  </span>
                </div>

                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-50 bg-slate-50/30 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                        <th className="px-6 py-4">Fecha</th>
                        <th className="px-6 py-4">ID / Tipo</th>
                        <th className="px-6 py-4">Productos / Artículos</th>
                        <th className="px-6 py-4">Entregó</th>
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
                                    <span className={`w-1.5 h-1.5 rounded-full ${order.source === 'local' ? 'bg-indigo-500' : order.source === 'whatsapp' ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                                    {order.source === 'local' ? 'Venta Local' : order.source === 'whatsapp' ? 'WhatsApp' : 'Teléfono'}
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
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-12 text-center h-[650px] flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                <User size={24} className="text-slate-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Consulta de Historial de Ventas</h3>
                <p className="text-[11px] text-slate-400 max-w-sm font-medium">
                  Por favor, selecciona un cliente del panel lateral izquierdo para ver su historial completo de compras, estadísticas, filtros avanzados, y opciones de descarga.
                </p>
              </div>
            </div>
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
