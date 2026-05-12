import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Package, 
  MessageSquare, 
  Bell, 
  Search,
  Menu,
  X,
  Droplets
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import WhatsAppChat from './components/WhatsAppChat';

type View = 'dashboard' | 'inventory';

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { id: 'dashboard', label: 'Operación', icon: LayoutDashboard },
    { id: 'inventory', label: 'Gestión Envases', icon: Package },
  ];

  return (
    <div className="min-h-screen flex flex-col text-slate-800 bg-[#f1f5f9]">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#0ea5e9] rounded-lg flex items-center justify-center text-white">
            <Droplets size={20} strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold text-[#0284c7] tracking-tight">AquaControl Pro</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[13px] text-slate-500 font-medium tracking-wide">CDMX - Planta Iztapalapa</span>
          <div className="bg-[#ecfdf5] text-[#059669] px-3 py-1 rounded-full text-xs font-bold ring-1 ring-emerald-100">
            Sistema Online
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex flex-1 h-[calc(100vh-64px)] overflow-hidden">
        {/* Navigation Sidebar (Vertical Bar) */}
        <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-6 shrink-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as View)}
              className={`p-3 rounded-xl transition-all ${
                activeView === item.id 
                  ? 'bg-[#0ea5e9] text-white shadow-md shadow-sky-500/20' 
                  : 'text-slate-400 hover:bg-slate-100'
              }`}
              title={item.label}
            >
              <item.icon size={22} />
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 flex gap-6 overflow-hidden min-w-0">
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar pr-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1"
              >
                {activeView === 'dashboard' ? <Dashboard /> : <Inventory />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* WhatsApp Simulator Panel */}
          <div className="w-[320px] flex-shrink-0 flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <WhatsAppChat />
          </div>
        </div>
      </main>
    </div>
  );
}

