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

type View = 'dashboard' | 'inventory' | 'finances' | 'route' | 'profile';

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

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

      {/* Header */}
      <header className={`h-16 hidden md:flex border-b items-center justify-between px-6 shrink-0 sticky top-0 z-50 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#0ea5e9] rounded-lg flex items-center justify-center text-white">
            <Droplets size={20} strokeWidth={2.5} />
          </div>
          <span className={`text-xl font-bold tracking-tight ${darkMode ? 'text-sky-400' : 'text-[#0284c7]'}`}>AquaControl Pro</span>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-slate-800 text-amber-400' : 'bg-slate-100 text-slate-500'}`}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-slate-500 font-medium tracking-wide">CDMX - Planta Iztapalapa</span>
            <div className="bg-[#ecfdf5] text-[#059669] px-3 py-1 rounded-full text-xs font-bold ring-1 ring-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-900">
              Sistema Online
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex flex-1 md:h-[calc(100vh-64px)] overflow-hidden flex-col md:flex-row">
        {/* Navigation Sidebar (Vertical Bar) - DESKTOP */}
        <div className={`hidden md:flex w-16 border-r flex-col items-center py-6 gap-6 shrink-0 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          {navItems.filter(i => i.id !== 'profile').map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as View)}
              className={`p-3 rounded-xl transition-all ${
                activeView === item.id 
                  ? 'bg-[#0ea5e9] text-white shadow-md shadow-sky-500/20' 
                  : `text-slate-400 hover:bg-slate-100 ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`
              }`}
              title={item.label}
            >
              <item.icon size={22} />
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 md:p-6 flex flex-col md:flex-row gap-6 overflow-hidden min-w-0">
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

