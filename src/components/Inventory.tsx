import React from 'react';
import { motion } from 'motion/react';
import { User, Archive, ArrowDownLeft, Search, MapPin, ChevronRight, PackageCheck } from 'lucide-react';
import { MOCK_CUSTOMER_BALANCES } from '../constants';

export default function Inventory() {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Gestión de Envases</h1>
          <p className="text-slate-500 mt-2 italic">Control de garrafones vacíos pendientes por recolectar</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por cliente o colonia..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Stats Summary - Responsive */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-slate-200 border border-slate-800">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="p-4 bg-sky-500/20 rounded-2xl border border-sky-500/30">
            <Archive size={28} className="text-sky-400" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total en Calle</p>
            <p className="text-3xl font-black text-white">312 <span className="text-xs text-slate-500 font-bold uppercase">Und.</span></p>
          </div>
        </div>
        
        <div className="h-px md:h-12 w-full md:w-px bg-slate-800 hidden md:block" />
        
        <div className="flex flex-col w-full md:w-auto">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Tasa de Retorno</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-emerald-400">94.2%</p>
            <span className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-tighter">Meta: 95%</span>
          </div>
        </div>
        
        <button className="w-full md:w-auto bg-white text-slate-900 px-8 py-3 rounded-xl font-black text-sm hover:bg-sky-50 transition-all shadow-lg active:scale-95 min-h-[44px]">
          Conciliar Todo
        </button>
      </div>

      {/* Customer List Card Panel */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 px-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <PackageCheck size={18} className="text-sky-500" />
            Saldos Pendientes
          </h2>
          <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded font-black uppercase tracking-wider">
            {MOCK_CUSTOMER_BALANCES.length} Clientes
          </span>
        </div>
        
        <div className="divide-y divide-slate-50">
          {MOCK_CUSTOMER_BALANCES.map((customer, idx) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="px-6 py-4 flex justify-between items-center hover:bg-sky-50/30 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-sky-500 transition-colors">
                  <User size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">{customer.name}</p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin size={10} /> {customer.neighborhood}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-lg font-black text-slate-800 leading-none">{customer.jugBalance}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Garrafones</p>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-sky-500 transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
