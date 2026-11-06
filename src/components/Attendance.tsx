import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  LogOut, 
  Coffee, 
  Users, 
  Search, 
  Download, 
  ClipboardList, 
  Trash2,
  ExternalLink,
  Navigation,
  RefreshCw,
  Check,
  Calendar,
  ShieldCheck
} from 'lucide-react';
import { useAttendanceEngine, AttendanceAction } from '../hooks/useAttendanceEngine';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { exportToPDF } from '../utils/pdfExport';
import { supabase } from '../lib/supabaseClient';
import { namesMatch, normalizeEmployeeName, getLocalDateString } from '../utils/nameHelper';

interface AttendanceProps {
  userRole?: 'admin' | 'operator' | 'driver' | 'client' | 'supervisor' | null;
  userName?: string | null;
}

export default function Attendance({ userRole, userName }: AttendanceProps) {
  const [viewAsEmployee, setViewAsEmployee] = useState(false);
  // Modo monitor exclusivo para Admin o Supervisor cuando no están en vista personal
  const isMonitorMode = (userRole === 'admin' || userRole === 'supervisor') && !viewAsEmployee;

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [monitorSearch, setMonitorSearch] = useState('');

  // Estados de geolocalización en vivo para el dispositivo móvil
  const [gpsStatus, setGpsStatus] = useState<'calibrating' | 'ready' | 'error'>('calibrating');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  // Registro del día actual del empleado
  const [todayRecord, setTodayRecord] = useState<any | null>(null);
  const [loadingTodayRecord, setLoadingTodayRecord] = useState(true);
  
  const { registrarAsistencia, registrarSalidaComer, registrarRegresoComer, registrarSalidaDefinitiva, fetchHistory } = useAttendanceEngine();
  const { staffStatus } = useRealtimeNotifications(userRole || null);

  // Datos de sesión coherentes
  const [userData, setUserData] = useState({
    user_id: userRole === 'admin' ? 'admin-id' : '00000000-0000-0000-0000-000000000000',
    user_name: userName || (userRole === 'admin' ? 'Administrador' : 'Empleado Demo'),
    user_role: userRole || 'repartidor'
  });

  useEffect(() => {
    const savedSession = localStorage.getItem('qw_session');
    let finalName = userName || (userRole === 'admin' ? 'Administrador' : 'Empleado Demo');
    let finalId = userRole === 'admin' ? 'admin-id' : '00000000-0000-0000-0000-000000000000';
    let finalRole = userRole || 'repartidor';

    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.user_name && !userName) finalName = session.user_name;
        if (session.user_id) finalId = session.user_id;
        if (session.user_role) finalRole = session.user_role;
      } catch (e) {}
    }

    if (userName) {
      finalName = userName;
    }

    setUserData({
      user_id: finalId,
      user_name: finalName,
      user_role: finalRole
    });
  }, [userRole, userName]);

  // Calibración inicial del GPS del dispositivo
  const calibrateGps = () => {
    setGpsStatus('calibrating');
    setGpsErrorMsg(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('error');
      setGpsErrorMsg('Este dispositivo o navegador no soporta geolocalización GPS.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('ready');
        setGpsErrorMsg(null);
      },
      (err) => {
        console.warn('GPS initial check warning:', err);
        // Reintentar sin alta precisión para dispositivos con señal débil
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setGpsStatus('ready');
            setGpsErrorMsg(null);
          },
          (err2) => {
            setGpsStatus('error');
            if (err2.code === 1) {
              setGpsErrorMsg('Permiso de GPS denegado. Actívalo en la configuración de tu celular.');
            } else if (err2.code === 2) {
              setGpsErrorMsg('Ubicación no disponible. Activa la localización de tu dispositivo móvil.');
            } else {
              setGpsErrorMsg('Tiempo de espera agotado al conectar con satélite GPS.');
            }
          },
          { enableHighAccuracy: false, timeout: 8000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  useEffect(() => {
    calibrateGps();
  }, []);

  // Cargar registro de asistencia de hoy para el empleado actual
  const loadTodayEmployeeRecord = async () => {
    const today = getLocalDateString();
    setLoadingTodayRecord(true);
    try {
      const { data, error } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('work_date', today);

      if (!error && data) {
        const found = data.find(r => namesMatch(r.user_name, userData.user_name));
        setTodayRecord(found || null);
      }
    } catch (err) {
      console.warn('Error loading today record:', err);
    } finally {
      setLoadingTodayRecord(false);
    }
  };

  useEffect(() => {
    loadTodayEmployeeRecord();
    loadHistory();

    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase.from('employees').select('*');
        if (!error && data) {
          setEmployeesList(data);
        }
      } catch (_) {}
    };
    fetchEmployees();

    // Sincronización Realtime con daily_attendance
    const channel = supabase
      .channel('attendance_live_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_attendance' }, () => {
        loadHistory();
        loadTodayEmployeeRecord();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userData.user_name]);

  const loadHistory = async () => {
    const res = await (fetchHistory as any)();
    if (res.success && res.data) {
      setHistory(res.data);
    }
  };

  const getGoogleMapsUrl = (lat?: number | null, lng?: number | null) => {
    if (!lat || !lng) return null;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  const handleAction = async (actionType: AttendanceAction) => {
    setStatus('loading');
    
    try {
      let location = null;
      try {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          throw new Error('Geolocalización GPS no soportada por este dispositivo.');
        }
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, (err1) => {
            console.warn('Alta precisión falló, intentando precisión estándar...', err1);
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 8000,
              maximumAge: 60000
            });
          }, {
            enableHighAccuracy: true,
            timeout: 6000,
            maximumAge: 0
          });
        });
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentCoords(location);
        setGpsStatus('ready');
      } catch (e: any) {
        console.warn('Geolocation blocked or errored entirely:', e);
        let errorMsg = 'No se pudo obtener la ubicación GPS.';
        if (e.code === 1) {
          errorMsg = 'Permiso denegado: Por favor habilita el acceso GPS en la configuración de tu navegador y celular.';
        } else if (e.code === 2) {
          errorMsg = 'Ubicación no disponible: Asegúrate de tener activada la ubicación / GPS de tu dispositivo.';
        } else if (e.code === 3) {
          errorMsg = 'Tiempo de espera agotado al conectar con señal GPS.';
        }
        alert(`⚠️ ADVERTENCIA DE UBICACIÓN GPS:\n\n${errorMsg}\n\nPara validar tu asistencia correctamente, es obligatorio que el celular tenga activo el GPS.`);
        setStatus('idle');
        return;
      }

      if (!location || !location.lat || !location.lng) {
        alert('⚠️ ADVERTENCIA DE UBICACIÓN:\n\nNo se pudo obtener una coordenada GPS válida. Por favor verifica que tu celular tenga buena señal GPS e inténtalo de nuevo.');
        setStatus('idle');
        return;
      }

      const actionMap = {
        check_in: registrarAsistencia,
        break_start: registrarSalidaComer,
        break_end: registrarRegresoComer,
        check_out: registrarSalidaDefinitiva
      };

      const result = await actionMap[actionType](userData, location);

      if (result.success) {
        setStatus('success');
        const labels: Record<AttendanceAction, string> = {
          check_in: 'Entrada al Turno',
          break_start: 'Salida a Comer',
          break_end: 'Regreso de Comer',
          check_out: 'Salida Definitiva'
        };
        setLastAction(`${labels[actionType]} - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        await loadTodayEmployeeRecord();
        await loadHistory();
        setTimeout(() => setStatus('idle'), 2500);
      } else {
        throw new Error('Fallo al registrar acción en base de datos');
      }
    } catch (e: any) {
      console.error(e);
      alert('Error al registrar asistencia: ' + (e.message || 'Error desconocido'));
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleDeleteAttendance = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar registro de asistencia de ${name}?`)) return;
    const { error } = await supabase.from('daily_attendance').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else loadHistory();
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const columns = ['Empleado', 'Fecha', 'Entrada', 'Comida (I)', 'Comida (R)', 'Salida', 'Coordenadas GPS'];
      const data = history.map(h => {
        const loc = h.last_location || {};
        const coordsStr = (loc.lat && loc.lng) ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : 'Sin GPS';
        return [
          h.user_name,
          h.work_date,
          h.check_in ? new Date(h.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
          h.break_start ? new Date(h.break_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
          h.break_end ? new Date(h.break_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
          h.check_out ? new Date(h.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
          coordsStr
        ];
      });

      exportToPDF({
        title: 'Reporte de Asistencias y Ubicaciones GPS',
        subtitle: `Generado el ${new Date().toLocaleDateString('es-MX')} - Registros Oficiales`,
        columns,
        data,
        filename: `Reporte_Asistencia_${new Date().toISOString().split('T')[0]}`
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const columns = ['Empleado', 'Fecha', 'Entrada', 'Comida Inicio', 'Comida Regreso', 'Salida', 'Latitud', 'Longitud', 'Google Maps Link'];
      const data = history.map(h => {
        const loc = h.last_location || {};
        const mapUrl = (loc.lat && loc.lng) ? `https://www.google.com/maps?q=${loc.lat},${loc.lng}` : '';
        return [
          h.user_name,
          h.work_date,
          h.check_in ? new Date(h.check_in).toLocaleTimeString() : '-',
          h.break_start ? new Date(h.break_start).toLocaleTimeString() : '-',
          h.break_end ? new Date(h.break_end).toLocaleTimeString() : '-',
          h.check_out ? new Date(h.check_out).toLocaleTimeString() : '-',
          loc.lat || '',
          loc.lng || '',
          mapUrl
        ];
      });

      const csvContent = [
        columns.join(','),
        ...data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Reporte_Asistencia_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  // Filtrado de monitoreo
  const filteredHistory = history.filter(h => {
    if (!monitorSearch.trim()) return true;
    const q = monitorSearch.toLowerCase();
    return (
      (h.user_name || '').toLowerCase().includes(q) ||
      (h.work_date || '').includes(q)
    );
  });

  // Historial personal del empleado logueado
  const personalHistory = history.filter(h => namesMatch(h.user_name, userData.user_name)).slice(0, 7);

  // Extracción de coordenadas de eventos de hoy
  const todayLoc = todayRecord?.last_location || {};
  const checkInLoc = todayLoc.check_in_location || (todayLoc.lat ? { lat: todayLoc.lat, lng: todayLoc.lng } : null);
  const breakStartLoc = todayLoc.break_start_location || null;
  const breakEndLoc = todayLoc.break_end_location || null;
  const checkOutLoc = todayLoc.check_out_location || null;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white italic uppercase">
            {isMonitorMode ? 'Monitor de ' : 'Control de '}
            <span className="text-sky-500">Asistencia</span>
          </h2>
          <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">
            {isMonitorMode 
              ? 'Auditoría satelital de plantilla y horarios en tiempo real' 
              : 'Marcaje con geolocalización GPS obligatoria para celular'}
          </p>
        </div>
        
        {/* Switcher para Administrador / Supervisor */}
        {(userRole === 'admin' || userRole === 'supervisor') && (
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner gap-1 shrink-0">
            <button
              onClick={() => setViewAsEmployee(false)}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                !viewAsEmployee
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Monitor de Personal 📊
            </button>
            <button
              onClick={() => setViewAsEmployee(true)}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewAsEmployee
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Mi Checador GPS ⏰
            </button>
          </div>
        )}

        {isMonitorMode && (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportPDF}
              disabled={isExporting || history.length === 0}
              className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              PDF
            </button>
            <button 
              onClick={handleExportExcel}
              disabled={isExporting || history.length === 0}
              className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Download size={14} />
              Excel
            </button>
          </div>
        )}
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {!isMonitorMode ? (
          /* ========================================================
             VISTA CHECADOR MÓVIL DEL EMPLEADO (REPARTIDOR / PLANTA)
             ======================================================== */
          <div className="lg:col-span-2 space-y-6">
            {/* Widget de Estado de GPS Móvil */}
            <div className={`p-4 rounded-3xl border flex items-center justify-between gap-3 shadow-sm transition-all ${
              gpsStatus === 'ready' 
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' 
                : gpsStatus === 'calibrating'
                ? 'bg-sky-50 border-sky-200 text-sky-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  gpsStatus === 'ready' ? 'bg-emerald-500 text-white' :
                  gpsStatus === 'calibrating' ? 'bg-sky-500 text-white' : 'bg-rose-500 text-white'
                }`}>
                  {gpsStatus === 'ready' ? <Navigation size={20} /> :
                   gpsStatus === 'calibrating' ? <Loader2 size={20} className="animate-spin" /> :
                   <AlertCircle size={20} />}
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest block leading-none">
                    {gpsStatus === 'ready' ? 'Señal Satelital GPS Conectada' :
                     gpsStatus === 'calibrating' ? 'Calibrando GPS del Celular...' : 'GPS Desactivado o Bloqueado'}
                  </span>
                  <p className="text-xs font-bold mt-1">
                    {gpsStatus === 'ready' && currentCoords 
                      ? `Lat: ${currentCoords.lat.toFixed(5)}, Lng: ${currentCoords.lng.toFixed(5)} (Listo para marcar)`
                      : gpsErrorMsg || 'Obteniendo coordenadas de alta precisión...'}
                  </p>
                </div>
              </div>
              <button
                onClick={calibrateGps}
                className="px-3 py-1.5 bg-white rounded-xl shadow-xs border border-slate-200 text-[9px] font-black uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                title="Volver a calibrar señal GPS"
              >
                <RefreshCw size={12} className={gpsStatus === 'calibrating' ? "animate-spin" : ""} />
                Calibrar
              </button>
            </div>

            {/* Guía Amigable si el GPS está apagado */}
            {gpsStatus === 'error' && (
              <div className="p-4 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-3xl flex items-start gap-3.5 shadow-sm animate-scale-up">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <AlertCircle size={16} />
                </div>
                <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1 flex-1">
                  <p className="font-black uppercase tracking-wider text-[10px]">¿Cómo activar tu ubicación en el celular?</p>
                  <p className="font-medium text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                    1. Desliza hacia abajo la barra superior de tu teléfono y activa <strong>"Ubicación / GPS"</strong>.<br />
                    2. En el mensaje del navegador, pulsa <strong>"Permitir mientras se usa la app"</strong>.<br />
                    3. Pulsa el botón <strong>"Calibrar"</strong> arriba para conectar la señal.
                  </p>
                </div>
              </div>
            )}

            {/* Tarjeta Principal del Checador */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <Clock size={28} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Sesión Empleado</p>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase italic mt-1">{userData.user_name}</h3>
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-700 text-[9px] font-black uppercase tracking-widest mt-1">
                      {userData.user_role}
                    </span>
                  </div>
                </div>

                {/* Badge de Estado Actual de la Jornada */}
                <div className="text-left sm:text-right">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">
                    Estatus de Hoy ({new Date().toLocaleDateString('es-MX')})
                  </span>
                  {todayRecord?.check_out ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider">
                      <LogOut size={12} /> Jornada Concluida
                    </span>
                  ) : todayRecord?.break_start && !todayRecord?.break_end ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider animate-pulse">
                      <Coffee size={12} /> En Comida
                    </span>
                  ) : todayRecord?.check_in ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider">
                      <CheckCircle2 size={12} /> En Turno Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider">
                      ⚪ Sin Marcar Entrada
                    </span>
                  )}
                </div>
              </div>

              {/* LOS 4 BOTONES OFICIALES DE ASISTENCIA */}
              <div className="space-y-4">
                {/* 1. ENTRADA AL TURNO */}
                <div className={`p-4 rounded-3xl border transition-all ${
                  todayRecord?.check_in 
                    ? 'bg-emerald-50/60 border-emerald-200' 
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                        todayRecord?.check_in ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">1. Entrada al Turno</h4>
                        <p className="text-[11px] font-bold text-slate-400">
                          {todayRecord?.check_in 
                            ? `Registrada a las ${new Date(todayRecord.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                            : 'Registra el inicio de tu jornada laboral con GPS'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {todayRecord?.check_in ? (
                        <>
                          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center gap-1">
                            <Check size={12} /> Marcada
                          </span>
                          {checkInLoc && (
                            <a
                              href={getGoogleMapsUrl(checkInLoc.lat, checkInLoc.lng) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-emerald-50 flex items-center gap-1 transition-all"
                              title="Ver ubicación exacta en Google Maps"
                            >
                              <MapPin size={12} /> Ver Mapa
                            </a>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => handleAction('check_in')}
                          disabled={status === 'loading'}
                          className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 size={16} /> Marcar Entrada
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2 & 3. SALIDA Y REGRESO DE COMER (DUAL CARD) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Salida a Comer */}
                  <div className={`p-4 rounded-3xl border transition-all ${
                    todayRecord?.break_start 
                      ? 'bg-amber-50/60 border-amber-200' 
                      : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        todayRecord?.break_start ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <Coffee size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase">2. Salida a Comer</h4>
                        <p className="text-[10px] text-slate-400 font-bold">
                          {todayRecord?.break_start 
                            ? `${new Date(todayRecord.break_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                            : 'Inicio de receso'}
                        </p>
                      </div>
                    </div>

                    {todayRecord?.break_start ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                          Marcado
                        </span>
                        {breakStartLoc && (
                          <a
                            href={getGoogleMapsUrl(breakStartLoc.lat, breakStartLoc.lng) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] font-black text-amber-700 hover:underline flex items-center gap-1"
                          >
                            <MapPin size={10} /> Ver Mapa
                          </a>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAction('break_start')}
                        disabled={status === 'loading' || !todayRecord?.check_in || Boolean(todayRecord?.check_out)}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-amber-500/10 disabled:opacity-40 cursor-pointer"
                      >
                        Salir a Comer
                      </button>
                    )}
                  </div>

                  {/* Regreso de Comer */}
                  <div className={`p-4 rounded-3xl border transition-all ${
                    todayRecord?.break_end 
                      ? 'bg-sky-50/60 border-sky-200' 
                      : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        todayRecord?.break_end ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <Clock size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase">3. Regreso de Comer</h4>
                        <p className="text-[10px] text-slate-400 font-bold">
                          {todayRecord?.break_end 
                            ? `${new Date(todayRecord.break_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                            : 'Fin de receso'}
                        </p>
                      </div>
                    </div>

                    {todayRecord?.break_end ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-sky-800 bg-sky-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                          Marcado
                        </span>
                        {breakEndLoc && (
                          <a
                            href={getGoogleMapsUrl(breakEndLoc.lat, breakEndLoc.lng) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] font-black text-sky-700 hover:underline flex items-center gap-1"
                          >
                            <MapPin size={10} /> Ver Mapa
                          </a>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAction('break_end')}
                        disabled={status === 'loading' || !todayRecord?.break_start || Boolean(todayRecord?.check_out)}
                        className={`w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-sky-500/10 disabled:opacity-40 cursor-pointer ${
                          todayRecord?.break_start && !todayRecord?.break_end ? 'animate-pulse' : ''
                        }`}
                      >
                        Volver de Comer
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. SALIDA DEFINITIVA */}
                <div className={`p-4 rounded-3xl border transition-all ${
                  todayRecord?.check_out 
                    ? 'bg-slate-100 border-slate-300' 
                    : 'bg-white border-slate-200 hover:border-slate-400'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                        todayRecord?.check_out ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <LogOut size={22} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">4. Salida Definitiva</h4>
                        <p className="text-[11px] font-bold text-slate-400">
                          {todayRecord?.check_out 
                            ? `Jornada concluida a las ${new Date(todayRecord.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                            : 'Cierra tu jornada laboral del día'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {todayRecord?.check_out ? (
                        <>
                          <span className="px-3 py-1.5 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center gap-1">
                            <Check size={12} /> Salida Confirmada
                          </span>
                          {checkOutLoc && (
                            <a
                              href={getGoogleMapsUrl(checkOutLoc.lat, checkOutLoc.lng) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-slate-50 flex items-center gap-1 transition-all"
                              title="Ver ubicación en Google Maps"
                            >
                              <MapPin size={12} /> Ver Mapa
                            </a>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm('¿Confirmas que has concluido tu jornada y deseas marcar tu Salida Definitiva?')) {
                              handleAction('check_out');
                            }
                          }}
                          disabled={status === 'loading' || !todayRecord?.check_in}
                          className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-950/10 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                        >
                          <LogOut size={16} /> Marcar Salida
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Overlay Animado */}
              <AnimatePresence>
                {status !== 'idle' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 size={54} className="text-sky-500 animate-spin mb-4" />
                        <p className="text-lg font-black text-slate-800 dark:text-white uppercase italic">Conectando Satélite GPS...</p>
                        <p className="text-xs text-slate-400 font-bold uppercase mt-1">Validando coordenadas y hora oficial</p>
                      </>
                    ) : status === 'success' ? (
                      <>
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                          <CheckCircle2 size={36} />
                        </div>
                        <p className="text-xl font-black text-slate-800 dark:text-white uppercase italic">¡Asistencia Registrada!</p>
                        <p className="text-xs text-emerald-600 font-bold uppercase mt-1">Ubicación y hora guardadas con éxito</p>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
                          <AlertCircle size={36} />
                        </div>
                        <p className="text-xl font-black text-slate-800 dark:text-white uppercase italic">Error en Registro</p>
                        <p className="text-xs text-rose-500 font-bold uppercase mt-1">Por favor verifica tu conexión y GPS</p>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Historial Personal de Asistencias (Últimos 7 días) */}
            <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-sky-500" />
                Mi Historial de Asistencia Reciente (Últimos 7 Días)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Entrada</th>
                      <th className="px-4 py-3">Comida (I/R)</th>
                      <th className="px-4 py-3">Salida</th>
                      <th className="px-4 py-3 text-right">Ubicación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                    {personalHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic">No hay registros de asistencia previos.</td>
                      </tr>
                    ) : (
                      personalHistory.map(h => {
                        const loc = h.last_location || {};
                        const mapUrl = getGoogleMapsUrl(loc.lat, loc.lng);
                        return (
                          <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{h.work_date}</td>
                            <td className="px-4 py-3 text-emerald-600">
                              {h.check_in ? new Date(h.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="px-4 py-3 text-amber-600">
                              {h.break_start ? new Date(h.break_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'} / {h.break_end ? new Date(h.break_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                              {h.check_out ? new Date(h.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'En turno'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {mapUrl ? (
                                <a
                                  href={mapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-sky-600 hover:text-sky-700 font-black uppercase tracking-wider"
                                >
                                  <MapPin size={12} /> Ver GPS
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-300">Sin GPS</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================
             MODO MONITOR ADMINISTRATIVO / SUPERVISOR
             ======================================================== */
          <div className="lg:col-span-2 space-y-6">
            {/* Buscador de personal */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={monitorSearch}
                  onChange={(e) => setMonitorSearch(e.target.value)}
                  placeholder="Buscar empleado o fecha (ej. Carlos, 2026-11-04)..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
              <span className="text-xs font-mono font-black py-1 px-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 shrink-0">
                {filteredHistory.length} registros
              </span>
            </div>

            {/* Tabla General de Asistencia con Ubicación GPS */}
            <div className="bg-white dark:bg-slate-900 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Empleado / Rol</th>
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Entrada</th>
                      <th className="px-6 py-4">Comida</th>
                      <th className="px-6 py-4">Salida</th>
                      <th className="px-6 py-4">Ubicación GPS</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold uppercase italic text-xs">
                          No se encontraron registros bajo el filtro indicado.
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((record) => {
                        const loc = record.last_location || {};
                        const mapUrl = getGoogleMapsUrl(loc.lat, loc.lng);
                        return (
                          <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-black text-slate-800 dark:text-white text-xs">{record.user_name}</p>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{record.user_role || 'empleado'}</span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300">
                              {record.work_date}
                            </td>
                            <td className="px-6 py-4 font-bold">
                              {record.check_in ? (
                                <span className="text-emerald-600">{new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              ) : (
                                <span className="text-slate-300">Sin marcar</span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-bold text-amber-600">
                              {record.break_start ? new Date(record.break_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'} / {record.break_end ? new Date(record.break_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="px-6 py-4 font-bold">
                              {record.check_out ? (
                                <span className="text-slate-800 dark:text-slate-200">{new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              ) : (
                                <span className="text-emerald-500 italic">En turno</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {mapUrl ? (
                                <a
                                  href={mapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-sky-100 transition-all cursor-pointer"
                                  title="Abrir ubicación exacta en Google Maps"
                                >
                                  <MapPin size={12} className="text-sky-500" />
                                  <span>Ver Mapa</span>
                                  <ExternalLink size={10} />
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-300 uppercase">Sin GPS</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => handleDeleteAttendance(record.id, record.user_name)}
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                                title="Eliminar registro"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Columna Lateral Derecha (Información y Resumen) */}
        <div className="space-y-6">
          {/* Card Satélite GPS */}
          <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest block leading-none mb-4">
                Satelital GPS Gateway
              </span>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center backdrop-blur-md shadow-inner">
                  <MapPin size={24} className="text-sky-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-white uppercase italic">Protocolo Satelital</p>
                  <p className="text-[10px] text-slate-400 font-bold leading-relaxed mt-1 uppercase">
                    Coordenadas validadas con hora de servidor
                  </p>
                </div>
              </div>
              {lastAction && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Último Marcado:</p>
                  <p className="text-xs font-bold text-white mt-1">{lastAction}</p>
                </div>
              )}
            </div>
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Resumen del Día para Monitor */}
          {(() => {
            const todayStr = getLocalDateString();
            const todayRecords = history.filter(h => h.work_date === todayStr);
            const enComida = todayRecords.filter(h => h.break_start && !h.break_end && !h.check_out).length;
            const enTurno = todayRecords.filter(h => h.check_in && !h.check_out && (!h.break_start || h.break_end)).length;
            const conSalida = todayRecords.filter(h => h.check_out).length;
            const totalPersonal = employeesList.filter(e => e.status !== 'inactive').length || 6;
            const sinMarcar = Math.max(0, totalPersonal - todayRecords.length);

            return (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Resumen de Asistencias de Hoy
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500 uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> En Turno Activo
                    </span>
                    <span className="font-black text-slate-800 dark:text-white">{enTurno}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500 uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> En Comida
                    </span>
                    <span className="font-black text-amber-500">{enComida}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500 uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400" /> Jornada Concluida
                    </span>
                    <span className="font-black text-slate-700 dark:text-slate-300">{conSalida}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-500 uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400" /> Sin Marcar Aún
                    </span>
                    <span className="font-black text-rose-500">{sinMarcar}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
