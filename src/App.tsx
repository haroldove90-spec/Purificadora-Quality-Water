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
  Download,
  BookOpen,
  Settings,
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import WhatsAppChat from './components/WhatsAppChat';
import Finances from './components/Finances';
import DeliveryRoute from './components/DeliveryRoute';
import Profile from './components/Profile';
import Manual from './components/Manual';
import Attendance from './components/Attendance';
import NotificationHub from './components/NotificationHub';
import QualityLog from './components/QualityLog';
import ClientStatus from './components/ClientStatus';
import Notifications from './components/Notifications';
import POS from './components/POS';

import Lobby from './components/Lobby';
import { usePWA } from './hooks/usePWA';

import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './lib/supabaseClient';

type View = 'lobby' | 'dashboard' | 'inventory' | 'finances' | 'route' | 'profile' | 'metrics' | 'sales' | 'customers' | 'settlement' | 'plant_cut' | 'driver_sales' | 'attendance' | 'quality' | 'client_status' | 'notifications' | 'manual' | 'pos';

export default function App() {
  const { isInstallable, installApp, requestPermissions } = usePWA();
  const [activeView, setActiveView] = useState<View>(() => {
    try {
      const saved = localStorage.getItem('activeView');
      if (saved && saved !== 'lobby') return saved as View;
    } catch (_) {}
    return 'lobby';
  });
  const [userRole, setUserRole] = useState<'admin' | 'operator' | 'driver' | 'client' | null>(() => {
    try {
      const backupStr = localStorage.getItem('quality_water_session_backup');
      if (backupStr) {
        const backup = JSON.parse(backupStr);
        if (backup?.userRole) return backup.userRole;
      }
    } catch (_) {}
    return null;
  });
  const [currentRoleView, setCurrentRoleView] = useState<'admin' | 'operator' | 'driver' | 'client' | null>(() => {
    try {
      const backupStr = localStorage.getItem('quality_water_session_backup');
      if (backupStr) {
        const backup = JSON.parse(backupStr);
        if (backup?.currentRoleView) return backup.currentRoleView;
      }
      const saved = localStorage.getItem('currentRoleView');
      if (saved) return saved as any;
    } catch (_) {}
    return null;
  });
  const [userName, setUserName] = useState<string | null>(() => {
    try {
      const backupStr = localStorage.getItem('quality_water_session_backup');
      if (backupStr) {
        const backup = JSON.parse(backupStr);
        if (backup?.userName) return backup.userName;
      }
    } catch (_) {}
    return null;
  });
  const [session, setSession] = useState<any>(() => {
    try {
      const backupStr = localStorage.getItem('quality_water_session_backup');
      if (backupStr) {
        const backup = JSON.parse(backupStr);
        if (backup?.session) return backup.session;
      }
    } catch (_) {}
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Backup sync effect
  useEffect(() => {
    if (session) {
      try {
        localStorage.setItem('quality_water_session_backup', JSON.stringify({
          session,
          userRole,
          currentRoleView,
          userName
        }));
      } catch (_) {}
    } else if (session === null) {
      try {
        localStorage.removeItem('quality_water_session_backup');
      } catch (_) {}
    }
  }, [session, userRole, currentRoleView, userName]);

  useEffect(() => {
    if (activeView && activeView !== 'lobby') {
      try {
        localStorage.setItem('activeView', activeView);
      } catch (_) {}
    }
  }, [activeView]);

  useEffect(() => {
    if (currentRoleView) {
      try {
        localStorage.setItem('currentRoleView', currentRoleView);
      } catch (_) {}
    }
  }, [currentRoleView]);

  useEffect(() => {
    let mounted = true;

    // Función auxiliar para auto-limpieza en caso de tokens corruptos
    const cleanCorruptTokens = () => {
      console.warn('Detectado token o sesión corrupta de Supabase. Limpiando almacenamiento local...');
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => {
          try {
            localStorage.removeItem(k);
          } catch (e) {}
        });
      } catch (e) {
        console.error('No se pudo limpiar localStorage:', e);
      }
    };

    // Control global de rechazos asíncronos para evitar alertas molestas y auto-recuperar la app
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!mounted) return;
      const reason = event.reason;
      const message = reason?.message || String(reason || '');
      
      const lowerMsg = message.toLowerCase();
      if (
        lowerMsg.includes('failed to fetch') ||
        lowerMsg.includes('fetch') ||
        lowerMsg.includes('networkerror') ||
        lowerMsg.includes('network error')
      ) {
        console.warn('Capturado y mitigado error de red offline en background:', message);
        try {
          event.preventDefault();
          event.stopPropagation();
        } catch (_) {}
        return;
      }
      
      if (
        message.includes('Refresh Token') || 
        message.includes('refresh_token') || 
        message.includes('Invalid Refresh Token') || 
        message.includes('grant') || 
        message.includes('AuthApiError')
      ) {
        console.warn('Capturado y mitigado error de Auth del servidor:', message);
        event.preventDefault(); // Evita el banner rojo en la UI para errores ignorables

        cleanCorruptTokens();
        supabase.auth.signOut().catch(() => {});
        
        setSession(null);
        setUserRole(null);
        setCurrentRoleView(null);
        setUserName(null);
        setActiveView('lobby');
        setLoading(false);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Timeout de seguridad definitivo: si en 4 segundos la app sigue cargando por temas de red, forzamos el cierre de la pantalla de carga.
    // Esto asegura que la app siempre cargue el Lobby o la pantalla principal de forma inmediata.
    const safetyTimeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Freno de seguridad de carga activado (Timeout).');
        setLoading(false);
      }
    }, 4000);

    // 1. Escuchar cambios de autenticación
    console.log('Iniciando suscripción a cambios de Auth...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      console.log(`Evento de Auth detectado: ${event}`);
      setSession(currentSession);
      
      if (currentSession?.user) {
        fetchUserRole(currentSession.user.id, currentSession.user.user_metadata?.full_name);
      } else if (event === 'SIGNED_OUT') {
        setUserRole(null);
        setCurrentRoleView(null);
        setActiveView('lobby');
        setLoading(false);
      }
    });

    // 2. Intento de carga inicial de sesión
    const init = async () => {
      console.log('Iniciando carga inicial de sesión...');
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error('Error al recuperar sesión inicial:', error);
          if (
            error.message?.includes('Refresh Token') || 
            error.message?.includes('refresh_token') || 
            error.message?.includes('grant')
          ) {
            cleanCorruptTokens();
            await supabase.auth.signOut().catch(() => {});
            setSession(null);
            setUserRole(null);
            setCurrentRoleView(null);
            setActiveView('lobby');
          }
        } else if (initialSession) {
          console.log('Sesión inicial recuperada con éxito');
          setSession(initialSession);
          await fetchUserRole(initialSession.user.id, initialSession.user.user_metadata?.full_name);
        } else {
          console.log('No hay sesión de usuario guardada');
          setUserRole(null);
          setCurrentRoleView(null);
          setActiveView('lobby');
        }
      } catch (err: any) {
        console.error('Fallo de inicialización crítica en init:', err);
        const errMsg = err?.message || String(err || '');
        if (
          errMsg.includes('Refresh Token') || 
          errMsg.includes('refresh_token') || 
          errMsg.includes('grant')
        ) {
          cleanCorruptTokens();
          await supabase.auth.signOut().catch(() => {});
          setSession(null);
          setUserRole(null);
          setCurrentRoleView(null);
          setActiveView('lobby');
        }
      } finally {
        if (mounted) {
          clearTimeout(safetyTimeoutId);
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      clearTimeout(safetyTimeoutId);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string, defaultName?: string) => {
    try {
      console.log('Cargando rol para:', userId);
      // Timeout para la consulta a la base de datos (4 segundos máximo)
      const rolePromise = supabase
        .from('employees')
        .select('role, name')
        .eq('auth_id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout en DB')), 4000)
      );

      const { data, error }: any = await Promise.race([rolePromise, timeoutPromise]);
      
      if (error) throw error;

      if (data) {
        let role = String(data.role || 'driver').toLowerCase();
        
        // Normalización de roles (Español -> English Interno)
        if (role === 'planta' || role === 'operador') role = 'operator';
        if (role === 'repartidor' || role === 'chofer' || role === 'client') role = 'driver';
        if (role === 'administrador') role = 'admin';
        
        setUserRole(role as any);
        setCurrentRoleView(role as any);
        setUserName(data.name);
        
        // Cambio de vista inmediato
        if (activeView === 'lobby') {
          switch(role) {
            case 'admin': setActiveView('metrics'); break;
            case 'operator': setActiveView('pos'); break;
            case 'driver': setActiveView('pos'); break;
            default: setActiveView('pos');
          }
        }
      } else {
        setUserRole('driver');
        setCurrentRoleView('driver');
        setUserName(defaultName || 'Repartidor');
        if (activeView === 'lobby') setActiveView('pos');
      }
    } catch (err) {
      console.error('Error obteniendo rol:', err);
      setUserRole('driver');
      setCurrentRoleView('driver');
      setUserName(defaultName || 'Usuario');
      if (activeView === 'lobby') setActiveView('pos');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelection = (role: 'admin' | 'operator' | 'driver' | 'client') => {
    // This is now purely for visual priority if needed, but real role comes from DB
    requestPermissions();
  };

  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    
    console.log('Cierre de sesión iniciado...');
    
    try {
      // Intentamos cerrar sesión en segundo plano, no bloqueamos la UI
      supabase.auth.signOut().catch(err => console.warn('Supabase signOut error (ignorable):', err));
    } catch (e) {
      console.error('Excepción en logout:', e);
    } finally {
      // Limpieza inmediata y forzada
      try {
        localStorage.removeItem('activeView');
        localStorage.removeItem('currentRoleView');
        localStorage.removeItem('quality_water_session_backup');
      } catch (_) {}
      setSession(null);
      setUserRole(null);
      setCurrentRoleView(null);
      setUserName(null);
      setActiveView('lobby');
      setLoggingOut(false);
      console.log('Sesión cerrada exitosamente en local');
    }
  };

  const getNavItems = () => {
    let items: any[] = [];
    
    if (currentRoleView === 'admin') {
      items = [
        { id: 'dashboard', label: 'Pedidos', icon: LayoutDashboard },
        { id: 'manual', label: 'Manual Usuario', icon: BookOpen },
        { id: 'inventory', label: 'Gestión de Productos', icon: Package },
        { id: 'metrics', label: 'Métricas', icon: TrendingUp },
        { id: 'attendance', label: 'Asistencia', icon: Clock },
        { id: 'sales', label: 'Métricas', icon: History },
        { id: 'customers', label: 'Clientes', icon: Users },
        { id: 'driver_sales', label: 'Empleados', icon: Truck },
        { id: 'plant_cut', label: 'Caja Planta', icon: Store },
        { id: 'quality', label: 'Calidad', icon: ShieldCheck },
        { id: 'notifications', label: 'Notificaciones', icon: Bell },
        { id: 'profile', label: 'Perfil', icon: User },
      ];
    } else if (currentRoleView === 'driver') {
      items = [
        { id: 'pos', label: 'Venta POS', icon: CreditCard },
        { id: 'manual', label: 'Manual Usuario', icon: BookOpen },
        { id: 'route', label: 'Mi Ruta', icon: Truck },
        { id: 'customers', label: 'Clientes', icon: Users },
        { id: 'attendance', label: 'Asistencia', icon: Clock },
        { id: 'notifications', label: 'Notificaciones', icon: Bell },
        { id: 'profile', label: 'Perfil', icon: User },
      ];
    } else if (currentRoleView === 'operator') {
      items = [
        { id: 'pos', label: 'Rol Ventas (POS)', icon: CreditCard },
        { id: 'dashboard', label: 'Pedidos', icon: LayoutDashboard },
        { id: 'manual', label: 'Manual Usuario', icon: BookOpen },
        { id: 'inventory', label: 'Gestión de Productos', icon: Package },
        { id: 'sales', label: 'Métricas', icon: History },
        { id: 'attendance', label: 'Asistencia', icon: Clock },
        { id: 'notifications', label: 'Notificaciones', icon: Bell },
        { id: 'profile', label: 'Perfil', icon: User },
      ];
    } else if (currentRoleView === 'client') {
      items = [
        { id: 'client_status', label: 'Mi Pedido', icon: MessageSquare },
        { id: 'profile', label: 'Perfil', icon: User },
      ];
    }

    // Agregar accesos directos de cambio de rol para el administrador real
    if (userRole === 'admin') {
      if (currentRoleView === 'admin') {
        items.push(
          { id: 'switch_to_operator', label: 'Vista Planta', icon: Store, isShortcut: true },
          { id: 'switch_to_driver', label: 'Vista Repartidor', icon: Truck, isShortcut: true }
        );
      } else {
        items.push(
          { id: 'switch_to_admin', label: 'Ver Admin', icon: ShieldCheck, isShortcut: true }
        );
      }
    }

    return items;
  };

  const handleNavClick = (itemId: string) => {
    if (itemId === 'switch_to_operator') {
      setCurrentRoleView('operator');
      setActiveView('pos');
    } else if (itemId === 'switch_to_driver') {
      setCurrentRoleView('driver');
      setActiveView('pos');
    } else if (itemId === 'switch_to_admin') {
      setCurrentRoleView('admin');
      setActiveView('metrics');
    } else {
      setActiveView(itemId as View);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8">
          <div className="w-20 h-20 border-4 border-sky-500/10 border-t-sky-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Droplets size={32} className="text-sky-500 animate-bounce" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white uppercase tracking-tight italic">Quality<span className="text-sky-500">Water</span></h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse">Iniciando Centro de Control...</p>
          </div>
          <button 
            onClick={() => setLoading(false)}
            className="text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-sky-500 transition-colors border border-slate-800 px-4 py-2 rounded-full"
          >
            ¿Tarda mucho? Cargar Manualmente
          </button>
        </div>
      </div>
    );
  }

  const navItems = getNavItems();

  if (!session) {
    return <Lobby onSelectRole={handleRoleSelection} />;
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'text-slate-800 bg-[#f1f5f9]'}`}>
      
      {/* Header - Mobile Only */}
      <header className={`md:hidden shrink-0 sticky top-0 z-[50] border-b transition-colors duration-300 ${darkMode ? 'bg-slate-900/95 backdrop-blur-md border-slate-800' : 'bg-white/95 backdrop-blur-md border-slate-250'}`}>
        <div className="flex items-center justify-between p-3.5">
          <div className="flex items-center gap-2">
            <img 
              src="https://cossma.com.mx/purificadora.jpg" 
              alt="Logo" 
              className="w-8 h-8 object-contain rounded"
            />
            <div className="flex flex-col">
              <span className="font-display font-black text-sm tracking-tight leading-none text-slate-800 dark:text-white">
                Quality<span className="text-sky-500">Water</span>
              </span>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">{userName || 'Usuario'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isInstallable && (
              <button
                onClick={installApp}
                title="Instalar App"
                className="p-2 rounded-xl bg-sky-500/10 text-sky-500 hover:bg-sky-500 hover:text-white transition-all flex items-center gap-1"
              >
                <Download size={14} />
                <span className="text-[8px] font-black uppercase tracking-tight">Instalar</span>
              </button>
            )}
            <NotificationHub userRole={currentRoleView} onViewAll={() => setActiveView('notifications')} />
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl transition-colors ${darkMode ? 'bg-slate-800 text-amber-400' : 'bg-slate-100 text-slate-500'}`}
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>

        {/* Prominent Role view switcher on mobile for Administrator profile */}
        {userRole === 'admin' && (
          <div className="px-3 pb-3">
            <div className="flex flex-col gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-sky-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">MODO VISTA ACTIVA:</span>
                </div>
                <span className="text-[9px] font-black uppercase text-sky-500 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
                  {currentRoleView === 'admin' ? 'Ver Admin' : currentRoleView === 'operator' ? 'Ver Planta' : 'Ver Reparto'}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'admin', label: 'Admin', icon: ShieldCheck, view: 'metrics' },
                  { id: 'operator', label: 'Planta', icon: Store, view: 'pos' },
                  { id: 'driver', label: 'Reparto', icon: Truck, view: 'pos' }
                ].map((role) => {
                  const active = currentRoleView === role.id;
                  const Icon = role.icon;
                  return (
                    <button
                      key={role.id}
                      onClick={() => {
                        setCurrentRoleView(role.id as any);
                        setActiveView(role.view as any);
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl transition-all ${
                        active 
                          ? 'bg-sky-500 text-white font-extrabold shadow-md shadow-sky-500/15' 
                          : 'bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold'
                      }`}
                    >
                      <Icon size={12} className={active ? 'animate-bounce' : 'opacity-70'} />
                      <span className="text-[9px] uppercase tracking-wider">{role.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Toast Notification Container Removed */}

      {/* Sidebar - Desktop Only */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-50 border-r transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-900 text-white border-slate-800'}`}
      >
        <div 
          className="p-6 flex items-center gap-3 group border-b border-slate-800/50"
        >
          <img 
            src="https://cossma.com.mx/purificadora.jpg" 
            alt="Logo" 
            className="w-10 h-10 object-contain rounded-lg group-hover:scale-110 transition-transform"
          />
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg tracking-tight whitespace-nowrap leading-none">Quality<span className="text-sky-400">Water</span></span>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1">{userName || 'Usuario'}</span>
            </div>
          )}
        </div>

          <nav className="flex-1 px-4 mt-4 space-y-2 overflow-y-auto custom-scrollbar-sidebar">
            {isInstallable && (
              <button
                onClick={installApp}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-white mb-4 border border-sky-500/20"
              >
                <Download size={22} className="shrink-0" />
                {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest text-left">Instalar Aplicación</span>}
              </button>
            )}

            {navItems.map((item: any) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                item.isShortcut 
                  ? 'border border-dashed border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300'
                  : activeView === item.id 
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20 font-bold' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={22} className={item.isShortcut ? 'text-amber-400 animate-pulse shrink-0' : 'shrink-0'} />
              {isSidebarOpen && <span className="text-sm font-bold uppercase tracking-wider">{item.label}</span>}
            </button>
          ))}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 mt-8"
          >
            <LogOut size={22} />
            {isSidebarOpen && <span className="text-sm font-bold uppercase tracking-wider text-slate-400">Cerrar Sesión</span>}
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
              {navItems.find((i: any) => i.id === activeView)?.label || 'Panel'}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <NotificationHub userRole={currentRoleView} onViewAll={() => setActiveView('notifications')} />
            {isInstallable && (
              <button
                onClick={installApp}
                title="Instalar App"
                className="p-2 rounded-lg bg-sky-500/10 text-sky-500 hover:bg-sky-500 hover:text-white transition-all flex items-center gap-2"
              >
                <Download size={18} />
                <span className="text-[9px] font-black uppercase tracking-tight">Instalar</span>
              </button>
            )}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-slate-800 text-amber-400' : 'bg-slate-100 text-slate-500'}`}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest leading-none mb-1">
                  {currentRoleView === 'admin' ? 'Administrador' : currentRoleView === 'operator' ? 'Planta' : currentRoleView === 'driver' ? 'Repartidor' : 'Cliente'}
                  {currentRoleView !== userRole && (
                    <span className="text-amber-500 ml-1 text-[8px] tracking-normal lowercase italic">(vista)</span>
                  )}
                </p>
                <p className="text-xs font-bold text-slate-700 uppercase italic">{userName || 'Usuario'}</p>
              </div>
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
                {activeView === 'dashboard' ? <Dashboard userRole={currentRoleView} /> : 
                 activeView === 'inventory' ? <Inventory userRole={currentRoleView} /> :
                 activeView === 'pos' ? <POS userRole={currentRoleView} /> :
                 activeView === 'finances' ? <Finances userRole={currentRoleView} /> :
                 activeView === 'metrics' ? <Finances initialTab="metrics" userRole={currentRoleView} /> :
                 activeView === 'sales' ? <Finances initialTab="sales" userRole={currentRoleView} /> :
                 activeView === 'customers' ? <Finances initialTab="customers" userRole={currentRoleView} /> :
                 activeView === 'driver_sales' ? <Finances initialTab="driver_sales" userRole={currentRoleView} /> :
                 activeView === 'plant_cut' ? <Finances initialTab="plant_cut" userRole={currentRoleView} /> :
                 activeView === 'attendance' ? <Attendance userRole={currentRoleView} /> :
                 activeView === 'quality' ? <QualityLog userRole={currentRoleView} /> :
                 activeView === 'route' ? <DeliveryRoute userRole={currentRoleView} /> :
                 activeView === 'client_status' ? <ClientStatus userRole={currentRoleView} /> :
                 activeView === 'notifications' ? <Notifications userRole={currentRoleView} /> :
                 activeView === 'manual' ? <Manual role={currentRoleView} /> :
                 <Profile />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className={`md:hidden fixed bottom-1 left-4 right-4 h-20 border-t flex items-center justify-start gap-2 px-4 z-[60] pb-safe transition-colors shadow-2xl rounded-3xl overflow-x-auto no-scrollbar ${darkMode ? 'bg-slate-900/90 backdrop-blur-xl border-slate-800' : 'bg-white/90 backdrop-blur-xl border-slate-200'}`}>
        {navItems.filter((item: any) => !item.isShortcut).map((item: any) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] rounded-xl transition-all shrink-0 ${
              activeView === item.id 
                ? 'text-sky-500 font-bold' 
                : 'text-slate-400'
            }`}
          >
            <item.icon 
              size={activeView === item.id ? 22 : 20} 
              strokeWidth={activeView === item.id ? 2.5 : 2} 
              className="shrink-0"
            />
            <span className="text-[9px] font-bold uppercase tracking-widest leading-none text-center h-4 flex items-center">{item.label}</span>
          </button>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] rounded-xl text-slate-400 shrink-0"
        >
          <LogOut size={20} strokeWidth={2.5} />
          <span className="text-[9px] font-bold uppercase tracking-widest leading-none">Cerrar</span>
        </button>
      </nav>

      {/* Bottom Spacer for Mobile Nav */}
      <div className="h-20 md:hidden flex-shrink-0" />
    </div>
  );
}

