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
  Download
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Order } from '../lib/types.supabase';
import { useDriverRoute } from '../hooks/useDriverRoute';
import { handleCompleteDelivery } from '../services/deliveryService';
import { exportToPDF } from '../utils/pdfExport';
import { namesMatch } from '../utils/nameHelper';

export default function DeliveryRoute() {
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

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['assigned', 'pending', 'delivered', 'pickup_assigned', 'pickup_confirmed']) 
        .order('created_at', { ascending: false })
        .limit(10);

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

  const [products, setProducts] = useState<any[]>([]);
  const [deliveryItems, setDeliveryItems] = useState('');
  const [deliveryTotal, setDeliveryTotal] = useState(0);

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
      setAmountPaidToday(0);
    }
  }, [step, selectedDelivery]);

  const handleComplete = async () => {
    if (!selectedDelivery || !currentDelivery) return;
    setCompleting(true);
    
    try {
      if (isDebt) {
        const debtAmount = Number(deliveryTotal) - Number(amountPaidToday);
        if (debtAmount <= 0) {
          // No debt in practice
          const result = await handleCompleteDelivery(selectedDelivery, deliveryItems, deliveryTotal, 'delivered');
          if (result.success) {
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
      } else {
        const result = await handleCompleteDelivery(selectedDelivery, deliveryItems, deliveryTotal, 'delivered');
        if (result.success) {
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
      const { error } = await supabase
        .from('orders')
        .update({
          items: `${jugsReceived} Garrafones p/Lavado (Recogidos por ${currentDelivery.assigned_to_name || 'Repartidor'})`,
          status: 'pickup_confirmed' // Transferred to pickup_confirmed state
        })
        .eq('id', selectedDelivery);
        
      if (error) throw error;

      // Log notifications to plant/admin
      await supabase.from('notifications_log').insert([
        {
          title: 'Garrafones Recogidos 🔄',
          message: `${currentDelivery.assigned_to_name || 'Repartidor'} recogió ${jugsReceived} garrafones vacíos de ${currentDelivery.customer_name} y va de regreso a planta.`,
          type: 'order',
          user_role: 'admin'
        },
        {
          title: 'Garrafones Recogidos 🔄',
          message: `${currentDelivery.assigned_to_name || 'Repartidor'} recogió ${jugsReceived} garrafones vacíos de ${currentDelivery.customer_name} y va de regreso a planta.`,
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

  // Filtrar primero si pertenece al chofer
  const driverDeliveries = deliveries.filter(d => {
    // Si no hay chofer logueado (sesión vacía o admin), se muestra todo para que lo puedan probar/ver
    if (!loggedInDriver) return true;
    
    // Si d.assigned_to_name está vacío, puede ser una orden pendiente en general que todos pueden ver y auto-reclamar
    if (!d.assigned_to_name) return true;

    // Usamos namesMatch para comparar flexiblemente
    return namesMatch(d.assigned_to_name, loggedInDriver);
  });

  // Dividir en Active (incluyendo pickup_assigned, assigned, pending, pickup_pending) vs Completed
  const activeDeliveries = driverDeliveries.filter(d => 
    d.status === 'assigned' || d.status === 'pending' || d.status === 'pickup_assigned' || d.status === 'pickup_pending'
  );

  const completedDeliveries = driverDeliveries.filter(d => 
    d.status === 'delivered' || d.status === 'pickup_confirmed'
  );

  const displayedDeliveries = activeSubTab === 'active' ? activeDeliveries : completedDeliveries;

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
                
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className="text-[10px] bg-slate-50 text-slate-500 px-2 py-1 rounded-lg font-bold">
                      {delivery.items}
                    </span>
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
            {currentDelivery?.status === 'pickup_assigned' ? 'Confirmar Recogida' : 'Finalizar Entrega'}
          </h3>

          <div className="space-y-6">
            <div className="text-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                {currentDelivery?.status === 'pickup_assigned' ? 'Cantidad de Garrafones Recogidos' : 'Envases Recibidos'}
              </p>
              <div className="flex items-center justify-center gap-6">
                <button 
                  onClick={() => setJugsReceived(Math.max(0, jugsReceived - 1))}
                  className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 active:bg-slate-150 shadow-sm min-h-[44px]"
                >
                  <Minus size={20} />
                </button>
                <span className="text-4xl font-black text-slate-950 w-12">{jugsReceived}</span>
                <button 
                  onClick={() => setJugsReceived(jugsReceived + 1)}
                  className={currentDelivery?.status === 'pickup_assigned' ? "w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white active:bg-indigo-700 shadow-lg shadow-indigo-500/20 min-h-[44px]" : "w-12 h-12 bg-sky-500 rounded-xl flex items-center justify-center text-white active:bg-sky-600 shadow-lg shadow-sky-500/20 min-h-[44px]"}
                >
                  <Plus size={20} />
                </button>
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

                {/* Control de Adeudos (Cuentas por cobrar) */}
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

                <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">Monto Final</span>
                    <span className="text-xs text-emerald-600 font-bold font-sans">Cobrar al cliente</span>
                  </div>
                  <span className="text-3xl font-black text-emerald-600 font-sans">
                    ${deliveryTotal.toFixed(2)}
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
