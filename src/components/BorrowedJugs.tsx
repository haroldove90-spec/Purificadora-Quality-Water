import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PackageCheck,
  Search,
  Filter,
  RefreshCw,
  DollarSign,
  Download,
  Calendar,
  User,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  X,
  CreditCard,
  Building,
  Check,
  MapPin,
  Phone
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { exportToPDF } from '../utils/pdfExport';
import { getLocalDateString, normalizeEmployeeName, namesMatch } from '../utils/nameHelper';

interface BorrowedJugsProps {
  userRole?: string | null;
  userName?: string | null;
}

interface BorrowedOrder {
  id: string;
  customer_name: string;
  address?: string;
  items: string;
  total_price: number;
  status: string;
  payment_method?: string;
  created_at: string;
  assigned_to_name?: string;
  is_borrowed?: boolean;
  borrowed_jugs_count?: number;
  borrowed_paid?: boolean;
  borrowed_paid_at?: string;
  source?: string;
}

export default function BorrowedJugs({ userRole = 'admin', userName }: BorrowedJugsProps) {
  const [orders, setOrders] = useState<BorrowedOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'paid' | 'all'>('pending');
  const [periodFilter, setPeriodFilter] = useState<'today' | '2days' | 'week' | 'all'>('all');
  
  // Modal for registering payment
  const [selectedOrder, setSelectedOrder] = useState<BorrowedOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  const normalizedUser = useMemo(() => {
    return userName ? normalizeEmployeeName(userName) : '';
  }, [userName]);

  const isDriver = userRole === 'driver';

  const fetchBorrowedOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Filter orders that represent borrowed jugs or pending loans
        const borrowedList = data.filter((o: any) => {
          const itemsLower = (o.items || '').toLowerCase();
          const pmLower = (o.payment_method || '').toLowerCase();
          
          const isExplicitBorrowed = o.is_borrowed === true || o.borrowed_jugs_count > 0;
          const isBorrowedText = itemsLower.includes('garrafon') && (
            itemsLower.includes('prestado') || 
            itemsLower.includes('fiado') || 
            pmLower.includes('prestado') || 
            pmLower.includes('fiado')
          );
          const isPendingLoan = o.status === 'pending_payment' && (
            pmLower.includes('prestado') || 
            pmLower.includes('fiado') || 
            pmLower.includes('debe') || 
            itemsLower.includes('prestado') || 
            itemsLower.includes('fiado')
          );

          return isExplicitBorrowed || isBorrowedText || isPendingLoan;
        });

        setOrders(borrowedList);
      }
    } catch (err: any) {
      console.error('Error cargando garrafones fiados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowedOrders();
  }, []);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    const todayStr = getLocalDateString();
    
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.toISOString().split('T')[0];

    return orders.filter(o => {
      // Driver view restriction: if role is driver, only show their assigned orders or orders created by them
      if (isDriver && normalizedUser) {
        const assignedName = o.assigned_to_name || '';
        if (!namesMatch(assignedName, normalizedUser)) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const cust = (o.customer_name || '').toLowerCase();
        const addr = (o.address || '').toLowerCase();
        const emp = (o.assigned_to_name || '').toLowerCase();
        const items = (o.items || '').toLowerCase();
        if (!cust.includes(q) && !addr.includes(q) && !emp.includes(q) && !items.includes(q)) {
          return false;
        }
      }

      // Status filter
      const isPaid = o.status === 'delivered' || o.borrowed_paid === true;
      if (statusFilter === 'pending' && isPaid) return false;
      if (statusFilter === 'paid' && !isPaid) return false;

      // Period filter
      const orderDate = o.created_at?.split('T')[0];

      // Drivers only see last 2 days by default per policy
      if (isDriver) {
        if (orderDate && orderDate < twoDaysAgoStr) return false;
      } else {
        if (periodFilter === 'today' && orderDate !== todayStr) return false;
        if (periodFilter === '2days' && orderDate < twoDaysAgoStr) return false;
        if (periodFilter === 'week' && orderDate < weekAgo.toISOString().split('T')[0]) return false;
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter, periodFilter, isDriver, normalizedUser]);

  // Extract count of jugs from items text or column
  const getJugsCount = (order: BorrowedOrder): number => {
    if (order.borrowed_jugs_count && order.borrowed_jugs_count > 0) {
      return order.borrowed_jugs_count;
    }
    const itemsStr = order.items || '';
    const match = itemsStr.match(/(\d+)\s*x/i) || itemsStr.match(/\[GARRAFONES PRESTADOS:\s*(\d+)\]/i);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return 1;
  };

  // KPIs
  const stats = useMemo(() => {
    let pendingJugs = 0;
    let pendingAmount = 0;
    let paidJugsToday = 0;
    let paidAmountToday = 0;

    const todayStr = getLocalDateString();

    orders.forEach(o => {
      const jugs = getJugsCount(o);
      const isPaid = o.status === 'delivered' || o.borrowed_paid === true;
      const amount = Number(o.total_price || 0);

      if (!isPaid) {
        pendingJugs += jugs;
        pendingAmount += amount;
      } else {
        const orderDate = o.created_at?.split('T')[0];
        if (orderDate === todayStr || o.borrowed_paid_at?.split('T')[0] === todayStr) {
          paidJugsToday += jugs;
          paidAmountToday += amount;
        }
      }
    });

    return {
      pendingJugs,
      pendingAmount,
      paidJugsToday,
      paidAmountToday
    };
  }, [orders]);

  // Open modal to pay borrowed jugs
  const handleOpenPayModal = (order: BorrowedOrder) => {
    setSelectedOrder(order);
    setPaymentAmount(Number(order.total_price || 0));
    setPaymentMethod('cash');
    setPaymentNotes('');
  };

  // Process payment of borrowed jugs
  const handleConfirmPayment = async () => {
    if (!selectedOrder) return;
    setIsProcessingPayment(true);

    try {
      const nowIso = new Date().toISOString();
      const updatedItems = `${selectedOrder.items} [PAGO GARRAFONES FIADOS REGISTRADO: $${paymentAmount} (${paymentMethod === 'cash' ? 'EFECTIVO' : 'TRANSFERENCIA'})]`;

      const { error } = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          payment_method: paymentMethod,
          items: updatedItems,
          borrowed_paid: true,
          borrowed_paid_at: nowIso
        })
        .eq('id', selectedOrder.id);

      if (error) {
        // Fallback update if borrowed_paid column isn't present
        await supabase
          .from('orders')
          .update({
            status: 'delivered',
            payment_method: paymentMethod,
            items: updatedItems
          })
          .eq('id', selectedOrder.id);
      }

      // Log notification
      await supabase.from('notifications_log').insert([
        {
          title: '💵 Pago de Garrafones Fiados Registrado',
          message: `Se cobraron $${paymentAmount} de garrafones fiados a ${selectedOrder.customer_name}. Cobrado por ${userName || 'Repartidor'}.`,
          type: 'finance',
          user_role: 'admin',
          is_read: false
        }
      ]);

      alert(`¡Pago de $${paymentAmount} registrado con éxito para ${selectedOrder.customer_name}!`);
      setSelectedOrder(null);
      await fetchBorrowedOrders();
    } catch (err: any) {
      alert('Error al registrar el pago: ' + err.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    const columns = ['Fecha', 'Cliente', 'Dirección', 'Repartidor', 'Garrafones', 'Monto ($)', 'Estatus'];
    const data = filteredOrders.map(o => {
      const isPaid = o.status === 'delivered' || o.borrowed_paid === true;
      return [
        o.created_at ? new Date(o.created_at).toLocaleDateString() : 'N/A',
        o.customer_name || 'Venta Mostrador',
        o.address || 'Local/Ruta',
        o.assigned_to_name || 'No asignado',
        `${getJugsCount(o)} Garrafones`,
        `$${Number(o.total_price || 0).toFixed(2)}`,
        isPaid ? 'PAGADO' : 'PENDIENTE'
      ];
    });

    exportToPDF({
      title: 'Reporte de Garrafones Prestados / Fiados',
      subtitle: `QualityWater Purificadora - Total Fiados por Cobrar: $${stats.pendingAmount.toFixed(2)}`,
      columns,
      data,
      filename: `Garrafones_Fiados_${getLocalDateString()}`
    });
  };

  // Export Excel / CSV
  const handleExportExcel = () => {
    const columns = ['Fecha', 'Cliente', 'Dirección', 'Repartidor', 'Garrafones', 'Monto ($)', 'Estatus', 'Detalles'];
    const data = filteredOrders.map(o => {
      const isPaid = o.status === 'delivered' || o.borrowed_paid === true;
      return [
        o.created_at ? new Date(o.created_at).toLocaleDateString() : 'N/A',
        o.customer_name || 'Venta Mostrador',
        o.address || 'Local/Ruta',
        o.assigned_to_name || 'No asignado',
        getJugsCount(o),
        Number(o.total_price || 0).toFixed(2),
        isPaid ? 'PAGADO' : 'PENDIENTE',
        o.items || ''
      ];
    });

    const csvContent = [
      columns.join(','),
      ...data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Garrafones_Fiados_${getLocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 text-white p-6 md:p-8 rounded-[36px] shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-amber-900/40 text-amber-100 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-amber-300/30">
                🪣 Control de Cuentas por Cobrar
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight">
              Garrafones <span className="text-amber-200">Fiados y Prestados</span>
            </h1>
            <p className="text-xs text-amber-100/90 font-medium max-w-xl leading-relaxed">
              Consulte el historial de garrafones prestados en ruta o planta, supervise los saldos pendientes y registre pagos al instante.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={fetchBorrowedOrders}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border border-white/20"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-white text-amber-900 hover:bg-amber-50 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg"
            >
              <Download size={14} /> PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg"
            >
              <Download size={14} /> Excel
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
              🪣
            </div>
            <span className="text-[9px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded-full">
              Pendientes
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.pendingJugs} <span className="text-xs text-slate-400">Garrafones</span></p>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Garrafones Sin Pagar</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
              <DollarSign size={18} />
            </div>
            <span className="text-[9px] font-black text-rose-600 uppercase bg-rose-50 px-2 py-0.5 rounded-full">
              Por Cobrar
            </span>
          </div>
          <p className="text-2xl font-black text-rose-600">${stats.pendingAmount.toFixed(2)}</p>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Monto Total Fiado Pendiente</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <CheckCircle2 size={18} />
            </div>
            <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full">
              Cobrados Hoy
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-600">${stats.paidAmountToday.toFixed(2)}</p>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Efectivo Recaudado Hoy</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-black">
              <PackageCheck size={18} />
            </div>
            <span className="text-[9px] font-black text-sky-600 uppercase bg-sky-50 px-2 py-0.5 rounded-full">
              Recuperados
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.paidJugsToday} <span className="text-xs text-slate-400">Garrafones</span></p>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Garrafones Liquidados Hoy</p>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por cliente, repartidor o dirección..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 text-slate-800 rounded-2xl text-xs font-bold border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Status filter */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            {[
              { id: 'pending', label: '⏳ Pendientes' },
              { id: 'paid', label: '✅ Pagados' },
              { id: 'all', label: '📋 Todos' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`py-1.5 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                  statusFilter === tab.id
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date filter (for non-drivers) */}
          {!isDriver && (
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              {[
                { id: 'today', label: 'Hoy' },
                { id: '2days', label: 'Últimos 2 Días' },
                { id: 'week', label: 'Esta Semana' },
                { id: 'all', label: 'Todo' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setPeriodFilter(tab.id as any)}
                  className={`py-1.5 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                    periodFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Borrowed Jugs Table / Card Grid */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-wider flex items-center gap-2">
            <span>🪣 Listado de Garrafones Prestados</span>
            <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
              {filteredOrders.length} registros
            </span>
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={32} />
            <p className="text-xs font-bold uppercase tracking-widest">Cargando garrafones prestados...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={40} />
            <p className="text-sm font-black text-slate-700 uppercase">Sin garrafones prestados pendientes</p>
            <p className="text-xs text-slate-400 mt-1">No se encontraron registros de garrafones fiados bajo los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/60 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Cliente / Dirección</th>
                  <th className="p-4">Repartidor</th>
                  <th className="p-4 text-center">Garrafones Prestados</th>
                  <th className="p-4 text-right">Monto ($)</th>
                  <th className="p-4 text-center">Estatus</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredOrders.map(o => {
                  const isPaid = o.status === 'delivered' || o.borrowed_paid === true;
                  const jugsCount = getJugsCount(o);

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-500 whitespace-nowrap">
                        {o.created_at ? new Date(o.created_at).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </td>

                      <td className="p-4">
                        <p className="font-extrabold text-slate-900 uppercase">{o.customer_name || 'Venta Mostrador'}</p>
                        <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-amber-500 shrink-0" />
                          {o.address || 'Planta / En Ruta'}
                        </p>
                      </td>

                      <td className="p-4">
                        <span className="font-extrabold text-slate-700 uppercase flex items-center gap-1">
                          <Truck size={12} className="text-slate-400 shrink-0" />
                          {o.assigned_to_name || 'Personal Planta'}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className="bg-amber-100 text-amber-900 font-black text-xs px-2.5 py-1 rounded-xl">
                          🪣 {jugsCount} {jugsCount === 1 ? 'Garrafón' : 'Garrafones'}
                        </span>
                      </td>

                      <td className="p-4 text-right font-black text-slate-900 text-sm font-mono">
                        ${Number(o.total_price || 0).toFixed(2)}
                      </td>

                      <td className="p-4 text-center">
                        {isPaid ? (
                          <span className="bg-emerald-100 text-emerald-800 font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 size={10} /> Pagado
                          </span>
                        ) : (
                          <span className="bg-rose-100 text-rose-800 font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full inline-flex items-center gap-1 animate-pulse">
                            <Clock size={10} /> Pendiente
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center whitespace-nowrap">
                        {!isPaid ? (
                          <button
                            onClick={() => handleOpenPayModal(o)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 mx-auto"
                          >
                            <DollarSign size={12} />
                            Cobrar
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-extrabold uppercase italic">
                            Liquidado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal to Register Payment */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[9px] font-black uppercase text-amber-600 tracking-wider">🪣 Registrar Cobro de Garrafones</span>
                  <h3 className="text-lg font-black text-slate-900 uppercase">{selectedOrder.customer_name}</h3>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 bg-amber-50/60 p-4 rounded-2xl border border-amber-100 text-xs">
                <div className="flex justify-between text-slate-700">
                  <span className="font-bold">Garrafones Prestados:</span>
                  <span className="font-black text-amber-900">🪣 {getJugsCount(selectedOrder)} Garrafones</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="font-bold">Repartidor Responsable:</span>
                  <span className="font-black">{selectedOrder.assigned_to_name || 'Planta'}</span>
                </div>
                <div className="flex justify-between text-slate-700 border-t border-amber-200/60 pt-2 font-mono">
                  <span className="font-black">Total a Cobrar:</span>
                  <span className="font-black text-base text-slate-900">${Number(selectedOrder.total_price || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Método de Cobro</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-3 px-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-2 transition-all ${
                      paymentMethod === 'cash'
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-300'
                    }`}
                  >
                    <DollarSign size={16} /> Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`py-3 px-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-2 transition-all ${
                      paymentMethod === 'transfer'
                        ? 'bg-sky-500 border-sky-500 text-white shadow-lg'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-sky-300'
                    }`}
                  >
                    <CreditCard size={16} /> Transferencia
                  </button>
                </div>
              </div>

              {/* Amount input */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Monto que entrega el cliente ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-black text-lg text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={handleConfirmPayment}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  {isProcessingPayment ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                  Confirmar Cobro
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
