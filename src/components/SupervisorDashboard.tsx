import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  ClipboardList, 
  Activity, 
  RefreshCw, 
  Check, 
  UserCheck, 
  ExternalLink,
  ChevronRight,
  Navigation,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Profile from './Profile';
import { namesMatch, normalizeEmployeeName } from '../utils/nameHelper';

interface SupervisorDashboardProps {
  userName: string;
  userRole: string;
  initialTab?: 'attendance' | 'cash_closure' | 'profile';
}

export default function SupervisorDashboard({ userName, userRole, initialTab = 'attendance' }: SupervisorDashboardProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'cash_closure' | 'profile'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [dbStatusAlert, setDbStatusAlert] = useState<boolean>(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    fetchSupervisorData();
  }, [activeTab]);

  const fetchSupervisorData = async () => {
    setLoading(true);
    setErr(null);
    try {
      // Obtener registros de asistencia recientes (últimos 7 días) para supervisar
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      const startDateStr = sevenDaysAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_attendance')
        .select('*')
        .gte('work_date', startDateStr)
        .order('work_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (error: any) {
      console.error('Error fetching supervisor data:', error);
      setErr('Error al cargar datos. Asegúrate de haber ejecutado el SQL de actualización: ' + error.message);
      setDbStatusAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const approveAttendance = async (recordId: string, employeeName: string) => {
    setLoading(true);
    setMsg(null);
    try {
      const supervisorName = userName || 'Supervisor';
      const timestamp = new Date().toISOString();

      // Encontrar registro
      const record = attendanceRecords.find(r => r.id === recordId);
      let updatedLocation = record?.last_location ? { ...record.last_location } : {};
      
      // Auto-sanar en el JSONB también en caso de que la columna SQL no esté lista
      updatedLocation.supervisor_approved = true;
      updatedLocation.supervisor_approved_at = timestamp;
      updatedLocation.supervisor_approved_by = supervisorName;

      // Realizar la actualización en Supabase
      const { error } = await supabase
        .from('daily_attendance')
        .update({
          supervisor_attendance_approved: true,
          supervisor_attendance_approved_at: timestamp,
          supervisor_attendance_approved_by: supervisorName,
          last_location: updatedLocation
        })
        .eq('id', recordId);

      if (error) {
        // Fallback robusto en el JSONB si falló column por falta de sincronización SQL
        const { error: fallbackError } = await supabase
          .from('daily_attendance')
          .update({
            last_location: updatedLocation
          })
          .eq('id', recordId);

        if (fallbackError) throw fallbackError;
      }

      // Determinar rol exacto del empleado para que reciba la notificación en su respectivo dashboard
      const employeeRole = record?.user_role || 'driver';

      // Notificar al canal correspondiente
      await supabase.from('notifications_log').insert([
        {
          title: 'Asistencia Verificada',
          message: `El supervisor ${supervisorName} confirmó la asistencia de ${employeeName}`,
          type: 'attendance',
          user_role: 'admin',
          is_read: false
        },
        {
          title: 'Asistencia Verificada',
          message: `Tu asistencia ha sido confirmada por el supervisor ${supervisorName}`,
          type: 'attendance',
          user_role: employeeRole,
          is_read: false
        }
      ]);

      setMsg({ type: 'success', text: `¡Asistencia de ${employeeName} corroborada exitosamente!` });
      fetchSupervisorData();
    } catch (error: any) {
      console.error('Error approving attendance:', error);
      setMsg({ type: 'error', text: 'No se pudo aprobar la asistencia: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const approveCashClose = async (recordId: string, employeeName: string) => {
    setLoading(true);
    setMsg(null);
    try {
      const supervisorName = userName || 'Supervisor';
      const timestamp = new Date().toISOString();

      // Encontrar registro
      const record = attendanceRecords.find(r => r.id === recordId);
      let updatedLocation = record?.last_location ? { ...record.last_location } : {};
      
      // Auto-sanar en el JSONB driver_session u operator_session
      if (updatedLocation.driver_session) {
        updatedLocation.driver_session.cash_approved = true;
        updatedLocation.driver_session.cash_approved_at = timestamp;
        updatedLocation.driver_session.cash_approved_by = supervisorName;
      }
      if (updatedLocation.operator_session) {
        updatedLocation.operator_session.cash_approved = true;
        updatedLocation.operator_session.cash_approved_at = timestamp;
        updatedLocation.operator_session.cash_approved_by = supervisorName;
      }

      // También llaves raíz para compatibilidad
      updatedLocation.cash_approved = true;
      updatedLocation.cash_approved_at = timestamp;
      updatedLocation.cash_approved_by = supervisorName;

      // Actualizar en Supabase
      const { error } = await supabase
        .from('daily_attendance')
        .update({
          supervisor_cash_approved: true,
          supervisor_cash_approved_at: timestamp,
          supervisor_cash_approved_by: supervisorName,
          last_location: updatedLocation
        })
        .eq('id', recordId);

      if (error) {
        // Fallback si la columna no existe aún en BD
        const { error: fallbackError } = await supabase
          .from('daily_attendance')
          .update({
            last_location: updatedLocation
          })
          .eq('id', recordId);

        if (fallbackError) throw fallbackError;
      }

      // Determinar rol exacto del empleado para su respectivo dashboard
      const employeeRole = record?.user_role || 'driver';

      // Notificar
      await supabase.from('notifications_log').insert([
        {
          title: 'Corte de Caja Aprobado',
          message: `El supervisor ${supervisorName} aprobó el corte de caja de ${employeeName}`,
          type: 'finances',
          user_role: 'admin',
          is_read: false
        },
        {
          title: 'Corte de Caja Aprobado',
          message: `Tu corte de caja ha sido aprobado por el supervisor ${supervisorName}`,
          type: 'finances',
          user_role: employeeRole,
          is_read: false
        }
      ]);

      setMsg({ type: 'success', text: `¡Corte de caja de ${employeeName} validado y confirmado!` });
      fetchSupervisorData();
    } catch (error: any) {
      console.error('Error approving cash close:', error);
      setMsg({ type: 'error', text: 'Error al aprobar corte de caja: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // Helper para decodificar JSON de ubicación o sesiones
  const parseJsonObj = (val: any) => {
    if (!val) return {};
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(val) || {};
    } catch (_) {
      return {};
    }
  };

  // Helper para dar formato seguro a coordenadas sin crasear si son nulas o strings
  const formatCoord = (val: any, decimals: number = 5) => {
    if (val === null || val === undefined) return '0.00000';
    const num = Number(val);
    return isNaN(num) ? '0.00000' : num.toFixed(decimals);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Banner de Bienvenida del Supervisor */}
      <div className="bg-gradient-to-r from-sky-600 to-indigo-700 rounded-[32px] p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-sky-200">
              <ShieldCheck size={14} className="text-sky-300" />
              Acceso de Supervisor Autorizado
            </div>
            <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tight leading-none">
              Panel de <span className="text-sky-300">Supervisión</span>
            </h1>
            <p className="text-xs sm:text-sm text-sky-100 font-bold uppercase tracking-wider">
              Bienvenido, {userName || 'Supervisor'}. Gestiona asistencias, cortes de caja de empleados y tu perfil.
            </p>
          </div>
          
          <button 
            onClick={fetchSupervisorData}
            disabled={loading}
            className="self-start md:self-auto flex items-center gap-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-extrabold text-[10px] uppercase tracking-widest px-5 py-3 rounded-2xl transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar Datos
          </button>
        </div>
      </div>

      {dbStatusAlert && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-2xl flex items-start gap-3">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="text-[11px] font-bold leading-relaxed uppercase">
            <span className="font-extrabold text-amber-600 block mb-1">RECORDATORIO - MIGRACIÓN DE ENTORNO:</span>
            Si la aplicación muestra errores al interactuar, recuerda copiar el fragmento de la parte inferior de <code className="bg-amber-500/20 px-1 py-0.5 rounded text-amber-800 dark:text-amber-300 font-mono">/supabase_schema.sql</code> y pegarlo en el editor SQL de tu panel de Supabase para añadir las columnas correspondientes de inmediato de forma 100% segura.
          </div>
        </div>
      )}

       {/* Tabs */}
      {!initialTab && (
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-2 max-w-md">
          <button
            onClick={() => { setActiveTab('attendance'); setMsg(null); }}
            className={`flex-1 py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'attendance'
                ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Asistencias
          </button>
          <button
            onClick={() => { setActiveTab('cash_closure'); setMsg(null); }}
            className={`flex-1 py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'cash_closure'
                ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Cortes de Caja
          </button>
          <button
            onClick={() => { setActiveTab('profile'); setMsg(null); }}
            className={`flex-1 py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Mi Perfil
          </button>
        </div>
      )}

      {/* Alerts */}
      <AnimatePresence mode="wait">
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-wide border ${
              msg.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            {msg.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <AlertCircle size={18} className="text-rose-500" />}
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="min-h-[400px]">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={40} className="text-sky-500 animate-spin mb-4" />
            <p className="text-xs text-slate-400 font-black uppercase tracking-widest animate-pulse">Procesando y Sincronizando datos...</p>
          </div>
        )}

        {!loading && activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 dark:border-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white uppercase text-xs tracking-widest flex items-center gap-2">
                    <ClipboardList size={16} className="text-sky-500" />
                    Asistencias Recientes de Colaboradores
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Revisa ubicaciones GPS y valida la asistencia del día</p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Registros: {attendanceRecords.length}
                </div>
              </div>

              {attendanceRecords.length === 0 ? (
                <div className="p-16 text-center">
                  <p className="text-xs font-bold text-slate-300 dark:text-slate-700 uppercase italic">No se encontraron asistencias en los últimos 7 días</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/30 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Colaborador / Fecha</th>
                        <th className="px-6 py-4">Horarios (Min / Max)</th>
                        <th className="px-6 py-4">Ubicación GPS (Check-In)</th>
                        <th className="px-6 py-4">Validación de Supervisor</th>
                        <th className="px-6 py-4 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                      {attendanceRecords.map((record) => {
                        const loc = parseJsonObj(record.last_location);
                        // Verificar estado de aprobación en columna o en JSON
                        const isApproved = record.supervisor_attendance_approved === true || loc.supervisor_approved === true;
                        const approvedBy = record.supervisor_attendance_approved_by || loc.supervisor_approved_by;
                        
                        return (
                          <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                            {/* Nombre y Rol */}
                            <td className="px-6 py-5">
                              <div>
                                <p className="font-black text-slate-800 dark:text-white text-xs italic">{record.user_name}</p>
                                <p className="text-[9px] text-sky-500 font-extrabold uppercase tracking-tight mt-0.5">{record.user_role || 'empleado'}</p>
                                <p className="text-[8px] text-slate-400 font-extrabold uppercase mt-1">{record.work_date}</p>
                              </div>
                            </td>

                            {/* Horarios */}
                            <td className="px-6 py-5">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-[10px]">
                                  <span className="font-bold text-slate-400 uppercase w-12 text-[8px]">Entrada:</span>
                                  {record.check_in ? (
                                    <span className="font-extrabold text-emerald-500">{new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  ) : (
                                    <span className="font-bold text-slate-300 uppercase text-[9px]">-</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px]">
                                  <span className="font-bold text-slate-400 uppercase w-12 text-[8px]">Comida:</span>
                                  {record.break_start || record.break_end ? (
                                    <span className="font-extrabold text-amber-500">
                                      {record.break_start ? new Date(record.break_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'} 
                                      {' / '} 
                                      {record.break_end ? new Date(record.break_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </span>
                                  ) : (
                                    <span className="font-bold text-slate-300 uppercase text-[9px]">-</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px]">
                                  <span className="font-bold text-slate-400 uppercase w-12 text-[8px]">Salida:</span>
                                  {record.check_out ? (
                                    <span className="font-extrabold text-slate-600 dark:text-slate-300">{new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  ) : (
                                    <span className="font-bold text-amber-500 uppercase text-[8px] animate-pulse">Activo</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Ubicación GPS */}
                            <td className="px-6 py-5">
                              <div className="space-y-2 min-w-[150px]">
                                {/* Check In Location if present */}
                                {loc.check_in_location?.lat ? (
                                  <div className="p-1.5 px-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                                    <div className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                      Entrada
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-[8px] font-mono font-black text-slate-500">
                                        {formatCoord(loc.check_in_location.lat, 5)}, {formatCoord(loc.check_in_location.lng, 5)}
                                      </span>
                                      <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${loc.check_in_location.lat},${loc.check_in_location.lng}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sky-500 hover:text-sky-600 inline-flex items-center gap-0.5 font-bold text-[8px] uppercase"
                                      >
                                        <Navigation size={8} /> Mapa
                                      </a>
                                    </div>
                                  </div>
                                ) : null}

                                {/* Break Start Location */}
                                {loc.break_start_location?.lat ? (
                                  <div className="p-1.5 px-2 bg-amber-500/5 pointer-events-auto border border-amber-500/10 rounded-xl">
                                    <div className="text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                                      Salida Almuerzo
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-[8px] font-mono font-black text-slate-500">
                                        {formatCoord(loc.break_start_location.lat, 5)}, {formatCoord(loc.break_start_location.lng, 5)}
                                      </span>
                                      <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${loc.break_start_location.lat},${loc.break_start_location.lng}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sky-500 hover:text-sky-600 inline-flex items-center gap-0.5 font-bold text-[8px] uppercase"
                                      >
                                        <Navigation size={8} /> Mapa
                                      </a>
                                    </div>
                                  </div>
                                ) : null}

                                {/* Break End Location */}
                                {loc.break_end_location?.lat ? (
                                  <div className="p-1.5 px-2 bg-orange-500/5 border border-orange-500/10 rounded-xl">
                                    <div className="text-[8px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block"></span>
                                      Regreso Almuerzo
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-[8px] font-mono font-black text-slate-500">
                                        {formatCoord(loc.break_end_location.lat, 5)}, {formatCoord(loc.break_end_location.lng, 5)}
                                      </span>
                                      <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${loc.break_end_location.lat},${loc.break_end_location.lng}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sky-500 hover:text-sky-600 inline-flex items-center gap-0.5 font-bold text-[8px] uppercase"
                                      >
                                        <Navigation size={8} /> Mapa
                                      </a>
                                    </div>
                                  </div>
                                ) : null}

                                {/* Check Out Location */}
                                {loc.check_out_location?.lat ? (
                                  <div className="p-1.5 px-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                                    <div className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"></span>
                                      Salida Turno
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-[8px] font-mono font-black text-slate-500">
                                        {formatCoord(loc.check_out_location.lat, 5)}, {formatCoord(loc.check_out_location.lng, 5)}
                                      </span>
                                      <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${loc.check_out_location.lat},${loc.check_out_location.lng}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sky-500 hover:text-sky-600 inline-flex items-center gap-0.5 font-bold text-[8px] uppercase"
                                      >
                                        <Navigation size={8} /> Mapa
                                      </a>
                                    </div>
                                  </div>
                                ) : null}

                                {/* Fallback standard latest location */}
                                {!loc.check_in_location && !loc.break_start_location && !loc.break_end_location && !loc.check_out_location && loc.lat && loc.lng ? (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1 bg-sky-50 dark:bg-sky-500/5 px-2.5 py-1 rounded-lg text-sky-600 dark:text-sky-400 max-w-fit">
                                      <MapPin size={12} className="shrink-0" />
                                      <span className="text-[9px] font-mono font-extrabold">{formatCoord(loc.lat, 6)}, {formatCoord(loc.lng, 6)}</span>
                                    </div>
                                    <a 
                                      href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-sky-500 hover:text-sky-600 transition-colors"
                                    >
                                      <Navigation size={10} />
                                      Ver en Google Maps
                                      <ExternalLink size={8} />
                                    </a>
                                  </div>
                                ) : null}

                                {!loc.lat && !loc.lng && (
                                  <span className="text-[9px] font-bold text-slate-300 uppercase italic">Ubicación no recibida</span>
                                )}
                              </div>
                            </td>

                            {/* Validación */}
                            <td className="px-6 py-5">
                              {isApproved ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-[8px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    <Check size={10} />
                                    Corroborado y OK
                                  </span>
                                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">Por: {approvedBy}</p>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[8px] font-black uppercase tracking-wider text-slate-500">
                                  Pendiente validación
                                </span>
                              )}
                            </td>

                            {/* Acción */}
                            <td className="px-6 py-5 text-center">
                              {isApproved ? (
                                <button
                                  disabled
                                  className="mx-auto w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center cursor-default"
                                >
                                  <Check size={16} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => approveAttendance(record.id, record.user_name)}
                                  className="mx-auto flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold text-[9px] uppercase tracking-wider px-3 py-2 rounded-xl transition-all shadow-md shadow-emerald-500/10"
                                >
                                  <UserCheck size={12} />
                                  Confirmar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && activeTab === 'cash_closure' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 dark:border-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white uppercase text-xs tracking-widest flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-500" />
                    Cortes de Caja por Validar
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Supervisa y autoriza la liquidación del dinero, fondo y ventas de garrafones</p>
                </div>
              </div>

              {(() => {
                // Filtrar registros que tengan sesión cerrada de repartidor u operador (cash_closed === true)
                const closedShifts = attendanceRecords.filter((record) => {
                  const loc = parseJsonObj(record.last_location);
                  const isDriverClosed = loc.driver_session && loc.driver_session.cash_closed === true;
                  const isOperatorClosed = loc.operator_session && loc.operator_session.cash_closed === true;
                  const isRootWebClosed = loc.cash_closed === true;
                  return isDriverClosed || isOperatorClosed || isRootWebClosed;
                });

                if (closedShifts.length === 0) {
                  return (
                    <div className="p-16 text-center">
                      <p className="text-xs font-bold text-slate-300 dark:text-slate-700 uppercase italic">No hay cortes de caja cerrados recientemente por colaboradores</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800/30 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Colaborador / Turno</th>
                          <th className="px-6 py-4">Fondo Inicial</th>
                          <th className="px-6 py-4">Ventas Registradas</th>
                          <th className="px-6 py-4">Cantidad Pedidos / Garrafones</th>
                          <th className="px-6 py-4">Total a Entregar al Supervisor</th>
                          <th className="px-6 py-4">Estado Corte</th>
                          <th className="px-6 py-4 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                        {closedShifts.map((record) => {
                          const loc = parseJsonObj(record.last_location);
                          const session = loc.driver_session || loc.operator_session || loc;
                          
                          // Verificar si ya está verificado nuestro corte de caja
                          const isCashApproved = record.supervisor_cash_approved === true || loc.cash_approved === true || session.cash_approved === true;
                          const approvedBy = record.supervisor_cash_approved_by || loc.cash_approved_by || session.cash_approved_by;

                          const cashFloat = Number(session.cash_float || 0);
                          const cashSales = Number(session.cash_sales_total || 0);
                          const totalToDeliver = Number(session.cash_total_to_deliver || (cashFloat + cashSales));
                          const ordersCount = session.cash_orders_count || 0;

                          return (
                            <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                              {/* Nombre */}
                              <td className="px-6 py-5">
                                <div>
                                  <p className="font-black text-slate-800 dark:text-white text-xs italic">{record.user_name}</p>
                                  <p className="text-[9px] text-indigo-500 font-extrabold uppercase mt-0.5">{record.user_role === 'operator' ? 'Fondo Planta' : 'Fondo Ruta'}</p>
                                  <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase">Fecha: {record.work_date}</p>
                                </div>
                              </td>

                              {/* Fondo */}
                              <td className="px-6 py-5">
                                <span className="font-mono text-xs font-black text-slate-700 dark:text-slate-300">
                                  ${cashFloat.toFixed(2)}
                                </span>
                              </td>

                              {/* Ventas */}
                              <td className="px-6 py-5">
                                <span className="font-mono text-xs font-black text-emerald-500">
                                  +${cashSales.toFixed(2)}
                                </span>
                              </td>

                              {/* Garrafones / Pedidos */}
                              <td className="px-6 py-5">
                                <div className="space-y-0.5">
                                  <span className="inline-flex px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase">
                                    {ordersCount} Pedidos / Entregas
                                  </span>
                                </div>
                              </td>

                              {/* Total a entregar */}
                              <td className="px-6 py-5">
                                <div className="text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl max-w-max">
                                  ${totalToDeliver.toFixed(2)} MXN
                                </div>
                              </td>

                              {/* Estado */}
                              <td className="px-6 py-5">
                                {isCashApproved ? (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                                      <Check size={10} />
                                      Corte Confirmado
                                    </span>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">Por: {approvedBy}</p>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-500/10 text-[8px] font-black uppercase text-amber-600 dark:text-amber-400 animate-pulse">
                                    Por Validar Dinero
                                  </span>
                                )}
                              </td>

                              {/* Acción */}
                              <td className="px-6 py-5 text-center">
                                {isCashApproved ? (
                                  <button
                                    disabled
                                    className="mx-auto w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center cursor-default"
                                  >
                                    <Check size={16} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => approveCashClose(record.id, record.user_name)}
                                    className="mx-auto flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-[9px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/10"
                                  >
                                    <DollarSign size={11} />
                                    Confirmar Dinero
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {!loading && activeTab === 'profile' && (
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-10">
            <div className="mb-4">
              <h3 className="font-extrabold text-slate-800 dark:text-white uppercase text-xs tracking-widest flex items-center gap-2">
                <User size={16} className="text-sky-500" />
                Mi Perfil Personal de Supervisor
              </h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Configura tus accesos, sube tu foto de perfil y actualiza tus campos personales</p>
            </div>
            <Profile />
          </div>
        )}
      </div>

    </div>
  );
}
