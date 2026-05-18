
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Package, MapPin, Phone, MessageSquare, Clock, CheckCircle2, Truck, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Order } from '../lib/types.supabase';

export default function ClientStatus() {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Para propósitos de demo, buscamos el pedido más reciente de este "cliente"
    // En producción usaríamos la sesión del usuario o el número de WA
    const fetchLatestOrder = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data[0]) {
        setOrder(data[0] as Order);
      }
      setLoading(false);
    };

    fetchLatestOrder();

    // Realtime update for this specific order
    const subscription = supabase
      .channel('client_order_status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          if (order && payload.new.id === order.id) {
            setOrder(payload.new as Order);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [order?.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-black uppercase tracking-widest text-xs italic">Buscando tu pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <div className="bg-white p-12 rounded-[48px] shadow-xl border border-slate-100">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
            <Package size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-800 uppercase italic">Sin pedidos <span className="text-sky-500">activos</span></h3>
          <p className="text-sm font-bold text-slate-400 mt-4 leading-relaxed">
            Parece que no tienes solicitudes pendientes. ¿Deseas pedir agua ahora?
          </p>
          <button 
            onClick={() => window.open('https://wa.me/525500000000', '_blank')}
            className="w-full mt-8 bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            <MessageSquare size={16} /> Pedir por WhatsApp
          </button>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 'pending', label: 'Solicitud Recibida', icon: MessageSquare, description: 'Tu pedido está en cola para procesamiento.' },
    { id: 'assigned', label: 'En Camino', icon: Truck, description: 'Un repartidor ha sido asignado a tu entrega.' },
    { id: 'delivered', label: 'Entregado', icon: CheckCircle2, description: '¡Gracias por tu compra! Agua de calidad en tu hogar.' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === order.status);

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-black text-slate-800 uppercase italic">Estado de <span className="text-sky-500">Mi Pedido</span></h2>
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Folio: {order.id.slice(0, 8)}</p>
      </div>

      {/* Main Status Card */}
      <div className="bg-white p-8 md:p-12 rounded-[48px] shadow-2xl border border-slate-100 mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="space-y-12">
            {steps.map((step, idx) => {
              const isPast = idx < currentStepIndex || order.status === 'delivered';
              const isCurrent = idx === currentStepIndex && order.status !== 'delivered';
              const isFuture = idx > currentStepIndex && order.status !== 'delivered';

              return (
                <div key={step.id} className="flex gap-6 relative">
                  {idx < steps.length - 1 && (
                    <div className={`absolute left-6 top-10 w-0.5 h-12 ${isPast ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                  )}
                  
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                    isPast ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                    isCurrent ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20 animate-pulse' :
                    'bg-slate-50 text-slate-300'
                  }`}>
                    <step.icon size={24} />
                  </div>

                  <div>
                    <h4 className={`font-black uppercase italic tracking-tight ${isFuture ? 'text-slate-300' : 'text-slate-800'}`}>
                      {step.label}
                    </h4>
                    <p className={`text-xs font-bold leading-relaxed mt-1 ${isFuture ? 'text-slate-300' : 'text-slate-500'}`}>
                      {step.description}
                    </p>
                    {isCurrent && (
                      <div className="mt-4 inline-flex items-center gap-2 bg-sky-50 text-sky-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        <Clock size={12} /> Actualizado: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating background indicator */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50/50 rounded-bl-[100px] -z-0" />
      </div>

      {/* Order Details */}
      <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-xl mb-6">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Detalles de Entrega</h4>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Package size={20} className="text-sky-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Producto</p>
              <p className="font-black text-sm italic">{order.items}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <MapPin size={20} className="text-rose-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Dirección</p>
              <p className="font-black text-sm italic leading-tight">{order.address}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10 flex justify-between items-center">
          <p className="text-xs font-bold text-slate-400 uppercase">Total a pagar</p>
          <p className="text-3xl font-black text-emerald-400">${order.total_price.toFixed(2)}</p>
        </div>
      </div>

      {/* Help Action */}
      <div className="flex gap-4">
        <button 
          onClick={() => window.open('https://wa.me/525500000000', '_blank')}
          className="flex-1 bg-white border border-slate-200 text-slate-600 p-5 rounded-3xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
        >
          <MessageSquare size={16} /> Necesito Ayuda
        </button>
      </div>
    </div>
  );
}
