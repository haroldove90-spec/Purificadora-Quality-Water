import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  Phone, 
  CreditCard, 
  DollarSign, 
  Share2, 
  Printer, 
  Check, 
  Loader2, 
  X, 
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function POS({ userRole }: { userRole: string | null }) {
  // Products & Customers from DB
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Search and Select States
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // Selected Customer or Free Text Customer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [manualCustomerName, setManualCustomerName] = useState('Venta Mostrador');
  const [manualCustomerPhone, setManualCustomerPhone] = useState('');
  const [manualCustomerAddress, setManualCustomerAddress] = useState('Mostrador');

  // Transaction States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Generated Ticket Modal
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState<{
    id: string;
    customer_name: string;
    items: { name: string; quantity: number; price: number }[];
    total: number;
    payment_method: string;
    date: string;
    phone?: string;
  } | null>(null);

  // Load Data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Products
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (prodError) throw prodError;
      if (prodData) setProducts(prodData);

      // Fetch Customers
      const { data: custData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      
      if (custError) throw custError;
      if (custData) setCustomers(custData);
    } catch (e: any) {
      console.error('Error cargando catálogo POS:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter products based on search
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(productSearch.toLowerCase()))
  );

  // Filter customers based on search
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  // Cart Helpers
  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (product: Product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity <= 1) {
          return prevCart.filter(item => item.product.id !== product.id);
        }
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity - 1 } 
            : item
        );
      }
      return prevCart;
    });
  };

  const getCartCount = (productId: string): number => {
    const item = cart.find(i => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setManualCustomerName(customer.name);
    setManualCustomerPhone(customer.phone || '');
    setManualCustomerAddress(customer.address || 'Domicilio Registrado');
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setManualCustomerName('Venta Mostrador');
    setManualCustomerPhone('');
    setManualCustomerAddress('Mostrador');
    setCustomerSearch('');
  };

  // Register Transaction in Supabase Database
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setNotification({ type: 'error', message: 'Por favor, agrega al menos un producto al ticket.' });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    const total = getCartTotal();
    
    // Format items list in a clean structure or readable string for database column
    // E.g. "3x Garrafón 20L ($165.00), 1x Sello de Garantía ($10.00)"
    const itemsDescription = cart.map(item => {
      return `${item.quantity}x ${item.product.name}`;
    }).join(', ');

    // Structure for generating virtual ticket
    const ticketItems = cart.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price
    }));

    try {
      const payload = {
        customer_name: manualCustomerName.trim() || 'Venta Mostrador',
        address: userRole === 'driver' ? (manualCustomerAddress.trim() === 'Mostrador' ? 'Reparto' : manualCustomerAddress) : manualCustomerAddress,
        items: itemsDescription,
        total_price: total,
        status: 'delivered', // Immediate delivery
        source: 'pos', // Source tracking
        assigned_to_name: userRole === 'driver' ? 'Repartidor' : 'Operador Planta',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([payload])
        .select();

      if (error) throw error;

      const createdOrder = data ? data[0] : null;
      const orderId = createdOrder ? createdOrder.id.substring(0, 8).toUpperCase() : `V-${Math.floor(1000 + Math.random() * 9000)}`;

      // Setup Generated Ticket Details
      setGeneratedTicket({
        id: orderId,
        customer_name: manualCustomerName,
        items: ticketItems,
        total: total,
        payment_method: paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia',
        date: new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
        phone: manualCustomerPhone
      });

      // Clear operational states on success
      clearCart();
      setShowTicketModal(true);
      setNotification({ type: 'success', message: '¡Venta registrada con éxito en la base de datos!' });

      // If no customer details are cached or kept, reset customer
      if (!selectedCustomer) {
        handleClearCustomer();
      }
    } catch (e: any) {
      console.error('Error al registrar venta:', e);
      setNotification({ type: 'error', message: 'Error de base de datos: ' + (e.message || e) });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Share receipt via WhatsApp API
  const handleShareWhatsApp = () => {
    if (!generatedTicket) return;

    let textMessage = `💧 *QUALITY WATER* 💧\n`;
    textMessage += `=========================\n`;
    textMessage += `📄 *TICKET DE Venta* (#${generatedTicket.id})\n`;
    textMessage += `📅 *Fecha:* ${generatedTicket.date}\n`;
    textMessage += `👤 *Cliente:* ${generatedTicket.customer_name}\n`;
    if (userRole === 'driver') {
      textMessage += `🚚 *Modalidad:* Reparto / Entrega\n`;
    } else {
      textMessage += `🏢 *Modalidad:* Mostrador / Planta\n`;
    }
    textMessage += `=========================\n`;
    textMessage += `🛍️ *PRODUCTOS:* \n`;
    
    generatedTicket.items.forEach(item => {
      textMessage += `• ${item.quantity}x ${item.name} ($${(item.price * item.quantity).toFixed(2)})\n`;
    });
    
    textMessage += `=========================\n`;
    textMessage += `💰 *TOTAL A PAGAR:* $${generatedTicket.total.toFixed(2)}\n`;
    textMessage += `💳 *MÉTODO DE PAGO:* ${generatedTicket.payment_method}\n`;
    textMessage += `=========================\n`;
    textMessage += `¡Gracias por su preferencia! 🌊\n`;
    textMessage += `📍 Purificadora Quality Water 💦`;

    const encodedText = encodeURIComponent(textMessage);
    const whatsappPhone = generatedTicket.phone ? generatedTicket.phone.replace(/\D/g, '') : '';
    
    // API link: support both target number if provided or simple send
    const link = whatsappPhone 
      ? `https://api.whatsapp.com/send?phone=${whatsappPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(link, '_blank');
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 pb-24 h-full min-h-[calc(100vh-140px)]">
      
      {/* LEFT SECTION: Large Product Buttons Catalog */}
      <div className="flex-1 space-y-6 flex flex-col min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic flex items-center gap-2">
              <ShoppingBag className="text-sky-500 animate-bounce shrink-0" size={32} />
              Registro de <span className="text-sky-500">Ventas (POS)</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-bold italic uppercase text-[10px] tracking-wider">
              {userRole === 'driver' ? 'PUNTO DE VENTA EN RUTA' : 'PUNTO DE VENTA EN MOSTRADOR'}
            </p>
          </div>

          {/* Search bar inside Catalog */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-sky-500 text-sm font-bold text-slate-700 dark:text-slate-200"
            />
            {productSearch && (
              <button 
                onClick={() => setProductSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Global Notifications inside POS */}
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-semibold border ${
              notification.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </motion.div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 flex-1 text-slate-400">
            <Loader2 className="animate-spin mb-3 text-sky-500" size={32} />
            <p className="font-bold uppercase tracking-widest text-xs">Cargando catálogo...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex-1 flex flex-col justify-center items-center">
            <ShoppingBag className="mx-auto mb-4 text-slate-300 dark:text-slate-700" size={48} />
            <p className="font-black text-slate-700 dark:text-slate-300 uppercase italic">No se encontraron productos</p>
            <p className="text-slate-400 mt-1 text-xs">Agrega productos en el módulo de Inventario para mostrarlos en el POS.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 overflow-y-auto no-scrollbar max-h-[60vh] xl:max-h-none">
            {filteredProducts.map((prod) => {
              const qty = getCartCount(prod.id);
              return (
                <motion.div
                  key={prod.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => addToCart(prod)}
                  className={`relative p-6 rounded-3xl cursor-pointer select-none border-2 transition-all overflow-hidden flex flex-col justify-between min-h-[140px] shadow-sm ${
                    qty > 0 
                      ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-500' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-sky-300'
                  }`}
                >
                  {/* Badge quantity counter inside card */}
                  {qty > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 bg-sky-500 text-white min-w-8 h-8 rounded-full flex items-center justify-center font-black text-sm z-10 shadow-md border-2 border-white dark:border-slate-900 animate-pulse"
                    >
                      {qty}
                    </motion.div>
                  )}

                  <div className="space-y-1 pr-6">
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg uppercase leading-none tracking-tight">
                      {prod.name}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase italic line-clamp-2">
                      {prod.description || 'Sin descripción'}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                      <span className="text-sky-500 text-sm font-black mr-0.5">$</span>
                      {prod.price.toFixed(2)}
                    </div>

                    {/* Touch Friendly Action Buttons to change quantities from the Card */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {qty > 0 && (
                        <button
                          onClick={() => removeFromCart(prod)}
                          className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center hover:bg-rose-600 transition-colors shadow-md shadow-rose-500/10 active:scale-95"
                          title="Disminuir"
                        >
                          <Minus size={18} strokeWidth={2.5} />
                        </button>
                      )}
                      
                      <button
                        onClick={() => addToCart(prod)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-md active:scale-95 ${
                          qty > 0 
                            ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/10' 
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200'
                        }`}
                        title="Agregar"
                      >
                        <Plus size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT SECTION: Cart list, customer details, checkout, receipt creation */}
      <div className="w-full xl:w-[400px] flex flex-col shrink-0 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl flex flex-col overflow-hidden h-full flex-1">
          
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 flex justify-between items-center">
            <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag size={18} className="text-sky-500" />
              TICKET / CARRITO
            </h2>
            {cart.length > 0 && (
              <button 
                onClick={clearCart}
                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 size={12} />
                Vaciar
              </button>
            )}
          </div>

          <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[300px] xl:max-h-none">
            {/* Customer Lookup and Assignment */}
            <div className="space-y-2 relative">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                Asignación de Cliente
              </label>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Buscar o digitar cliente..."
                  value={customerSearch}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setManualCustomerName(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-sky-500 text-sm font-bold text-slate-700 dark:text-slate-200"
                />
                
                {customerSearch && (
                  <button
                    onClick={handleClearCustomer}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown for existing customers */}
              <AnimatePresence>
                {showCustomerDropdown && (customerSearch !== '' || customers.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-30 max-h-48 overflow-y-auto"
                  >
                    <div className="bg-slate-50 dark:bg-slate-950 p-2 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      Coincidencias en Base de Datos
                    </div>
                    {filteredCustomers.length === 0 ? (
                      <div className="p-3 text-xs italic text-slate-500 text-center">
                        Ningún cliente guardado coincide. Se registrará como cliente libre.
                      </div>
                    ) : (
                      filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full text-left p-3 hover:bg-sky-50/50 dark:hover:bg-slate-800 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-none transition-colors"
                        >
                          <div>
                            <p className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase">{c.name}</p>
                            <p className="text-[10px] text-slate-400">{c.address || 'Sin dirección'}</p>
                          </div>
                          {c.phone && (
                            <span className="text-[10px] font-mono text-sky-500">{c.phone}</span>
                          )}
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Close lookup background */}
              {showCustomerDropdown && (
                <div className="fixed inset-0 z-20" onClick={() => setShowCustomerDropdown(false)} />
              )}

              {/* Selected Customer indicator badge or free input metadata details */}
              {selectedCustomer ? (
                <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 flex items-start justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-sky-700 dark:text-sky-400 capitalize">
                      ✓ CLIENTE SELECCIONADO
                    </p>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">
                      {selectedCustomer.name}
                    </p>
                    {selectedCustomer.phone && (
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                        <Phone size={10} /> {selectedCustomer.phone}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={handleClearCustomer}
                    className="text-sky-600 dark:text-sky-400 hover:text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">Telf. WhatsApp (Opcional)</label>
                      <input 
                        type="text" 
                        placeholder="Ej. 5512345678"
                        value={manualCustomerPhone}
                        onChange={(e) => setManualCustomerPhone(e.target.value)}
                        className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 focus:border-sky-500 text-xs font-bold font-mono py-1 text-slate-700 dark:text-slate-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">Dirección o Ruta</label>
                      <input 
                        type="text" 
                        placeholder="Mostrador/Calle"
                        value={manualCustomerAddress}
                        onChange={(e) => setManualCustomerAddress(e.target.value)}
                        className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 focus:border-sky-500 text-xs font-bold py-1 text-slate-700 dark:text-slate-200 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Selected items in current transaction */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                Artículos Agregados
              </label>

              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                  <ShoppingBag className="mx-auto mb-2 text-slate-300" size={32} />
                  <p className="font-bold uppercase tracking-tight text-[11px] italic">Carrito vacío</p>
                  <p className="text-[9px] mt-0.5">Agrega productos tocando las tarjetas de la izquierda.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto no-scrollbar">
                  {cart.map((item) => (
                    <div 
                      key={item.product.id}
                      className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                        <p className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase truncate">
                          {item.product.name}
                        </p>
                        <p className="text-[10px] font-black text-sky-500 tracking-tight font-mono">
                          {item.quantity} x ${item.product.price.toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => removeFromCart(item.product)}
                          className="w-7 h-7 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-colors"
                        >
                          <Minus size={12} strokeWidth={3} />
                        </button>
                        
                        <span className="w-6 text-center font-extrabold text-xs text-slate-800 dark:text-slate-100">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => addToCart(item.product)}
                          className="w-7 h-7 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-colors"
                        >
                          <Plus size={12} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Options */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Efectivo', icon: DollarSign },
                  { id: 'card', label: 'Tarjeta', icon: CreditCard },
                  { id: 'transfer', label: 'Transf.', icon: Share2 }
                ].map((meth) => {
                  const Icon = meth.icon;
                  const active = paymentMethod === meth.id;
                  return (
                    <button
                      key={meth.id}
                      onClick={() => setPaymentMethod(meth.id as any)}
                      className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 border-2 transition-all ${
                        active 
                          ? 'bg-sky-500 border-sky-500 text-white font-black' 
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-sky-300 hover:text-slate-700'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="text-[10px] uppercase font-bold tracking-tight">{meth.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
          </div>

          {/* Pricing summary footer and checkout triggers */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">TOTAL A COBRAR</p>
                <p className="text-[11px] font-bold text-slate-400 uppercase italic mt-1">Con IVA incluido</p>
              </div>
              <div className="text-3xl font-black text-slate-800 dark:text-white flex items-center font-mono">
                <span className="text-sky-500 text-lg mr-0.5">$</span>
                {getCartTotal().toFixed(2)}
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isSubmitting || cart.length === 0}
              className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider transition-all shadow-lg active:scale-[0.98] ${
                cart.length === 0 
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white shadow-sky-500/20 hover:shadow-indigo-500/20'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin text-white" size={18} />
                  <span>Registrando Venta...</span>
                </>
              ) : (
                <>
                  <Check size={18} strokeWidth={3} />
                  <span>REGISTRAR VENTA & COBRAR</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* TICKET AND RECEIPT VIRTUAL MODAL */}
      <AnimatePresence>
        {showTicketModal && generatedTicket && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Modal backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTicketModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Virtual Receipt Sheet */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-sm w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col z-50 text-slate-800"
            >
              {/* Top Banner */}
              <div className="p-6 bg-slate-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-sky-500 rounded-xl flex items-center justify-center">
                    <CheckCircle2 size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400">Venta Exitosa</p>
                    <p className="text-xs font-black uppercase tracking-wider">¡Se registró en Supabase!</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTicketModal(false)}
                  className="bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Printable Thermal Receipt styling */}
              <div className="p-6 space-y-6 bg-amber-50/10 dark:bg-slate-900 select-all font-mono text-xs text-slate-700 dark:text-slate-300 border-b border-dashed border-slate-200 dark:border-slate-800">
                <div className="text-center space-y-1">
                  <h3 className="font-black text-base text-slate-900 dark:text-white uppercase tracking-tight">QUALITY WATER</h3>
                  <p className="text-[9px] text-slate-500 uppercase">Purificación de Agua de Calidad 💧</p>
                  <p className="text-[9px] text-slate-400 uppercase">Santa Fe, Poniente, CDMX</p>
                  <p className="text-[10px] text-sky-500 font-extrabold uppercase mt-1">VENTA COMPLEMENTADA</p>
                </div>

                <div className="border-t border-b border-dashed border-slate-200 dark:border-slate-800 py-3 space-y-1 text-[10px]">
                  <p className="flex justify-between"><span>No. Ticket:</span> <span className="font-bold text-slate-900 dark:text-white">#{generatedTicket.id}</span></p>
                  <p className="flex justify-between"><span>Fecha/Hora:</span> <span className="text-slate-900 dark:text-white">{generatedTicket.date}</span></p>
                  <p className="flex justify-between"><span>Cliente:</span> <span className="font-extrabold text-slate-900 dark:text-white uppercase truncate max-w-[150px]">{generatedTicket.customer_name}</span></p>
                  {generatedTicket.phone && (
                    <p className="flex justify-between"><span>WhatsApp:</span> <span className="text-slate-900 dark:text-white font-bold">{generatedTicket.phone}</span></p>
                  )}
                  <p className="flex justify-between"><span>Atendió:</span> <span className="font-bold text-slate-900 dark:text-white">{userRole === 'driver' ? 'Reparto' : 'Planta'}</span></p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between font-black text-slate-900 dark:text-white text-[10px] border-b pb-1">
                    <span>CONCEPTO / CANT.</span>
                    <span>IMPORTE</span>
                  </div>
                  <div className="space-y-1.5 text-[10px]">
                    {generatedTicket.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start">
                        <div className="truncate max-w-[200px] leading-tight">
                          <p className="font-black text-slate-900 dark:text-slate-200 truncate">{item.name}</p>
                          <p className="text-slate-400">{item.quantity} x ${item.price.toFixed(2)}</p>
                        </div>
                        <span className="font-black text-slate-900 dark:text-white shrink-0">${(item.quantity * item.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-3 space-y-1 text-xs">
                  <div className="flex justify-between font-black text-slate-900 dark:text-white text-sm">
                    <span>TOTAL:</span>
                    <span>${generatedTicket.total.toFixed(2)} MXN</span>
                  </div>
                  <p className="flex justify-between text-[10px]"><span>Pago:</span> <span className="font-extrabold uppercase">{generatedTicket.payment_method}</span></p>
                </div>

                <div className="text-center font-bold text-[9px] text-slate-400 uppercase pt-4">
                  --- ¡GRACIAS POR SU PREFERENCIA! ---
                  <p className="text-[8px] italic mt-1">Mantente hidratado, vive saludable</p>
                </div>
              </div>

              {/* Action utilities */}
              <div className="p-6 bg-slate-50 dark:bg-slate-950 flex flex-col gap-3">
                <button
                  onClick={handleShareWhatsApp}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-95 transition-all text-center"
                >
                  <Share2 size={16} strokeWidth={2.5} />
                  Compartir por WhatsApp
                </button>
                
                <button
                  onClick={() => {
                    alert('Impresora no configurada. El ticket virtual se ha guardado en la base de datos y se puede compartir por WhatsApp.');
                  }}
                  className="w-full py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase text-xs tracking-tight rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-center"
                >
                  <Printer size={14} />
                  Imprimir Comprobante (Físico)
                </button>

                <button
                  onClick={() => setShowTicketModal(false)}
                  className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs text-center uppercase tracking-widest font-black"
                >
                  Regresar al Punto de Venta
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
