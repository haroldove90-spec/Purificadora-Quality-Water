import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Waves, 
  Truck, 
  MessageCircle, 
  ArrowRight,
  Droplets,
  Mail,
  Lock,
  User,
  Phone,
  ArrowLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface LobbyProps {
  onSelectRole: (role: 'admin' | 'operator' | 'driver' | 'client') => void;
}

export default function Lobby({ onSelectRole }: LobbyProps) {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'operator' | 'driver' | 'client' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

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
      disabled: false
    }
  ];

  const handleRoleClick = (role: any) => {
    if (role.disabled) return;
    setSelectedRole(role.id);
    setShowAuth(true);
    onSelectRole(role.id);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phoneNumber,
              role: selectedRole
            }
          }
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          // Sincronizar automáticamente con la tabla empleados
          const { error: empError } = await supabase.from('employees').insert({
            auth_id: data.user.id,
            name: fullName,
            email: email,
            role: selectedRole,
            phone: phoneNumber
          });

          if (empError) console.error('Error syncing employee:', empError);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 bg-gradient-to-br from-white via-sky-50 to-white">
      <AnimatePresence mode="wait">
        {!showAuth ? (
          <motion.div 
            key="role-selection"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full flex flex-col items-center"
          >
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
              {roles.map((role, idx) => (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => handleRoleClick(role)}
                  className={`group ${role.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                >
                  <div className={`h-full bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm transition-all duration-300 relative overflow-hidden ${!role.disabled ? 'hover:shadow-2xl hover:-translate-y-2' : ''}`}>
                    <div className={`w-16 h-16 ${role.color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg ${role.shadow} ${!role.disabled ? 'group-hover:scale-110' : ''} transition-transform`}>
                      <role.icon size={32} />
                    </div>
                    
                    <h3 className="text-xl font-black text-slate-800 mb-3">{role.title}</h3>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed mb-8">{role.desc}</p>
                    
                    <div className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all ${role.disabled ? 'text-slate-300' : 'text-sky-500 group-hover:gap-4'}`}>
                      {role.disabled ? 'Módulo Desactivado' : (role.id === 'client' ? 'Acceso Cliente' : 'Ingresar al sistema')} 
                      {!role.disabled && <ArrowRight size={16} />}
                    </div>

                    <div className={`absolute -bottom-8 -right-8 w-24 h-24 ${role.color} opacity-[0.03] rounded-full ${!role.disabled ? 'group-hover:scale-[3]' : ''} transition-transform duration-700`} />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="auth-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md bg-white p-10 rounded-[48px] shadow-2xl border border-slate-100 relative"
          >
            <button 
              onClick={() => setShowAuth(false)}
              className="absolute left-6 top-6 p-3 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-2xl transition-all"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="text-center mb-10">
              <div className="flex justify-center mb-4">
                <div className={`w-16 h-16 ${roles.find(r => r.id === selectedRole)?.color || 'bg-sky-500'} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                  {React.createElement(roles.find(r => r.id === selectedRole)?.icon || ShieldCheck, { size: 32 })}
                </div>
              </div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                {authMode === 'login' ? 'Bienvenido' : 'Crear Cuenta'}
              </h2>
              <p className="text-sm text-slate-400 font-bold italic">
                {selectedRole === 'admin' ? 'Acceso Administrativo' : 
                 selectedRole === 'operator' ? 'Acceso Personal de Planta' :
                 selectedRole === 'driver' ? 'Acceso para Repartidores' : 'Acceso Clientes'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'register' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Nombre Completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Teléfono</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="tel" 
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+52 ..."
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold animate-shake">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-5 bg-sky-500 text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-sky-500/30 hover:bg-sky-600 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (authMode === 'login' ? 'Entrar' : 'Registrarme')}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-sky-500 transition-colors"
              >
                {authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-16 text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]">
        &copy; 2026 Quality Water System &bull; Mission Control Center
      </footer>
    </div>
  );
}
