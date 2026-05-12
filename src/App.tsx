import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Package, 
  MessageSquare, 
  Bell, 
  Search,
  Menu,
  X,
  Droplets,
  DollarSign,
  Moon,
  Sun,
  Truck,
  User,
  CreditCard,
  MapPin
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import WhatsAppChat from './components/WhatsAppChat';
import Finances from './components/Finances';
import DeliveryRoute from './components/DeliveryRoute';

import Lobby from './components/Lobby';

type View = 'lobby' | 'dashboard' | 'inventory' | 'finances' | 'route' | 'profile';

export default function App() {
  const [activeView, setActiveView] = useState<View>('lobby');
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  const handleRoleSelection = (role: 'admin' | 'operator' | 'driver' | 'client') => {
    if (role === 'client') {
      const msg = 'Hola Quality Water, quiero solicitar un servicio de llenado.';
      window.open(`https://wa.me/525500000000?text=${encodeURIComponent(msg)}`, '_blank');
      return;
    }
    
    switch(role) {
      case 'admin': setActiveView('finances'); break;
      case 'operator': setActiveView('dashboard'); break;
      case 'driver': setActiveView('route'); break;
    }
  };

  // Simulated Notifications
  useEffect(() => {
    const notifications = [
      'Nuevo pedido vía WhatsApp: 2 Garrafones en Polanco',
      'Ruta 1 reporta retraso en tráfico (Av. Reforma)',
      'Nuevo pedido vía WhatsApp: 5 Garrafones en Santa Fe',
      'Mantenimiento: Filtro de carbón al 15%',
      'Nuevo pedido vía WhatsApp: 1 Garrafón en Condesa'
    ];

    const interval = setInterval(() => {
      const msg = notifications[Math.floor(Math.random() * notifications.length)];
      setNotification(msg);
      setTimeout(() => setNotification(null), 4000);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Pedidos', icon: LayoutDashboard },
    { id: 'route', label: 'Ruta', icon: Truck },
    { id: 'finances', label: 'Cobrar', icon: DollarSign },
    { id: 'inventory', label: 'Envases', icon: Package },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  if (activeView === 'lobby') {
    return <Lobby onSelectRole={handleRoleSelection} />;
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'text-slate-800 bg-[#f1f5f9]'}`}>
      
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none"
          >
            <div className="bg-sky-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md pointer-events-auto border-2 border-sky-400">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <MessageSquare size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Nuevo Mensaje</p>
                <p className="text-sm font-bold">{notification}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop Only */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-50 border-r transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-900 text-white border-slate-800'}`}
      >
        <div 
          className="p-6 flex items-center gap-3 cursor-pointer group"
          onClick={() => setActiveView('lobby')}
        >
          <img 
            src="https://cossma.com.mx/purificadora.jpg" 
            alt="Logo" 
            className="w-10 h-10 object-contain rounded-lg group-hover:scale-110 transition-transform"
          />
          {isSidebarOpen && (
            <span className="font-display font-bold text-lg tracking-tight whitespace-nowrap">Quality<span className="text-sky-400">Water</span></span>
          )}
        </div>

        <nav className="flex-1 px-4 mt-4 space-y-2">
          {navItems.filter(i => i.id !== 'profile').map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as View)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                activeView === item.id 
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20 font-bold' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={22} />
              {isSidebarOpen && <span className="text-sm font-bold uppercase tracking-wider">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-6">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.aside>

      <main className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-[280px]' : 'md:ml-[80px]'}`}>
        {/* Header - Desktop */}
        <header className={`h-16 hidden md:flex border-b items-center justify-between px-6 shrink-0 sticky top-0 z-50 transition-colors ${darkMode ? 'bg-slate-900/80 backdrop-blur-md border-slate-800' : 'bg-white/80 backdrop-blur-md border-slate-200'}`}>
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">
              {navItems.find(i => i.id === activeView)?.label || 'Panel'}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-slate-800 text-amber-400' : 'bg-slate-100 text-slate-500'}`}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="flex items-center gap-4">
              <span className="text-[11px] text-slate-500 font-black uppercase tracking-wider">Planta Iztapalapa</span>
              <div className="bg-emerald-500 w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Sistema Online" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-4 md:p-8 flex flex-col lg:flex-row gap-6 overflow-hidden min-w-0 md:h-[calc(100vh-64px)]">
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar md:pr-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1"
              >
                {activeView === 'dashboard' ? <Dashboard /> : 
                 activeView === 'inventory' ? <Inventory /> :
                 activeView === 'finances' ? <Finances /> :
                 activeView === 'route' ? <DeliveryRoute /> :
                 <div className="p-8 text-center text-slate-400 italic">Módulo de perfil en desarrollo...</div>}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Desktop WhatsApp Simulator Panel */}
          <div className={`hidden lg:flex w-[320px] flex-shrink-0 flex-col h-full border rounded-xl overflow-hidden shadow-sm transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <WhatsAppChat />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 h-20 border-t flex items-center justify-around px-2 z-[60] pb-safe transition-colors shadow-[0_-5px_15px_rgba(0,0,0,0.05)] ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id as View)}
            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] rounded-xl transition-all ${
              activeView === item.id 
                ? 'text-sky-500 font-bold' 
                : 'text-slate-400'
            }`}
          >
            <item.icon size={activeView === item.id ? 24 : 20} strokeWidth={activeView === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Mobile Dark Mode Toggle Overlay */}
      <button 
        onClick={() => setDarkMode(!darkMode)}
        className="md:hidden fixed top-4 right-4 z-[70] p-3 rounded-full shadow-lg bg-white dark:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
      >
        {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-slate-500" />}
      </button>

      {/* Bottom Spacer for Mobile Nav */}
      <div className="h-20 md:hidden flex-shrink-0" />
    </div>
  );
}

