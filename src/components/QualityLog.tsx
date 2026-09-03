import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, Thermometer, ShieldCheck, ClipboardList, Plus, Search, CheckCircle2, X, Loader2, AlertCircle, Download, Trash2, Settings, PenTool as Tool, Eye, Edit3 as Edit, FileText } from 'lucide-react';
import { useQualityEngine } from '../hooks/useQualityEngine';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { exportToPDF } from '../utils/pdfExport';
import { supabase } from '../lib/supabaseClient';

interface QualityLogProps {
  userRole?: 'admin' | 'operator' | 'driver' | 'client' | 'supervisor' | string | null;
}

export default function QualityLog({ userRole }: QualityLogProps) {
  const { handleSaveQualityLog, fetchQualityHistory, loading: isSaving } = useQualityEngine();
  const [dbLogs, setDbLogs] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customParams, setCustomParams] = useState<{ name: string; value: string; unit: string }[]>([]);
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<any | null>(null);
  const [editingLog, setEditingLog] = useState<any | null>(null);

  // Determinar si es Admin (Monitor) o Planta (Registro)
  const isMonitorMode = userRole === 'admin';
  const [isExporting, setIsExporting] = useState(false);

  const handleExportSinglePDF = (log: any) => {
    let parsedNotes: any = {};
    try {
      if (log.notes) parsedNotes = JSON.parse(log.notes);
    } catch (_) {}

    const columns = ['Parámetro', 'Valor Registrado / Especificación'];
    const data = [
      ['ID de Registro', log.id || '-'],
      ['Supervisor Titular', log.supervisor_name || '-'],
      ['Fecha de Captura', new Date(log.created_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })],
      ['Volumen de Agua Cruda', `${log.volume_received || 0} Litros`],
      ['Dosificación de Cloro', `${log.chlorine_dosage || 0} ppm (Aceptable: 0.2 - 1.5 ppm)`],
      ['Potencial de Hidrógeno (pH)', `${parsedNotes.ph || '7.2'} (Aceptable: 6.5 - 8.5)`],
      ['Sólidos Totales Disueltos (TDS)', `${parsedNotes.tds || '150'} ppm`],
      ['Mantenimiento Preventivo', parsedNotes.maintenance || 'Ninguno / Normal'],
      ['Condición General Hidráulica', log.pipeline_status === 'good' ? 'ÓPTIMO / OPERACIÓN NORMAL' : 'REVISIÓN REQUERIDA / MANTENIMIENTO urgente'],
      ['Observaciones Técnicas', parsedNotes.additional_notes || '-']
    ];

    if (parsedNotes.custom_params && Array.isArray(parsedNotes.custom_params)) {
      parsedNotes.custom_params.forEach((p: any) => {
        data.push([`Especial: ${p.name || 'Parámetro'}`, `${p.value || '-'} ${p.unit || ''}`]);
      });
    }

    exportToPDF({
      title: `Bitácora Individual de Calidad - Folio ${log.id?.substring(0,8) || 'N/A'}`,
      subtitle: `Registro técnico de potabilidad e inocuidad de agua - Sistema QualityWater`,
      columns,
      data,
      filename: `Reporte_Individual_Calidad_${log.id?.substring(0, 8)}`
    });
  };

  const handleExportSingleExcel = (log: any) => {
    try {
      let parsedNotes: any = {};
      try {
        if (log.notes) parsedNotes = JSON.parse(log.notes);
      } catch (_) {}

      const columns = ['Parámetro', 'Valor Registrado / Especificación'];
      const data = [
        ['ID de Registro', log.id || '-'],
        ['Supervisor Titular', log.supervisor_name || '-'],
        ['Fecha de Captura', new Date(log.created_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })],
        ['Volumen de Agua Cruda', `${log.volume_received || 0} Litros`],
        ['Dosificación de Cloro', `${log.chlorine_dosage || 0} ppm`],
        ['Potencial de Hidrógeno (pH)', `${parsedNotes.ph || '7.2'}`],
        ['Sólidos Totales Disueltos (TDS)', `${parsedNotes.tds || '150'} ppm`],
        ['Mantenimiento Preventivo', parsedNotes.maintenance || 'Ninguno / Normal'],
        ['Condición General Hidráulica', log.pipeline_status === 'good' ? 'ÓPTIMO / OPERACIÓN NORMAL' : 'REVISIÓN REQUERIDA / MANTENIMIENTO urgente'],
        ['Observaciones Técnicas', parsedNotes.additional_notes || '-']
      ];

      if (parsedNotes.custom_params && Array.isArray(parsedNotes.custom_params)) {
        parsedNotes.custom_params.forEach((p: any) => {
          data.push([`Especial: ${p.name || 'Parámetro'}`, `${p.value || '-'} ${p.unit || ''}`]);
        });
      }

      const csvContent = [
        columns.join(','),
        ...data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Reporte_Individual_Calidad_${log.id?.substring(0, 8)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditClick = (log: any) => {
    setEditingLog(log);
    let parsed: any = {};
    try {
      if (log.notes) parsed = JSON.parse(log.notes);
    } catch (_) {}
    setCustomParams(parsed.custom_params || []);
    setShowModal(true);
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const columns = ['Supervisor', 'Agua Cruda (L)', 'Cloro (ppm)', 'pH', 'TDS (ppm)', 'Mantenimiento', 'Estatus', 'Fecha'];
      const data = dbLogs.map(l => {
        let parsed = { ph: '-', tds: '-', maintenance: 'Ninguno' };
        try {
          if (l.notes) parsed = JSON.parse(l.notes);
        } catch (_) {}
        return [
          l.supervisor_name,
          `${l.volume_received}L`,
          `${l.chlorine_dosage} ppm`,
          parsed.ph || '-',
          parsed.tds || '-',
          parsed.maintenance || 'Ninguno',
          l.pipeline_status === 'good' ? 'Óptimo' : 'Revisión',
          new Date(l.created_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
        ];
      });

      exportToPDF({
        title: 'Bitácora de Calidad QualityWater',
        subtitle: `Reporte de auditoría de variables físicas y químicas - Generado el ${new Date().toLocaleDateString()}`,
        columns,
        data,
        filename: 'Reporte_Calidad'
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const columns = ['Supervisor', 'Agua Cruda (L)', 'Cloro (ppm)', 'pH', 'TDS (ppm)', 'Mantenimiento', 'Estatus', 'Fecha'];
      const data = dbLogs.map(l => {
        let parsed = { ph: '-', tds: '-', maintenance: 'Ninguno' };
        try {
          if (l.notes) parsed = JSON.parse(l.notes);
        } catch (_) {}
        return [
          l.supervisor_name,
          `${l.volume_received}L`,
          `${l.chlorine_dosage} ppm`,
          parsed.ph || '-',
          parsed.tds || '-',
          parsed.maintenance || 'Ninguno',
          l.pipeline_status === 'good' ? 'Óptimo' : 'Revisión',
          new Date(l.created_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
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
      link.setAttribute('download', `Reporte_Calidad_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  // Mock de sesión local
  const [session, setSession] = useState({
    user_id: '0000000-0000-0000-0000-000000000000',
    user_name: 'Supervisor Planta'
  });

  useEffect(() => {
    const saved = localStorage.getItem('qw_session');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setSession({ user_id: s.user_id, user_name: s.user_name });
      } catch (e) {}
    }
    
    loadHistory();

    // Suscripción Realtime para actualizar la tabla histórica automáticamente
    const channel = supabase
      .channel('quality_logs_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quality_logs' }, () => {
        loadHistory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadHistory = async () => {
    const res = await fetchQualityHistory();
    if (res.success) setDbLogs(res.data);
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('¿Eliminar este registro de calidad?')) return;
    const { error } = await supabase.from('quality_logs').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else loadHistory();
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const extraParams = {
      ph: formData.get('ph') ? Number(formData.get('ph')) : 7.2,
      tds: formData.get('tds') ? Number(formData.get('tds')) : 150,
      maintenance: (formData.get('maintenance') as string) || 'Ninguno',
      additional_notes: (formData.get('additional_notes') as string) || '',
      custom_params: customParams
    };

    const data = {
      supervisor_name: editingLog ? editingLog.supervisor_name : session.user_name,
      pipeline_status: formData.get('status') as string,
      volume_received: Number(formData.get('volume')),
      chlorine_dosage: Number(formData.get('chlorine')),
      notes: JSON.stringify(extraParams)
    };

    let res;
    if (editingLog) {
      const { error } = await supabase
        .from('quality_logs')
        .update(data)
        .eq('id', editingLog.id);

      if (error) {
        alert('Error al actualizar registro de calidad: ' + error.message);
        res = { success: false };
      } else {
        res = { success: true };
      }
    } else {
      res = await handleSaveQualityLog({
        staff_id: session.user_id,
        ...data
      });
    }

    if (res.success) {
      setSuccess(true);
      setCustomParams([]);
      setTimeout(() => {
        setSuccess(false);
        setEditingLog(null);
        setShowModal(false);
        loadHistory();
      }, 2000);
    }
  };

  const filteredLogs = dbLogs.filter(log => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    
    let parsedNotes: any = {};
    try {
      if (log.notes) parsedNotes = JSON.parse(log.notes);
    } catch (_) {}

    return (
      log.supervisor_name.toLowerCase().includes(q) ||
      (parsedNotes.maintenance && parsedNotes.maintenance.toLowerCase().includes(q)) ||
      log.pipeline_status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-3xl font-black text-slate-800 italic uppercase">Bitácoras de <span className="text-sky-500">Calidad</span></h2>
          <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest italic font-mono">Monitoreo Físico-Químico • NORMA-127-SSA1</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button 
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting || dbLogs.length === 0}
            className="flex items-center gap-3 bg-slate-100 text-slate-600 px-6 py-4 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            PDF Auditoría
          </button>
          <button 
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting || dbLogs.length === 0}
            className="flex items-center gap-3 bg-emerald-50 text-emerald-700 border border-emerald-100 px-6 py-4 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-100 transition-all disabled:opacity-50"
          >
            <Download size={18} />
            Excel Auditoría
          </button>
          <button 
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all"
          >
            <Plus size={18} /> Nuevo Registro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Log Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest flex items-center gap-2">
                <ClipboardList size={18} className="text-sky-500" />
                Historial Técnico {isMonitorMode ? '(Modo Auditor)' : ''}
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar parámetro..." 
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500/10 transition-all font-bold" 
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  <tr>
                    <th className="px-8 py-6">Parámetros / Supervisor</th>
                    <th className="px-8 py-6">Mediciones (Agua • Cloro • pH • TDS)</th>
                    <th className="px-8 py-6">Estatus</th>
                    <th className="px-8 py-6">Fecha y Hora</th>
                    {isMonitorMode && <th className="px-8 py-6 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={isMonitorMode ? 5 : 4} className="px-8 py-12 text-center text-slate-300 font-bold italic">No hay registros de calidad cargados</td>
                    </tr>
                  ) : filteredLogs.map((log) => {
                    let parsedNotes: any = null;
                    try {
                      if (log.notes) parsedNotes = JSON.parse(log.notes);
                    } catch (_) {}
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/75 group transition-colors">
                        <td className="px-8 py-6">
                          <p onClick={() => setSelectedLogForDetail(log)} className="font-black text-slate-800 text-sm italic cursor-pointer hover:text-sky-500 transition-colors flex items-center gap-1.5">
                            <ClipboardList size={14} className="text-slate-400" />
                            Entrada de Agua
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{log.supervisor_name}</p>
                        </td>
                        <td className="px-8 py-6 space-y-1.5" translate="no">
                          <p className="font-black text-slate-900 text-sm">{log.volume_received} Litros</p>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="bg-sky-50 text-sky-700 text-[9px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-wider border border-sky-100">
                              Cloro: {log.chlorine_dosage} ppm
                            </span>
                            {parsedNotes?.ph && (
                              <span className="bg-purple-100 text-purple-700 text-[9px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-wider border border-purple-200">
                                pH: {parsedNotes.ph}
                              </span>
                            )}
                            {parsedNotes?.tds && (
                              <span className="bg-teal-100 text-teal-700 text-[9px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-wider border border-teal-200">
                                TDS: {parsedNotes.tds} ppm
                              </span>
                            )}
                            {parsedNotes?.custom_params && Array.isArray(parsedNotes.custom_params) && parsedNotes.custom_params.map((p: any, idx: number) => (
                              <span key={idx} className="bg-indigo-50 text-indigo-700 text-[9px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-wider border border-indigo-100">
                                {p.name}: {p.value} {p.unit}
                              </span>
                            ))}
                          </div>
                          {parsedNotes?.maintenance && parsedNotes.maintenance !== 'Ninguno' && (
                            <p className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-1">
                              🔧 Mant.: {parsedNotes.maintenance}
                            </p>
                          )}
                          {parsedNotes?.additional_notes && (
                            <p className="text-[9px] text-slate-400 font-bold italic line-clamp-1">"{parsedNotes.additional_notes}"</p>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                            log.pipeline_status === 'good' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {log.pipeline_status === 'good' ? 'Óptimo' : 'Revisión'}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-sm font-bold text-slate-500 italic">
                          <span>
                            {new Date(log.created_at).toLocaleString('es-MX', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedLogForDetail(log)}
                              className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-all"
                              title="Ver Detalle / Parámetros"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportSinglePDF(log)}
                              className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Generar PDF de esta bitácora"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportSingleExcel(log)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Generar Excel de esta bitácora"
                            >
                              <FileText size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditClick(log)}
                              className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Editar Registro"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteLog(log.id)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              title="Eliminar Registro de Calidad"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-500 to-sky-500 p-8 rounded-[40px] text-white shadow-2xl shadow-sky-500/20">
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 opacity-80">Cumplimiento Normativo</h4>
            <div className="flex items-center gap-6 mb-8">
              <div className="text-5xl font-black">100%</div>
              <div className="text-[10px] font-black uppercase leading-tight opacity-80">Rendimiento e Inocuidad<br/>Hoy</div>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div className="bg-white h-full" style={{ width: '100%' }} />
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Supervisor en Turno</h4>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center font-black">
                {session.user_name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-black text-slate-800 uppercase italic">{session.user_name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activo ahora</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Registro */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSaving) {
                  setShowModal(false);
                  setEditingLog(null);
                }
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-800 uppercase italic">
                  {editingLog ? 'Editar' : 'Registrar'} <span className="text-sky-500">Bitácora</span>
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingLog(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {success ? (
                <div className="py-12 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={48} />
                  </div>
                  <p className="text-2xl font-black text-slate-800 uppercase italic">¡Bitácora <span className="text-emerald-500">Guardada!</span></p>
                  <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Registrada en base de datos real</p>
                </div>
              ) : (() => {
                let parsedEdNotes: any = {};
                if (editingLog && editingLog.notes) {
                  try {
                    parsedEdNotes = JSON.parse(editingLog.notes);
                  } catch (_) {}
                }
                return (
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estatus General de Entrada</label>
                      <select name="status" defaultValue={editingLog ? editingLog.pipeline_status : "good"} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold appearance-none">
                        <option value="good">Óptimo (Agua clara/Inodora)</option>
                        <option value="warning">Revisión (Turbiedad/Olor leve)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Volumen Agua Cruda (Litros)</label>
                        <input required name="volume" type="number" defaultValue={editingLog ? editingLog.volume_received : "10000"} placeholder="Ej. 10000" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cloro Residual (ppm)</label>
                        <input required name="chlorine" type="number" step="0.01" defaultValue={editingLog ? editingLog.chlorine_dosage : "0.8"} placeholder="Ej. 0.8" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">pH (Acidez/Alcalinidad)</label>
                        <input required name="ph" type="number" step="0.1" min="0" max="14" defaultValue={editingLog ? (parsedEdNotes.ph || "7.2") : "7.2"} placeholder="Ej. 7.2" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dureza / TDS (ppm)</label>
                        <input required name="tds" type="number" defaultValue={editingLog ? (parsedEdNotes.tds || "150") : "150"} placeholder="Ej. 150" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mantenimiento Preventivo (Hoy)</label>
                      <select name="maintenance" defaultValue={editingLog ? (parsedEdNotes.maintenance || "Ninguno") : "Ninguno"} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold appearance-none">
                        <option value="Ninguno">Ninguno / Operación Normal</option>
                        <option value="Retrolavado de Filtro de Arena">Retrolavado de Filtro de Arena</option>
                        <option value="Limpieza de Cama Carbón Activado">Limpieza de Cama Carbón Activado</option>
                        <option value="Lavado de Suavizadores">Lavado de Suavizadores</option>
                        <option value="Sanitización de Cisternas">Sanitización de Cisternas</option>
                        <option value="Cambio de Filtro Pulidor">Cambio de Filtro de Micras/Pulidor</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observaciones o Notas</label>
                      <textarea name="additional_notes" defaultValue={editingLog ? (parsedEdNotes.additional_notes || "") : ""} placeholder="Escribe aquí observaciones técnicas..." className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold h-20" />
                    </div>

                    {/* Parámetros de Calidad Dinámicos */}
                    <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          🚀 Parámetros Especiales / Adicionales
                        </label>
                        <button
                          type="button"
                          onClick={() => setCustomParams([...customParams, { name: '', value: '', unit: '' }])}
                          className="text-[10px] font-black uppercase text-sky-500 flex items-center gap-1 hover:text-sky-600 transition-colors"
                        >
                          <Plus size={12} /> Agregar Parámetro
                        </button>
                      </div>

                      {customParams.length > 0 ? (
                        <div className="space-y-2">
                          {customParams.map((param, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-5">
                                <input
                                  required
                                  placeholder="Nombre (ej. Turbidez)"
                                  value={param.name}
                                  onChange={(e) => {
                                    const copy = [...customParams];
                                    copy[index].name = e.target.value;
                                    setCustomParams(copy);
                                  }}
                                  className="w-full bg-white border border-slate-150 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-sky-500 font-bold"
                                />
                              </div>
                              <div className="col-span-3">
                                <input
                                  required
                                  placeholder="Valor (ej. 1.2)"
                                  value={param.value}
                                  onChange={(e) => {
                                    const copy = [...customParams];
                                    copy[index].value = e.target.value;
                                    setCustomParams(copy);
                                  }}
                                  className="w-full bg-white border border-slate-150 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-sky-500 font-bold"
                                />
                              </div>
                              <div className="col-span-3">
                                <input
                                  required
                                  placeholder="Unidad (ej. NTU)"
                                  value={param.unit}
                                  onChange={(e) => {
                                    const copy = [...customParams];
                                    copy[index].unit = e.target.value;
                                    setCustomParams(copy);
                                  }}
                                  className="w-full bg-white border border-slate-150 p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-sky-500 font-bold"
                                />
                              </div>
                              <div className="col-span-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomParams(customParams.filter((_, i) => i !== index));
                                  }}
                                  className="text-rose-500 hover:text-rose-600 transition-colors p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">Haz clic en "Agregar Parámetro" para registrar métricas a tu gusto.</p>
                      )}
                    </div>

                    <button
                      disabled={isSaving}
                      className="w-full bg-sky-500 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-sky-500/20 hover:bg-sky-600 transition-all active:scale-95 mt-6 flex items-center justify-center gap-2"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={18} /> : (editingLog ? 'Guardar Cambios' : 'Registrar Bitácora')}
                    </button>
                  </form>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Detalle / Visualización individual */}
      <AnimatePresence>
        {selectedLogForDetail && (() => {
          let parsedDetNotes: any = {};
          try {
            if (selectedLogForDetail.notes) parsedDetNotes = JSON.parse(selectedLogForDetail.notes);
          } catch (_) {}
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedLogForDetail(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden p-8 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase italic">Detalle de <span className="text-sky-500">Bitácora</span></h2>
                    <p className="text-[9px] font-mono text-slate-400 font-bold uppercase mt-1">Folio: {selectedLogForDetail.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLogForDetail(null)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6 text-slate-700">
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-3">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Datos del Auditor</p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-600">Supervisor:</span>
                      <span className="font-black text-slate-800 uppercase italic">{selectedLogForDetail.supervisor_name}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-600">Fecha y hora:</span>
                      <span className="font-black text-slate-500 italic">
                        {new Date(selectedLogForDetail.created_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Mediciones Registradas</p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100">
                        <span className="text-[9px] font-black uppercase text-sky-600 block">Volumen Agua</span>
                        <span className="text-lg font-black text-slate-800">{selectedLogForDetail.volume_received} L</span>
                      </div>
                      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                        <span className="text-[9px] font-black uppercase text-emerald-600 block">Cloro Residual</span>
                        <span className="text-lg font-black text-slate-800">{selectedLogForDetail.chlorine_dosage} ppm</span>
                      </div>
                      <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                        <span className="text-[9px] font-black uppercase text-purple-600 block">Nivel pH</span>
                        <span className="text-lg font-black text-slate-800">{parsedDetNotes.ph || '7.2'}</span>
                      </div>
                      <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100">
                        <span className="text-[9px] font-black uppercase text-teal-600 block">Sólidos / TDS</span>
                        <span className="text-lg font-black text-slate-800">{parsedDetNotes.tds || '150'} ppm</span>
                      </div>
                    </div>
                  </div>

                  {parsedDetNotes.custom_params && parsedDetNotes.custom_params.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Métricas Adicionales Especiales</p>
                      <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-2">
                        {parsedDetNotes.custom_params.map((p: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-600 uppercase">{p.name || 'Parámetro'}:</span>
                            <span className="font-black text-indigo-600">{p.value} {p.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Mantenimiento & Diagnóstico</p>
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-2 text-xs">
                      <p className="font-bold text-slate-600">Servicio de Mantenimiento:</p>
                      <p className="font-black text-indigo-700 uppercase">{parsedDetNotes.maintenance || 'Ninguno / Operación estándar'}</p>
                      {parsedDetNotes.additional_notes && (
                        <div className="mt-2 pt-2 border-t border-slate-200/55">
                          <p className="font-bold text-slate-500 mb-1">Notas Técnicas Extra:</p>
                          <p className="italic font-mono text-[11px] text-slate-600">"{parsedDetNotes.additional_notes}"</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-100">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLogForDetail(null);
                          handleEditClick(selectedLogForDetail);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleExportSinglePDF(selectedLogForDetail);
                        }}
                        className="bg-indigo-50 border border-indigo-150 text-indigo-600 hover:bg-indigo-100 px-4 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all flex items-center gap-1.5"
                      >
                        <Download size={12} /> PDF Individual
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('¿Eliminar este registro de calidad?')) {
                          handleDeleteLog(selectedLogForDetail.id);
                          setSelectedLogForDetail(null);
                        }
                      }}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Borrar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
