import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://zzsbqrwmppvpvtajkuva.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6c2JxcndtcHB2cHZ0YWprdXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTQ2NjQsImV4cCI6MjA5NDczMDY2NH0.VQyx8HLHn8kjVX9rgY2xoPejBKGffWTQaTolXiToAjE';

// Forzar el uso de las credenciales proporcionadas por el usuario para asegurar que el preview funcione correctamente
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Función global auxiliar de auto-recuperación para evitar bloqueos por tokens corruptos de Supabase
const clearAllSupabaseTokens = () => {
  console.warn('Iniciando limpieza de emergencia para sesión corrupta de Supabase...');
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });
    // Limpiar sessionStorage también por seguridad
    try {
      sessionStorage.clear();
    } catch (_) {}
  } catch (e) {
    console.error('Error al limpiar el almacenamiento local:', e);
  }
};

// Interceptor global para unhandled rejections (promesas caídas de Supabase)
if (typeof window !== 'undefined') {
  const handleAuthErrorText = (errMsg: string) => {
    const lower = errMsg.toLowerCase();
    if (
      lower.includes('refresh token') ||
      lower.includes('refresh_token') ||
      lower.includes('invalid_grant') ||
      lower.includes('invalid refresh token') ||
      lower.includes('grant') ||
      lower.includes('token not found')
    ) {
      console.error('Interceptada sesión de Supabase inválida o expirada. Forzando cierre seguro e inmediato.');
      clearAllSupabaseTokens();
      supabase.auth.signOut().catch(() => {});
      
      // Forzar redirección limpia del usuario tras la limpieza
      setTimeout(() => {
        window.location.reload();
      }, 300);
      return true;
    }
    return false;
  };

  // Interceptar window.alert de forma ultra-segura para capturar errores de refresco que se disparan en try/catch locales
  const originalAlert = typeof window !== 'undefined' ? window.alert : null;
  if (typeof window !== 'undefined') {
    window.alert = function (message) {
      try {
        const msgStr = String(message || '');
        if (handleAuthErrorText(msgStr)) {
          // Si era error de refresh token, silenciamos la alerta y auto-limpiamos
          return;
        }
        if (typeof originalAlert === 'function') {
          originalAlert.call(window, message);
        } else {
          console.log('Alerta bloqueada en este entorno:', message);
        }
      } catch (e) {
        console.warn('Fallback silencioso para alerta bloqueada o restringida:', e);
      }
    };
  }

  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason = event.reason;
      const msg = reason?.message || reason?.error_description || String(reason || '');
      
      // Capturar y mitigar errores de autenticación o tokens expirados/inválidos
      if (handleAuthErrorText(msg)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // Mitigar fallos de conexión WebSocket de Vite (HMR) que a veces ocurren bajo firewalls o iframes restringidos
      if (msg.includes('websocket') || msg.includes('WebSocket') || msg.includes('HMR')) {
        event.preventDefault();
        event.stopPropagation();
      }
    } catch (e) {}
  });

  window.addEventListener('error', (event) => {
    try {
      const msg = event.message || '';
      
      // Capturar y mitigar errores de autenticación
      if (handleAuthErrorText(msg)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // Evitar que errores genéricos de iframe/dominios cruzados ("Script error.") o fallas de WebSocket de Vite HMR propaguen fallas falsas positivas
      if (
        msg.includes('Script error.') || 
        msg.includes('Script error') || 
        msg.includes('websocket') || 
        msg.includes('HMR') ||
        event.filename?.includes('vite')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    } catch (e) {}
  });
}

