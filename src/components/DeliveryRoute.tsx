import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  MapPin, 
  Navigation, 
  Phone, 
  CheckCircle2, 
  Minus, 
  Plus, 
  Clock, 
  MessageCircle,
  Truck,
  ArrowLeft,
  Loader2,
  Download,
  Gift,
  PackageCheck,
  CreditCard,
  DollarSign,
  Lock,
  ShoppingBag,
  X,
  Store,
  Sparkles,
  User,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Order } from '../lib/types.supabase';
import { useDriverRoute } from '../hooks/useDriverRoute';
import { handleCompleteDelivery } from '../services/deliveryService';
import { exportToPDF } from '../utils/pdfExport';
import { namesMatch } from '../utils/nameHelper';

export default function DeliveryRoute({ userRole }: { userRole?: string } = {}) {
  const [deliveries, setDeliveries] = useState<Order[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [jugsReceived, setJugsReceived] = useState(0);
  const [step, setStep] = useState(1); // 1: Route List, 2: Delivery Detail, 3: Completion
  const [completing, setCompleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'history'>('active');
  const [isDebt, setIsDebt] = useState(false);
  const [amountPaidToday, setAmountPaidToday] = useState(0);
  const [isGift, setIsGift] = useState(false);
  const [isAssignmentConfirmed, setIsAssignmentConfirmed] = useState(false);
  const [isConfirmingReceipt, setIsConfirmingReceipt] = useState(false);

  // Estados para Registro de Venta Directa en Calle (sin pedido previo)
  const [showDirectSaleModal, setShowDirectSaleModal] = useState(false);
  const [directSaleCustomerName, setDirectSaleCustomerName] = useState('');
  const [directSaleAddress, setDirectSaleAddress] = useState('');
  const [directSaleItems, setDirectSaleItems] = useState<{ [productId: string]: number }>({});
  const [directSalePaymentMethod, setDirectSalePaymentMethod] = useState<'cash' | 'transfer' | 'borrowed'>('cash');
  const [directSaleTransferRef, setDirectSaleTransferRef] = useState('');
  const [directSaleEmptiesReceived, setDirectSaleEmptiesReceived] = useState(0);
  const [directSaleSubmitting, setDirectSaleSubmitting] = useState(false);

  // Estados para Auditoría de Ruta del Administrador / Supervisor
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('all');
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);

  const isRealAdminOrSupervisor = (() => {
    try {
      const backup = JSON.parse(localStorage.getItem('quality_water_session_backup') || '{}');
      if (backup?.userRole === 'admin' || backup?.userRole === 'supervisor') return true;
    } catch (_) {}
    return userRole === 'admin' || userRole === 'supervisor';
  })();

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const columns = ['Cliente', 'Dirección', 'Artículos', 'Estatus'];
      const data = deliveries.map(d => [d.customer_name, d.address, d.items, d.status]);
      
      exportToPDF({
        title: 'Hoja de Ruta del Repartidor',
        subtitle: `Ruta: Santa Fe / Poniente - ${new Date().toLocaleDateString()}`,
        columns,
        data,
        filename: 'Hoja_Ruta'
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  // Demo: Usamos un ID de chofer fijo o el del usuario logueado
  const driverId = '00000000-0000-0000-0000-000000000000'; 
  const { openNavigation } = useDriverRoute(driverId);

  const handleOpenNavigation = (order: Order) => {
    const clientMatch = customersList.find(c => c.name === order.customer_name);
    if (clientMatch?.geolocation_url) {
      console.log('Navegando a través del enlace de ubicación guardado:', clientMatch.geolocation_url);
      window.open(clientMatch.geolocation_url, '_blank');
    } else {
      openNavigation(order);
    }
  };

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      // Cargamos registros de clientes para ver Alias y Geounicaciones en vivo
      const { data: custData } = await supabase.from('customers').select('*');
      if (custData) {
        setCustomersList(custData);
      }

      // Si es admin o supervisor, cargar lista de repartidores registrados
      if (isRealAdminOrSupervisor) {
        const { data: empData } = await supabase
          .from('employees')
          .select('*')
          .in('role', ['driver', 'repartidor'])
          .order('name');
        if (empData) setAvailableDrivers(empData);
      }

      // Restricción: Órdenes activas (sin importar fecha) + entregadas de los últimos 2 días anteriores
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(0, 0, 0, 0);
      const twoDaysAgoIso = twoDaysAgo.toISOString();

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['assigned', 'pending', 'delivered', 'pickup_assigned', 'pickup_confirmed']) 
        .or(`status.in.(assigned,pending,pickup_assigned,pickup_pending),created_at.gte.${twoDaysAgoIso}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setDeliveries(data as Order[]);
        try {
          localStorage.setItem('cached_delivery_route', JSON.stringify(data));
        } catch (_) {}
      }
    } catch (err: any) {
      console.warn('Fallo al obtener entregas de la base de datos:', err);
      // Fallback a ruta guardada localmente
      try {
        const cached = localStorage.getItem('cached_delivery_route');
        if (cached) {
          setDeliveries(JSON.parse(cached));
        }
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Carga rápida inicial de caché si existe
    try {
      const cached = localStorage.getItem('cached_delivery_route');
      if (cached) {
        setDeliveries(JSON.parse(cached));
      }
    } catch (_) {}

    fetchDeliveries();

    // Cargar confirmacion de asignacion del dia
    try {
      const today = new Date().toISOString().split('T')[0];
      const isConfirmed = localStorage.getItem(`qw_assignment_confirmed_${today}`) === 'true';
      setIsAssignmentConfirmed(isConfirmed);
    } catch (_) {}

    // Listen for new assignments
    const subscription = supabase
      .channel('delivery_route_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchDeliveries)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const getDriverRouteName = () => {
    const saved = localStorage.getItem('qw_session');
    let driverName = '';
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        driverName = parsed.user_name || '';
      } catch (_) {}
    }

    if (driverName) {
      const nameNorm = driverName.toLowerCase();
      if (nameNorm.includes('carlos') || nameNorm.includes('ruiz')) return 'Ruta Centro';
      if (nameNorm.includes('mario') || nameNorm.includes('santos')) return 'Ruta Santa Cruz';
      if (nameNorm.includes('ana') || nameNorm.includes('lopez')) return 'Ruta Norte / Altavista';
    }

    const activeNDs = deliveries.map(d => (d.neighborhood || '').trim()).filter(Boolean);
    if (activeNDs.length > 0) {
      return `Ruta ${activeNDs[0]}`;
    }

    return 'Ruta Centro';
  };

  const currentDelivery = deliveries.find(d => d.id === selectedDelivery);

  const isCollectingExistingLoan = Boolean(
    currentDelivery && (
      currentDelivery.is_borrowed === true ||
      currentDelivery.payment_method === 'Garrafones Prestados' ||
      (currentDelivery.status === 'pending_payment' && currentDelivery.items && (
        currentDelivery.items.toLowerCase().includes('prestado') ||
        currentDelivery.items.toLowerCase().includes('fiado') ||
        currentDelivery.items.toLowerCase().includes('garrafones prestados')
      ))
    )
  );

  const [products, setProducts] = useState<any[]>([]);
  const [deliveryItems, setDeliveryItems] = useState('');
  const [deliveryTotal, setDeliveryTotal] = useState(0);

  const [soldRosa, setSoldRosa] = useState(0);
  const [soldAzul, setSoldAzul] = useState(0);
  const [soldColor, setSoldColor] = useState(0);
  const [soldPequeno, setSoldPequeno] = useState(0);
  const [pequenosReceived, setPequenosReceived] = useState(0);
  const [isBorrowed, setIsBorrowed] = useState(false);
  const [paymentMethodType, setPaymentMethodType] = useState<'cash' | 'transfer'>('cash');
  const [transferReference, setTransferReference] = useState<string>('');

  const fetchProducts = async () => {
    try {
      const { data } = await supabase.from('products').select('*').order('name');
      if (data) setProducts(data);
    } catch (e) {
      console.warn('Error fetching products for driver:', e);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (step === 3 && currentDelivery) {
      setDeliveryItems(currentDelivery.items || '');
      setDeliveryTotal(currentDelivery.total_price || 0);
      setIsDebt(false);
      setIsGift(false);
      setIsBorrowed(false);
      setPaymentMethodType('cash');
      setTransferReference('');
      setAmountPaidToday(0);
      setSoldRosa(0);
      setSoldAzul(0);
      setSoldColor(0);
      setSoldPequeno(0);
      setPequenosReceived(0);
    }
  }, [step, selectedDelivery]);

  const getSessionInfo = () => {
    try {
      const saved = localStorage.getItem('qw_session');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_) {}
    return null;
  };

  const parseJsonFields = (field: any) => {
    if (!field) return {};
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (e) {
        return {};
      }
    }
    return field;
  };

  const handleUpdateSold = (type: 'azul' | 'rosa' | 'color' | 'pequeno', diff: number) => {
    let newRosa = soldRosa;
    let newAzul = soldAzul;
    let newColor = soldColor;
    let newPequeno = soldPequeno;

    if (type === 'azul') {
      newAzul = Math.max(0, soldAzul + diff);
      setSoldAzul(newAzul);
    } else if (type === 'rosa') {
      newRosa = Math.max(0, soldRosa + diff);
      setSoldRosa(newRosa);
    } else if (type === 'color') {
      newColor = Math.max(0, soldColor + diff);
      setSoldColor(newColor);
    } else if (type === 'pequeno') {
      newPequeno = Math.max(0, soldPequeno + diff);
      setSoldPequeno(newPequeno);
    }

    // Recalculate deliveryItems string
    const parts = [];
    if (newAzul > 0) parts.push(`${newAzul}x Garrafón Azul`);
    if (newRosa > 0) parts.push(`${newRosa}x Garrafón Rosa`);
    if (newColor > 0) parts.push(`${newColor}x Garrafón De Color`);
    if (newPequeno > 0) parts.push(`${newPequeno}x Garrafón Pequeño`);
    setDeliveryItems(parts.join(', '));

    // Recalculate price total dynamically based on fetched products prices
    let total = 0;
    if (products && products.length > 0) {
      const priceAzul = products.find(p => p.name.toLowerCase().includes('azul'))?.price || 35;
      const priceRosa = products.find(p => p.name.toLowerCase().includes('rosa'))?.price || 35;
      const priceColor = products.find(p => p.name.toLowerCase().includes('color'))?.price || 35;
      const pricePequeno = products.find(p => p.name.toLowerCase().includes('pequeño') || p.name.toLowerCase().includes('pequeno'))?.price || 25;

      total += newAzul * priceAzul;
      total += newRosa * priceRosa;
      total += newColor * priceColor;
      total += newPequeno * pricePequeno;
    } else {
      total += newAzul * 35;
      total += newRosa * 35;
      total += newColor * 35;
      total += newPequeno * 25;
    }
    setDeliveryTotal(total);
  };

  const updateDriverAttendanceFromDelivery = async (
    totalRegularSold: number, 
    totalSmallSold: number,
    isBorrowedDelivery: boolean = false,
    overrideEmptyJugs?: number,
    overrideEmptySmall?: number
  ) => {
    const session = getSessionInfo();
    const driverName = session?.user_name;
    if (!driverName) return;

    const today = new Date().toLocaleDateString('sv-SE');
    try {
      const { data: todayAtt } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('work_date', today);

      let existing = (todayAtt || []).find(a => namesMatch(a.user_name, driverName));
      if (!existing) {
        const { data: createdAtt } = await supabase
          .from('daily_attendance')
          .insert([{
            user_name: driverName,
            user_role: 'driver',
            work_date: today,
            check_in: new Date().toISOString(),
            last_location: { trips: [] }
          }])
          .select()
          .single();
        if (createdAtt) existing = createdAtt;
      }
      if (!existing) return;

      const lastLoc = parseJsonFields(existing.last_location);
      const trips = lastLoc.trips || [];
      const activeTrip = trips.find((t: any) => t.status === 'active');
      const emptyToCollect = overrideEmptyJugs !== undefined ? overrideEmptyJugs : jugsReceived;
      const emptySmallToCollect = overrideEmptySmall !== undefined ? overrideEmptySmall : pequenosReceived;

      if (activeTrip) {
        if (isBorrowedDelivery) {
          // Garrafones fiados: NO sumar a sold_qty (venta cobrada), sino registrar en borrowed_qty
          activeTrip.borrowed_qty = (Number(activeTrip.borrowed_qty) || 0) + totalRegularSold + totalSmallSold;
          activeTrip.borrowed_qty_regular = (Number(activeTrip.borrowed_qty_regular) || 0) + totalRegularSold;
          activeTrip.borrowed_qty_pequeno = (Number(activeTrip.borrowed_qty_pequeno) || 0) + totalSmallSold;
        } else {
          activeTrip.sold_qty = (Number(activeTrip.sold_qty) || 0) + totalRegularSold;
          activeTrip.sold_qty_pequeno = (Number(activeTrip.sold_qty_pequeno) || 0) + totalSmallSold;
        }
        activeTrip.collected_empty_qty = (Number(activeTrip.collected_empty_qty) || 0) + emptyToCollect;
        activeTrip.collected_empty_qty_pequeno = (Number(activeTrip.collected_empty_qty_pequeno) || 0) + emptySmallToCollect;
      } else {
        const newTrip = {
          id: 'T-' + Math.floor(10000 + Math.random() * 90000),
          trip_number: trips.length + 1,
          loaded_qty: totalRegularSold + totalSmallSold,
          loaded_qty_rosa: 0,
          loaded_qty_azul: totalRegularSold,
          loaded_qty_color: 0,
          loaded_qty_pequeno: totalSmallSold,
          loaded_qty_lavar: 0,
          returned_unsold_qty: 0,
          returned_empty_qty: 0,
          sold_qty: isBorrowedDelivery ? 0 : totalRegularSold,
          sold_qty_pequeno: isBorrowedDelivery ? 0 : totalSmallSold,
          borrowed_qty: isBorrowedDelivery ? (totalRegularSold + totalSmallSold) : 0,
          borrowed_qty_regular: isBorrowedDelivery ? totalRegularSold : 0,
          borrowed_qty_pequeno: isBorrowedDelivery ? totalSmallSold : 0,
          collected_empty_qty: emptyToCollect,
          collected_empty_qty_pequeno: emptySmallToCollect,
          status: 'active',
          loaded_at: new Date().toISOString()
        };
        trips.push(newTrip);
      }

      const updatedLocation = {
        ...lastLoc,
        trips: trips
      };

      await supabase
        .from('daily_attendance')
        .update({ last_location: updatedLocation })
        .eq('id', existing.id);

    } catch (err) {
      console.warn('Error updating driver attendance from delivery:', err);
    }
  };

  const catalogProducts = products.length > 0 ? products : [
    { id: 'p1', name: 'Garrafón 20L', price: 55 },
    { id: 'p2', name: 'Garrafón 10L', price: 35 },
    { id: 'p3', name: 'Botella 1.5L (Paquete 6)', price: 72 }
  ];

  const handleCreateDirectSale = async () => {
    const selectedEntries = Object.entries(directSaleItems).filter(([_, qty]) => Number(qty) > 0);
    if (selectedEntries.length === 0) {
      alert('Por favor agrega al menos 1 garrafón o producto para registrar la venta.');
      return;
    }

    setDirectSaleSubmitting(true);
    try {
      const session = getSessionInfo();
      let driverName = session?.user_name;
      if (!driverName) {
        try {
          const backup = JSON.parse(localStorage.getItem('quality_water_session_backup') || '{}');
          if (backup?.userName) driverName = backup.userName;
        } catch (_) {}
      }
      if (!driverName) driverName = 'Repartidor';

      let calculatedTotal = 0;
      let totalRegularSold = 0;
      let totalSmallSold = 0;
      const itemsTextParts: string[] = [];

      selectedEntries.forEach(([prodId, qty]) => {
        const prod = catalogProducts.find(p => p.id === prodId) || { name: 'Garrafón 20L', price: 55 };
        const price = Number(prod.price) || 0;
        calculatedTotal += price * Number(qty);
        itemsTextParts.push(`${qty}x ${prod.name}`);

        const lowerName = prod.name.toLowerCase();
        if (lowerName.includes('10l') || lowerName.includes('peque') || lowerName.includes('10 l')) {
          totalSmallSold += Number(qty);
        } else if (lowerName.includes('20l') || lowerName.includes('garraf') || lowerName.includes('20 l')) {
          totalRegularSold += Number(qty);
        }
      });

      const isBorrowed = directSalePaymentMethod === 'borrowed';
      const isTrf = directSalePaymentMethod === 'transfer';
      const totalJugsCount = totalRegularSold + totalSmallSold;
      const baseItems = itemsTextParts.join(', ');
      
      let finalItems = `${baseItems} [VENTA DIRECTA EN RUTA]`;
      if (isBorrowed) {
        finalItems = `${baseItems} [GARRAFONES PRESTADOS FIADOS: ${totalJugsCount}] [is_borrowed: true]`;
      } else if (isTrf) {
        const refStr = directSaleTransferRef.trim() ? ` [Ref: ${directSaleTransferRef.trim()}]` : '';
        finalItems = `${baseItems} [MÉTODO DE PAGO: TRANSFERENCIA]${refStr} [VENTA DIRECTA EN RUTA]`;
      }

      const orderPayload: any = {
        customer_name: directSaleCustomerName.trim() || 'Cliente en Ruta (Venta Directa)',
        address: directSaleAddress.trim() || 'Reparto / Venta en Calle',
        items: finalItems,
        total_price: calculatedTotal,
        status: isBorrowed ? 'pending_payment' : 'delivered',
        source: 'route',
        payment_method: isBorrowed ? 'Garrafones Prestados' : (isTrf ? 'transfer' : 'cash'),
        transfer_reference: isTrf ? (directSaleTransferRef.trim() || null) : null,
        is_borrowed: isBorrowed,
        borrowed_jugs_count: isBorrowed ? totalJugsCount : 0,
        borrowed_paid: false,
        borrowed_status: isBorrowed ? 'pending' : null,
        assigned_to_name: driverName,
        assigned_route: getDriverRouteName(),
        created_at: new Date().toISOString()
      };

      const { error: insErr } = await supabase.from('orders').insert([orderPayload]);
      if (insErr) {
        console.warn('Error guardando venta directa en Supabase:', insErr);
        // Respaldo offline
        try {
          const offlineList = JSON.parse(localStorage.getItem('pending_offline_sales') || '[]');
          offlineList.push(orderPayload);
          localStorage.setItem('pending_offline_sales', JSON.stringify(offlineList));
        } catch (_) {}
      }

      // Actualizar viaje del chofer
      await updateDriverAttendanceFromDelivery(
        totalRegularSold,
        totalSmallSold,
        isBorrowed,
        directSaleEmptiesReceived,
        0
      );

      // Notificaciones
      if (isTrf) {
        await supabase.from('notifications_log').insert([{
          title: '💳 Venta por Transferencia en Ruta',
          message: `${driverName} cobró $${calculatedTotal} por transferencia de ${orderPayload.customer_name}${directSaleTransferRef ? ` (Ref: ${directSaleTransferRef})` : ''}.`,
          type: 'transfer',
          user_role: 'admin',
          is_read: false
        }]);
      } else if (isBorrowed) {
        await supabase.from('notifications_log').insert([{
          title: '📦 Garrafón Fiado en Ruta',
          message: `${driverName} prestó ${totalJugsCount} garrafón(es) fiado(s) a ${orderPayload.customer_name}. Total: $${calculatedTotal}.`,
          type: 'borrowed',
          user_role: 'admin',
          is_read: false
        }]);
      }

      // Resetear estado
      setDirectSaleItems({});
      setDirectSaleCustomerName('');
      setDirectSaleAddress('');
      setDirectSalePaymentMethod('cash');
      setDirectSaleTransferRef('');
      setDirectSaleEmptiesReceived(0);
      setShowDirectSaleModal(false);

      await fetchDeliveries();
      alert(`✅ ¡Venta en calle registrada con éxito por $${calculatedTotal.toFixed(2)}!\n\nLos garrafones se descontaron de tu viaje activo y se sumaron a tu corte.`);
    } catch (e: any) {
      alert('Error al registrar venta directa: ' + e.message);
    } finally {
      setDirectSaleSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedDelivery || !currentDelivery) return;
    setCompleting(true);
    
    const totalRegularSold = soldAzul + soldRosa + soldColor;
    const totalSmallSold = soldPequeno;
    
    try {
      if (isGift) {
        const result = await handleCompleteDelivery(selectedDelivery, `${deliveryItems} [OBSEQUIO/REGALO]`, 0, 'delivered');
        if (result.success) {
          await updateDriverAttendanceFromDelivery(totalRegularSold, totalSmallSold);
          await fetchDeliveries();
          setStep(1);
          setSelectedDelivery(null);
        } else {
          alert('Error al confirmar obsequio: ' + result.error);
        }
      } else if (isBorrowed) {
        const totalJugsCount = totalRegularSold + totalSmallSold || 1;
        const result = await handleCompleteDelivery(
          selectedDelivery,
          `${deliveryItems} [GARRAFONES PRESTADOS FIADOS: ${totalJugsCount}] [is_borrowed: true]`,
          deliveryTotal,
          'pending_payment',
          {
            payment_method: 'Garrafones Prestados',
            is_borrowed: true,
            borrowed_jugs_count: totalJugsCount,
            borrowed_paid: false,
            borrowed_status: 'pending'
          }
        );
        if (result.success) {
          await updateDriverAttendanceFromDelivery(totalRegularSold, totalSmallSold, true);
          await fetchDeliveries();
          setStep(1);
          setSelectedDelivery(null);
        } else {
          alert('Error al registrar garrafones prestados: ' + result.error);
        }
      } else if (isCollectingExistingLoan) {
        // Cobro de garrafón prestado (fiado) previamente registrado
        const session = getSessionInfo();
        const driverName = session?.user_name || 'Repartidor';
        const nowIso = new Date().toISOString();
        const isTrf = paymentMethodType === 'transfer';
        const refStr = transferReference.trim() ? ` [Ref: ${transferReference.trim()}]` : '';
        const methodTag = isTrf ? `(TRANSFERENCIA)${refStr} [MÉTODO DE PAGO: TRANSFERENCIA] [payment_method: transfer]` : `(EFECTIVO)`;
        const paymentTag = `[PAGO GARRAFONES FIADOS REGISTRADO: $${deliveryTotal} ${methodTag}] [COBRADO POR: ${driverName}] [FECHA COBRO: ${new Date().toLocaleDateString('es-MX')}]`;
        const updatedItems = `${currentDelivery.items} ${paymentTag}`;
        
        const result = await handleCompleteDelivery(
          selectedDelivery,
          updatedItems,
          deliveryTotal,
          'delivered',
          {
            borrowed_paid: true,
            borrowed_status: 'paid',
            borrowed_paid_at: nowIso,
            payment_method: isTrf ? 'transfer' : 'cash',
            transfer_reference: isTrf ? (transferReference.trim() || null) : null,
            transfer_validated: false
          }
        );
        if (result.success) {
          // Garrafón fiado cobrado: NO debe sumar a sold_qty del viaje diario
          await fetchDeliveries();
          setStep(1);
          setSelectedDelivery(null);
          alert(`¡Cobro de garrafón fiado por $${deliveryTotal} registrado con éxito!`);
        } else {
          alert('Error al registrar cobro de fiado: ' + result.error);
        }
      } else if (isDebt) {
        const debtAmount = Number(deliveryTotal) - Number(amountPaidToday);
        if (debtAmount <= 0) {
          // No debt in practice
          const result = await handleCompleteDelivery(selectedDelivery, deliveryItems, deliveryTotal, 'delivered');
          if (result.success) {
            await updateDriverAttendanceFromDelivery(totalRegularSold, totalSmallSold);
            await fetchDeliveries();
            setStep(1);
            setSelectedDelivery(null);
          } else {
            alert('Error al confirmar entrega: ' + result.error);
          }
        } else if (Number(amountPaidToday) <= 0) {
          // Fully pending payment
          const result = await handleCompleteDelivery(selectedDelivery, `${deliveryItems} (Se debe)`, deliveryTotal, 'pending_payment');
          if (result.success) {
            await updateDriverAttendanceFromDelivery(totalRegularSold, totalSmallSold);
            await fetchDeliveries();
            setStep(1);
            setSelectedDelivery(null);
          } else {
            alert('Error al registrar saldo pendiente: ' + result.error);
          }
        } else {
          // Split into paid portion and unpaid portion (debt)
          const result = await handleCompleteDelivery(selectedDelivery, `${deliveryItems} [PAGO PARCIAL]`, Number(amountPaidToday), 'delivered');
          if (result.success) {
            await updateDriverAttendanceFromDelivery(totalRegularSold, totalSmallSold);
            // Write cumulative debt remainder order
            const { error: insertErr } = await supabase
              .from('orders')
              .insert([
                {
                  customer_name: currentDelivery.customer_name,
                  address: currentDelivery.address,
                  items: `${deliveryItems} [SALDO PENDIENTE]`,
                  total_price: debtAmount,
                  status: 'pending_payment',
                  source: currentDelivery.source || 'pos',
                  assigned_to: currentDelivery.assigned_to || null,
                  assigned_to_name: currentDelivery.assigned_to_name || null,
                  created_at: new Date().toISOString()
                }
              ]);
            
            if (insertErr) {
              console.warn('Error inserting pending_payment Order partition:', insertErr);
            }
            
            await fetchDeliveries();
            setStep(1);
            setSelectedDelivery(null);
          } else {
            alert('Error al registrar pago parcial: ' + result.error);
          }
        }
      } else if (paymentMethodType === 'transfer') {
        const refStr = transferReference.trim() ? ` [Ref: ${transferReference.trim()}]` : '';
        const transferItems = `${deliveryItems} [MÉTODO DE PAGO: TRANSFERENCIA] [payment_method: transfer]${refStr}`;
        const result = await handleCompleteDelivery(
          selectedDelivery, 
          transferItems, 
          deliveryTotal, 
          'delivered',
          {
            payment_method: 'transfer',
            transfer_reference: transferReference.trim() || null,
            transfer_validated: false
          }
        );
        if (result.success) {
          await updateDriverAttendanceFromDelivery(totalRegularSold, totalSmallSold);
          await fetchDeliveries();
          setStep(1);
          setSelectedDelivery(null);
          alert(`¡Entrega pagada por transferencia de $${deliveryTotal} registrada con éxito! (No suma a tu efectivo de entrega)`);
        } else {
          alert('Error al confirmar entrega por transferencia: ' + result.error);
        }
      } else {
        const result = await handleCompleteDelivery(selectedDelivery, deliveryItems, deliveryTotal, 'delivered');
        if (result.success) {
          await updateDriverAttendanceFromDelivery(totalRegularSold, totalSmallSold);
          await fetchDeliveries();
          setStep(1);
          setSelectedDelivery(null);
        } else {
          alert('Error al confirmar entrega: ' + result.error);
        }
      }
    } catch (err: any) {
      console.error('Error in handleComplete:', err);
      alert('Error inesperado: ' + err.message);
    } finally {
      setCompleting(false);
    }
  };

  const handleCompletePickup = async () => {
    if (!selectedDelivery || !currentDelivery) return;
    setCompleting(true);
    try {
      const itemsString = pequenosReceived > 0 
        ? `${jugsReceived} G. Grandes y ${pequenosReceived} G. Pequeños p/Lavado (Recogidos por ${currentDelivery.assigned_to_name || 'Repartidor'})`
        : `${jugsReceived} Garrafones p/Lavado (Recogidos por ${currentDelivery.assigned_to_name || 'Repartidor'})`;

      const { error } = await supabase
        .from('orders')
        .update({
          items: itemsString,
          status: 'pickup_confirmed' // Transferred to pickup_confirmed state
        })
        .eq('id', selectedDelivery);
        
      if (error) throw error;

      await updateDriverAttendanceFromDelivery(0, 0);

      const notifMsg = pequenosReceived > 0
        ? `${currentDelivery.assigned_to_name || 'Repartidor'} recogió ${jugsReceived} g. grandes y ${pequenosReceived} g. pequeños vacíos de ${currentDelivery.customer_name} y va de regreso a planta.`
        : `${currentDelivery.assigned_to_name || 'Repartidor'} recogió ${jugsReceived} garrafones vacíos de ${currentDelivery.customer_name} y va de regreso a planta.`;

      // Log notifications to plant/admin
      await supabase.from('notifications_log').insert([
        {
          title: 'Garrafones Recogidos 🔄',
          message: notifMsg,
          type: 'order',
          user_role: 'admin'
        },
        {
          title: 'Garrafones Recogidos 🔄',
          message: notifMsg,
          type: 'order',
          user_role: 'operator'
        }
      ]);

      await fetchDeliveries();
      setStep(1);
      setSelectedDelivery(null);
    } catch (err: any) {
      console.error('Error confirming pickup:', err);
      alert('Error al confirmar recolección: ' + (err.message || 'Verifica tu conexión'));
    } finally {
      setCompleting(false);
    }
  };

  // Obtener nombre del chofer de la sesión para filtrar pedidos
  const getLoggedInDriverName = () => {
    try {
      const saved = localStorage.getItem('qw_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.user_name || '';
      }
    } catch (_) {}
    return '';
  };

  const loggedInDriver = getLoggedInDriverName();

  // Filtrar estrictamente si pertenece al chofer (o permitir al admin supervisar cualquier chofer)
  const driverDeliveries = deliveries.filter(d => {
    if (isRealAdminOrSupervisor) {
      if (selectedDriverFilter === 'all') return true;
      return namesMatch(d.assigned_to_name, selectedDriverFilter);
    }
    // Si no hay chofer logueado (sesión vacía), se muestra todo
    if (!loggedInDriver) return true;
    
    // El chofer solo ve pedidos estrictamente asignados a su nombre
    return namesMatch(d.assigned_to_name, loggedInDriver);
  });

  // Dividir en Active (incluyendo pickup_assigned, assigned, pending, pickup_pending) vs Completed (Últimos 2 días)
  const activeDeliveries = driverDeliveries.filter(d => 
    d.status === 'assigned' || d.status === 'pending' || d.status === 'pickup_assigned' || d.status === 'pickup_pending'
  );

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  twoDaysAgo.setHours(0, 0, 0, 0);

  const completedDeliveries = driverDeliveries.filter(d => {
    if (d.status !== 'delivered' && d.status !== 'pickup_confirmed') return false;
    // Driver history limited strictly to the last 2 days
    const createdDate = new Date(d.created_at || d.updated_at || Date.now());
    return createdDate >= twoDaysAgo;
  });


  const displayedDeliveries = activeSubTab === 'active' ? activeDeliveries : completedDeliveries;

  const handleConfirmAssignmentReceipt = async () => {
    setIsConfirmingReceipt(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const driverName = getLoggedInDriverName() || 'Repartidor';

      // Insert notifications for Admin and Supervisor
      const notifications = [
        {
          title: `🚚 ${driverName} recibió asignación`,
          message: `El repartidor ha confirmado la recepción de sus ${activeDeliveries.length} pedidos y ya se va a poner a trabajar en ruta.`,
          type: 'order',
          user_role: 'admin'
        },
        {
          title: `🚚 ${driverName} recibió asignación`,
          message: `El repartidor ha confirmado la recepción de sus ${activeDeliveries.length} pedidos y ya se va a poner a trabajar en ruta.`,
          type: 'order',
          user_role: 'supervisor'
        }
      ];

      const { error } = await supabase.from('notifications_log').insert(notifications);
      if (error) throw error;

      localStorage.setItem(`qw_assignment_confirmed_${today}`, 'true');
      setIsAssignmentConfirmed(true);
      alert('¡Asignación confirmada! Los administradores y supervisores han sido notificados. ¡Excelente jornada!');
    } catch (e: any) {
      alert('Error al confirmar: ' + e.message);
    } finally {
      setIsConfirmingReceipt(false);
    }
  };

  if (loading && !deliveries.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Loader2 size={32} className="animate-spin mb-4" />
        <p className="font-black uppercase tracking-widest text-xs">Cargando tu ruta...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pb-24 h-full overflow-y-auto no-scrollbar">
      {/* Selector de Ruta para Administrador / Supervisor en Modo Auditoría */}
      {isRealAdminOrSupervisor && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-500 text-slate-900 rounded-md font-black text-[9px] uppercase tracking-wider">
              Supervisión
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider">
              Ruta Chofer:
            </span>
          </div>
          <select
            value={selectedDriverFilter}
            onChange={e => setSelectedDriverFilter(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-amber-400/60 dark:border-amber-700 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
          >
            <option value="all">Todos los Choferes ({deliveries.length})</option>
            {availableDrivers.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Driver Context Header */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center">
              <Truck size={24} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ruta Asignada</p>
              <p className="text-lg font-black italic">{getDriverRouteName()}</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <button 
              onClick={handleExportPDF}
              disabled={isExporting || deliveries.length === 0}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
              Hoja de Ruta
            </button>
            <div>
              <p className="text-2xl font-black text-sky-400">
                {completedDeliveries.length}/{driverDeliveries.length}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Entregas</p>
            </div>
          </div>
        </div>
        
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-sky-500 h-full transition-all duration-500" 
            style={{ width: `${(completedDeliveries.length / Math.max(1, driverDeliveries.length)) * 100}%` }}
          />
        </div>
      </div>

      {/* Botón de Venta Directa en Ruta / Calle */}
      <div className="bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 text-white p-4 rounded-3xl shadow-xl shadow-sky-500/25 flex items-center justify-between gap-3 border border-sky-400/40">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sky-100">
            <Sparkles size={12} className="animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest block truncate">
              Venta Directa en Ruta
            </span>
          </div>
          <p className="text-sm font-black uppercase italic truncate text-white">¿Cliente al paso en la calle?</p>
        </div>
        <button
          onClick={() => setShowDirectSaleModal(true)}
          className="bg-white hover:bg-sky-50 active:scale-95 text-sky-700 font-black text-xs uppercase tracking-wider px-4 py-3 rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={16} className="text-sky-600 stroke-[3]" />
          <span>+ Registrar Venta</span>
        </button>
      </div>

      {/* MODAL DE VENTA DIRECTA EN RUTA */}
      {showDirectSaleModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 max-h-[90vh] overflow-y-auto space-y-5 animate-scale-up">
            
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Venta Directa en Calle
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Cobro inmediato y descuento de garrafones en ruta
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDirectSaleModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Selector de Productos */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                1. Selecciona los Productos a Entregar
              </label>
              <div className="space-y-2">
                {catalogProducts.map(prod => {
                  const currentQty = directSaleItems[prod.id] || 0;
                  return (
                    <div 
                      key={prod.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        currentQty > 0 
                          ? 'bg-sky-50/60 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800' 
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-white uppercase">{prod.name}</p>
                        <p className="text-[11px] font-bold text-sky-600 dark:text-sky-400">${Number(prod.price).toFixed(2)} c/u</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDirectSaleItems(prev => ({
                              ...prev,
                              [prod.id]: Math.max(0, (prev[prod.id] || 0) - 1)
                            }));
                          }}
                          disabled={currentQty <= 0}
                          className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-slate-600 dark:text-slate-300 disabled:opacity-40"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-black text-base text-slate-900 dark:text-white">
                          {currentQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setDirectSaleItems(prev => {
                              const newQty = (prev[prod.id] || 0) + 1;
                              setDirectSaleEmptiesReceived(prevEmp => prevEmp + 1);
                              return {
                                ...prev,
                                [prod.id]: newQty
                              };
                            });
                          }}
                          className="w-8 h-8 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white flex items-center justify-center font-black shadow-sm"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total a Cobrar */}
            {(() => {
              const total = Object.entries(directSaleItems).reduce((acc, [pId, q]) => {
                const prod = catalogProducts.find(p => p.id === pId);
                return acc + (Number(prod?.price || 0) * q);
              }, 0);
              return (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider block">
                      Total de la Venta
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {directSalePaymentMethod === 'borrowed' ? 'Se registra como Fiado' : 'Monto a Cobrar'}
                    </span>
                  </div>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    ${total.toFixed(2)}
                  </span>
                </div>
              );
            })()}

            {/* Datos del Cliente */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                2. Datos del Cliente / Lugar (Opcional)
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={directSaleCustomerName}
                  onChange={e => setDirectSaleCustomerName(e.target.value)}
                  placeholder="Nombre o Alias (Ejem: Doña Martha, Taller Mecánico, etc.)"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-sky-500"
                />
                <input
                  type="text"
                  value={directSaleAddress}
                  onChange={e => setDirectSaleAddress(e.target.value)}
                  placeholder="Calle o Referencia (Ejem: Calle Hidalgo esq. Morelos)"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Método de Pago */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                3. Forma de Pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDirectSalePaymentMethod('cash')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    directSalePaymentMethod === 'cash'
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <DollarSign size={18} className="mx-auto mb-1" />
                  <span className="text-[10px] font-black uppercase block">Efectivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDirectSalePaymentMethod('transfer')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    directSalePaymentMethod === 'transfer'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <CreditCard size={18} className="mx-auto mb-1" />
                  <span className="text-[10px] font-black uppercase block">Transferencia</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDirectSalePaymentMethod('borrowed')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    directSalePaymentMethod === 'borrowed'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <PackageCheck size={18} className="mx-auto mb-1" />
                  <span className="text-[10px] font-black uppercase block">Fiado</span>
                </button>
              </div>

              {directSalePaymentMethod === 'transfer' && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/50 space-y-1.5 animate-fade-in">
                  <label className="text-[9px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest block">
                    Folio o Referencia de Transferencia (SPEI)
                  </label>
                  <input
                    type="text"
                    value={directSaleTransferRef}
                    onChange={e => setDirectSaleTransferRef(e.target.value)}
                    placeholder="Ejem: 123456 o Últimos 4 dígitos"
                    className="w-full bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 p-2 rounded-lg text-xs font-bold text-slate-800 dark:text-white outline-none"
                  />
                </div>
              )}
            </div>

            {/* Envases Vacíos Recogidos */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                4. Envases Vacíos Recibidos
              </label>
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex-1">
                  ¿Cuántos cascos vacíos te entregó el cliente?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDirectSaleEmptiesReceived(prev => Math.max(0, prev - 1))}
                    className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-black"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center font-black text-sm text-slate-800 dark:text-white">
                    {directSaleEmptiesReceived}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDirectSaleEmptiesReceived(prev => prev + 1)}
                    className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center font-black"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Botón de Confirmación */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCreateDirectSale}
                disabled={directSaleSubmitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-sm uppercase py-4 rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {directSaleSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Guardando Venta en Ruta...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Confirmar y Cobrar Venta</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Acceso Directo a Cierre de Ventas Diario */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-3xl shadow-lg border border-indigo-900/50 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block truncate">
            {completedDeliveries.length} entregas realizadas hoy
          </span>
          <p className="text-xs font-black uppercase italic truncate">Liquidación y Cierre de Caja</p>
        </div>
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('navigate-view', { detail: 'cash_float' }));
          }}
          className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-2xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Lock size={12} />
          <span>Cerrar Mi Venta</span>
        </button>
      </div>

      {step === 1 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Sub-Tabs Switcher para el repartidor */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl mb-2">
            <button
              onClick={() => setActiveSubTab('active')}
              className={`py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                activeSubTab === 'active'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Solicitudes de Ruta 🚚 ({activeDeliveries.length})
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                activeSubTab === 'history'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Historial de Registros 📋 ({completedDeliveries.length})
            </button>
          </div>

          {/* Confirm Assignment Banner */}
          {!isAssignmentConfirmed && activeDeliveries.length > 0 && activeSubTab === 'active' && (
            <div className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white p-6 rounded-3xl shadow-xl flex flex-col gap-4 border border-sky-400/20 relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                <span className="text-[9px] font-black bg-white/20 px-2.5 py-1 rounded-full uppercase tracking-widest inline-block">
                  ⚠️ CONFIRMACIÓN REQUERIDA
                </span>
                <h3 className="text-base font-black uppercase italic">¿Recibiste tus Entregas de Hoy?</h3>
                <p className="text-[11px] text-sky-100 font-bold leading-relaxed">
                  Tienes <strong>{activeDeliveries.length}</strong> pedidos/recojos asignados en tu ruta de hoy. Por favor, confirma que los has recibido para informar a tus administradores y supervisores que inicias operaciones.
                </p>
              </div>
              <button
                onClick={handleConfirmAssignmentReceipt}
                disabled={isConfirmingReceipt}
                className="w-full bg-white text-indigo-700 hover:bg-sky-50 py-3.5 px-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 relative z-10 cursor-pointer"
              >
                {isConfirmingReceipt ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Confirmando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirmar Recepción e Iniciar Ruta 🚀</span>
                  </>
                )}
              </button>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            </div>
          )}

          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
              {activeSubTab === 'active' ? 'Próximas Paradas o Recojos' : 'Historial de Paradas'}
            </h2>
            <span className="flex items-center gap-1 text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-1 rounded-lg">
              {activeDeliveries.length} PENDIENTES
            </span>
          </div>

          <div className="space-y-3">
            {displayedDeliveries.map((delivery) => {
              const clientMatch = customersList.find(c => c.name === delivery.customer_name || delivery.customer_name.endsWith(c.name));
              const isCompleted = delivery.status === 'delivered' || delivery.status === 'pickup_confirmed';
              return (
                <div 
                  key={delivery.id}
                  onClick={() => {
                    if (!isCompleted) {
                      setSelectedDelivery(delivery.id);
                      setStep(2);
                    }
                  }}
                  className={`bg-white p-5 rounded-3xl border border-slate-200 shadow-sm transition-all cursor-pointer group ${
                    isCompleted ? 'opacity-50 grayscale pointer-events-none' : 'hover:border-sky-505'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2" translate="no">
                        <h3 className="text-lg font-black text-slate-805 leading-none">{delivery.customer_name.replace('🔄 [RECOGER] ', '')}</h3>
                        {clientMatch?.alias && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-sm border border-amber-200 shrink-0">
                            {clientMatch.alias}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 font-bold mt-2 flex items-center gap-1 text-xs italic">
                        <MapPin size={12} className="text-rose-500 shrink-0" /> 
                        <span className="truncate w-40 text-left">{delivery.address}</span>
                      </p>
                    </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-sky-600 uppercase">
                      {new Date(delivery.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg uppercase tracking-wider ${
                      delivery.status === 'delivered' ? 'bg-emerald-100 text-emerald-600' :
                      delivery.status === 'pickup_assigned' ? 'bg-indigo-150 text-indigo-700 bg-indigo-50 border border-indigo-200 animate-pulse' :
                      delivery.status === 'pickup_confirmed' ? 'bg-amber-100 text-amber-700' :
                      'bg-sky-100 text-sky-600'
                    }`}>
                      {
                        delivery.status === 'pickup_assigned' ? 'Recoger' :
                        delivery.status === 'pickup_confirmed' ? 'Recogido ✔' :
                        'Entrega'
                      }
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] bg-slate-50 text-slate-500 px-2 py-1 rounded-lg font-bold">
                      {delivery.items}
                    </span>
                    {(delivery.is_borrowed || delivery.payment_method === 'Garrafones Prestados' || (delivery.items && (delivery.items.toLowerCase().includes('prestado') || delivery.items.toLowerCase().includes('fiado')))) && (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 font-black text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wide">
                        🪣 Garrafones Prestados (Fiado)
                      </span>
                    )}
                    {(delivery.payment_method === 'Obsequio / Regalo' || (delivery.items && (delivery.items.toLowerCase().includes('obsequio') || delivery.items.toLowerCase().includes('regalo')))) && (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wide">
                        🎁 Obsequio / Regalo
                      </span>
                    )}
                    {delivery.status === 'pending_payment' && !delivery.is_borrowed && delivery.payment_method !== 'Garrafones Prestados' && (
                      <span className="bg-rose-100 text-rose-800 border border-rose-300 font-black text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wide">
                        ⚠️ Saldo Pendiente (Adeudo)
                      </span>
                    )}
                  </div>
                  {!isCompleted && (
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                      <ArrowLeft size={16} className="rotate-180" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </motion.div>
      ) : step === 2 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <button 
            onClick={() => setStep(1)}
            className="flex items-center gap-2 text-slate-400 font-bold text-sm min-h-[44px]"
          >
            <ArrowLeft size={16} /> Volver a la Lista
          </button>

          <div className="bg-white p-6 rounded-3xl border-2 border-sky-100 shadow-xl shadow-sky-900/5">
            {(() => {
              const currentClientMatch = customersList.find(c => c.name === currentDelivery?.customer_name);
              return (
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{currentDelivery?.customer_name}</h3>
                      {currentClientMatch?.alias && (
                        <span className="bg-amber-100 text-amber-800 text-xs font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm border border-amber-200 shrink-0">
                          {currentClientMatch.alias}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 font-bold mt-2 flex items-center gap-1 italic leading-tight">
                      <MapPin size={14} className="text-rose-500 shrink-0" /> {currentDelivery?.address}
                    </p>
                  </div>
                  <div className="bg-sky-50 text-sky-600 px-3 py-1 rounded-xl text-xs font-black uppercase whitespace-nowrap">
                    {currentDelivery?.status}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-3 mb-8">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">Artículos a Entregar</p>
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                <span className="text-sm font-bold text-slate-700">{currentDelivery?.items}</span>
                <span className="text-lg font-black text-sky-600">${currentDelivery?.total_price.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => currentDelivery && handleOpenNavigation(currentDelivery)}
                className="flex flex-col items-center justify-center gap-2 bg-slate-100 p-4 rounded-2xl hover:bg-slate-200 transition-all min-h-[44px]"
              >
                <Navigation size={20} className="text-sky-600" />
                <span className="text-[10px] font-black uppercase text-slate-600">Navegar</span>
              </button>
              <button 
                onClick={() => currentDelivery?.whatsapp_number && window.open(`https://wa.me/${currentDelivery.whatsapp_number.replace(/\D/g, '')}`, '_blank')}
                className="flex flex-col items-center justify-center gap-2 bg-slate-100 p-4 rounded-2xl hover:bg-slate-200 transition-all min-h-[44px]"
              >
                <Phone size={20} className="text-emerald-600" />
                <span className="text-[10px] font-black uppercase text-slate-600">Llamar</span>
              </button>
            </div>

            <button 
              onClick={() => setStep(3)}
              className="w-full bg-sky-500 text-white mt-6 py-5 rounded-2xl font-black text-lg shadow-xl shadow-sky-500/30 active:scale-95 transition-all min-h-[44px]"
            >
              Llegué al Domicilio
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-3xl border-2 border-emerald-100 shadow-xl shadow-emerald-900/5 mb-6 animate-fade-in"
        >
          <button 
            onClick={() => setStep(2)}
            className="mb-4 flex items-center gap-2 text-slate-400 font-bold text-sm min-h-[44px]"
          >
            <ArrowLeft size={16} /> Volver
          </button>

          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <CheckCircle2 className={currentDelivery?.status === 'pickup_assigned' ? "text-indigo-500" : "text-emerald-500"} /> 
            {currentDelivery?.status === 'pickup_assigned' ? 'Confirmar Recogida' : isCollectingExistingLoan ? 'Cobrar Garrafón Fiado' : 'Finalizar Entrega'}
          </h3>

          {isCollectingExistingLoan && (
            <div className="bg-amber-50 p-4 rounded-3xl border border-amber-200 text-left space-y-1 mb-4">
              <p className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <PackageCheck size={16} className="text-amber-600" />
                Cobro de Garrafones Prestados (Fiado Pendiente)
              </p>
              <p className="text-[10px] text-amber-800 font-semibold">
                Este pedido corresponde a garrafones prestados anteriormente por ${(currentDelivery?.total_price || 0).toFixed(2)}. Al confirmar, se registrará como cobro de fiado en tu corte sin sumar a tu venta de garrafones de hoy.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {/* Envases Vacíos Recibidos */}
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 text-center space-y-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  {currentDelivery?.status === 'pickup_assigned' ? 'Garrafones para Lavado Recogidos' : 'Envases Vacíos Recibidos'}
                </p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Registra los envases vacíos recogidos en esta visita</p>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {/* Grandes */}
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase mb-2">🔵 Grandes 20L</span>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setJugsReceived(Math.max(0, jugsReceived - 1))}
                      className="w-8 h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 active:bg-slate-100 min-h-[44px] cursor-pointer"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-xl font-black text-slate-950 w-6 text-center">{jugsReceived}</span>
                    <button 
                      type="button"
                      onClick={() => setJugsReceived(jugsReceived + 1)}
                      className={currentDelivery?.status === 'pickup_assigned' ? "w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white active:bg-indigo-700 min-h-[44px] cursor-pointer" : "w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center text-white active:bg-sky-600 min-h-[44px] cursor-pointer"}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Pequeños */}
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase mb-2">🍼 Pequeños 10L</span>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setPequenosReceived(Math.max(0, pequenosReceived - 1))}
                      className="w-8 h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 active:bg-slate-100 min-h-[44px] cursor-pointer"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-xl font-black text-slate-950 w-6 text-center">{pequenosReceived}</span>
                    <button 
                      type="button"
                      onClick={() => setPequenosReceived(pequenosReceived + 1)}
                      className={currentDelivery?.status === 'pickup_assigned' ? "w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white active:bg-indigo-700 min-h-[44px] cursor-pointer" : "w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white active:bg-indigo-600 min-h-[44px] cursor-pointer"}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {currentDelivery?.status === 'pickup_assigned' ? (
              <div className="space-y-6">
                <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-150 p-5 rounded-3xl text-left">
                  <p className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    💡 Control de Envases
                  </p>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-300 font-bold leading-normal">
                    Se registrarán estos envases bajo el estado <strong className="font-extrabold text-indigo-800 dark:text-indigo-400">Listo p/Liquidar</strong>. Al regresar a planta, administración podrá confirmar el lavado y liquidar la venta exacta sin alterar el inventario ni el corte prematuramente.
                  </p>
                </div>
                
                <button 
                  onClick={handleCompletePickup}
                  disabled={completing}
                  className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/30 active:scale-95 transition-all flex items-center justify-center gap-3 min-h-[44px]"
                >
                  {completing ? <Loader2 size={24} className="animate-spin" /> : <><CheckCircle2 size={24} /> Confirmar Custodia y Regresar</>}
                </button>
              </div>
            ) : (
              <>
                {/* Preparation of sale */}
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Concepto de la Venta / Productos</label>
                  
                  {/* Desglose de Garrafones Entregados */}
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 space-y-3.5 text-left">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Desglose de Garrafones Entregados / Vendidos</span>
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Azul */}
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-xs font-black text-slate-800">🔵 Azul</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Grande 20L</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateSold('azul', -1)}
                            className="w-6 h-6 bg-white hover:bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-600 border border-slate-150 min-h-[30px]"
                          >
                            -
                          </button>
                          <span className="text-xs font-black text-slate-850 w-3.5 text-center">{soldAzul}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateSold('azul', 1)}
                            className="w-6 h-6 bg-sky-500 hover:bg-sky-600 rounded-lg flex items-center justify-center font-bold text-white shadow-sm min-h-[30px]"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Rosa */}
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-xs font-black text-slate-800">🌸 Rosa</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Grande 20L</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateSold('rosa', -1)}
                            className="w-6 h-6 bg-white hover:bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-600 border border-slate-150 min-h-[30px]"
                          >
                            -
                          </button>
                          <span className="text-xs font-black text-slate-850 w-3.5 text-center">{soldRosa}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateSold('rosa', 1)}
                            className="w-6 h-6 bg-pink-500 hover:bg-pink-600 rounded-lg flex items-center justify-center font-bold text-white shadow-sm min-h-[30px]"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Color */}
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-xs font-black text-slate-800">🟢 Color</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Grande 20L</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateSold('color', -1)}
                            className="w-6 h-6 bg-white hover:bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-600 border border-slate-150 min-h-[30px]"
                          >
                            -
                          </button>
                          <span className="text-xs font-black text-slate-850 w-3.5 text-center">{soldColor}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateSold('color', 1)}
                            className="w-6 h-6 bg-emerald-500 hover:bg-emerald-600 rounded-lg flex items-center justify-center font-bold text-white shadow-sm min-h-[30px]"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Pequeño */}
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-xs font-black text-slate-800">👶 Pequeño</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">10L / Chico</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateSold('pequeno', -1)}
                            className="w-6 h-6 bg-white hover:bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-600 border border-slate-150 min-h-[30px]"
                          >
                            -
                          </button>
                          <span className="text-xs font-black text-slate-850 w-3.5 text-center">{soldPequeno}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateSold('pequeno', 1)}
                            className="w-6 h-6 bg-indigo-500 hover:bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-sm min-h-[30px]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Catalogue items buttons */}
                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1 custom-scrollbar">
                    {products.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const prefix = deliveryItems ? ', ' : '';
                          setDeliveryItems(prev => prev + prefix + '1x ' + p.name);
                          setDeliveryTotal(prev => prev + p.price);
                        }}
                        className="bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-slate-700 hover:text-sky-600 px-3 py-2 rounded-xl text-[10px] font-extrabold transition-all text-left flex justify-between items-center"
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="text-emerald-500 font-mono shrink-0">${p.price}</span>
                      </button>
                    ))}
                  </div>

                  <textarea 
                    value={deliveryItems}
                    onChange={(e) => setDeliveryItems(e.target.value)}
                    placeholder="Ej. 1x Garrafón 20L, 1x Botella 1.5L"
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-xs focus:ring-2 focus:ring-sky-500 outline-none h-16 resize-none"
                  />

                  <div className="flex justify-between items-center pt-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setDeliveryItems('');
                        setDeliveryTotal(0);
                      }}
                      className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 px-2 py-1 rounded-lg"
                    >
                      Limpiar Venta
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total ($):</span>
                      <input 
                        type="number"
                        step="0.01"
                        value={deliveryTotal}
                        onChange={(e) => setDeliveryTotal(parseFloat(e.target.value) || 0)}
                        className="w-24 p-2 bg-white border border-slate-200 rounded-xl font-bold text-sm text-right focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Control de Garrafones Prestados (Fiado) */}
                <div className="bg-amber-50 p-4 rounded-3xl border border-amber-200 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <PackageCheck size={14} className="text-amber-600" />
                        ¿Garrafones / Líquidos Prestados (Fiado)?
                      </p>
                      <p className="text-[10px] text-amber-700 font-semibold uppercase">Marcar si los garrafones/envases quedan prestados sin cobro inmediato</p>
                    </div>
                    <input 
                      type="checkbox"
                      id="isBorrowedCheckbox"
                      checked={isBorrowed}
                      onChange={(e) => {
                        setIsBorrowed(e.target.checked);
                        if (e.target.checked) {
                          setIsGift(false);
                          setIsDebt(false);
                        }
                      }}
                      className="w-5 h-5 text-amber-600 accent-amber-600 rounded border-amber-300 focus:ring-amber-500 h-[44px] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Control de Obsequios */}
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Gift size={14} className="text-emerald-500" />
                        ¿Es Obsequio / Regalo?
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">Marcar si el garrafón es regalado al cliente o trabajador</p>
                    </div>
                    <input 
                      type="checkbox"
                      id="isGiftCheckbox"
                      checked={isGift}
                      onChange={(e) => {
                        setIsGift(e.target.checked);
                        if (e.target.checked) {
                          setIsDebt(false);
                          setIsBorrowed(false);
                        }
                      }}
                      className="w-5 h-5 text-emerald-500 accent-emerald-500 rounded border-slate-300 focus:ring-emerald-500 h-[44px] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Control de Adeudos (Cuentas por cobrar) */}
                {!isGift && !isBorrowed && (
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-wider">¿Tiene Saldo Pendiente? (Adeudo)</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Marcar si el cliente queda a deber ("se debe")</p>
                      </div>
                      <input 
                        type="checkbox"
                        id="isDebtCheckbox"
                        checked={isDebt}
                        onChange={(e) => {
                          setIsDebt(e.target.checked);
                          if (e.target.checked) {
                            setAmountPaidToday(0); // Default unpaid full amount
                          }
                        }}
                        className="w-5 h-5 text-sky-500 accent-sky-500 rounded border-slate-300 focus:ring-sky-500 h-[44px]"
                      />
                    </div>

                    {isDebt && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3 pt-2 border-t border-slate-200"
                      >
                        <div className="flex justify-between items-center">
                          <label htmlFor="amountPaidInput" className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Monto Cobrado Hoy ($):</label>
                          <input 
                            type="number"
                            id="amountPaidInput"
                            min="0"
                            max={deliveryTotal}
                            step="0.01"
                            value={amountPaidToday}
                            onChange={(e) => setAmountPaidToday(Math.min(deliveryTotal, parseFloat(e.target.value) || 0))}
                            className="w-24 p-2 bg-white border border-slate-200 rounded-xl font-bold text-sm text-right focus:ring-2 focus:ring-sky-500 outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 bg-amber-50 p-3 rounded-2xl border border-amber-100 text-[11px] font-bold text-amber-800">
                          <div>
                            <p className="text-[10px] opacity-75 uppercase">Cobro Hoy:</p>
                            <p className="text-sm font-black">${amountPaidToday.toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] opacity-75 uppercase">Adeudo acumulado:</p>
                            <p className="text-sm font-black text-rose-600">${(deliveryTotal - amountPaidToday).toFixed(2)}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Selector de Método de Pago: Efectivo vs Transferencia */}
                {!isGift && !isBorrowed && (
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 text-left space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                      Método de Pago del Cliente
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethodType('cash')}
                        className={`py-3 px-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
                          paymentMethodType === 'cash'
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                        }`}
                      >
                        <DollarSign size={16} /> Efectivo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethodType('transfer');
                          setIsDebt(false);
                        }}
                        className={`py-3 px-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
                          paymentMethodType === 'transfer'
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                        }`}
                      >
                        <CreditCard size={16} /> Transferencia
                      </button>
                    </div>

                    {paymentMethodType === 'transfer' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2 pt-2 border-t border-slate-200"
                      >
                        <div className="bg-indigo-50/70 p-3 rounded-2xl border border-indigo-100 text-[10px] text-indigo-900 font-semibold leading-relaxed">
                          💳 <strong>Pago por Transferencia Bancaria:</strong> Este monto irá directo a la cuenta de banco y <strong>no se sumará al efectivo que debes entregar hoy</strong> en tu corte.
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                            Folio / Referencia o Teléfono (Opcional)
                          </label>
                          <input
                            type="text"
                            placeholder="Ej. Ref: 984512 / BBVA..."
                            value={transferReference}
                            onChange={(e) => setTransferReference(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">Monto Final</span>
                    <span className="text-xs text-emerald-600 font-bold font-sans">
                      {isGift ? 'Entregado como Obsequio sin costo' : 'Cobrar al cliente'}
                    </span>
                  </div>
                  <span className="text-3xl font-black text-emerald-600 font-sans">
                    ${isGift ? '0.00' : deliveryTotal.toFixed(2)}
                  </span>
                </div>

                <button 
                  onClick={handleComplete}
                  disabled={completing}
                  className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center gap-3 min-h-[44px]"
                >
                  {completing ? <Loader2 size={24} className="animate-spin" /> : <><CheckCircle2 size={24} /> Confirmar Pago y Entrega</>}
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Floating Action Tip */}
      <div className="bg-indigo-600 text-white p-4 rounded-2xl flex items-center gap-4 shadow-lg sticky bottom-0">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
          <MessageCircle size={20} />
        </div>
        <p className="text-xs font-bold leading-tight">Cliente escribió: "{currentDelivery?.customer_name || 'Nuevo'} está esperando."</p>
      </div>
    </div>
  );
}
