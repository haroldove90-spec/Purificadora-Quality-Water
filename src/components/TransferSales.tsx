import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  Search, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Download, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle,
  Truck,
  Store,
  FileText,
  DollarSign,
  User,
  ArrowUpDown,
  Plus,
  MapPin
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { exportToPDF } from '../utils/pdfExport';
import { getOrderRoute } from '../utils/routeHelper';
import { namesMatch } from '../utils/nameHelper';

interface TransferSalesProps {
  userRole: string;
  userName?: string;
}

interface TransferOrder {
  id: string;
  customer_name: string;
  address: string;
  items: string;
  total_price: number;
  status: string;
  source?: string;
  payment_method: string;
  assigned_to_name?: string;
  assigned_route?: string;
  created_at: string;
  transfer_validated?: boolean;
  transfer_validated_by?: string;
  transfer_validated_at?: string;
  transfer_reference?: string;
}

export default function TransferSales({ userRole, userName = 'Usuario' }: TransferSalesProps) {
  const [transfers, setTransfers] = useState<TransferOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'validated'>('all');
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'week' | 'all'>('today');
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [referenceModalOrder, setReferenceModalOrder] = useState<TransferOrder | null>(null);
  const [referenceText, setReferenceText] = useState('');

  // Modal para registrar NUEVA transferencia
  const [showNewTransferModal, setShowNewTransferModal] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newAddress, setNewAddress] = useState<string>('');
  const [newJugsCount, setNewJugsCount] = useState<number>(1);
  const [newJugType, setNewJugType] = useState<string>('Azul 20L');
  const [newTotalPrice, setNewTotalPrice] = useState<number>(35);
  const [newAssignedDriver, setNewAssignedDriver] = useState<string>('');
  const [newAssignedRoute, setNewAssignedRoute] = useState<string>('1.- Santa Cruz');
  const [newReference, setNewReference] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');
  const [isSubmittingNew, setIsSubmittingNew] = useState<boolean>(false);
  const [employeesList, setEmployeesList] = useState<string[]>([]);

  const isAdminOrSupervisor = userRole === 'admin' || userRole === 'supervisor';

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Filter specifically for transfer sales
        const transferOrders = data.filter((o: any) => {
          const pm = String(o.payment_method || '').toLowerCase();
          const items = String(o.items || '').toLowerCase();
          return (
            pm === 'transfer' ||
            pm === 'transferencia' ||
            items.includes('[método de pago: transfer]') ||
            items.includes('[método de pago: transferencia]') ||
            items.includes('[payment_method: transfer') ||
            items.includes('transferencia')
          );
        }).map((o: any) => {
          const itemsStr = String(o.items || '');
          const itemsLower = itemsStr.toLowerCase();
          const isValidated = 
            o.transfer_validated === true || 
            itemsLower.includes('[transferencia validada en banco]') ||
            itemsLower.includes('transferencia validada') ||
            itemsLower.includes('transferencia avalada') ||
            itemsLower.includes('validado en banco');

          let ref = o.transfer_reference || '';
          if (!ref) {
            const m = itemsStr.match(/\[Ref:\s*([^\]]+)\]/i) || itemsStr.match(/Ref:\s*([^\s\]]+)/i);
            if (m && m[1]) ref = m[1];
          }

          return {
            ...o,
            transfer_validated: isValidated,
            transfer_reference: ref
          };
        });

        setTransfers(transferOrders);
      }
    } catch (err) {
      console.warn('Error fetching transfer sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();

    const fetchEmployees = async () => {
      try {
        const { data } = await supabase.from('employees').select('name').order('name');
        if (data && data.length > 0) {
          const names = Array.from(new Set(data.map((e: any) => e.name).filter(Boolean)));
          setEmployeesList(names);
        }
      } catch (_) {}
    };
    fetchEmployees();

    const channel = supabase
      .channel('transfer_sales_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchTransfers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const resetNewTransferForm = () => {
    setNewCustomerName('');
    setNewAddress('');
    setNewJugsCount(1);
    setNewJugType('Azul 20L');
    setNewTotalPrice(35);
    setNewAssignedDriver(userName || '');
    setNewAssignedRoute('1.- Santa Cruz');
    setNewReference('');
    setNewNotes('');
  };

  const handleCreateTransferOrder = async () => {
    if (!newCustomerName.trim()) {
      alert('Por favor ingresa el nombre del cliente');
      return;
    }
    setIsSubmittingNew(true);
    try {
      const nowIso = new Date().toISOString();
      const refTag = newReference.trim() ? ` [Ref: ${newReference.trim()}]` : '';
      const notesTag = newNotes.trim() ? ` [Nota: ${newNotes.trim()}]` : '';
      const itemsDescription = `${newJugsCount}x Garrafón ${newJugType} [MÉTODO DE PAGO: TRANSFERENCIA] [payment_method: transfer] [Ruta: ${newAssignedRoute}]${refTag}${notesTag}`;

      const payload: any = {
        customer_name: newCustomerName.trim(),
        address: newAddress.trim() || 'Ruta / Domicilio',
        items: itemsDescription,
        total_price: Number(newTotalPrice) || 0,
        status: 'delivered',
        source: 'local',
        payment_method: 'transfer',
        transfer_validated: false,
        transfer_reference: newReference.trim() || null,
        assigned_to_name: newAssignedDriver.trim() || userName || 'Planta',
        assigned_route: newAssignedRoute,
        created_at: nowIso
      };

      const res = await supabase.from('orders').insert([payload]);
      if (res.error) {
        // Fallback for missing optional columns
        const safePayload = {
          customer_name: payload.customer_name,
          address: payload.address,
          items: payload.items,
          total_price: payload.total_price,
          status: 'delivered',
          source: 'local',
          assigned_to_name: payload.assigned_to_name,
          created_at: nowIso
        };
        const fallbackRes = await supabase.from('orders').insert([safePayload]);
        if (fallbackRes.error) throw fallbackRes.error;
      }

      try {
        await supabase.from('notifications_log').insert([{
          title: '💳 Venta por Transferencia Registrada',
          message: `Venta por transferencia de $${payload.total_price} a ${payload.customer_name} registrada por ${payload.assigned_to_name}.`,
          type: 'finance',
          user_role: 'admin',
          is_read: false
        }]);
      } catch (_) {}

      alert(`¡Venta por transferencia registrada con éxito para ${newCustomerName}!`);
      setShowNewTransferModal(false);
      resetNewTransferForm();
      await fetchTransfers();
    } catch (err: any) {
      alert('Error al registrar transferencia: ' + err.message);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Handle validating a transfer (Permitido tanto a Administrador como a Repartidor)
  const handleValidateTransfer = async (order: TransferOrder, refCode?: string) => {
    setValidatingId(order.id);
    try {
      const nowIso = new Date().toISOString();
      const currentItems = order.items || '';
      const refDetail = refCode ? ` Ref: ${refCode}` : '';
      const updatedItems = currentItems.includes('[TRANSFERENCIA VALIDADA EN BANCO]')
        ? currentItems
        : `${currentItems} [TRANSFERENCIA VALIDADA EN BANCO por ${userName} el ${new Date().toLocaleDateString('es-MX')}${refDetail}]`;

      const { error } = await supabase
        .from('orders')
        .update({
          transfer_validated: true,
          transfer_validated_by: userName,
          transfer_validated_at: nowIso,
          transfer_reference: refCode || order.transfer_reference || '',
          items: updatedItems
        })
        .eq('id', order.id);

      if (error) {
        // Fallback update if columns are missing
        await supabase
          .from('orders')
          .update({
            items: updatedItems
          })
          .eq('id', order.id);
      }

      // Log notification
      try {
        await supabase.from('notifications_log').insert([{
          title: '✅ Transferencia Bancaria Validada',
          message: `Transferencia de $${order.total_price} de ${order.customer_name} fue validada por ${userName}.`,
          type: 'finance',
          user_role: 'admin',
          is_read: false
        }]);
      } catch (_) {}

      // Update state locally
      setTransfers(prev => prev.map(t => t.id === order.id ? { 
        ...t, 
        transfer_validated: true, 
        transfer_validated_by: userName,
        transfer_validated_at: nowIso,
        transfer_reference: refCode || t.transfer_reference,
        items: updatedItems
      } : t));

      setReferenceModalOrder(null);
      setReferenceText('');
    } catch (err: any) {
      alert('Error al validar la transferencia: ' + err.message);
    } finally {
      setValidatingId(null);
    }
  };

  // Filtered list
  const filteredTransfers = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA');
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);

    return transfers.filter(order => {
      // Driver restriction: strictly own sales and max 2 days
      if (userRole === 'driver') {
        const isOwn = namesMatch(order.assigned_to_name, userName);
        if (!isOwn) return false;

        const orderDate = order.created_at ? new Date(order.created_at) : null;
        if (orderDate && orderDate < twoDaysAgo) return false;
      }

      // Date filtering
      const orderDate = order.created_at ? new Date(order.created_at) : null;
      const orderDateStr = orderDate ? orderDate.toLocaleDateString('en-CA') : '';

      if (dateRange === 'today' && orderDateStr !== todayStr) return false;
      if (dateRange === 'yesterday' && orderDateStr !== yesterdayStr) return false;
      if (dateRange === 'week' && orderDate && orderDate < sevenDaysAgo) return false;

      // Status filtering
      if (statusFilter === 'pending' && order.transfer_validated) return false;
      if (statusFilter === 'validated' && !order.transfer_validated) return false;

      // Route filtering
      if (selectedRoute !== 'all') {
        const effectiveRoute = getOrderRoute(order);
        if (!effectiveRoute.toLowerCase().includes(selectedRoute.toLowerCase())) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const customer = (order.customer_name || '').toLowerCase();
        const address = (order.address || '').toLowerCase();
        const driver = (order.assigned_to_name || '').toLowerCase();
        const items = (order.items || '').toLowerCase();
        if (!customer.includes(query) && !address.includes(query) && !driver.includes(query) && !items.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [transfers, userRole, userName, dateRange, statusFilter, selectedRoute, searchTerm]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalAmount = filteredTransfers.reduce((acc, t) => acc + Number(t.total_price || 0), 0);
    const validatedTransfers = filteredTransfers.filter(t => t.transfer_validated);
    const validatedAmount = validatedTransfers.reduce((acc, t) => acc + Number(t.total_price || 0), 0);
    const pendingTransfers = filteredTransfers.filter(t => !t.transfer_validated);
    const pendingAmount = pendingTransfers.reduce((acc, t) => acc + Number(t.total_price || 0), 0);

    return {
      totalCount: filteredTransfers.length,
      totalAmount,
      validatedCount: validatedTransfers.length,
      validatedAmount,
      pendingCount: pendingTransfers.length,
      pendingAmount
    };
  }, [filteredTransfers]);

  // Export to PDF
  const handleExportPDF = () => {
    const columns = ['Fecha', 'Cliente', 'Ruta', 'Repartidor', 'Monto ($)', 'Estado Banco', 'Detalles'];
    const data = filteredTransfers.map(t => [
      t.created_at ? new Date(t.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A',
      t.customer_name || 'Venta Mostrador',
      getOrderRoute(t),
      t.assigned_to_name || 'N/A',
      `$${Number(t.total_price || 0).toFixed(2)}`,
      t.transfer_validated ? 'VALIDADA' : 'PENDIENTE',
      t.items || ''
    ]);

    exportToPDF({
      title: 'Reporte de Ventas por Transferencia Bancaria',
      subtitle: `QualityWater Purificadora - Total: $${metrics.totalAmount.toFixed(2)} | Validadas: $${metrics.validatedAmount.toFixed(2)} | Pendientes: $${metrics.pendingAmount.toFixed(2)}`,
      columns,
      data,
      filename: `Ventas_Transferencia_${new Date().toISOString().split('T')[0]}`
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
              <CreditCard size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">
                Ventas por <span className="text-indigo-600 dark:text-indigo-400">Transferencia</span>
              </h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Auditoría y Validación de Pagos Bancarios (Separados del Efectivo en Ruta)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              resetNewTransferForm();
              setShowNewTransferModal(true);
            }}
            className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={3} />
            <span>Registrar Transferencia</span>
          </button>

          <button
            onClick={fetchTransfers}
            disabled={loading}
            className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-50 font-bold transition-all shadow-sm flex items-center gap-2 text-xs uppercase cursor-pointer"
            title="Recargar transferencias"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Download size={16} />
            <span>Descargar Reporte</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Transferencias</p>
            <span className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-xl flex items-center justify-center font-black text-xs">
              {metrics.totalCount}
            </span>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">
            ${metrics.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Registradas por Repartidor/Planta</p>
        </div>

        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Validadas en Banco</p>
            <span className="w-8 h-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center font-black text-xs shadow-md shadow-emerald-500/20">
              {metrics.validatedCount}
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
            ${metrics.validatedAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase mt-1">Confirmadas por Admin/Supervisor</p>
        </div>

        <div className="bg-amber-50/60 dark:bg-amber-950/20 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/30 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Pendientes de Validar</p>
            <span className="w-8 h-8 bg-amber-500 text-white rounded-xl flex items-center justify-center font-black text-xs shadow-md shadow-amber-500/20">
              {metrics.pendingCount}
            </span>
          </div>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
            ${metrics.pendingAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] font-bold text-amber-600/70 dark:text-amber-400/70 uppercase mt-1">Por verificar ingreso en cuenta</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente, chofer o producto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-1.5">
            <Calendar size={16} className="text-slate-400 shrink-0" />
            <select
              value={dateRange}
              onChange={(e: any) => setDateRange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none w-full cursor-pointer"
            >
              <option value="today">Ventas de Hoy</option>
              <option value="yesterday">Ventas de Ayer</option>
              {userRole !== 'driver' && (
                <>
                  <option value="week">Últimos 7 Días</option>
                  <option value="all">Todas las Fechas</option>
                </>
              )}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-1.5">
            <Filter size={16} className="text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none w-full cursor-pointer"
            >
              <option value="all">Todos los Estados</option>
              <option value="pending">⏳ Solo Pendientes de Validar</option>
              <option value="validated">✅ Solo Validadas en Banco</option>
            </select>
          </div>

          {/* Route Filter */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-1.5">
            <Truck size={16} className="text-slate-400 shrink-0" />
            <select
              value={selectedRoute}
              onChange={e => setSelectedRoute(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none w-full cursor-pointer"
            >
              <option value="all">Todas las Rutas</option>
              <option value="Santa Cruz">1.- Santa Cruz</option>
              <option value="San Miguel">2.- San Miguel-Centro</option>
              <option value="La Francia">3.- La Francia-Los Reyes</option>
              <option value="Planta">4.- Planta o Local</option>
              <option value="WhatsApp">6.- WhatsApp</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table of Transfers */}
      <div className="bg-white dark:bg-slate-900 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">Fecha y Hora</th>
                <th className="py-4 px-6">Cliente y Dirección</th>
                <th className="py-4 px-6">Ruta y Repartidor</th>
                <th className="py-4 px-6">Detalle / Productos</th>
                <th className="py-4 px-6 text-right">Monto</th>
                <th className="py-4 px-6 text-center">Estado Bancario</th>
                <th className="py-4 px-6 text-right">Avalar Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredTransfers.map(t => {
                const effectiveRoute = getOrderRoute(t);
                const isVal = t.transfer_validated;
                const formattedDate = t.created_at ? new Date(t.created_at).toLocaleString('es-MX', {
                  dateStyle: 'short',
                  timeStyle: 'short'
                }) : 'N/A';

                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-bold whitespace-nowrap">
                      {formattedDate}
                    </td>

                    <td className="py-4 px-6">
                      <p className="font-black text-slate-800 dark:text-white uppercase">{t.customer_name || 'Venta Mostrador'}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-xs">{t.address || 'Sin dirección registrada'}</p>
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mb-1">
                        {effectiveRoute}
                      </span>
                      <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <User size={10} /> {t.assigned_to_name || 'Sin Asignar'}
                      </p>
                    </td>

                    <td className="py-4 px-6 max-w-xs text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      <p className="line-clamp-2">{t.items}</p>
                      {t.transfer_reference && (
                        <p className="text-[9px] font-bold text-indigo-600 mt-0.5">Ref: {t.transfer_reference}</p>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right font-black text-sm text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      ${Number(t.total_price || 0).toFixed(2)}
                    </td>

                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      {isVal ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 size={12} /> Validada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse">
                          <Clock size={12} /> Pendiente
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      {isVal ? (
                        <span className="text-[10px] font-bold text-slate-400 italic">✓ Avalada</span>
                      ) : (
                        <button
                          onClick={() => {
                            setReferenceModalOrder(t);
                            setReferenceText('');
                          }}
                          disabled={validatingId === t.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <ShieldCheck size={12} />
                          <span>Avalar Pago</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredTransfers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <CreditCard size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="text-xs font-black uppercase tracking-wider">No se encontraron ventas por transferencia</p>
                    <p className="text-[10px] text-slate-400 mt-1">Ajusta los filtros de fecha o búsqueda para ver más registros</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reference / Confirmation Modal */}
      <AnimatePresence>
        {referenceModalOrder && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReferenceModalOrder(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[36px] shadow-2xl p-7 z-[121] border border-slate-100 dark:border-slate-800 space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white uppercase italic">
                    Validar <span className="text-emerald-500">Transferencia Bancaria</span>
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Confirmar recepción del dinero en la cuenta
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Cliente:</span>
                  <span className="font-black text-slate-800 dark:text-white">{referenceModalOrder.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Monto:</span>
                  <span className="font-black text-indigo-600 text-sm">${Number(referenceModalOrder.total_price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Registrado por:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{referenceModalOrder.assigned_to_name || 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block px-1">
                  Número de Autorización o Clave de Rastreo (Opcional):
                </label>
                <input
                  type="text"
                  value={referenceText}
                  onChange={e => setReferenceText(e.target.value)}
                  placeholder="Ej. BBVA-893049 / SPEI..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReferenceModalOrder(null)}
                  className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleValidateTransfer(referenceModalOrder, referenceText)}
                  className="flex-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  Confirmar Validación
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para Registrar NUEVA Transferencia Bancaria */}
      <AnimatePresence>
        {showNewTransferModal && (
          <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center font-black">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">Registrar Venta por Transferencia</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Ingreso bancario auditado - No suma a corte de efectivo</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewTransferModal(false)}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Restaurante Los Portales / Lic. Roberto"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Dirección / Ubicación
                    </label>
                    <input
                      type="text"
                      placeholder="Calle o referencia"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Folio / Referencia Bancaria (SPEI)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. BBVA-10294 / 7482"
                      value={newReference}
                      onChange={(e) => setNewReference(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Cantidad de Garrafones
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newJugsCount}
                      onChange={(e) => {
                        const count = parseInt(e.target.value) || 1;
                        setNewJugsCount(count);
                        setNewTotalPrice(count * 35);
                      }}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Tipo de Garrafón
                    </label>
                    <select
                      value={newJugType}
                      onChange={(e) => setNewJugType(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Azul 20L">Azul 20L</option>
                      <option value="Rosa 20L">Rosa 20L</option>
                      <option value="De Color 20L">De Color 20L</option>
                      <option value="Pequeño 10L">Pequeño 10L</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Monto Total Transferido ($) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newTotalPrice}
                      onChange={(e) => setNewTotalPrice(parseFloat(e.target.value) || 0)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Ruta Asignada
                    </label>
                    <select
                      value={newAssignedRoute}
                      onChange={(e) => setNewAssignedRoute(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="1.- Santa Cruz">1.- Santa Cruz</option>
                      <option value="2.- Saban">2.- Saban</option>
                      <option value="3.- Huaymax">3.- Huaymax</option>
                      <option value="4.- Planta Local">4.- Planta Local</option>
                      <option value="5.- Llamadas telefónicas">5.- Llamadas telefónicas</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                    Repartidor / Responsable de la Venta
                  </label>
                  <input
                    type="text"
                    list="transfer-employees-datalist"
                    placeholder="Nombre del repartidor o vendedor"
                    value={newAssignedDriver}
                    onChange={(e) => setNewAssignedDriver(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <datalist id="transfer-employees-datalist">
                    {employeesList.map(emp => (
                      <option key={emp} value={emp} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                    Notas adicionales (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Envió comprobante por WhatsApp, cliente frecuente..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewTransferModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmittingNew}
                  onClick={handleCreateTransferOrder}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingNew ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Registrar Venta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
