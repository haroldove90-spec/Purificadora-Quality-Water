import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, MapPin, Phone, MessageSquare, Clock, CheckCircle2, 
  Truck, AlertCircle, ShoppingCart, Tag, TagIcon, Store, 
  History, Plus, Check, Loader2, Calendar, DollarSign, Printer, Download
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { namesMatch } from '../utils/nameHelper';
import { exportToPDF } from '../utils/pdfExport';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface Order {
  id: string;
  customer_name: string;
  address: string;
  items: string;
  total_price: number;
  status: string;
  created_at: string;
  payment_method?: string;
  source?: string;
}

interface ClientStatusProps {
  userRole?: string | null;
  userName?: string | null;
}

const generateOrderUUID = () => {
  return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
};

export default function ClientStatus({ userRole, userName }: ClientStatusProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientHistory, setClientHistory] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const WHATSAPP_NUMBER = '525544771611';

  // State for new order registration form
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [orderMode, setOrderMode] = useState<'delivered' | 'pending'>('delivered');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name');
    if (data) {
      setProducts(data);
      if (data.length > 0) {
        setSelectedProductId(data[0].id);
      }
    }
  };

  const fetchLatestOrder = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      // If we have a logged-in userName, get their latest active order
      if (userName) {
        const matchingOrders = data.filter(o => o.customer_name && namesMatch(o.customer_name, userName));
        const activeOrder = matchingOrders.find(o => o.status !== 'delivered' && o.status !== 'cancelled');
        setOrder(activeOrder || matchingOrders[0] || null);
      } else if (data[0]) {
        setOrder(data[0] as Order);
      }
    }
  };

  const fetchClientHistory = async () => {
    if (!userName) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const filtered = data.filter(o => o.customer_name && namesMatch(o.customer_name, userName));
        setClientHistory(filtered);
      }
    } catch (err) {
      console.warn('Error fetching client history:', err);
    }
  };

  const handleExportPDF = () => {
    try {
      const columns = ['Fecha', 'ID de Compra', 'Detalle / Artículos', 'Estatus', 'Total ($)'];
      const data = clientHistory.map(o => [
        new Date(o.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        `#${o.id.slice(0, 8).toUpperCase()}`,
        o.items,
        o.status === 'delivered' ? 'Entregado' : o.status === 'pending' ? 'Pendiente' : o.status === 'assigned' ? 'En ruta' : o.status,
        `$${Number(o.total_price).toFixed(2)}`
      ]);

      exportToPDF({
        title: 'Mi Historial de Consumo',
        subtitle: `Cliente: ${userName || 'Usuario'} - Generado el ${new Date().toLocaleDateString()}`,
        columns,
        data,
        filename: `Historial_Consumo_${(userName || 'Usuario').replace(/\s+/g, '_')}`
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportExcel = () => {
    try {
      const columns = ['Fecha', 'ID de Compra', 'Detalle / Artículos', 'Estatus', 'Total ($)'];
      const data = clientHistory.map(o => [
        new Date(o.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        `#${o.id.slice(0, 8).toUpperCase()}`,
        o.items,
        o.status === 'delivered' ? 'Entregado' : o.status === 'pending' ? 'Pendiente' : o.status === 'assigned' ? 'En ruta' : o.status,
        Number(o.total_price).toFixed(2)
      ]);

      const csvContent = [
        columns.join(','),
        ...data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Historial_Consumo_${(userName || 'Usuario').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchLatestOrder(), fetchProducts(), fetchClientHistory()]);
      setLoading(false);
    };
    init();

    const orderSubscription = supabase
      .channel('client_order_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchLatestOrder();
        fetchClientHistory();
      })
      .subscribe();

    const productsSubscription = supabase
      .channel('products_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orderSubscription);
      supabase.removeChannel(productsSubscription);
    };
  }, [userName]);

  const handleOrderWhatsApp = (productName?: string) => {
    const message = productName 
      ? `Hola QualityWater, me gustaría pedir: ${productName}`
      : 'Hola QualityWater, me gustaría realizar un pedido de agua.';
    
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleRegisterSelfOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName) {
      alert('Error: No se ha detectado el nombre del cliente. Por favor inicia sesión.');
      return;
    }
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    setIsSubmitting(true);
    try {
      const totalPrice = product.price * quantity;
      const itemsDescription = `${quantity} x ${product.name}`;

      const payload = {
        id: generateOrderUUID(),
        customer_name: userName,
        address: orderMode === 'delivered' ? 'Auto-registrado (Compra Directa)' : 'Auto-registrado (Servicio Domicilio)',
        items: itemsDescription,
        total_price: totalPrice,
        status: orderMode,
        source: 'local',
        payment_method: paymentMethod,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('orders').insert([payload]);
      if (error) throw error;

      setRegisterSuccess(true);
      setQuantity(1);
      await Promise.all([fetchLatestOrder(), fetchClientHistory()]);
      
      setTimeout(() => {
        setRegisterSuccess(false);
      }, 4000);

    } catch (err: any) {
      console.error('Error registering client purchase:', err);
      alert('No se pudo registrar la compra: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-black uppercase tracking-widest text-[10px] italic">Sincronizando con QualityWater...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-32 max-w-4xl mx-auto px-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-black text-slate-800 uppercase italic tracking-tight">Agua de <span className="text-sky-500">Calidad</span></h1>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3 italic">Purificadora Iztapalapa - Portal de Clientes</p>
        {userName && (
          <div className="mt-4 inline-flex items-center gap-2 bg-sky-50 text-sky-800 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
            <CheckCircle2 size={12} className="text-sky-500" /> Cliente: {userName}
          </div>
        )}
      </div>

      {/* Active Order Status IF exists */}
      {order && order.status !== 'delivered' && order.status !== 'cancelled' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 md:p-10 rounded-[48px] shadow-2xl border border-sky-100 flex flex-col md:flex-row gap-8 md:gap-10 items-center relative overflow-hidden"
        >
          <div className="relative z-10 flex-1">
            <span className="text-[9px] font-black bg-sky-500 text-white px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">Pedido en Curso</span>
            <h3 className="text-2xl font-black text-slate-800 uppercase italic">Tu pedido está <span className="text-sky-500">{order.status === 'assigned' || order.status === 'pickup_assigned' ? 'en camino' : 'siendo preparado'}</span></h3>
            <p className="text-sm font-bold text-slate-400 mt-2 italic">Fecha: {new Date(order.created_at).toLocaleDateString()}</p>
            
            <div className="mt-8 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${['assigned', 'pickup_assigned'].includes(order.status) ? 'bg-sky-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                <Truck size={24} />
              </div>
              <div className="h-px flex-1 bg-slate-100" />
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${['delivered', 'pickup_confirmed'].includes(order.status) ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <CheckCircle2 size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 text-white p-8 rounded-[32px] w-full md:w-72 shrink-0">
             <div className="flex justify-between items-center mb-6">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</span>
               <p className="text-2xl font-black text-emerald-400">${order.total_price.toFixed(2)}</p>
             </div>
             <p className="text-[10px] font-bold text-slate-400 leading-relaxed mb-4">{order.items}</p>
             <button 
              onClick={() => handleOrderWhatsApp()}
              className="w-full bg-white/10 hover:bg-white/20 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
             >
               Soporte Pedido
             </button>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50/50 rounded-bl-full -z-0" />
        </motion.div>
      )}

      {/* Auto-Register Client Purchase / New Order Form */}
      {userName && (
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-[40px] p-8 md:p-10 shadow-xl space-y-6">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wide flex items-center gap-2.5">
              <Plus size={20} className="text-sky-400" /> Registrar Compra o Consumo
            </h2>
            <p className="text-slate-400 text-xs mt-1">Registra tus compras de garrafones en planta/mostrador para mantener al día tu historial de ventas, o solicita un nuevo pedido.</p>
          </div>

          <form onSubmit={handleRegisterSelfOrder} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Selecciona Producto</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-white/10 border border-white/10 rounded-2xl p-3.5 font-bold text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id} className="text-slate-900 font-bold text-xs">
                      {p.name} - ${p.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white/10 border border-white/10 rounded-2xl p-3.5 font-bold text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-white/10 border border-white/10 rounded-2xl p-3.5 font-bold text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="cash" className="text-slate-900 font-bold text-xs">Efectivo</option>
                    <option value="transfer" className="text-slate-900 font-bold text-xs">Transferencia</option>
                    <option value="card" className="text-slate-900 font-bold text-xs">Tarjeta</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-6 flex flex-col justify-between">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Tipo de Registro</label>
                <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setOrderMode('delivered')}
                    className={`py-3 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${orderMode === 'delivered' ? 'bg-white text-indigo-900' : 'text-slate-400 hover:text-white'}`}
                  >
                    Compra Directa (Entregado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderMode('pending')}
                    className={`py-3 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${orderMode === 'pending' ? 'bg-white text-indigo-900' : 'text-slate-400 hover:text-white'}`}
                  >
                    Nuevo Pedido (Pendiente)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">Total Estimado</p>
                  <p className="text-2xl font-black text-emerald-400">
                    ${((products.find(p => p.id === selectedProductId)?.price || 0) * quantity).toFixed(2)}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-wider text-xs px-6 py-3.5 rounded-2xl transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : registerSuccess ? (
                    <Check size={14} />
                  ) : (
                    <Plus size={14} />
                  )}
                  {registerSuccess ? '¡Registrado!' : orderMode === 'delivered' ? 'Registrar Compra' : 'Solicitar Pedido'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Product Catalog */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 px-4">
          <div className="h-px flex-1 bg-slate-200" />
          <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-widest flex items-center gap-3">
             <ShoppingCart size={20} className="text-sky-500" /> Catálogo de Productos
          </h2>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {products.length === 0 ? (
          <div className="text-center p-20 bg-slate-50 rounded-[48px] border border-dashed border-slate-200">
             <Store size={48} className="mx-auto text-slate-300 mb-4" />
             <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Cargando catálogo...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
            {products.map((product) => (
              <motion.div 
                key={product.id}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-xl transition-all"
              >
                <div className="flex-1">
                  <span className="text-[9px] font-black text-sky-500 uppercase tracking-[0.2em]">QualityWater</span>
                  <h4 className="text-lg font-black text-slate-800 uppercase italic mt-1">{product.name}</h4>
                  <p className="text-xs font-bold text-slate-400 mt-2 line-clamp-2 italic">{product.description}</p>
                  <p className="text-2xl font-black text-emerald-500 mt-4">${product.price.toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => handleOrderWhatsApp(product.name)}
                  className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 active:scale-95 transition-all shrink-0"
                  title="Pedir por WhatsApp"
                >
                  <MessageSquare size={24} fill="currentColor" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Purchase History Table */}
      {userName && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-widest flex items-center gap-3">
               <History size={20} className="text-indigo-500" /> Mi Historial de Consumo
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={clientHistory.length === 0}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                title="Exportar mi historial en PDF"
              >
                <Printer size={12} className="text-slate-500" />
                Exportar PDF
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={clientHistory.length === 0}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 px-3.5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                title="Exportar mi historial en Excel"
              >
                <Download size={12} className="text-emerald-500" />
                Exportar Excel
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50/30 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">ID de Compra</th>
                    <th className="px-6 py-4">Detalle / Artículos</th>
                    <th className="px-6 py-4">Estatus</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {clientHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                        Aún no tienes compras o consumos registrados
                      </td>
                    </tr>
                  ) : (
                    clientHistory.map((order) => {
                      const orderDate = new Date(order.created_at);
                      return (
                        <tr key={order.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4 text-xs font-black text-slate-700">
                            {orderDate.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4 text-xs font-mono font-bold text-slate-500">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-600">
                            {order.items}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase ${
                              order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' :
                              order.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                              order.status === 'assigned' ? 'bg-sky-50 text-sky-600' :
                              'bg-slate-50 text-slate-500'
                            }`}>
                              {order.status === 'delivered' ? 'Entregado' :
                               order.status === 'pending' ? 'Pendiente' :
                               order.status === 'assigned' ? 'En ruta' :
                               order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-xs font-black text-indigo-950">
                            ${order.total_price.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Floating CTA for WhatsApp */}
      <motion.button 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        onClick={() => handleOrderWhatsApp()}
        className="fixed bottom-24 right-4 md:right-8 bg-emerald-500 text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs shadow-2xl shadow-emerald-500/40 flex items-center gap-3 z-50 group hover:pr-10 transition-all active:scale-95 border-b-4 border-emerald-700"
      >
        <MessageSquare size={20} className="group-hover:rotate-12 transition-transform" />
        Pedir ahora
      </motion.button>
    </div>
  );
}
