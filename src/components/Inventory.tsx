import React from 'react';
import { motion } from 'motion/react';
import { User, Archive, ArrowDownLeft, Search } from 'lucide-react';
import { MOCK_CUSTOMER_BALANCES } from '../constants';

export default function Inventory() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Gestión de Envases</h1>
        <p className="text-slate-500 mt-1">Control de garrafones vacíos pendientes por recolectar</p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Buscar cliente por nombre o colonia..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all shadow-sm"
        />
      </div>

      {/* Stats Summary */}
      <div className="bg-brand-700 text-white p-6 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-600 rounded-xl">
            <Archive size={24} />
          </div>
          <div>
            <p className="text-brand-100 text-xs font-medium uppercase tracking-wider">Total de Envases en Calle</p>
            <p className="text-3xl font-bold">312</p>
          </div>
        </div>
        <div className="h-10 w-px bg-brand-600 mx-8 hidden sm:block" />
        <div className="hidden sm:block">
          <p className="text-brand-100 text-xs font-medium uppercase tracking-wider">Tasa de Retorno</p>
          <p className="text-3xl font-bold">94.2%</p>
        </div>
        <button className="bg-white text-brand-700 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-brand-50 transition-colors shadow-lg">
          Conciliar Todo
        </button>
      </div>

      {/* Customer List Panel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-w-2xl">
        <div className="p-4 px-6 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">Gestión de Envases</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {MOCK_CUSTOMER_BALANCES.map((customer, idx) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="px-6 py-3 flex justify-between items-center hover:bg-slate-50 transition-colors"
            >
              <span className="text-[13px] font-medium text-slate-800">{customer.name}</span>
              <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-bold text-sky-600">
                {customer.jugBalance}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
