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
  const [selectedDelivery, setSelectedDelivery] = useState<number | null>(null);
  const [jugsReceived, setJugsReceived] = useState(0);
  const [step, setStep] = useState(1); // 1: Route List, 2: Delivery Detail

  const deliveries = [
    {
      id: 1,
      client: 'Residencial Latitud',
      neighborhood: 'Santa Fe',
      address: 'Carr. México-Toluca 5420, Santa Fe, CDMX',
      items: [
        { name: 'Garrafón 20L (Llenado)', quantity: 12 },
        { name: 'Envase Nuevo', quantity: 2 }
      ],
      time: '10:15 AM',
      distance: '15 min',
      phone: '55-1234-5678',
      status: 'pending'
    },
    {
      id: 2,
      client: 'Corporativo Arcos',
      neighborhood: 'Bosques de las Lomas',
      address: 'Paseo de los Tamarindos 400, Bosques, CDMX',
      items: [
        { name: 'Garrafón 20L (Llenado)', quantity: 45 }
      ],
      time: '11:00 AM',
      distance: '25 min',
      phone: '55-9876-5432',
      status: 'pending'
    },
    {
      id: 3,
      client: 'Torre Virreyes',
      neighborhood: 'Lomas de Chapultepec',
      address: 'Pedregal 24, Lomas de Chapultepec, CDMX',
      items: [
        { name: 'Garrafón 20L (Llenado)', quantity: 8 },
        { name: 'Agua 5L (Caja)', quantity: 4 }
      ],
      time: '12:30 PM',
      distance: '40 min',
      phone: '55-5555-5555',
      status: 'pending'
    }
  ];

  const currentDelivery = selectedDelivery !== null ? deliveries.find(d => d.id === selectedDelivery) : deliveries[0];

  const handleOpenMaps = () => {
    if (!currentDelivery) return;
    window.location.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentDelivery.address)}`;
  };

  const handleSelectDelivery = (id: number) => {
    setSelectedDelivery(id);
    setStep(2);
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Próximas Paradas</h2>
            <span className="flex items-center gap-1 text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-1 rounded-lg">
              {deliveries.length} PENDIENTES
            </span>
          </div>

          <div className="space-y-3">
            {deliveries.map((delivery) => (
              <div 
                key={delivery.id}
                onClick={() => handleSelectDelivery(delivery.id)}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-sky-500 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 leading-none">{delivery.client}</h3>
                    <p className="text-slate-400 font-bold mt-2 flex items-center gap-1 text-xs italic">
                      <MapPin size={12} className="text-rose-500" /> {delivery.neighborhood}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-sky-600 uppercase">{delivery.time}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{delivery.distance}</p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex gap-2">
                    {delivery.items.slice(0, 1).map((item, i) => (
                      <span key={i} className="text-[10px] bg-slate-50 text-slate-500 px-2 py-1 rounded-lg font-bold">
                        {item.quantity}x {item.name.split(' ')[0]}...
                      </span>
                    ))}
                    {delivery.items.length > 1 && (
                      <span className="text-[10px] bg-slate-50 text-slate-500 px-2 py-1 rounded-lg font-bold">
                        +{delivery.items.length - 1} más
                      </span>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                    <ArrowLeft size={16} className="rotate-180" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ) : step === 2 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <button 
            onClick={() => setStep(1)}
            className="flex items-center gap-2 text-slate-400 font-bold text-sm min-h-[44px]"
          >
            <ArrowLeft size={16} /> Ver Toda la Ruta
          </button>

          <div className="bg-white p-6 rounded-3xl border-2 border-sky-100 shadow-xl shadow-sky-900/5">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{currentDelivery?.client}</h3>
                <p className="text-slate-400 font-bold mt-2 flex items-center gap-1 italic">
                  <MapPin size={14} className="text-rose-500" /> {currentDelivery?.neighborhood}
                </p>
              </div>
              <div className="bg-sky-50 text-sky-600 px-3 py-1 rounded-xl text-xs font-black uppercase">
                {currentDelivery?.distance}
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">Artículos a Entregar</p>
              {currentDelivery?.items.map((item, i) => (
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
              onClick={() => setStep(3)}
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
            onClick={() => setStep(2)}
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
                <span className="text-3xl font-black text-emerald-700">
                  ${currentDelivery?.items.reduce((acc, item) => acc + (item.quantity * 45), 0)}.00
                </span>
              </div>
              <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase text-right">Efectivo o Transferencia</p>
            </div>

            <button 
              onClick={() => {
                setStep(1);
                setSelectedDelivery(null);
              }}
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
