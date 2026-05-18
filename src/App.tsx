import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Package, 
  MessageSquare, 
  Bell, 
  Search,
  Clock,
  Menu,
  X,
  LogOut,
  Droplets,
  DollarSign,
  TrendingUp,
  Moon,
  Sun,
  Truck,
  User,
  CreditCard,
  Users,
  ShoppingBag,
  History,
  Store,
  ShieldCheck,
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import WhatsAppChat from './components/WhatsAppChat';
import Finances from './components/Finances';
import DeliveryRoute from './components/DeliveryRoute';
import Profile from './components/Profile';
import Attendance from './components/Attendance';
import NotificationHub from './components/NotificationHub';
import QualityLog from './components/QualityLog';

import Lobby from './components/Lobby';

type View = 'lobby' | 'dashboard' | 'inventory' | 'finances' | 'route' | 'profile' | 'metrics' | 'sales' | 'customers' | 'settlement' | 'plant_cut' | 'driver_sales' | 'attendance' | 'quality';

export default function App() {
  const [activeView, setActiveView] = useState<View>('metrics');
  const [userRole, setUserRole] = useState<'admin' | 'operator' | 'driver' | null>('admin');
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  const handleRoleSelection = (role: 'admin' | 'operator' | 'driver' | 'client') => {
    if (role === 'client') {
      const msg = 'Hola Quality Water, quiero solicitar un servicio de llenado.';
      window.open(`https://wa.me/525500000000?text=${encodeURIComponent(msg)}`, '_blank');
      return;
    }
    
    setUserRole(role);
    switch(role) {
      case 'admin': setActiveView('metrics'); break;
      case 'operator': setActiveView('dashboard'); break;
      case 'driver': setActiveView('route'); break;
    }
  };

  // Simulated Notifications
  useEffect(() => {
    // Notifications disabled per user request
  }, []);

  const getNavItems = () => {
    if (userRole === 'admin') {
      return [
        { id: 'metrics', label: 'Métricas', icon: TrendingUp },
        { id: 'sales', label: 'Ventas Globales', icon: History },
        { id: 'customers', label: 'Clientes', icon: Users },
        { id: 'driver_sales', label: 'Choferes', icon: Truck },
        { id: 'plant_cut', label: 'Caja Planta', icon: Store },
        { id: 'attendance', label: 'Asistencia', icon: Clock },
        { id: 'quality', label: 'Calidad', icon: ShieldCheck },
      ];
    }

    return [
      { id: 'dashboard', label: 'Pedidos', icon: LayoutDashboard },
      { id: 'route', label: 'Ruta', icon: Truck },
      { id: 'inventory', label: 'Envases', icon: Package },
      { id: 'profile', label: 'Ajustes', icon: User },
    ];
  };

  const navItems = getNavItems();

  if (activeView === 'lobby') {
    return <Lobby onSelectRole={handleRoleSelection} />;
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'text-slate-800 bg-[#f1f5f9]'}`}>
      
      {/* Toast Notification Container Removed */}

      {/* Sidebar - Desktop Only */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-50 border-r transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-900 text-white border-slate-800'}`}
      >
        <div 
          className="p-6 flex items-center gap-3 group"
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
          {navItems.map((item) => (
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
          
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-slate-600 cursor-not-allowed mt-8"
          >
            <LogOut size={22} />
            {isSidebarOpen && <span className="text-sm font-bold uppercase tracking-wider">Sesión Admin</span>}
          </button>
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
            <NotificationHub userRole={userRole} />
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
                 activeView === 'metrics' ? <Finances initialTab="metrics" /> :
                 activeView === 'sales' ? <Finances initialTab="sales" /> :
                 activeView === 'customers' ? <Finances initialTab="customers" /> :
                 activeView === 'driver_sales' ? <Finances initialTab="driver_sales" /> :
                 activeView === 'plant_cut' ? <Finances initialTab="plant_cut" /> :
                 activeView === 'attendance' ? <Attendance /> :
                 activeView === 'quality' ? <QualityLog /> :
                 activeView === 'route' ? <DeliveryRoute /> :
                 <Profile />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className={`md:hidden fixed bottom-1 left-4 right-4 h-20 border-t flex items-center justify-start gap-2 px-4 z-[60] pb-safe transition-colors shadow-2xl rounded-3xl overflow-x-auto no-scrollbar ${darkMode ? 'bg-slate-900/90 backdrop-blur-xl border-slate-800' : 'bg-white/90 backdrop-blur-xl border-slate-200'}`}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id as View)}
            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] rounded-xl transition-all shrink-0 ${
              activeView === item.id 
                ? 'text-sky-500 font-bold' 
                : 'text-slate-400'
            }`}
          >
            <item.icon size={activeView === item.id ? 22 : 20} strokeWidth={activeView === item.id ? 2.5 : 2} />
            <span className="text-[9px] font-bold uppercase tracking-widest leading-none text-center h-4 flex items-center">{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => {}}
          className="flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] rounded-xl text-slate-400 shrink-0"
        >
          <LogOut size={20} strokeWidth={2.5} />
          <span className="text-[9px] font-bold uppercase tracking-widest leading-none">Admin</span>
        </button>
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

