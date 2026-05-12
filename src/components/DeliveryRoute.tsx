import React, { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';

export default function DeliveryRoute() {
  const [jugsReceived, setJugsReceived] = useState(0);
  const [step, setStep] = useState(1); // 1: Route Overview, 2: Delivery Detail

  const nextDelivery = {
    client: 'Residencial Latitud',
    neighborhood: 'Santa Fe',
    address: 'Carr. México-Toluca 5420, Santa Fe, CDMX',
    items: [
      { name: 'Garrafón 20L (Llenado)', quantity: 12 },
      { name: 'Envase Nuevo', quantity: 2 }
    ],
    time: '10:15 AM',
    distance: '15 min',
    phone: '55-1234-5678'
  };

  const handleOpenMaps = () => {
    // Simulating opening Google Maps
    window.location.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextDelivery.address)}`;
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-24">
      {/* Driver Context Header */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center">
              <Truck size={24} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ruta Asignada</p>
              <p className="text-lg font-black italic">Santa Fe / Poniente</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-sky-400">12/25</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Entregas</p>
          </div>
        </div>
        
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div className="bg-sky-500 h-full w-[48%]" />
        </div>
      </div>

      {step === 1 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Siguiente Parada</h2>
            <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">
              <Clock size={12} /> EN TIEMPO
            </span>
          </div>

          <div className="bg-white p-6 rounded-3xl border-2 border-sky-100 shadow-xl shadow-sky-900/5">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{nextDelivery.client}</h3>
                <p className="text-slate-400 font-bold mt-2 flex items-center gap-1 italic">
                  <MapPin size={14} className="text-rose-500" /> {nextDelivery.neighborhood}
                </p>
              </div>
              <div className="bg-sky-50 text-sky-600 px-3 py-1 rounded-xl text-xs font-black uppercase">
                {nextDelivery.distance}
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">Artículos a Entregar</p>
              {nextDelivery.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                  <span className="text-sm font-bold text-slate-700">{item.name}</span>
                  <span className="text-lg font-black text-sky-600">x{item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleOpenMaps}
                className="flex flex-col items-center justify-center gap-2 bg-slate-100 p-4 rounded-2xl hover:bg-slate-200 transition-all min-h-[44px]"
              >
                <Navigation size={20} className="text-sky-600" />
                <span className="text-[10px] font-black uppercase text-slate-600">Navegar</span>
              </button>
              <button className="flex flex-col items-center justify-center gap-2 bg-slate-100 p-4 rounded-2xl hover:bg-slate-200 transition-all min-h-[44px]">
                <Phone size={20} className="text-emerald-600" />
                <span className="text-[10px] font-black uppercase text-slate-600">Llamar</span>
              </button>
            </div>

            <button 
              onClick={() => setStep(2)}
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
          className="bg-white p-6 rounded-3xl border-2 border-emerald-100 shadow-xl shadow-emerald-900/5 mb-6"
        >
          <button 
            onClick={() => setStep(1)}
            className="mb-6 flex items-center gap-2 text-slate-400 font-bold text-sm min-h-[44px]"
          >
            <ArrowLeft size={16} /> Volver
          </button>

          <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-500" /> Finalizar Entrega
          </h3>

          <div className="space-y-8">
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Envases Recibidos</p>
              <div className="flex items-center justify-center gap-8">
                <button 
                  onClick={() => setJugsReceived(Math.max(0, jugsReceived - 1))}
                  className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 active:bg-slate-200 min-h-[44px]"
                >
                  <Minus size={24} />
                </button>
                <span className="text-5xl font-black text-slate-900 w-16">{jugsReceived}</span>
                <button 
                  onClick={() => setJugsReceived(jugsReceived + 1)}
                  className="w-14 h-14 bg-sky-500 rounded-2xl flex items-center justify-center text-white active:bg-sky-600 min-h-[44px]"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>

            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-emerald-800 uppercase tracking-wide">Total a Cobrar</span>
                <span className="text-3xl font-black text-emerald-700">$540.00</span>
              </div>
              <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase text-right">Efectivo o Transferencia</p>
            </div>

            <button 
              onClick={() => setStep(1)}
              className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center gap-3 min-h-[44px]"
            >
              <CheckCircle2 size={24} /> Confirmar Pago y Entrega
            </button>
          </div>
        </motion.div>
      )}

      {/* Floating Action Tip */}
      <div className="bg-indigo-600 text-white p-4 rounded-2xl flex items-center gap-4 shadow-lg">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
          <MessageCircle size={20} />
        </div>
        <p className="text-xs font-bold leading-tight">Cliente escribió por WhatsApp: "Deje los garrafones en la recepción"</p>
      </div>
    </div>
  );
}
