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
  Phone,
  Plus
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

  // Modal for registering NEW borrowed jugs
  const [showNewBorrowedModal, setShowNewBorrowedModal] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newAddress, setNewAddress] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newJugsCount, setNewJugsCount] = useState<number>(1);
  const [newJugType, setNewJugType] = useState<string>('Azul 20L');
  const [newTotalPrice, setNewTotalPrice] = useState<number>(35);
  const [newAssignedDriver, setNewAssignedDriver] = useState<string>('');
  const [newAssignedRoute, setNewAssignedRoute] = useState<string>('1.- Santa Cruz');
  const [newNotes, setNewNotes] = useState<string>('');
  const [isSubmittingNew, setIsSubmittingNew] = useState<boolean>(false);
  const [employeesList, setEmployeesList] = useState<string[]>([]);

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
          
          // Exclude orders that explicitly marked is_borrowed as false and have no loan markers
          if (itemsLower.includes('[is_borrowed: false]') && 
              !itemsLower.includes('prestado') && 
              !itemsLower.includes('fiado') && 
              !itemsLower.includes('[pago garrafones fiados')) {
            return false;
          }

          const isExplicitBorrowed = o.is_borrowed === true || (Number(o.borrowed_jugs_count) > 0 && o.is_borrowed !== false);
          const isPaymentMethodBorrowed = 
            pmLower === 'borrowed' || 
            pmLower.includes('prestado') || 
            pmLower.includes('fiado');
          const isItemsBorrowed = 
            itemsLower.includes('garrafones prestados') ||
            itemsLower.includes('prestado') || 
            itemsLower.includes('fiado') || 
            itemsLower.includes('[pago garrafones fiados') ||
            itemsLower.includes('[is_borrowed: true]');
          const isPendingDebt = o.status === 'pending_payment' && (
            isPaymentMethodBorrowed ||
            isItemsBorrowed ||
            pmLower.includes('debe') || 
            itemsLower.includes('se debe') || 
            itemsLower.includes('saldo pendiente') ||
            itemsLower.includes('pago parcial')
          );
          const isMarkedBorrowedPaid = o.borrowed_paid === true || o.borrowed_status === 'paid';

          return isExplicitBorrowed || isPaymentMethodBorrowed || isItemsBorrowed || isPendingDebt || isMarkedBorrowedPaid;
        });

        setOrders(borrowedList);
      }
    } catch (err: any) {
      console.error('Error cargando garrafones fiados:', err);
    } finally {
      setLoading(false);
    }
  };

  const isOrderPaid = (o: BorrowedOrder) => {
    if (o.borrowed_paid === true) return true;
    if ((o as any).borrowed_status === 'paid') return true;
    const items = (o.items || '').toLowerCase();
    if (items.includes('[pago garrafones fiados')) return true;
    if (items.includes('[adeudo liquidado')) return true;
    if (items.includes('[pago parcial') && o.status === 'delivered') return true;
    if (o.status === 'delivered') {
      if (items.includes('pago') || items.includes('liquidado') || items.includes('cobrado')) {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    fetchBorrowedOrders();

    const fetchEmployees = async () => {
      try {
        const { data } = await supabase
          .from('employees')
          .select('name')
          .order('name');
        if (data && data.length > 0) {
          const names = Array.from(new Set(data.map((e: any) => e.name).filter(Boolean)));
          setEmployeesList(names);
        }
      } catch (_) {}
    };
    fetchEmployees();

    const channel = supabase
      .channel('borrowed_jugs_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchBorrowedOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    const todayStr = getLocalDateString();
    
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = getLocalDateString(twoDaysAgo);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = getLocalDateString(weekAgo);

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
      const isPaid = isOrderPaid(o);
      if (statusFilter === 'pending' && isPaid) return false;
      if (statusFilter === 'paid' && !isPaid) return false;

      // Period filter
      const orderDate = o.created_at ? getLocalDateString(o.created_at) : '';

      // Drivers only see last 2 days by default per policy
      if (isDriver) {
        if (orderDate && orderDate < twoDaysAgoStr) return false;
      } else {
        if (periodFilter === 'today' && orderDate !== todayStr) return false;
        if (periodFilter === '2days' && orderDate < twoDaysAgoStr) return false;
        if (periodFilter === 'week' && orderDate < weekAgoStr) return false;
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter, periodFilter, isDriver, normalizedUser]);

  // Extract count of jugs from items text or column
  const getJugsCount = (order: BorrowedOrder): number => {
    if (order.borrowed_jugs_count && Number(order.borrowed_jugs_count) > 0) {
      return Number(order.borrowed_jugs_count);
    }
    const itemsStr = order.items || '';
    const matchBorrowed = itemsStr.match(/\[GARRAFONES PRESTADOS FIADOS:\s*(\d+)\]/i) ||
                          itemsStr.match(/\[GARRAFONES PRESTADOS:\s*(\d+)\]/i) ||
                          itemsStr.match(/\[borrowed_jugs_count:\s*(\d+)\]/i);
    if (matchBorrowed && matchBorrowed[1]) {
      return parseInt(matchBorrowed[1], 10);
    }
    const match = itemsStr.match(/(\d+)\s*x/i) || itemsStr.match(/(\d+)\s*garraf/i);
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
      const isPaid = isOrderPaid(o);
      const amount = Number(o.total_price || 0);

      if (!isPaid) {
        pendingJugs += jugs;
        pendingAmount += amount;
      } else {
        const orderDate = o.created_at ? getLocalDateString(o.created_at) : '';
        const paidDate = o.borrowed_paid_at ? getLocalDateString(o.borrowed_paid_at) : '';
        const isPaidToday = paidDate === todayStr || orderDate === todayStr || (o.items && o.items.includes(todayStr));
        if (isPaidToday) {
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
      const updatedItems = `${selectedOrder.items} [PAGO GARRAFONES FIADOS REGISTRADO: $${paymentAmount} (${paymentMethod === 'cash' ? 'EFECTIVO' : 'TRANSFERENCIA'})] [COBRADO POR: ${userName || 'Repartidor'}] [FECHA COBRO: ${new Date().toLocaleDateString('es-MX')}]`;

      // 1. Try full update with optional columns
      const fullRes = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          payment_method: paymentMethod,
          items: updatedItems,
          borrowed_paid: true,
          borrowed_status: 'paid',
          borrowed_paid_at: nowIso
        })
        .eq('id', selectedOrder.id);

      // 2. Safe fallback if optional columns (payment_method, borrowed_paid, etc.) are missing
      if (fullRes.error) {
        console.warn('Fallback update for borrowed order payment:', fullRes.error.message);
        const safeRes = await supabase
          .from('orders')
          .update({
            status: 'delivered',
            items: updatedItems
          })
          .eq('id', selectedOrder.id);

        if (safeRes.error) throw safeRes.error;
      }

      // Log notification in try/catch so any log error doesn't abort the payment
      try {
        await supabase.from('notifications_log').insert([
          {
            title: '💵 Pago de Garrafones Fiados Registrado',
            message: `Se cobraron $${paymentAmount} de garrafones fiados a ${selectedOrder.customer_name}. Cobrado por ${userName || 'Repartidor'}.`,
            type: 'finance',
            user_role: 'admin',
            is_read: false
          }
        ]);
      } catch (notifErr) {
        console.warn('notifications_log insert skipped or error:', notifErr);
      }

      alert(`¡Pago de $${paymentAmount} registrado con éxito para ${selectedOrder.customer_name}!`);
      setSelectedOrder(null);
      await fetchBorrowedOrders();
    } catch (err: any) {
      alert('Error al registrar el pago: ' + err.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const resetNewBorrowedForm = () => {
    setNewCustomerName('');
    setNewAddress('');
    setNewPhone('');
    setNewJugsCount(1);
    setNewJugType('Azul 20L');
    setNewTotalPrice(35);
    setNewAssignedDriver('');
    setNewAssignedRoute('1.- Santa Cruz');
    setNewNotes('');
  };

  const handleCreateBorrowedOrder = async () => {
    if (!newCustomerName.trim()) {
      alert('Por favor ingresa el nombre del cliente');
      return;
    }
    if (newJugsCount <= 0) {
      alert('La cantidad de garrafones debe ser mayor a 0');
      return;
    }

    setIsSubmittingNew(true);
    try {
      const itemsDescription = `${newJugsCount}x Garrafón ${newJugType} [GARRAFONES PRESTADOS FIADOS: ${newJugsCount}] [Ruta: ${newAssignedRoute || '1.- Santa Cruz'}] [is_borrowed: true]${newNotes ? ` [Nota: ${newNotes.trim()}]` : ''}`;
      const nowIso = new Date().toISOString();

      const newOrderPayload: any = {
        customer_name: newCustomerName.trim(),
        address: newAddress.trim() || 'Planta / Mostrador',
        items: itemsDescription,
        total_price: Number(newTotalPrice) || 0,
        status: 'pending_payment',
        source: 'local',
        payment_method: 'Garrafones Prestados',
        is_borrowed: true,
        borrowed_jugs_count: newJugsCount,
        borrowed_paid: false,
        borrowed_status: 'pending',
        assigned_to_name: newAssignedDriver.trim() || userName || 'Planta',
        assigned_route: newAssignedRoute || '1.- Santa Cruz',
        created_at: nowIso
      };

      // 1. Try insert with full optional columns
      const res = await supabase.from('orders').insert([newOrderPayload]);
      if (res.error) {
        console.warn('Fallback insert without optional borrowed columns:', res.error.message);
        // Guaranteed safe payload with strictly validated existing columns in Supabase
        const safePayload = {
          customer_name: newOrderPayload.customer_name,
          address: newOrderPayload.address,
          items: newOrderPayload.items,
          total_price: newOrderPayload.total_price,
          status: 'pending_payment',
          source: 'local',
          assigned_to_name: newOrderPayload.assigned_to_name,
          created_at: nowIso
        };
        const fallbackRes = await supabase.from('orders').insert([safePayload]);
        if (fallbackRes.error) throw fallbackRes.error;
      }

      // Notify
      try {
        await supabase.from('notifications_log').insert([{
          title: '🪣 Garrafones Prestados Registrados',
          message: `${newJugsCount} garrafones prestados/fiados a ${newCustomerName} por ${newAssignedDriver.trim() || userName || 'Planta'}.`,
          type: 'sale',
          user_role: 'admin',
          is_read: false
        }]);
      } catch (_) {}

      alert(`¡Garrafones prestados a ${newCustomerName} registrados con éxito!`);
      setShowNewBorrowedModal(false);
      resetNewBorrowedForm();
      await fetchBorrowedOrders();
    } catch (err: any) {
      alert('Error al registrar garrafones prestados: ' + err.message);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    const columns = ['Fecha', 'Cliente', 'Dirección', 'Repartidor', 'Garrafones', 'Monto ($)', 'Estatus'];
    const data = filteredOrders.map(o => {
      const isPaid = isOrderPaid(o);
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
      const isPaid = isOrderPaid(o);
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
              onClick={() => {
                resetNewBorrowedForm();
                setShowNewBorrowedModal(true);
              }}
              className="bg-amber-400 hover:bg-amber-300 text-amber-950 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer"
            >
              <Plus size={16} strokeWidth={3} />
              Prestar Garrafones
            </button>
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
                  const isPaid = isOrderPaid(o);
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

      {/* Modal to Register NEW Borrowed Jugs */}
      <AnimatePresence>
        {showNewBorrowedModal && (
          <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                    🪣
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase">Prestar Garrafones / Fiado</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Registrar entrega fiada o préstamo de envases</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewBorrowedModal(false)}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Tienda Doña Mary / Juan Pérez"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Dirección / Ubicación
                    </label>
                    <input
                      type="text"
                      placeholder="Calle, número o referencia"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Teléfono (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="983..."
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Cantidad de Garrafones *
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
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Tipo de Garrafón
                    </label>
                    <select
                      value={newJugType}
                      onChange={(e) => setNewJugType(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
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
                      Total a Cobrar Después ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newTotalPrice}
                      onChange={(e) => setNewTotalPrice(parseFloat(e.target.value) || 0)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                      Ruta Asignada
                    </label>
                    <select
                      value={newAssignedRoute}
                      onChange={(e) => setNewAssignedRoute(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
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
                    Repartidor / Responsable
                  </label>
                  <input
                    type="text"
                    list="borrowed-employees-datalist"
                    placeholder="Nombre del repartidor o vendedor"
                    value={newAssignedDriver}
                    onChange={(e) => setNewAssignedDriver(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <datalist id="borrowed-employees-datalist">
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
                    placeholder="Ej. Dejó identificación, pasa a pagar el viernes..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewBorrowedModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmittingNew}
                  onClick={handleCreateBorrowedOrder}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingNew ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                  Registrar Fiado
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
