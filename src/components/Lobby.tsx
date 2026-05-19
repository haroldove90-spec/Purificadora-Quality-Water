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
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface LobbyProps {
  onSelectRole: (role: 'admin' | 'operator' | 'driver' | 'client') => void;
}

export default function Lobby({ onSelectRole }: LobbyProps) {
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'operator' | 'driver' | 'client'>('client');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
          setMessage({ type: 'success', text: '¡Cuenta creada con éxito! Iniciando sesión...' });
          // El trigger de SQL se encargará de crear el registro en employees automáticamente
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 bg-gradient-to-br from-white via-sky-50 to-white">
      <AnimatePresence mode="wait">
        <motion.div 
          key="auth-form"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-white p-10 rounded-[48px] shadow-2xl border border-slate-100 relative"
        >
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <img 
                src="https://cossma.com.mx/purificadora.jpg" 
                alt="Quality Water Logo" 
                className="h-20 w-20 object-contain rounded-2xl shadow-lg ring-4 ring-white"
              />
            </div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
              {authMode === 'login' ? 'Acceso al Sistema' : 'Registro de Cuenta'}
            </h2>
            <p className="text-sm text-slate-400 font-bold italic mt-1">
              Quality Water Management Platform
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Tipo de Perfil</label>
                  <div className="grid grid-cols-2 gap-2">
                    {roles.map(role => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id as any)}
                        className={`flex items-center gap-2 p-3 rounded-2xl border transition-all ${
                          selectedRole === role.id 
                            ? 'bg-sky-500 text-white border-sky-500 shadow-md' 
                            : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-sky-500/50'
                        }`}
                      >
                        <role.icon size={16} />
                        <span className="text-[10px] font-black uppercase tracking-tight">{role.title.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

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
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
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
      </AnimatePresence>

      <footer className="mt-16 text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]">
        &copy; 2026 Quality Water System &bull; Mission Control Center
      </footer>
    </div>
  );
}
