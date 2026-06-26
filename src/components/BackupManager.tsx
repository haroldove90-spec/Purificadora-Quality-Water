import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  Shield, 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  FileText, 
  RefreshCw, 
  Sparkles, 
  Package, 
  Users, 
  Clock, 
  ShieldCheck, 
  Bell, 
  ClipboardList,
  ArrowRight,
  Info,
  Loader2,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { exportToPDF } from '../utils/pdfExport';

interface ModuleConfig {
  id: string;
  tableName: string;
  displayName: string;
  description: string;
  icon: any;
  color: string;
  headersMap: { [key: string]: string }; // Map CSV headers to database columns
}

export default function BackupManager() {
  const [loading, setLoading] = useState<boolean>(true);
  const [counts, setCounts] = useState<{ [key: string]: number }>({});
  const [activeModule, setActiveModule] = useState<string | null>(null);
  
  // Import modal state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [mappedColumns, setMappedColumns] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Configuration for each active module in the app
  const modules: ModuleConfig[] = [
    {
      id: 'orders',
      tableName: 'orders',
      displayName: 'Pedidos y Ventas',
      description: 'Registro histórico de todas las compras, envíos, recojos de agua y estados de entrega.',
      icon: ClipboardList,
      color: 'from-blue-500 to-indigo-600',
      headersMap: {
        'id': 'id',
        'cliente': 'customer_name',
        'customer_name': 'customer_name',
        'nombre': 'customer_name',
        'dirección': 'address',
        'direccion': 'address',
        'artículos': 'items',
        'articulos': 'items',
        'productos': 'items',
        'items': 'items',
        'total': 'total_price',
        'total_price': 'total_price',
        'precio': 'total_price',
        'monto': 'total_price',
        'estado': 'status',
        'estatus': 'status',
        'status': 'status',
        'origen': 'source',
        'source': 'source',
        'repartidor': 'assigned_to_name',
        'assigned_to_name': 'assigned_to_name',
        'repartidor_id': 'assigned_to',
        'assigned_to': 'assigned_to',
        'fecha': 'created_at',
        'created_at': 'created_at'
      }
    },
    {
      id: 'customers',
      tableName: 'customers',
      displayName: 'Directorio de Clientes',
      description: 'Base de datos de clientes registrados, direcciones, teléfonos, niveles y ubicaciones.',
      icon: Users,
      color: 'from-emerald-500 to-teal-600',
      headersMap: {
        'id': 'id',
        'nombre': 'name',
        'name': 'name',
        'cliente': 'name',
        'dirección': 'address',
        'direccion': 'address',
        'teléfono': 'phone',
        'telefono': 'phone',
        'phone': 'phone',
        'nivel': 'tier',
        'categoría': 'tier',
        'categoria': 'tier',
        'tier': 'tier',
        'geolocalización': 'geolocation_url',
        'geolocalizacion': 'geolocation_url',
        'ubicación': 'geolocation_url',
        'ubicacion': 'geolocation_url',
        'geolocation_url': 'geolocation_url',
        'fecha': 'created_at',
        'created_at': 'created_at'
      }
    },
    {
      id: 'products',
      tableName: 'products',
      displayName: 'Catálogo de Productos',
      description: 'Lista de productos (garrafones, botellas), precios y descripciones de la distribuidora.',
      icon: Package,
      color: 'from-amber-500 to-orange-600',
      headersMap: {
        'id': 'id',
        'nombre': 'name',
        'name': 'name',
        'producto': 'name',
        'descripción': 'description',
        'descripcion': 'description',
        'description': 'description',
        'precio': 'price',
        'price': 'price',
        'imagen': 'image_url',
        'image_url': 'image_url',
        'fecha': 'created_at',
        'created_at': 'created_at'
      }
    },
    {
      id: 'daily_attendance',
      tableName: 'daily_attendance',
      displayName: 'Registro de Asistencias',
      description: 'Control de entradas, salidas, descansos de los empleados y aprobaciones del supervisor.',
      icon: Clock,
      color: 'from-sky-500 to-cyan-600',
      headersMap: {
        'id': 'id',
        'usuario_id': 'user_id',
        'user_id': 'user_id',
        'nombre': 'user_name',
        'user_name': 'user_name',
        'empleado': 'user_name',
        'rol': 'user_role',
        'user_role': 'user_role',
        'fecha_trabajo': 'work_date',
        'work_date': 'work_date',
        'fecha': 'work_date',
        'entrada': 'check_in',
        'check_in': 'check_in',
        'inicio_break': 'break_start',
        'break_start': 'break_start',
        'fin_break': 'break_end',
        'break_end': 'break_end',
        'salida': 'check_out',
        'check_out': 'check_out',
        'fecha_registro': 'created_at',
        'created_at': 'created_at'
      }
    },
    {
      id: 'employees',
      tableName: 'employees',
      displayName: 'Directorio de Empleados',
      description: 'Perfiles de repartidores, supervisores y administradores con roles, teléfonos y correos.',
      icon: Users,
      color: 'from-violet-500 to-purple-600',
      headersMap: {
        'id': 'id',
        'auth_id': 'auth_id',
        'nombre': 'name',
        'name': 'name',
        'correo': 'email',
        'email': 'email',
        'rol': 'role',
        'role': 'role',
        'teléfono': 'phone',
        'telefono': 'phone',
        'phone': 'phone',
        'avatar': 'avatar_url',
        'avatar_url': 'avatar_url',
        'estado': 'status',
        'status': 'status',
        'fecha': 'created_at',
        'created_at': 'created_at'
      }
    },
    {
      id: 'quality_logs',
      tableName: 'quality_logs',
      displayName: 'Bitácora de Calidad',
      description: 'Métricas de cloración, volumen recibido y estado de las tuberías capturados por el supervisor.',
      icon: ShieldCheck,
      color: 'from-rose-500 to-pink-600',
      headersMap: {
        'id': 'id',
        'supervisor': 'supervisor_name',
        'supervisor_name': 'supervisor_name',
        'volumen': 'volume_received',
        'volume_received': 'volume_received',
        'cloro': 'chlorine_dosage',
        'chlorine_dosage': 'chlorine_dosage',
        'tubería': 'pipeline_status',
        'tuberia': 'pipeline_status',
        'pipeline_status': 'pipeline_status',
        'notas': 'notes',
        'notes': 'notes',
        'fecha': 'created_at',
        'created_at': 'created_at'
      }
    },
    {
      id: 'notifications_log',
      tableName: 'notifications_log',
      displayName: 'Historial de Alertas',
      description: 'Notificaciones automáticas y alertas enviadas al panel de administración y supervisión.',
      icon: Bell,
      color: 'from-slate-500 to-slate-600',
      headersMap: {
        'id': 'id',
        'título': 'title',
        'titulo': 'title',
        'title': 'title',
        'mensaje': 'message',
        'message': 'message',
        'tipo': 'type',
        'type': 'type',
        'rol_usuario': 'user_role',
        'user_role': 'user_role',
        'leído': 'is_read',
        'leido': 'is_read',
        'is_read': 'is_read',
        'fecha': 'created_at',
        'created_at': 'created_at'
      }
    }
  ];

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    setLoading(true);
    try {
      const newCounts: { [key: string]: number } = {};
      for (const mod of modules) {
        const { count, error } = await supabase
          .from(mod.tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          newCounts[mod.id] = count || 0;
        } else {
          console.error(`Error counting ${mod.tableName}:`, error.message);
          newCounts[mod.id] = 0;
        }
      }
      setCounts(newCounts);
    } catch (e) {
      console.error('Error fetching table counts:', e);
    } finally {
      setLoading(false);
    }
  };

  // EXPORT TO CSV / EXCEL
  const handleExportCSV = async (mod: ModuleConfig) => {
    try {
      const { data, error } = await supabase
        .from(mod.tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        alert(`No hay registros para exportar en el módulo de ${mod.displayName}.`);
        return;
      }

      // Extract all keys/headers from table
      const headers = Object.keys(data[0]);
      
      // Convert rows
      const rows = data.map(row => 
        headers.map(header => {
          let val = row[header];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val).replace(/"/g, '""');
          return String(val).replace(/"/g, '""');
        })
      );

      // Build CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Add UTF-8 BOM so Excel opens accents correctly
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Respaldo_${mod.tableName}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      alert(`Error al exportar: ${e.message}`);
    }
  };

  // EXPORT TO PDF
  const handleExportPDFReport = async (mod: ModuleConfig) => {
    try {
      const { data, error } = await supabase
        .from(mod.tableName)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Limit PDF to last 100 entries for readability

      if (error) throw error;
      if (!data || data.length === 0) {
        alert(`No hay registros para exportar en el módulo de ${mod.displayName}.`);
        return;
      }

      // Dynamic PDF construction based on module columns
      let columns: string[] = [];
      let mappedRows: any[][] = [];

      if (mod.id === 'orders') {
        columns = ['Fecha', 'ID Pedido', 'Cliente', 'Artículos', 'Total', 'Origen', 'Estado'];
        mappedRows = data.map(o => [
          new Date(o.created_at).toLocaleDateString('es-MX'),
          o.id.slice(0, 8).toUpperCase(),
          o.customer_name,
          o.items,
          `$${Number(o.total_price).toFixed(2)}`,
          o.source || 'whatsapp',
          o.status
        ]);
      } else if (mod.id === 'customers') {
        columns = ['Nombre', 'Dirección', 'Teléfono', 'Nivel', 'Fecha Registro'];
        mappedRows = data.map(c => [
          c.name,
          c.address || 'N/D',
          c.phone || 'N/D',
          c.tier || 'frequent',
          new Date(c.created_at).toLocaleDateString('es-MX')
        ]);
      } else if (mod.id === 'products') {
        columns = ['Nombre del Producto', 'Descripción', 'Precio unitario', 'Fecha Registro'];
        mappedRows = data.map(p => [
          p.name,
          p.description || 'Sin descripción',
          `$${Number(p.price).toFixed(2)}`,
          new Date(p.created_at).toLocaleDateString('es-MX')
        ]);
      } else if (mod.id === 'daily_attendance') {
        columns = ['Fecha', 'Empleado', 'Rol', 'Entrada', 'Break Inicio', 'Break Fin', 'Salida'];
        mappedRows = data.map(a => [
          a.work_date,
          a.user_name,
          a.user_role || 'driver',
          a.check_in ? new Date(a.check_in).toLocaleTimeString('es-MX') : 'N/D',
          a.break_start ? new Date(a.break_start).toLocaleTimeString('es-MX') : 'N/D',
          a.break_end ? new Date(a.break_end).toLocaleTimeString('es-MX') : 'N/D',
          a.check_out ? new Date(a.check_out).toLocaleTimeString('es-MX') : 'N/D'
        ]);
      } else if (mod.id === 'employees') {
        columns = ['Nombre', 'Email', 'Teléfono', 'Rol', 'Estatus', 'Fecha Registro'];
        mappedRows = data.map(e => [
          e.name,
          e.email || 'N/D',
          e.phone || 'N/D',
          e.role,
          e.status || 'active',
          new Date(e.created_at).toLocaleDateString('es-MX')
        ]);
      } else if (mod.id === 'quality_logs') {
        columns = ['Fecha', 'Supervisor', 'Vol. Recibido', 'Dosis Cloro', 'Estatus Tuberías', 'Notas'];
        mappedRows = data.map(q => [
          new Date(q.created_at).toLocaleDateString('es-MX'),
          q.supervisor_name,
          `${q.volume_received || 0} L`,
          `${q.chlorine_dosage || 0} ppm`,
          q.pipeline_status || 'ok',
          q.notes || 'Ninguna'
        ]);
      } else {
        // Fallback for general table structure
        columns = Object.keys(data[0]).slice(0, 5); // Take first 5 columns
        mappedRows = data.map(row => columns.map(col => String(row[col])));
      }

      exportToPDF({
        title: `Reporte de Seguridad: ${mod.displayName.toUpperCase()}`,
        subtitle: `Total Registros: ${data.length} | Exportación administrativa de seguridad.`,
        columns,
        data: mappedRows,
        filename: `Reporte_${mod.tableName}`
      });

    } catch (e: any) {
      alert(`Error al exportar reporte PDF: ${e.message}`);
    }
  };

  // CSV PARSING (Supports Quotes, commas and semicolons)
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = '';

    // Detect delimiter: Semicolon is highly common in Excel Spanish regions
    let delimiter = ',';
    const firstLine = text.split('\n')[0];
    if (firstLine.includes(';') && !firstLine.includes(',')) {
      delimiter = ';';
    }

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"'; // Escaped quote
          i++;
        } else {
          inQuotes = !inQuotes; // Toggle quote block
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(currentValue.trim());
        currentValue = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip carriage return linefeed
        }
        row.push(currentValue.trim());
        if (row.length > 0 && row.some(cell => cell !== '')) {
          lines.push(row);
        }
        row = [];
        currentValue = '';
      } else {
        currentValue += char;
      }
    }

    if (currentValue || row.length > 0) {
      row.push(currentValue.trim());
      if (row.some(cell => cell !== '')) {
        lines.push(row);
      }
    }

    return lines;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Por favor selecciona únicamente un archivo de tipo CSV (Valores separados por comas o punto y coma). Excel puede guardar en este formato.');
      return;
    }
    setImportFile(file);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const parsedLines = parseCSV(text);
      if (parsedLines.length < 2) {
        alert('El archivo cargado parece estar vacío o no contiene encabezados.');
        return;
      }

      const csvHeaders = parsedLines[0].map(h => h.toLowerCase().replace(/["'\ufeff]/g, '').trim());
      const csvRows = parsedLines.slice(1);

      // Map rows to Supabase compatible database objects based on active module config
      const targetConfig = modules.find(m => m.id === activeModule);
      if (!targetConfig) return;

      const mappedRecords: any[] = [];
      const columnsFound: string[] = [];

      csvRows.forEach((rowValues) => {
        const record: any = {};
        csvHeaders.forEach((header, index) => {
          const dbFieldName = targetConfig.headersMap[header];
          if (dbFieldName) {
            let val = rowValues[index];
            if (val === undefined || val === '') {
              val = null;
            }
            record[dbFieldName] = val;
            if (!columnsFound.includes(dbFieldName)) {
              columnsFound.push(dbFieldName);
            }
          }
        });

        // Clean values to avoid inserting empty primary keys / auto-generated uuid
        if (record.id && (record.id.trim() === '' || record.id === 'null' || record.id.length < 10)) {
          delete record.id;
        }

        // Parse numerical pricing / volume values
        if (record.total_price !== undefined && record.total_price !== null) {
          record.total_price = parseFloat(String(record.total_price).replace(/[^0-9.]/g, '')) || 0;
        }
        if (record.price !== undefined && record.price !== null) {
          record.price = parseFloat(String(record.price).replace(/[^0-9.]/g, '')) || 0;
        }
        if (record.volume_received !== undefined && record.volume_received !== null) {
          record.volume_received = parseFloat(String(record.volume_received).replace(/[^0-9.]/g, '')) || 0;
        }
        if (record.chlorine_dosage !== undefined && record.chlorine_dosage !== null) {
          record.chlorine_dosage = parseFloat(String(record.chlorine_dosage).replace(/[^0-9.]/g, '')) || 0;
        }
        if (record.is_read !== undefined && record.is_read !== null) {
          record.is_read = String(record.is_read).toLowerCase() === 'true';
        }

        if (Object.keys(record).length > 0) {
          mappedRecords.push(record);
        }
      });

      setParsedData(mappedRecords);
      setMappedColumns(columnsFound);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const triggerImportToDatabase = async () => {
    if (parsedData.length === 0 || !activeModule) return;
    setIsImporting(true);
    setImportStatus(null);

    const targetConfig = modules.find(m => m.id === activeModule);
    if (!targetConfig) {
      setIsImporting(false);
      return;
    }

    try {
      // Chunk inserts for large sets of data to avoid Supabase connection timeouts
      const chunkSize = 100;
      let insertedCount = 0;

      for (let i = 0; i < parsedData.length; i += chunkSize) {
        const chunk = parsedData.slice(i, i + chunkSize);
        
        // Supabase upsert will automatically replace rows if matching ID is found, or insert new ones
        const { error } = await supabase
          .from(targetConfig.tableName)
          .upsert(chunk);

        if (error) throw error;
        insertedCount += chunk.length;
      }

      // Add a notification log about this import
      await supabase.from('notifications_log').insert([{
        title: `📥 Importación Exitosa: ${targetConfig.displayName}`,
        message: `Se importaron/restauraron ${parsedData.length} registros en el módulo de ${targetConfig.displayName} mediante el panel de seguridad de administración.`,
        type: 'system',
        user_role: 'admin'
      }]);

      setImportStatus({
        success: true,
        message: `¡Importación completada! Se procesaron y guardaron ${parsedData.length} registros en la tabla '${targetConfig.tableName}' con éxito.`
      });

      // Clear states & refresh table counts
      setParsedData([]);
      setMappedColumns([]);
      setImportFile(null);
      fetchCounts();
    } catch (e: any) {
      setImportStatus({
        success: false,
        message: `Ocurrió un error al insertar en la base de datos: ${e.message}`
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6" id="backup_manager_module">
      
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden border border-indigo-500/15">
        <div className="absolute right-0 top-0 w-[400px] h-[400px] bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 border border-indigo-400/20">
              <Shield size={12} className="text-indigo-400" /> SEGURIDAD Y RESPALDOS CALIFICADOS
            </span>
            <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight leading-none">
              Respaldo y <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Restauración de Datos</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl font-medium leading-relaxed">
              Exporta toda la información activa de la distribuidora en formatos compatibles con Excel y reportes oficiales en PDF. En caso de emergencias o de borrar registros accidentalmente, puedes volver a cargarlos mapeando sus columnas al instante.
            </p>
          </div>
          <button 
            onClick={fetchCounts}
            className="self-start md:self-center bg-slate-800/80 border border-slate-700/50 text-slate-300 hover:text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 hover:bg-slate-800 flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Sincronizar Tablas
          </button>
        </div>
      </div>

      {/* Grid of Active Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod) => {
          const IconComponent = mod.icon;
          const count = counts[mod.id] !== undefined ? counts[mod.id] : 0;

          return (
            <div 
              key={mod.id} 
              className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm flex flex-col justify-between hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50/20 transition-all duration-300 relative group overflow-hidden"
            >
              <div className="space-y-4">
                {/* Header card info */}
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-2xl bg-gradient-to-tr ${mod.color} text-white shadow-md`}>
                    <IconComponent size={20} />
                  </div>
                  <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full uppercase tracking-wider">
                    {loading ? 'Cargando...' : `${count} registros`}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-black text-sm text-slate-800 uppercase italic tracking-tight">
                    {mod.displayName}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </div>

              {/* Card Actions */}
              <div className="mt-6 pt-5 border-t border-slate-50 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleExportCSV(mod)}
                    disabled={count === 0}
                    className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-50 disabled:pointer-events-none rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-slate-100 cursor-pointer"
                    title="Exportar archivo CSV compatible con Excel"
                  >
                    <Download size={12} className="text-slate-400" /> CSV / Excel
                  </button>
                  <button
                    onClick={() => handleExportPDFReport(mod)}
                    disabled={count === 0}
                    className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-50 disabled:pointer-events-none rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-slate-100 cursor-pointer"
                    title="Exportar reporte de auditoría en formato PDF"
                  >
                    <FileText size={12} className="text-slate-400" /> PDF Oficial
                  </button>
                </div>

                <button
                  onClick={() => {
                    setActiveModule(mod.id);
                    setImportFile(null);
                    setParsedData([]);
                    setMappedColumns([]);
                    setImportStatus(null);
                  }}
                  className="w-full py-3 bg-indigo-50/60 hover:bg-indigo-50 text-indigo-700 hover:text-indigo-800 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 border border-indigo-100/30 cursor-pointer"
                >
                  <Upload size={12} /> Importar / Restaurar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety & Import Modal Dialog */}
      <AnimatePresence>
        {activeModule && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isImporting) setActiveModule(null);
              }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-2xl bg-white rounded-[40px] shadow-2xl z-[201] p-6 md:p-8 space-y-6 border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4 text-indigo-900">
                  <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-md">
                    <Upload size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black uppercase italic leading-none">
                      Importar Datos a {modules.find(m => m.id === activeModule)?.displayName}
                    </h3>
                    <p className="text-[10px] font-black text-indigo-400 tracking-wider uppercase mt-1">
                      Asistente de Restauración y Carga de Archivos
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModule(null)}
                  disabled={isImporting}
                  className="p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Guide Warning */}
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-amber-800 tracking-wide">Pautas importantes de restauración:</p>
                  <p className="text-[10px] text-amber-700/95 font-medium leading-relaxed">
                    Sube un archivo <strong>.csv</strong>. Si el registro cuenta con un ID existente, se <strong>sobreescribirá/actualizará</strong> en la base de datos para evitar duplicados. Si el ID no está presente, se creará uno nuevo automáticamente. Las columnas se detectarán según su encabezado en español o inglés.
                  </p>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              {!importFile && (
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 transition-all duration-200 min-h-[220px] cursor-pointer ${
                    dragActive 
                      ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' 
                      : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50/40'
                  }`}
                >
                  <input 
                    type="file" 
                    id="csv-file-input" 
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center gap-3">
                    <div className="p-4 bg-slate-50 rounded-full text-slate-400 group-hover:scale-105 transition-transform">
                      <Database size={32} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-black text-xs uppercase tracking-wider text-slate-700">Arrastra tu archivo CSV aquí</p>
                      <p className="text-[10px] text-slate-400 font-bold">o haz click para buscar en tu computadora (.csv)</p>
                    </div>
                  </label>
                </div>
              )}

              {/* Parsed Preview State */}
              {importFile && parsedData.length > 0 && (
                <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 flex-wrap gap-2">
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-slate-700 uppercase">Archivo Cargado:</p>
                      <p className="text-[10px] font-mono text-slate-500">{importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 font-black text-[9px] uppercase">
                        {parsedData.length} Filas Encontradas
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Columnas Mapeadas con Éxito:</p>
                    <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                      {mappedColumns.map(col => (
                        <span key={col} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-mono font-bold uppercase">
                          {col}
                        </span>
                      ))}
                      {mappedColumns.length === 0 && (
                        <span className="text-[10px] text-rose-500 font-bold">No se detectó ninguna columna conocida. Revisa los encabezados.</span>
                      )}
                    </div>
                  </div>

                  {/* Tiny Table Preview of parsed rows */}
                  <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl scrollbar-thin">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[8px] tracking-widest border-b border-slate-100 sticky top-0">
                        <tr>
                          {mappedColumns.slice(0, 4).map(col => (
                            <th key={col} className="px-4 py-3">{col}</th>
                          ))}
                          {mappedColumns.length > 4 && <th className="px-4 py-3">...</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-medium text-slate-600">
                        {parsedData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30">
                            {mappedColumns.slice(0, 4).map(col => (
                              <td key={col} className="px-4 py-2.5 truncate max-w-[120px]" title={row[col]}>
                                {row[col] !== null ? String(row[col]) : <span className="text-slate-350 italic">nulo</span>}
                              </td>
                            ))}
                            {mappedColumns.length > 4 && <td className="px-4 py-2.5 text-slate-400">...</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedData.length > 5 && (
                    <p className="text-[9px] text-slate-400 font-bold italic text-center">Mostrando las primeras 5 filas de vista previa</p>
                  )}
                </div>
              )}

              {/* Feedback Status */}
              {importStatus && (
                <div className={`p-4 rounded-2xl border ${
                  importStatus.success 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                    : 'bg-rose-50 border-rose-100 text-rose-800'
                } flex gap-3`}>
                  {importStatus.success ? <CheckCircle size={20} className="flex-shrink-0" /> : <AlertCircle size={20} className="flex-shrink-0" />}
                  <div className="space-y-0.5">
                    <p className="text-xs font-black uppercase tracking-wide">
                      {importStatus.success ? 'Proceso Exitoso' : 'Fallo de Importación'}
                    </p>
                    <p className="text-[11px] font-medium leading-relaxed">{importStatus.message}</p>
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setImportFile(null);
                    setParsedData([]);
                    setMappedColumns([]);
                    setImportStatus(null);
                  }}
                  disabled={isImporting || !importFile}
                  className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Limpiar Archivo
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => setActiveModule(null)}
                  disabled={isImporting}
                  className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Cerrar
                </button>
                {importFile && parsedData.length > 0 && !importStatus?.success && (
                  <button
                    onClick={triggerImportToDatabase}
                    disabled={isImporting || mappedColumns.length === 0}
                    className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Restaurando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} />
                        <span>Confirmar e Importar de Inmediato 🚀</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
