import React from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  ChevronRight, 
  LogOut,
  MapPin,
  Mail,
  Phone,
  Building
} from 'lucide-react';

export default function Profile() {
  const sections = [
    {
      title: 'Configuración Personal',
      items: [
        { label: 'Información del Perfil', icon: User, value: 'Juan Pérez' },
        { label: 'Email', icon: Mail, value: 'juan.p@qualitywater.mx' },
        { label: 'Teléfono', icon: Phone, value: '55 1234 5678' }
      ]
    },
    {
      title: 'Empresa',
      items: [
        { label: 'Planta Asignada', icon: Building, value: 'Iztapalapa I' },
        { label: 'Zona de Cobertura', icon: MapPin, value: 'Santa Fe / Polanco' },
        { label: 'Rol de Usuario', icon: Shield, value: 'Supervisor / Driver' }
      ]
    },
    {
      title: 'Preferencias',
      items: [
        { label: 'Notificaciones Push', icon: Bell, value: 'Activado' },
        { label: 'Seguridad y Privacidad', icon: Shield, value: 'Verificada' },
        { label: 'Idioma', icon: Settings, value: 'Español (MX)' }
      ]
    }
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-2xl">
            JP
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 border-4 border-white rounded-full flex items-center justify-center text-white">
            <Shield size={14} />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800">Juan Pérez</h1>
          <p className="text-slate-500 font-bold italic">Supervisor de Operaciones Quality Water</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">
              {section.title}
            </h3>
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              {section.items.map((item, i) => (
                <button 
                  key={i}
                  className="w-full flex items-center justify-between p-4 px-6 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
                      <item.icon size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tight leading-none mb-1">{item.label}</p>
                      <p className="text-sm font-black text-slate-800">{item.value}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-sky-500 transition-all" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4">
        <button className="w-full bg-rose-50 text-rose-600 p-5 rounded-3xl font-black flex items-center justify-center gap-3 border border-rose-100 hover:bg-rose-100 transition-colors active:scale-95">
          <LogOut size={20} />
          ELIMINAR MI CUENTA (ZONA DE PELIGRO)
        </button>
      </div>
    </div>
  );
}
