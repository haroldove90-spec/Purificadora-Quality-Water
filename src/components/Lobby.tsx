import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Waves, 
  Truck, 
  MessageCircle, 
  ArrowRight,
  Droplets
} from 'lucide-react';

interface LobbyProps {
  onSelectRole: (role: 'admin' | 'operator' | 'driver' | 'client') => void;
}

export default function Lobby({ onSelectRole }: LobbyProps) {
  const roles = [
    {
      id: 'admin',
      title: 'Administrador',
      desc: 'Gestión de finanzas, registro de ventas y métricas globales.',
      icon: ShieldCheck,
      color: 'bg-indigo-500',
      shadow: 'shadow-indigo-500/20',
      disabled: false
    },
    {
      id: 'operator',
      title: 'Personal de Planta',
      desc: 'Gestión de inventarios, producción y control de calidad.',
      icon: Waves,
      color: 'bg-sky-500',
      shadow: 'shadow-sky-500/20',
      disabled: false
    },
    {
      id: 'driver',
      title: 'Repartidor / Chofer',
      desc: 'Seguimiento de rutas, navegación y confirmación de entregas.',
      icon: Truck,
      color: 'bg-emerald-500',
      shadow: 'shadow-emerald-500/20',
      disabled: false
    },
    {
      id: 'client',
      title: 'Cliente / WhatsApp',
      desc: 'Seguimiento de pedidos en tiempo real y asistencia directa.',
      icon: MessageCircle,
      color: 'bg-rose-500',
      shadow: 'shadow-rose-500/20',
      disabled: true
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 bg-gradient-to-br from-white via-sky-50 to-white">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="flex justify-center mb-6">
          <img 
            src="https://cossma.com.mx/purificadora.jpg" 
            alt="Quality Water Logo" 
            className="h-32 w-32 object-contain rounded-2xl shadow-xl ring-4 ring-white"
          />
        </div>
        <h1 className="text-4xl font-black text-slate-800 tracking-tight leading-none mb-4">
          Purificadora <span className="text-sky-500">Quality Water</span>
        </h1>
        <p className="text-slate-500 font-bold italic">Selecciona tu perfil de acceso para continuar</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
        {roles.filter(role => role.id !== 'client').map((role, idx) => (
          <motion.div
            key={role.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => !role.disabled && onSelectRole(role.id as any)}
            className={`group ${role.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            <div className={`h-full bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm transition-all duration-300 relative overflow-hidden ${!role.disabled ? 'hover:shadow-2xl hover:-translate-y-2' : ''}`}>
              <div className={`w-16 h-16 ${role.color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg ${role.shadow} ${!role.disabled ? 'group-hover:scale-110' : ''} transition-transform`}>
                <role.icon size={32} />
              </div>
              
              <h3 className="text-xl font-black text-slate-800 mb-3">{role.title}</h3>
              <p className="text-sm text-slate-400 font-medium leading-relaxed mb-8">{role.desc}</p>
              
              <div className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all ${role.disabled ? 'text-slate-300' : 'text-sky-500 group-hover:gap-4'}`}>
                {role.disabled ? 'Módulo Desactivado' : (role.id === 'client' ? 'Hacer pedido' : 'Ingresar al sistema')} 
                {!role.disabled && <ArrowRight size={16} />}
              </div>

              {/* Decorative background shape */}
              <div className={`absolute -bottom-8 -right-8 w-24 h-24 ${role.color} opacity-[0.03] rounded-full ${!role.disabled ? 'group-hover:scale-[3]' : ''} transition-transform duration-700`} />
            </div>
          </motion.div>
        ))}
      </div>

      <footer className="mt-16 text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]">
        &copy; 2026 Quality Water System &bull; Mission Control Center
      </footer>
    </div>
  );
}
