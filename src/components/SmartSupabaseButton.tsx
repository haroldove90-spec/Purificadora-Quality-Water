import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Database, 
  ChevronDown, 
  X, 
  History,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface SupabaseOperationLog {
  id: string;
  type: 'ping' | 'sync' | 'query' | 'insert' | 'update';
  timestamp: string;
  status: 'success' | 'error';
  latencyMs: number;
  details: string;
}

// Global emitter for save telemetry toast so any component can trigger it
export const emitSaveTelemetry = (details: string, success: boolean = true, latencyMs?: number) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('supabase-save-telemetry', {
      detail: { details, success, latencyMs: latencyMs || 0, timestamp: new Date().toISOString() }
    }));
  }
};

export default function SmartSupabaseButton() {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [latency, setLatency] = useState<number | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncedCount, setSyncedCount] = useState<number>(0);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [operationLogs, setOperationLogs] = useState<SupabaseOperationLog[]>([]);
  const [toastMessage, setToastMessage] = useState<{ text: string; success: boolean } | null>(null);
  
  const toastTimeoutRef = useRef<any>(null);

  const formatTimestamp = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dd = pad(date.getDate());
    const mm = pad(date.getMonth() + 1);
    const yyyy = date.getFullYear();
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${dd}/${mm}/${yyyy} - ${hh}:${min}:${ss}`;
  };

  const addLog = (
    type: 'ping' | 'sync' | 'query' | 'insert' | 'update',
    status: 'success' | 'error',
    latencyMs: number,
    details: string
  ) => {
    const newLog: SupabaseOperationLog = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      timestamp: formatTimestamp(new Date()),
      status,
      latencyMs,
      details
    };
    setOperationLogs(prev => [newLog, ...prev].slice(0, 30));
  };

  const showToast = (text: string, success: boolean = true) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ text, success });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const countPendingRecords = (): number => {
    try {
      const offline = localStorage.getItem('pending_offline_sales');
      if (offline) {
        const arr = JSON.parse(offline);
        return Array.isArray(arr) ? arr.length : 0;
      }
    } catch (_) {}
    return 0;
  };

  // Diagnostic Ping to Supabase
  const checkConnection = async (isBackground: boolean = false): Promise<boolean> => {
    if (!isBackground) setIsChecking(true);
    const startTime = performance.now();
    let success = false;
    let elapsedMs = 0;

    try {
      // Lightweight probe using health query on products or employees
      const { data, error } = await supabase
        .from('products')
        .select('id')
        .limit(1);

      elapsedMs = Math.round(performance.now() - startTime);

      if (!error && data !== null) {
        success = true;
        setIsConnected(true);
        setLatency(elapsedMs);
      } else {
        success = false;
        setIsConnected(false);
        setLatency(elapsedMs);
      }
    } catch (err: any) {
      elapsedMs = Math.round(performance.now() - startTime);
      success = false;
      setIsConnected(false);
      setLatency(elapsedMs);
    } finally {
      const nowStr = formatTimestamp(new Date());
      setLastCheckTime(nowStr);
      if (!isBackground) setIsChecking(false);

      addLog(
        'ping',
        success ? 'success' : 'error',
        elapsedMs,
        success ? `Respuesta OK (${elapsedMs} ms)` : `Error de conexión o timeout`
      );

      if (!isBackground) {
        showToast(
          success ? `🟢 Supabase Conectado • ${elapsedMs}ms` : `🔴 Sin Conexión a Supabase`,
          success
        );
      }
    }

    setPendingCount(countPendingRecords());
    return success;
  };

  // Sync pending local records to Supabase
  const syncPendingRecords = async () => {
    setIsSyncing(true);
    const pendingStr = localStorage.getItem('pending_offline_sales');
    if (!pendingStr) {
      setIsSyncing(false);
      showToast('No hay registros locales pendientes de sincronizar.', true);
      return;
    }

    let list: any[] = [];
    try {
      list = JSON.parse(pendingStr);
    } catch (_) {}

    if (!Array.isArray(list) || list.length === 0) {
      setIsSyncing(false);
      showToast('No hay registros locales pendientes de sincronizar.', true);
      return;
    }

    const initialPending = list.length;
    const startTime = performance.now();
    let uploaded = 0;
    const remaining: any[] = [];

    for (const item of list) {
      try {
        const { error } = await supabase.from('orders').insert([item]);
        if (!error) {
          uploaded++;
        } else {
          remaining.push(item);
        }
      } catch (err) {
        remaining.push(item);
      }
    }

    const elapsed = Math.round(performance.now() - startTime);

    if (remaining.length > 0) {
      localStorage.setItem('pending_offline_sales', JSON.stringify(remaining));
    } else {
      localStorage.removeItem('pending_offline_sales');
    }

    setPendingCount(remaining.length);
    setSyncedCount(prev => prev + uploaded);
    setIsSyncing(false);

    const isSuccess = uploaded > 0 || remaining.length === 0;
    addLog(
      'sync',
      isSuccess ? 'success' : 'error',
      elapsed,
      `Sincronizados: ${uploaded} de ${initialPending} pendientes (${remaining.length} restantes)`
    );

    showToast(
      uploaded > 0
        ? `✅ ${uploaded} registros sincronizados con la nube (${elapsed} ms)`
        : `⚠️ Error al sincronizar registros`,
      isSuccess
    );
  };

  // Listen to external telemetry events
  useEffect(() => {
    const handleTelemetry = (e: any) => {
      const detail = e.detail;
      if (detail) {
        addLog(
          'insert',
          detail.success ? 'success' : 'error',
          detail.latencyMs || 0,
          detail.details || 'Operación en base de datos'
        );
        showToast(detail.details || 'Datos guardados en Supabase', detail.success);
        setPendingCount(countPendingRecords());
      }
    };

    window.addEventListener('supabase-save-telemetry', handleTelemetry);
    return () => {
      window.removeEventListener('supabase-save-telemetry', handleTelemetry);
    };
  }, []);

  // Heartbeat every 25 seconds
  useEffect(() => {
    checkConnection(true);

    const interval = setInterval(() => {
      checkConnection(true);
    }, 25000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Smart Supabase Trigger Button */}
      <div className="relative inline-flex items-center">
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-tight transition-all active:scale-95 shadow-sm ${
            isConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 animate-pulse'
          }`}
          title="Monitoreo Inteligente de Supabase • Clic para ver historial y diagnósticos"
        >
          {/* Live 2-State Traffic Light 🟢 / 🔴 */}
          <span className="relative flex h-2.5 w-2.5">
            {isConnected ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </>
            ) : (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </>
            )}
          </span>

          <span className="hidden sm:inline">Supabase</span>

          {/* Latency in ms */}
          {latency !== null && (
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
              latency < 300 
                ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200' 
                : latency < 800 
                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200' 
                : 'bg-rose-500/20 text-rose-800 dark:text-rose-200'
            }`}>
              {latency}ms
            </span>
          )}

          {/* Pending Sync Badge */}
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[9px] font-extrabold animate-bounce">
              {pendingCount}
            </span>
          )}

          <ChevronDown size={12} className={`transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Floating Telemetry Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`fixed top-18 right-4 z-[9999] px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-black flex items-center gap-2 backdrop-blur-md ${
                toastMessage.success
                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              }`}
            >
              {toastMessage.success ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-rose-400" />}
              <span>{toastMessage.text}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History & Diagnostics Flyout Modal */}
      <AnimatePresence>
        {historyOpen && (
          <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${isConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {isConnected ? <Wifi size={22} /> : <WifiOff size={22} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">
                        Diagnóstico Inteligente Supabase
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        isConnected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        {isConnected ? 'En Línea' : 'Desconectado'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-1.5">
                      <Clock size={12} />
                      Última comprobación: {lastCheckTime || 'Iniciando...'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setHistoryOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status and Control Cards */}
              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Latencia</span>
                    <span className="text-base font-black text-slate-800 dark:text-white font-mono">
                      {latency !== null ? `${latency} ms` : '--'}
                    </span>
                    <span className="text-[8px] text-slate-400 block mt-0.5">Ping HTTP ligero</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Cola Offline</span>
                    <span className="text-base font-black text-amber-500 font-mono">
                      {pendingCount}
                    </span>
                    <span className="text-[8px] text-slate-400 block mt-0.5">En almacenamiento local</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Sincronizados</span>
                    <span className="text-base font-black text-emerald-500 font-mono">
                      {syncedCount}
                    </span>
                    <span className="text-[8px] text-slate-400 block mt-0.5">En esta sesión</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => checkConnection(false)}
                    disabled={isChecking}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
                  >
                    <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
                    {isChecking ? 'Verificando...' : 'Verificar Conexión Ahora'}
                  </button>

                  <button
                    onClick={syncPendingRecords}
                    disabled={isSyncing || pendingCount === 0}
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
                  >
                    <Database size={14} className={isSyncing ? 'animate-spin' : ''} />
                    {isSyncing ? 'Sincronizando...' : `Sincronizar (${pendingCount})`}
                  </button>
                </div>

                {/* Operations History (Last 30) */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                      <History size={13} /> Historial de Operaciones (Últimas 30)
                    </h4>
                    <span className="text-[9px] text-slate-400 font-bold">{operationLogs.length} eventos</span>
                  </div>

                  <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/40 dark:bg-slate-950/40">
                    {operationLogs.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-400 italic">No hay operaciones registradas aún.</p>
                    ) : (
                      operationLogs.map(log => (
                        <div key={log.id} className="p-2.5 px-3 flex items-center justify-between text-[11px] gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${log.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            <span className="font-mono text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {log.type}
                            </span>
                            <span className="text-slate-700 dark:text-slate-200 truncate font-semibold">
                              {log.details}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-[9px] text-slate-400 font-mono">
                            <span>{log.latencyMs}ms</span>
                            <span>&bull;</span>
                            <span>{log.timestamp.split(' - ')[1]}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                <span>Heartbeat automático cada 25s activo</span>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-black uppercase text-[9px] transition-all"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
