import React, { useState, useEffect } from 'react';
import { exportToPDF } from '../utils/pdfExport';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabaseClient';
import { namesMatch, normalizeEmployeeName } from '../utils/nameHelper';
import { getOrderRoute } from '../utils/routeHelper';
import { 
  DollarSign, 
  TrendingUp, 
  Download, 
  AlertCircle, 
  Truck, 
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  PieChart as PieChartIcon,
  Users,
  ShoppingBag,
  History,
  Store,
  ChevronRight,
  MoreVertical,
  Plus,
  ShieldCheck,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Loader2,
  Trash2,
  Edit3,
  Award
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const SALES_DATA = [
  { day: 'Lun', sales: 4500, orders: 42 },
  { day: 'Mar', sales: 5200, orders: 48 },
  { day: 'Mie', sales: 4800, orders: 45 },
  { day: 'Jue', sales: 6100, orders: 55 },
  { day: 'Vie', sales: 5900, orders: 53 },
  { day: 'Sab', sales: 7200, orders: 65 },
  { day: 'Dom', sales: 4000, orders: 38 },
];

const CHANNEL_DATA = [
  { name: 'WhatsApp', value: 45, color: '#0ea5e9' },
  { name: 'Ruta 1 (Norte)', value: 25, color: '#6366f1' },
  { name: 'Ruta 2 (Sur)', value: 20, color: '#8b5cf6' },
  { name: 'Mostrador', value: 10, color: '#f43f5e' },
];

const GLOBAL_SALES = [
  { id: 'T-9821', customer: 'Abarrotes Doña Mari', amount: 450, method: 'Efectivo', time: '14:20', items: '10 Garrafones' },
  { id: 'T-9822', customer: 'Residencial Latitud', amount: 1250, method: 'Transferencia', time: '14:45', items: '25 Garrafones' },
  { id: 'T-9823', customer: 'Gimnasio Sport City', amount: 360, method: 'Efectivo', time: '15:10', items: '8 Garrafones' },
  { id: 'T-9824', customer: 'Venta Mostrador', amount: 90, method: 'Efectivo', time: '15:30', items: '2 Garrafones' },
  { id: 'T-9825', customer: 'Oficinas BBVA', amount: 2400, method: 'Transferencia', time: '16:00', items: '50 Garrafones' },
];

const SELLER_PERFORMANCE = [
  { name: 'Carlos Ruiz', sales: 8420, orders: 24, efficiency: '98%', status: 'active' },
  { name: 'Mario Santos', sales: 7150, orders: 19, efficiency: '94%', status: 'active' },
  { name: 'Ana Lopez', sales: 4200, orders: 12, efficiency: '100%', status: 'on_break' },
];

const CLIENT_MANAGEMENT = [
  { id: 'C1', name: 'Residencial Latitud', neighborhood: 'Santa Fe', tier: 'VIP', totalOrders: 145, lastActivity: 'Hoy' },
  { id: 'C2', name: 'Abarrotes Doña Mari', neighborhood: 'Polanco', tier: 'Frecuente', totalOrders: 82, lastActivity: 'Ayer' },
  { id: 'C3', name: 'Gimnasio Sport City', neighborhood: 'Roma Norte', tier: 'Frecuente', totalOrders: 45, lastActivity: 'Hace 3 días' },
  { id: 'C4', name: 'Oficinas BBVA', neighborhood: 'Juarez', tier: 'VIP', totalOrders: 12, lastActivity: 'Hoy' },
];

type Tab = 'metrics' | 'sales' | 'customers' | 'driver_sales' | 'plant_cut' | 'employee_sales';

interface FinancesProps {
  initialTab?: Tab;
  userRole: string | null;
  userName?: string | null;
}

export default function Finances({ initialTab = 'metrics', userRole, userName }: FinancesProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [isExporting, setIsExporting] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  // Control de Adeudos (Cuentas por cobrar)
  const [debtCustomer, setDebtCustomer] = useState<any | null>(null);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [processingPayment, setProcessingPayment] = useState(false);

  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [isFinalizingCut, setIsFinalizingCut] = useState(false);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesSearch, setSalesSearch] = useState('');
  const [metricsSearch, setMetricsSearch] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [customerFilter, setCustomerFilter] = useState('');

  // Estados para Ventas por Empleado
  const [empSalesSearch, setEmpSalesSearch] = useState('');
  const [empSalesRoleFilter, setEmpSalesRoleFilter] = useState<string>('all');
  const [selectedEmployeeForSales, setSelectedEmployeeForSales] = useState<any | null>(null);

  // Master scope filter for admin: 'all' (unified/global), 'plant' (planta), 'drivers' (repartidores)
  const [adminSalesScope, setAdminSalesScope] = useState<'all' | 'plant' | 'drivers'>('all');
  const [timePeriod, setTimePeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');

  const filterByTimePeriod = (list: any[]) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 1);
    monthStart.setHours(0, 0, 0, 0);

    return list.filter(sale => {
      if (!sale.created_at) return true;
      const saleDate = new Date(sale.created_at);
      
      if (timePeriod === 'today') {
        const dStr = saleDate.toISOString().split('T')[0];
        return dStr === todayStr;
      }
      if (timePeriod === 'week') {
        return saleDate >= weekStart;
      }
      if (timePeriod === 'month') {
        return saleDate >= monthStart;
      }
      return true; // 'all'
    });
  };

  const isPlantSale = (sale: any) => {
    if (!sale) return true;
    const nameLower = (sale.assigned_to_name || '').toLowerCase();
    
    // If assigned to an actual driver, it is NOT a plant sale
    if (nameLower && 
        !nameLower.includes('mostrador') && 
        !nameLower.includes('planta') && 
        !nameLower.includes('operador') &&
        !nameLower.includes('whatsapp') &&
        !nameLower.includes('teléfono') &&
        !nameLower.includes('llamada')) {
      return false;
    }
    
    // If address is specifically labeled Planta or Mostrador, it is a plant sale
    if (sale.address) {
      const addressLower = sale.address.toLowerCase();
      if (addressLower.includes('planta') || addressLower.includes('mostrador')) {
        return true;
      }
    }
    
    // If it has no assigned driver, but is local/pos source, it is plant/mostrador
    if (!sale.assigned_to_name && (sale.source === 'pos' || sale.source === 'local')) {
      return true;
    }
    
    return true;
  };

  const getScopedSalesList = () => {
    let list = salesList;
    if (userRole === 'admin' || userRole === 'supervisor') {
      if (adminSalesScope === 'plant') {
        list = salesList.filter(s => isPlantSale(s));
      } else if (adminSalesScope === 'drivers') {
        list = salesList.filter(s => !isPlantSale(s));
      }
    }
    list = filterByTimePeriod(list);

    const query = activeTab === 'metrics' ? metricsSearch : (activeTab === 'sales' ? salesSearch : '');
    if (query.trim()) {
      const q = norm(query);
      list = list.filter(sale => {
        const route = getOrderRoute(sale);
        const routeNorm = norm(route);
        const nameNorm = norm(sale.assigned_to_name || '');
        const custNorm = norm(sale.customer_name || '');
        const itemsNorm = norm(sale.items || '');
        const addressNorm = norm(sale.address || '');
        const payNorm = norm(sale.payment_method || '');
        const sourceNorm = norm(sale.source || '');
        
        // Smart match for routes
        if (q === 'ruta 1' || q === 'ruta1' || q === 'santa cruz') {
          return route === '1.- Santa Cruz';
        }
        if (q === 'ruta 2' || q === 'ruta2' || q === 'san miguel' || q === 'centro') {
          return route === '2.- San Miguel-Centro';
        }
        if (q === 'ruta 3' || q === 'ruta3' || q === 'la francia' || q === 'reyes' || q === 'los reyes') {
          return route === '3.- La Francia-Los Reyes';
        }
        if (q === 'ruta 4' || q === 'ruta4' || q === 'planta' || q === 'mostrador' || q === 'local') {
          return route === '4.- Planta o Local';
        }
        if (q === 'ruta 5' || q === 'ruta5' || q === 'telefono' || q === 'llamadas' || q === 'llamada') {
          return route === '5.- Llamadas Telefónicas';
        }
        if (q === 'ruta 6' || q === 'ruta6' || q === 'whats' || q === 'whatsapp') {
          return route === '6.- WhatsApp';
        }
        
        return (
          routeNorm.includes(q) ||
          nameNorm.includes(q) ||
          custNorm.includes(q) ||
          itemsNorm.includes(q) ||
          addressNorm.includes(q) ||
          payNorm.includes(q) ||
          sourceNorm.includes(q)
        );
      });
    }
    return list;
  };

  // States for quick dispatch quantities by bottle type
  const [dispatchRosa, setDispatchRosa] = useState<number>(0);
  const [dispatchAzul, setDispatchAzul] = useState<number>(20);
  const [dispatchColor, setDispatchColor] = useState<number>(0);
  const [dispatchPequeno, setDispatchPequeno] = useState<number>(0);
  const [dispatchLavar, setDispatchLavar] = useState<number>(0);
  const [dispatchDriver, setDispatchDriver] = useState<string>('');
  const [dispatchRoute, setDispatchRoute] = useState<string>('1.- Santa Cruz');

  // States for other modules' records under Metrics
  const [metricsAttendance, setMetricsAttendance] = useState<any[]>([]);
  const [metricsQualityLogs, setMetricsQualityLogs] = useState<any[]>([]);
  const [metricsProducts, setMetricsProducts] = useState<any[]>([]);

  // States for today's attendances and editing trips (requested by user to edit trips/routes)
  const [todayAttendances, setTodayAttendances] = useState<any[]>([]);
  const [editingTrip, setEditingTrip] = useState<any | null>(null);
  const [editTripDriver, setEditTripDriver] = useState<string>('');
  const [editTripRoute, setEditTripRoute] = useState<string>('');
  const [editTripRosa, setEditTripRosa] = useState<number>(0);
  const [editTripAzul, setEditTripAzul] = useState<number>(0);
  const [editTripColor, setEditTripColor] = useState<number>(0);
  const [editTripPequeno, setEditTripPequeno] = useState<number>(0);
  const [editTripLavar, setEditTripLavar] = useState<number>(0);
  const [editTripStatus, setEditTripStatus] = useState<string>('active');

  const parseJsonObj = (val: any) => {
    if (!val) return {};
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch (_) {
        return {};
      }
    }
    return val;
  };

  const fetchTodayAttendance = async () => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const { data, error } = await supabase
      .from('daily_attendance')
      .select('*')
      .eq('work_date', todayStr);
    if (!error && data) {
      setTodayAttendances(data);
    }
  };

  const handleStartEditTrip = (trip: any) => {
    setEditingTrip(trip);
    setEditTripDriver(trip.driverName);
    setEditTripRoute(trip.assigned_route || '1.- Santa Cruz');
    setEditTripRosa(trip.loaded_qty_rosa || 0);
    setEditTripAzul(trip.loaded_qty_azul || 0);
    setEditTripColor(trip.loaded_qty_color || 0);
    setEditTripPequeno(trip.loaded_qty_pequeno || 0);
    setEditTripLavar(trip.loaded_qty_lavar || 0);
    setEditTripStatus(trip.status || 'active');
  };

  const handleSaveTripEdit = async () => {
    if (!editingTrip) return;
    try {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const totalQty = Number(editTripRosa) + Number(editTripAzul) + Number(editTripColor) + Number(editTripPequeno) + Number(editTripLavar);

      // 1. Fetch original attendance record
      const { data: origAttData, error: origErr } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('work_date', todayStr);

      if (origErr) throw origErr;

      const originalAttendance = (origAttData || []).find(a => {
        const n1 = a.user_name.toLowerCase().trim();
        const n2 = editingTrip.driverName.toLowerCase().trim();
        return n1 === n2 || n1.includes(n2) || n2.includes(n1);
      });

      if (!originalAttendance) {
        alert('Error: No se encontró el registro de asistencia del repartidor original.');
        return;
      }

      const origLocation = parseJsonObj(originalAttendance.last_location);
      const origTrips = origLocation.trips || [];
      const origTripIndex = origTrips.findIndex((t: any) => t.id === editingTrip.id);

      if (origTripIndex === -1) {
        alert('Error: No se encontró el viaje original en el registro.');
        return;
      }

      // Check if driver was changed
      const isDriverChanged = editTripDriver.toLowerCase().trim() !== editingTrip.driverName.toLowerCase().trim();

      // Create updated trip object
      const updatedTrip = {
        ...origTrips[origTripIndex],
        assigned_route: editTripRoute,
        loaded_qty: totalQty,
        loaded_qty_rosa: Number(editTripRosa),
        loaded_qty_azul: Number(editTripAzul),
        loaded_qty_color: Number(editTripColor),
        loaded_qty_pequeno: Number(editTripPequeno),
        loaded_qty_lavar: Number(editTripLavar),
        status: editTripStatus
      };

      if (!isDriverChanged) {
        // Just update in the same record
        origTrips[origTripIndex] = updatedTrip;
        const updatedLocation = {
          ...origLocation,
          trips: origTrips
        };

        const { error: saveErr } = await supabase
          .from('daily_attendance')
          .update({ last_location: updatedLocation })
          .eq('id', originalAttendance.id);

        if (saveErr) throw saveErr;
      } else {
        // Moving trip to another driver
        // A. Remove trip from original driver
        origTrips.splice(origTripIndex, 1);
        const updatedOrigLocation = {
          ...origLocation,
          trips: origTrips
        };

        const { error: saveOrigErr } = await supabase
          .from('daily_attendance')
          .update({ last_location: updatedOrigLocation })
          .eq('id', originalAttendance.id);

        if (saveOrigErr) throw saveOrigErr;

        // B. Fetch or create target driver's attendance record
        const targetAttendance = (origAttData || []).find(a => {
          const n1 = a.user_name.toLowerCase().trim();
          const n2 = editTripDriver.toLowerCase().trim();
          return n1 === n2 || n1.includes(n2) || n2.includes(n1);
        });

        let targetLocation: any = {};
        let targetTrips: any[] = [];

        if (targetAttendance) {
          targetLocation = parseJsonObj(targetAttendance.last_location);
          targetTrips = targetLocation.trips || [];
        }

        // Adjust trip number for target driver
        const targetTripWithNewNumber = {
          ...updatedTrip,
          trip_number: targetTrips.length + 1
        };

        targetTrips.push(targetTripWithNewNumber);
        const updatedTargetLocation = {
          ...targetLocation,
          trips: targetTrips
        };

        const { error: saveTargetErr } = await supabase
          .from('daily_attendance')
          .upsert({
            ...(targetAttendance || {}),
            user_name: editTripDriver,
            work_date: todayStr,
            user_role: 'driver',
            last_location: updatedTargetLocation,
            check_in: targetAttendance?.check_in || new Date().toISOString()
          }, { onConflict: 'user_name, work_date' });

        if (saveTargetErr) throw saveTargetErr;
      }

      // Log notification
      await supabase.from('notifications_log').insert([{
        title: '🚚 Viaje / Ruta Modificado',
        message: `El administrador/supervisor modificó el viaje #${editingTrip.trip_number} de ${editingTrip.driverName}. Nueva Ruta: ${editTripRoute}. Nueva carga: ${totalQty} g.`,
        created_at: new Date().toISOString(),
        is_read: false
      }]);

      alert('¡Viaje editado con éxito!');
      setEditingTrip(null);
      await fetchTodayAttendance();
      await fetchSales();
    } catch (e: any) {
      alert('Error al guardar cambios: ' + e.message);
    }
  };

  const calculateTotalVolume = () => {
    let total = 0;
    const scopedList = getScopedSalesList();
    const list = scopedList.length > 0 ? scopedList : GLOBAL_SALES;
    list.forEach(sale => {
      const match = (sale.items || '').match(/(\d+)\s*(garrafón|garrafon|garrafones|garr|pza|pzas|L|l|envase|botella)/i);
      if (match) {
        total += parseInt(match[1]);
      } else {
        const nums = (sale.items || '').match(/\d+/g);
        if (nums) {
          nums.forEach(n => { total += parseInt(n); });
        }
      }
    });
    return total || 1240;
  };

  const calculateVentasHoy = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const scopedList = getScopedSalesList();
    const todaySales = scopedList.filter(s => {
      const dStr = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '';
      return dStr === todayStr;
    });
    
    const total = todaySales.reduce((acc, s) => acc + Number(s.total_price || s.amount || 0), 0);
    if (total === 0 && scopedList.length > 0) {
      return scopedList.reduce((acc, s) => acc + Number(s.total_price || s.amount || 0), 0);
    }
    return total || 14580;
  };

  const calculateTicketPromedio = () => {
    const scopedList = getScopedSalesList();
    const list = scopedList.length > 0 ? scopedList : GLOBAL_SALES;
    const total = list.reduce((acc, s) => acc + Number(s.total_price || s.amount || 0), 0);
    return Math.round(total / list.length) || 240;
  };

  const calculateTotalCustomers = () => {
    return customersList.length || CLIENT_MANAGEMENT.length;
  };

  const getDynamicSalesData = () => {
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return {
        dateStr: d.toISOString().split('T')[0],
        dayLabel: daysOfWeek[d.getDay()],
        sales: 0
      };
    }).reverse();

    const scopedList = getScopedSalesList();
    if (scopedList.length > 0) {
      scopedList.forEach(sale => {
        const saleDateStr = sale.created_at ? new Date(sale.created_at).toISOString().split('T')[0] : '';
        const foundDay = last7Days.find(d => d.dateStr === saleDateStr);
        if (foundDay) {
          foundDay.sales += Number(sale.total_price || sale.amount || 0);
        }
      });
      const hasData = last7Days.some(d => d.sales > 0);
      if (hasData) {
        return last7Days.map(d => ({
          day: d.dayLabel,
          sales: d.sales
        }));
      }
    }
    return SALES_DATA;
  };

  const getDynamicChannelData = () => {
    let whatsappCount = 0;
    let posCount = 0;
    let phoneCount = 0;
    const scopedList = getScopedSalesList();
    const total = scopedList.length;

    if (total === 0) return CHANNEL_DATA;

    scopedList.forEach(s => {
      const src = (s.source || '').toLowerCase();
      if (src === 'whatsapp') whatsappCount++;
      else if (src === 'pos' || src === 'local' || src === 'physical') posCount++;
      else phoneCount++;
    });

    const list = [
      { name: 'WhatsApp', value: Math.round((whatsappCount / total) * 100) || 0, color: '#0ea5e9' },
      { name: 'Mostrador/POS', value: Math.round((posCount / total) * 100) || 0, color: '#f43f5e' },
      { name: 'Teléfono', value: Math.round((phoneCount / total) * 100) || 0, color: '#8b5cf6' },
    ].filter(c => c.value > 0);

    return list.length > 0 ? list : CHANNEL_DATA;
  };

  const getPlantAndFieldSalesToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const list = getScopedSalesList();
    const activeSales = timePeriod === 'today' 
      ? list.filter(s => {
          const dStr = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '';
          return dStr === todayStr;
        })
      : list;

    let plantSalesTotal = 0;
    let plantSalesCount = 0;
    let fieldSalesTotal = 0;
    let fieldSalesCount = 0;

    const employeePlantBreakdown: Record<string, { total: number; count: number }> = {};

    activeSales.forEach(s => {
      const isPlant = isPlantSale(s);
      
      const amount = Number(s.total_price || s.amount || 0);

      if (isPlant) {
        plantSalesTotal += amount;
        plantSalesCount++;

        let empName = s.assigned_to_name || 'Mostrador';
        if (empName.endsWith(' (Planta)')) {
          empName = empName.replace(' (Planta)', '');
        }
        if (!employeePlantBreakdown[empName]) {
          employeePlantBreakdown[empName] = { total: 0, count: 0 };
        }
        employeePlantBreakdown[empName].total += amount;
        employeePlantBreakdown[empName].count++;
      } else {
        fieldSalesTotal += amount;
        fieldSalesCount++;
      }
    });

    return {
      plantSalesTotal,
      plantSalesCount,
      fieldSalesTotal,
      fieldSalesCount,
      employeePlantBreakdown
    };
  };

  const getRouteMetricsForPeriod = () => {
    const listForPeriod = getScopedSalesList();

    let santaCruzTotal = 0;
    let santaCruzCount = 0;
    let sanMiguelTotal = 0;
    let sanMiguelCount = 0;
    let laFranciaTotal = 0;
    let laFranciaCount = 0;
    let plantaTotal = 0;
    let plantaCount = 0;
    let llamadasTotal = 0;
    let llamadasCount = 0;
    let whatsappTotal = 0;
    let whatsappCount = 0;

    listForPeriod.forEach(s => {
      const route = getOrderRoute(s);
      const amount = Number(s.total_price || s.amount || 0);

      if (route === '1.- Santa Cruz') {
        santaCruzTotal += amount;
        santaCruzCount++;
      } else if (route === '2.- San Miguel-Centro') {
        sanMiguelTotal += amount;
        sanMiguelCount++;
      } else if (route === '3.- La Francia-Los Reyes') {
        laFranciaTotal += amount;
        laFranciaCount++;
      } else if (route === '4.- Planta o Local') {
        plantaTotal += amount;
        plantaCount++;
      } else if (route === '5.- Llamadas Telefónicas') {
        llamadasTotal += amount;
        llamadasCount++;
      } else if (route === '6.- WhatsApp') {
        whatsappTotal += amount;
        whatsappCount++;
      } else {
        plantaTotal += amount;
        plantaCount++;
      }
    });

    const totalSales = listForPeriod.reduce((acc, s) => acc + Number(s.total_price || s.amount || 0), 0);

    return {
      santaCruzTotal,
      santaCruzCount,
      sanMiguelTotal,
      sanMiguelCount,
      laFranciaTotal,
      laFranciaCount,
      plantaTotal,
      plantaCount,
      llamadasTotal,
      llamadasCount,
      whatsappTotal,
      whatsappCount,
      totalSales,
      totalCount: listForPeriod.length
    };
  };

  const getPlantSalesToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const plantSales = salesList.filter(s => {
      const dStr = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '';
      const isToday = dStr === todayStr;
      const isPlant = !s.assigned_to_name || 
                      namesMatch(s.assigned_to_name, 'Mostrador') || 
                      s.assigned_to_name.toLowerCase().includes('planta') ||
                      s.source === 'local' || 
                      s.source === 'pos' || 
                      s.source === 'whatsapp' ||
                      (s.address && s.address.toLowerCase().includes('planta'));
      return isToday && isPlant;
    });

    const totalRevenue = plantSales.reduce((acc, s) => acc + Number(s.total_price || s.amount || 0), 0);
    
    let counterTotal = 0;
    let whatsappTotal = 0;
    let llenados = 0;
    let envasesNuevos = 0;

    plantSales.forEach(s => {
      const price = Number(s.total_price || s.amount || 0);
      const isWA = s.source === 'whatsapp' || 
                   (s.address && s.address.toLowerCase().includes('whatsapp')) ||
                   (s.assigned_to_name && s.assigned_to_name.toLowerCase().includes('whatsapp'));
      if (isWA) {
        whatsappTotal += price;
      } else {
        counterTotal += price;
      }

      const items = (s.items || '').toLowerCase();
      
      const llenadosMatch = items.match(/(\d+)\s*(llenado|refill|garrafon\s*vacio|garrafón)/gi);
      if (llenadosMatch) {
        llenadosMatch.forEach(m => {
          const num = m.match(/\d+/);
          if (num) llenados += parseInt(num[0]);
        });
      } else {
        const nums = items.match(/\d+/g);
        if (nums && items.includes('llenado')) {
          nums.forEach(n => { llenados += parseInt(n); });
        }
      }

      const envasesMatch = items.match(/(\d+)\s*(envase|nuevo|botella)/gi);
      if (envasesMatch) {
        envasesMatch.forEach(m => {
          const num = m.match(/\d+/);
          if (num) envasesNuevos += parseInt(num[0]);
        });
      } else {
        const nums = items.match(/\d+/g);
        if (nums && (items.includes('nuevo') || items.includes('envase'))) {
          nums.forEach(n => { envasesNuevos += parseInt(n); });
        }
      }
    });

    return {
      totalRevenue: totalRevenue,
      counterTotal: counterTotal,
      whatsappTotal: whatsappTotal,
      totalCount: plantSales.length,
      llenados: llenados,
      envasesNuevos: envasesNuevos
    };
  };

  const norm = (s?: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

  const getCustomerDebt = (clientName: string) => {
    if (!clientName) return 0;
    const matched = salesList.filter(s => 
      s.status === 'pending_payment' && 
      s.customer_name && 
      namesMatch(s.customer_name, clientName)
    );
    return matched.reduce((acc, order) => acc + (Number(order.total_price) || 0), 0);
  };

  const getCustomerDebtOrders = (clientName: string) => {
    if (!clientName) return [];
    return salesList
      .filter(s => s.status === 'pending_payment' && s.customer_name && namesMatch(s.customer_name, clientName))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  const handleApplyDebtPayment = async () => {
    if (!debtCustomer) return;
    setProcessingPayment(true);
    try {
      const debtOrders = getCustomerDebtOrders(debtCustomer.name);
      let remainingPayment = Number(paymentAmount);
      
      if (remainingPayment <= 0) {
        alert('Por favor introduce un monto de pago válido.');
        setProcessingPayment(false);
        return;
      }

      for (const order of debtOrders) {
        if (remainingPayment <= 0) break;

        const orderTotal = Number(order.total_price || 0);

        if (remainingPayment >= orderTotal) {
          const { error } = await supabase
            .from('orders')
            .update({
              status: 'delivered',
              items: `${order.items} [ADEUDO LIQUIDADO]`
            })
            .eq('id', order.id);
          
          if (error) throw error;
          remainingPayment -= orderTotal;
        } else {
          const { error: updateErr } = await supabase
            .from('orders')
            .update({
              status: 'delivered',
              total_price: remainingPayment,
              items: `${order.items} [ADEUDO PARCIALMENTE RECAUDADO]`
            })
            .eq('id', order.id);
            
          if (updateErr) throw updateErr;

          const remainder = orderTotal - remainingPayment;
          const { error: insertErr } = await supabase
            .from('orders')
            .insert([
              {
                customer_name: order.customer_name,
                address: order.address,
                items: `${order.items} [SALDO RESTANTE DEL ADEUDO]`,
                total_price: remainder,
                status: 'pending_payment',
                source: order.source || 'pos',
                assigned_to: order.assigned_to,
                assigned_to_name: order.assigned_to_name,
                created_at: new Date().toISOString()
              }
            ]);

          if (insertErr) throw insertErr;
          
          remainingPayment = 0;
        }
      }

      alert('¡Pago registrado con éxito! El saldo del cliente ha sido actualizado en el historial.');
      await fetchSales();
      setShowDebtModal(false);
      setDebtCustomer(null);
    } catch (err: any) {
      console.error('Error applying debt payment:', err);
      alert('Error al aplicar el pago: ' + err.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const getFilteredCustomers = () => {
    let list = customersList.length > 0 ? customersList : CLIENT_MANAGEMENT;
    if (customerFilter.trim()) {
      const q = norm(customerFilter);
      list = list.filter(c => 
        norm(c.name).includes(q) || 
        norm(c.alias).includes(q) || 
        norm(c.address || c.neighborhood).includes(q) || 
        norm(c.phone).includes(q)
      );
    }
    return list;
  };

  const getFilteredSales = () => {
    let list = salesList;

    // Filter by role if not admin
    if (userRole === 'driver' && userName) {
      list = list.filter(sale => namesMatch(sale.assigned_to_name, userName));
    } else if (userRole === 'operator') {
      // Operator (Planta) roles see counter sales (Mostrador/POS) or general plant sales
      list = list.filter(sale => 
        !sale.assigned_to_name || 
        namesMatch(sale.assigned_to_name, 'Mostrador') || 
        sale.source === 'local' || 
        sale.source === 'pos'
      );
    }

    // Filter by search query
    if (salesSearch.trim()) {
      const q = norm(salesSearch);
      list = list.filter(sale => 
        norm(sale.id).includes(q) || 
        norm(sale.customer_name).includes(q) || 
        norm(sale.items).includes(q) ||
        norm(sale.assigned_to_name).includes(q)
      );
    }

    return list;
  };

  useEffect(() => {
    setActiveTab(initialTab);
    
    fetchSales();
    fetchCustomers();
    fetchEmployees();

    const salesChannel = supabase
      .channel('sales_sync_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchSales();
      })
      .subscribe();

    const customersChannel = supabase
      .channel('customers_sync_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
         fetchCustomers();
      })
      .subscribe();

    const employeesChannel = supabase
      .channel('employees_sync_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        fetchEmployees();
      })
      .subscribe();

    const attendanceChannel = supabase
      .channel('attendance_sync_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_attendance' }, () => {
        fetchTodayAttendance();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(customersChannel);
      supabase.removeChannel(employeesChannel);
      supabase.removeChannel(attendanceChannel);
    };
  }, [initialTab, activeTab]);

  const fetchSales = async () => {
    setLoadingSales(true);
    try {
      fetchTodayAttendance();
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['delivered', 'pending_payment'])
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        if (userRole === 'operator') {
          const operatorSales = data.filter((s: any) => 
            s.source === 'pos' || 
            s.source === 'local' ||
            s.source === 'whatsapp' ||
            (s.address && s.address.includes(' | Planta')) ||
            !s.assigned_to_name ||
            s.assigned_to_name.includes('Mostrador') ||
            s.assigned_to_name.includes('Planta')
          );
          setSalesList(operatorSales);
        } else {
          setSalesList(data);
        }
      }

      // Fetch other modules' records for Metrics
      const { data: attData } = await supabase
        .from('daily_attendance')
        .select('*')
        .order('work_date', { ascending: false })
        .limit(20);
      if (attData) setMetricsAttendance(attData);

      const { data: qlData } = await supabase
        .from('quality_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (qlData) setMetricsQualityLogs(qlData);

      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      if (prodData) setMetricsProducts(prodData);

    } catch (err) {
      console.warn('Error fetching sales:', err);
    } finally {
      setLoadingSales(false);
    }
  };

  const handleAddDriverTrip = async (
    employeeName: string, 
    loadedQty: number,
    details?: {
      rosa?: number;
      azul?: number;
      deColor?: number;
      pequeno?: number;
      lavar?: number;
    },
    routeParam?: string
  ) => {
    const today = new Date().toLocaleDateString('en-CA');
    try {
      const { data: todayAtt } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('work_date', today);

      const existing = (todayAtt || []).find(a => {
        const n1 = a.user_name.toLowerCase().trim();
        const n2 = employeeName.toLowerCase().trim();
        return n1 === n2 || n1.includes(n2) || n2.includes(n1);
      });
      
      let existingLocation: any = {};
      if (existing) {
        if (existing.last_location) {
          try {
            existingLocation = typeof existing.last_location === 'string' 
              ? JSON.parse(existing.last_location) 
              : existing.last_location;
          } catch (e) {
            existingLocation = {};
          }
        }
      }

      const trips = existingLocation.trips || [];
      const hasActiveTrip = trips.some((t: any) => t.status === 'active');
      if (hasActiveTrip) {
        alert(`⚠️ El repartidor ${employeeName} ya tiene un viaje activo en curso. Por favor, liquida el viaje actual antes de asignarle uno nuevo.`);
        return;
      }

      const newTrip = {
        id: 'T-' + Math.floor(10000 + Math.random() * 90000),
        trip_number: trips.length + 1,
        loaded_qty: Number(loadedQty) || 20,
        loaded_qty_rosa: Number(details?.rosa || 0),
        loaded_qty_azul: Number(details?.azul || 0),
        loaded_qty_color: Number(details?.deColor || 0),
        loaded_qty_pequeno: Number(details?.pequeno || 0),
        loaded_qty_lavar: Number(details?.lavar || 0),
        returned_unsold_qty: 0,
        returned_empty_qty: 0,
        sold_qty: 0,
        status: 'active',
        loaded_at: new Date().toISOString(),
        assigned_route: routeParam || dispatchRoute || '1.- Santa Cruz'
      };

      const updatedLocation = {
        ...existingLocation,
        trips: [...trips, newTrip]
      };

      const { error } = await supabase
        .from('daily_attendance')
        .upsert({
          ...(existing || {}),
          user_name: employeeName,
          work_date: today,
          user_role: 'driver',
          last_location: updatedLocation,
          check_in: existing?.check_in || new Date().toISOString()
        }, { onConflict: 'user_name, work_date' });

      if (error) throw error;
      
      let detailMsg = '';
      if (details) {
        const parts = [];
        if (details.rosa) parts.push(`${details.rosa} Rosas`);
        if (details.azul) parts.push(`${details.azul} Azules`);
        if (details.deColor) parts.push(`${details.deColor} De Color`);
        if (details.pequeno) parts.push(`${details.pequeno} Pequeños`);
        if (details.lavar) parts.push(`${details.lavar} A Lavar`);
        if (parts.length > 0) detailMsg = ` (${parts.join(', ')})`;
      }
      
      const targetEmp = employeesList.find((e: any) => namesMatch(e.name, employeeName));
      const targetUserId = targetEmp?.id || targetEmp?.user_id || null;
      const finalRoute = routeParam || dispatchRoute || '1.- Santa Cruz';

      await supabase.from('notifications_log').insert([{
        title: '🚚 Carga de Inventario registrada',
        message: `Se despachó un viaje de carga con ${loadedQty} garrafones${detailMsg} a ${employeeName} para la ruta: ${finalRoute}.`,
        type: 'delivery',
        user_role: targetUserId ? `driver_${targetUserId}` : 'driver',
        is_read: false
      }]);

      alert(`¡Carga de ${loadedQty} garrafones${detailMsg} asignada con éxito a ${employeeName} para la ruta: ${finalRoute}!`);
    } catch (e: any) {
      alert('Error al asignar carga de viaje: ' + e.message);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        const normalized = data.map((emp: any) => ({
          ...emp,
          name: normalizeEmployeeName(emp.name)
        }));
        setEmployeesList(normalized);
      }
    } catch (err) {
      console.warn('Error fetching employees:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setCustomersList(data);
      }
    } catch (err) {
      console.warn('Error fetching customers:', err);
    }
  };

  const handleExport = (type: string) => {
    setIsExporting(true);
    
    try {
      let columns: string[] = [];
      let data: any[][] = [];
      let filename = '';

      if (activeTab === 'sales') {
        filename = 'Reporte_Ventas';
        columns = ['Folio', 'Cliente', 'Cobrado Por', 'Productos/Items', 'Fuente', 'Monto', 'Fecha/Hora'];
        const listToExport = getFilteredSales();
        data = listToExport.map(s => [
          s.id.slice(0, 8).toUpperCase(),
          s.customer_name || 'Venta Mostrador',
          s.assigned_to_name || 'Mostrador',
          s.items || '',
          s.source === 'local' ? 'Planta' : s.source === 'whatsapp' ? 'WhatsApp' : s.source === 'pos' ? 'Venta POS' : 'Teléfono',
          `$${Number(s.total_price || 0).toFixed(2)}`,
          new Date(s.created_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
        ]);
      } else if (activeTab === 'customers') {
        filename = 'Directorio_Clientes';
        columns = ['Nombre', 'Zona', 'Nivel', 'Pedidos'];
        const list = customersList.length > 0 ? customersList : CLIENT_MANAGEMENT;
        data = list.map(c => [c.name, c.address || c.neighborhood, c.tier, c.totalOrders || '0']);
      } else if (activeTab === 'driver_sales') {
        filename = 'Directorio_Empleados';
        columns = ['Nombre', 'Rol', 'Teléfono', 'Estatus'];
        const list = employeesList.length > 0 ? employeesList : SELLER_PERFORMANCE;
        data = list.map(e => [e.name, e.role, e.phone || '-', e.status || 'active']);
      } else if (activeTab === 'employee_sales') {
        filename = 'Reporte_Ventas_Por_Empleado';
        columns = ['Nombre', 'Rol / Puesto', 'Total Pedidos', 'Monto Total Ventas'];
        data = employeesList.map(e => {
          const empSales = salesList.filter(s => namesMatch(s.assigned_to_name, e.name));
          const totalAmount = empSales.reduce((sum, s) => sum + Number(s.total_price || 0), 0);
          return [
            e.name,
            e.role === 'driver' ? 'Repartidor' : e.role === 'operator' ? 'Operador Planta' : e.role === 'supervisor' ? 'Supervisor' : 'Administrador',
            String(empSales.length),
            `$${totalAmount.toFixed(2)}`
          ];
        });
      } else if (type === 'Corte de Caja' || activeTab === 'plant_cut') {
        filename = 'Corte_Caja_Planta';
        columns = ['Concepto', 'Detalle', 'Valor'];
        const plantStats = getPlantSalesToday();
        data = [
          ['Total Mostrador Hoy', 'Ventas realizadas físicamente en mostrador', `$${plantStats.counterTotal.toFixed(2)}`],
          ['Total WhatsApp Hoy', 'Ventas de planta coordinadas vía WhatsApp', `$${plantStats.whatsappTotal.toFixed(2)}`],
          ['Total Neto Recaudado', 'Suma acumulada de ingresos en planta', `$${plantStats.totalRevenue.toFixed(2)}`],
          ['Pedidos Registrados', 'Número de transacciones procesadas hoy', String(plantStats.totalCount)]
        ];
      } else {
        // Fallback for Metrics
        filename = 'Metricas_Operativas';
        columns = ['Dia', 'Ventas', 'Pedidos'];
        data = SALES_DATA.map(d => [d.day, `$${d.sales}`, d.orders]);
      }

      exportToPDF({
        title: `Reporte: ${type}`,
        subtitle: `Generado el ${new Date().toLocaleDateString()} - Sistema Admin QualityWater`,
        columns,
        data,
        filename
      });
    } catch (error) {
      console.error('PDF Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = (type: string) => {
    try {
      let columns: string[] = [];
      let data: any[][] = [];
      let filename = '';

      if (activeTab === 'sales') {
        filename = 'Reporte_Ventas';
        columns = ['Folio', 'Cliente', 'Cobrado Por', 'Productos/Items', 'Fuente', 'Monto', 'Fecha/Hora'];
        const listToExport = getFilteredSales();
        data = listToExport.map(s => [
          s.id.slice(0, 8).toUpperCase(),
          s.customer_name || 'Venta Mostrador',
          s.assigned_to_name || 'Mostrador',
          s.items || '',
          s.source === 'local' ? 'Planta' : s.source === 'whatsapp' ? 'WhatsApp' : s.source === 'pos' ? 'Venta POS' : 'Teléfono',
          Number(s.total_price || 0).toFixed(2),
          new Date(s.created_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
        ]);
      } else if (activeTab === 'customers') {
        filename = 'Directorio_Clientes';
        columns = ['Nombre', 'Zona/Dirección', 'Nivel', 'Pedidos'];
        const list = customersList.length > 0 ? customersList : CLIENT_MANAGEMENT;
        data = list.map(c => [c.name, c.address || c.neighborhood, c.tier, c.totalOrders || '0']);
      } else if (activeTab === 'driver_sales') {
        filename = 'Directorio_Empleados';
        columns = ['Nombre', 'Rol', 'Teléfono', 'Estatus'];
        const list = employeesList.length > 0 ? employeesList : SELLER_PERFORMANCE;
        data = list.map(e => [e.name, e.role, e.phone || '-', e.status || 'active']);
      } else if (activeTab === 'employee_sales') {
        filename = 'Reporte_Ventas_Por_Empleado';
        columns = ['Nombre', 'Rol / Puesto', 'Total Pedidos', 'Monto Total Ventas'];
        data = employeesList.map(e => {
          const empSales = salesList.filter(s => namesMatch(s.assigned_to_name, e.name));
          const totalAmount = empSales.reduce((sum, s) => sum + Number(s.total_price || 0), 0);
          return [
            e.name,
            e.role === 'driver' ? 'Repartidor' : e.role === 'operator' ? 'Operador Planta' : e.role === 'supervisor' ? 'Supervisor' : 'Administrador',
            String(empSales.length),
            Number(totalAmount || 0).toFixed(2)
          ];
        });
      } else if (type === 'Corte de Caja') {
        filename = 'Corte_Caja_Planta';
        columns = ['Concepto', 'Detalle', 'Valor'];
        const plantStats = getPlantSalesToday();
        data = [
          ['Total Mostrador Hoy', 'Ventas realizadas físicamente en mostrador', `$${plantStats.counterTotal.toFixed(2)}`],
          ['Total WhatsApp Hoy', 'Ventas de planta coordinadas vía WhatsApp', `$${plantStats.whatsappTotal.toFixed(2)}`],
          ['Total Neto Recaudado', 'Suma acumulada de ingresos en planta', `$${plantStats.totalRevenue.toFixed(2)}`],
          ['Pedidos Registrados', 'Número de transacciones procesadas hoy', String(plantStats.totalCount)]
        ];
      } else {
        filename = 'Metricas_Operativas';
        columns = ['Dia', 'Ventas', 'Pedidos'];
        data = SALES_DATA.map(d => [d.day, `$${d.sales}`, d.orders]);
      }

      const csvContent = [
        columns.join(','),
        ...data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Excel Export failed:', error);
    }
  };

  const handleExportAttendance = (format: 'pdf' | 'excel') => {
    const columns = ['Colaborador', 'Fecha de Trabajo', 'Rol', 'Entrada', 'Salida / Estado'];
    const data = metricsAttendance.map(att => [
      att.user_name || 'Sin Nombre',
      att.work_date || '',
      att.user_role || '',
      att.check_in ? new Date(att.check_in).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-',
      att.check_out ? new Date(att.check_out).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : (att.last_location ? 'Activo' : '-')
    ]);
    const filename = 'Historial_Asistencia';

    if (format === 'pdf') {
      exportToPDF({
        title: 'Reporte de Asistencia del Personal',
        subtitle: `Generado el ${new Date().toLocaleDateString()} - Control Operativo`,
        columns,
        data,
        filename
      });
    } else {
      const csvContent = [
        columns.join(','),
        ...data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportQuality = (format: 'pdf' | 'excel') => {
    const columns = ['Tipo Registro', 'Detalle/Observación', 'Registrado Por', 'Fecha/Hora'];
    const data = metricsQualityLogs.map(log => [
      log.type || '',
      log.notes || log.observation || '',
      log.operator_name || 'Operador',
      new Date(log.created_at).toLocaleString('es-MX')
    ]);
    const filename = 'Bitacora_Control_Calidad';

    if (format === 'pdf') {
      exportToPDF({
        title: 'Bitácora de Control de Calidad',
        subtitle: `Generado el ${new Date().toLocaleDateString()} - Planta QualityWater`,
        columns,
        data,
        filename
      });
    } else {
      const csvContent = [
        columns.join(','),
        ...data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportInventory = (format: 'pdf' | 'excel') => {
    const columns = ['Producto', 'Categoría', 'Stock en Planta', 'Precio'];
    const data = metricsProducts.map(prod => [
      prod.name || '',
      prod.category || '',
      String(prod.stock || 0),
      `$${Number(prod.price || 0).toFixed(2)}`
    ]);
    const filename = 'Catalogo_Inventario_Productos';

    if (format === 'pdf') {
      exportToPDF({
        title: 'Inventario y Catálogo de Productos',
        subtitle: `Generado el ${new Date().toLocaleDateString()} - Control de Almacén`,
        columns,
        data,
        filename
      });
    } else {
      const csvContent = [
        columns.join(','),
        ...data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleClearEmployeeSalesHistory = async (empName: string) => {
    const confirmMsg = `¿Deseas eliminar permanentemente el historial de ventas entregadas de "${empName}"?\n\nEsto vaciará su registro operativo para iniciar limpio su próximo turno sin arrastrar ventas del día anterior.`;
    if (!confirm(confirmMsg)) return;

    try {
      const matchedSales = salesList.filter(s => namesMatch(s.assigned_to_name, empName) && s.status === 'delivered');
      if (matchedSales.length === 0) {
        alert('Este empleado no tiene ningún registro de ventas entregadas para eliminar.');
        return;
      }

      const idsToDelete = matchedSales.map(s => s.id);

      const { error: deleteErr } = await supabase
        .from('orders')
        .delete()
        .in('id', idsToDelete);

      if (deleteErr) throw deleteErr;

      alert(`Se han borrado exitosamente las ${matchedSales.length} ventas entregadas de "${empName}".`);
      await fetchSales();
    } catch (err: any) {
      console.error('Error al vaciar ventas de un empleado:', err);
      alert('Error al borrar el historial de ventas: ' + err.message);
    }
  };

  const handleClearAllEmployeesSalesHistory = async () => {
    const confirmMsg = `¡ATENCIÓN ADMINISTRADOR!\n\n¿Estás seguro de que deseas VACIAR EL HISTORIAL COMPLETO de ventas entregadas de TODOS los empleados?\n\nEste proceso es irreversible y se realiza clásicamente al final del turno para que todos inicien su nueva jornada con historial limpio y en ceros.`;
    if (!confirm(confirmMsg)) return;

    try {
      const deliveredSales = salesList.filter(s => s.status === 'delivered');
      if (deliveredSales.length === 0) {
        alert('No hay ventas entregadas registradas en el sistema para vaciar.');
        return;
      }

      const idsToDelete = deliveredSales.map(s => s.id);

      const { error: deleteErr } = await supabase
        .from('orders')
        .delete()
        .in('id', idsToDelete);

      if (deleteErr) throw deleteErr;

      alert(`Historial Global Limpio: Se han eliminado las ${deliveredSales.length} ventas entregadas de todos los empleados correctamente.`);
      await fetchSales();
    } catch (err: any) {
      console.error('Error al vaciar historial de ventas globales:', err);
      alert('Error en el vaciado global: ' + err.message);
    }
  };

  const handleExportIndividualEmployeeReport = (emp: any) => {
    // Filter sales made by this employee
    const employeeSales = salesList.filter(s => namesMatch(s.assigned_to_name, emp.name));
    
    const columns = ['Folio', 'Cliente', 'Artículos', 'Dirección', 'Medio', 'Total', 'Fecha / Hora'];
    const data = employeeSales.map(s => [
      s.id.slice(0, 8).toUpperCase(),
      s.customer_name || 'Venta de Mostrador',
      s.items || '',
      s.address || '-',
      s.source === 'local' ? 'Planta' : s.source === 'whatsapp' ? 'WhatsApp' : s.source === 'pos' ? 'Venta POS' : 'Teléfono',
      `$${Number(s.total_price || 0).toFixed(2)}`,
      new Date(s.created_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
    ]);

    const totalCalculated = employeeSales.reduce((acc, s) => acc + Number(s.total_price || 0), 0);

    data.push(['', '', '', '', '', '', '']); // spacing row
    data.push(['CONSOLIDADO DE VENTAS INDIVIDUAL', '', '', '', '', '', '']);
    data.push(['Total de Pedidos Entregados', '', '', '', '', '', `${employeeSales.length} pedidos`]);
    data.push(['Monto Total Recaudado / Ventas', '', '', '', '', '', `$${totalCalculated.toFixed(2)}`]);

    exportToPDF({
      title: 'Reporte de Ventas Individual',
      subtitle: `Empleado: ${emp.name} - Cargo: ${emp.role.toUpperCase()} - Estado: ${emp.status || 'active'}`.toUpperCase(),
      columns,
      data,
      filename: `Reporte_Ventas_${emp.name.replace(/\s+/g, '_')}`
    });

    // Automatic clearing flow
    if (employeeSales.length > 0) {
      setTimeout(async () => {
        const autoClear = confirm(`Reporte PDF individual para "${emp.name}" descargado con éxito.\n\n¿Deseas vaciar y limpiar automáticamente su historial de ${employeeSales.length} ventas entregadas ahora para que comience su próximo turno limpio?`);
        if (autoClear) {
          try {
            const idsToDelete = employeeSales.map(s => s.id);
            const { error: deleteErr } = await supabase
              .from('orders')
              .delete()
              .in('id', idsToDelete);
            
            if (deleteErr) throw deleteErr;
            alert(`Sincronización Automática Correcta: Se ha vaciado el historial de ventas de "${emp.name}".`);
            await fetchSales();
          } catch (err: any) {
            console.error('Error al vaciar de forma automática:', err);
          }
        }
      }, 1000);
    }
  };

  const handleExportIndividualEmployeeExcel = (emp: any) => {
    // Filter sales made by this employee
    const employeeSales = salesList.filter(s => namesMatch(s.assigned_to_name, emp.name));
    
    const columns = ['Folio', 'Cliente', 'Artículos', 'Dirección', 'Medio', 'Total ($)', 'Fecha / Hora'];
    const data = employeeSales.map(s => [
      s.id.slice(0, 8).toUpperCase(),
      s.customer_name || 'Venta de Mostrador',
      s.items || '',
      s.address || '-',
      s.source === 'local' ? 'Planta' : s.source === 'whatsapp' ? 'WhatsApp' : s.source === 'pos' ? 'Venta POS' : 'Teléfono',
      Number(s.total_price || 0).toFixed(2),
      new Date(s.created_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
    ]);

    const totalCalculated = employeeSales.reduce((acc, s) => acc + Number(s.total_price || 0), 0);

    data.push(['', '', '', '', '', '', '']); // spacing row
    data.push(['CONSOLIDADO DE VENTAS INDIVIDUAL', '', '', '', '', '', '']);
    data.push(['Total de Pedidos Entregados', '', '', '', '', '', `${employeeSales.length} pedidos`]);
    data.push(['Monto Total Recaudado / Ventas', '', '', '', '', '', `$${totalCalculated.toFixed(2)}`]);

    const filename = `Reporte_Ventas_${emp.name.replace(/\s+/g, '_')}`;

    const csvContent = [
      columns.join(','),
      ...data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNewCustomerSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingCustomer(true);
    
    const formData = new FormData(e.currentTarget);
    const aliasValue = (formData.get('alias') as string) || '';
    const customerData: any = {
      name: formData.get('name') as string,
      alias: aliasValue,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      tier: (formData.get('tier') as string)?.toLowerCase() || 'frequent',
      geolocation_url: formData.get('geolocation_url') as string,
    };

    try {
      if (editingCustomer) {
        console.log('Intentando actualizar cliente:', customerData);
        // If it was a mock customer list edit (its id might start with C instead of standard UUID format)
        if (editingCustomer.id && editingCustomer.id.startsWith('C')) {
          const { error } = await supabase
            .from('customers')
            .insert([customerData]);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('customers')
            .update(customerData)
            .eq('id', editingCustomer.id);
          if (error) throw error;
        }
        console.log('Cliente actualizado con éxito');
      } else {
        console.log('Intentando guardar cliente:', customerData);
        const { error } = await supabase
          .from('customers')
          .insert([customerData]);

        if (error) throw error;
        console.log('Cliente guardado con éxito');
      }
      
      await fetchCustomers();
      handleCloseCustomerModal();
    } catch (error: any) {
      console.warn('Fallo inicial con campo alias, intentando fallback sin la columna alias...', error);
      // Fallback: If 'alias' column does not exist on the database table 'customers',
      // we remove 'alias' and append it to the client name so information is saved successfully.
      try {
        const fallbackData = {
          ...customerData,
          name: customerData.name + (aliasValue ? ` (${aliasValue})` : '')
        };
        delete fallbackData.alias;

        if (editingCustomer) {
          if (editingCustomer.id && editingCustomer.id.startsWith('C')) {
            const { error } = await supabase.from('customers').insert([fallbackData]);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('customers').update(fallbackData).eq('id', editingCustomer.id);
            if (error) throw error;
          }
        } else {
          const { error } = await supabase.from('customers').insert([fallbackData]);
          if (error) throw error;
        }
        console.log('Cliente guardado con éxito mediante fallback de nombre');
        await fetchCustomers();
        handleCloseCustomerModal();
      } catch (fallbackError: any) {
        console.error('Failure saving fallback client:', fallbackError);
        alert('ERROR AL GUARDAR CLIENTE: ' + (fallbackError.message || 'Error desconocido'));
      }
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleStartEditCustomer = (client: any) => {
    const preparedClient = {
      id: client.id,
      name: client.name,
      address: client.address || client.neighborhood || '',
      phone: client.phone || '',
      tier: client.tier || 'frequent',
      geolocation_url: client.geolocation_url || ''
    };
    setEditingCustomer(preparedClient);
    setShowNewCustomerModal(true);
  };

  const handleCloseCustomerModal = () => {
    setShowNewCustomerModal(false);
    setEditingCustomer(null);
  };

  const handleNewEmployeeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingEmployee(true);
    
    const formData = new FormData(e.currentTarget);
    const rawName = formData.get('name') as string;
    const normalizedName = normalizeEmployeeName(rawName);
    const newEmployee = {
      name: normalizedName,
      role: formData.get('role') as string,
      phone: formData.get('phone') as string,
      status: 'active'
    };

    try {
      console.log('Intentando guardar empleado:', newEmployee);
      const { error } = await supabase
        .from('employees')
        .insert([newEmployee]);

      if (error) {
        console.error('Error detallado de Supabase (empleados):', error);
        throw error;
      }
      
      console.log('Empleado guardado con éxito');
      await fetchEmployees();
      setShowNewEmployeeModal(false);
      
      // Notificación opcional (la envolvemos en try/catch para que no bloquee el flujo principal)
      try {
        await supabase.from('notifications_log').insert({
          title: 'Nuevo Empleado',
          message: `${newEmployee.name} se ha unido como ${newEmployee.role}`,
          type: 'system',
          user_role: 'admin'
        });
      } catch (notifErr) {
        console.warn('No se pudo crear la notificación:', notifErr);
      }

    } catch (error: any) {
      console.error('Error al guardar empleado:', error);
      alert('ERROR AL GUARDAR EMPLEADO: ' + (error.message || 'Error desconocido') + '\n\nVerifica si la tabla "employees" existe y tiene políticas RLS habilitadas para inserción.');
    } finally {
      setIsSavingEmployee(false);
    }
  };

  const handleFinalizeCut = () => {
    setIsFinalizingCut(true);
    setTimeout(() => {
      setIsFinalizingCut(false);
    }, 2000);
  };

  const handleDeleteSale = async (id: string, customer: string) => {
    if (!confirm(`¿Eliminar registro de venta de ${customer}?`)) return;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else fetchSales();
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar cliente ${name}?`)) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else fetchCustomers();
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar empleado ${name}?`)) return;
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else fetchEmployees();
  };

  const handleUpdateEmployeeRole = async (id: string, newRole: string) => {
    const { error } = await supabase
      .from('employees')
      .update({ role: newRole })
      .eq('id', id);
    
    if (error) {
      alert('Error al actualizar rol: ' + error.message);
    } else {
      fetchEmployees();
    }
  };

  const handleUpdateEmployeeStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('employees')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (error) {
      alert('Error al actualizar estatus: ' + error.message);
    } else {
      fetchEmployees();
    }
  };

  const liquidations = [
    { driver: 'Carlos Ruiz', route: 'Ruta 1', out: 120, delivered: 115, inTruck: 5, expectedCash: 5175, actualCash: 5175, status: 'ok', orders: 18 },
    { driver: 'Mario Santos', route: 'Ruta 2', out: 95, delivered: 88, inTruck: 4, expectedCash: 3960, actualCash: 3915, status: 'faltante', orders: 15 },
    { driver: 'Ana Lopez', route: 'Ruta 3', out: 50, delivered: 50, inTruck: 0, expectedCash: 2250, actualCash: 2250, status: 'ok', orders: 10 },
  ];

  return (
    <div className="space-y-6 pb-24 lg:pb-12">
      {/* Header with Title and Global Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none italic uppercase">
            {activeTab === 'sales' 
              ? (userRole === 'driver' ? 'Mis Ventas' : userRole === 'operator' ? 'Ventas Planta' : 'Ventas') 
              : 'Quality'} 
            <span className="text-sky-500">
              {activeTab === 'sales' 
                ? (userRole === 'driver' || userRole === 'operator' ? ' del Día' : ' Globales') 
                : ' Admin'}
            </span>
          </h1>
          <p className="text-slate-500 mt-2 font-bold flex items-center gap-2 text-sm italic">
            <ShieldCheck size={16} className="text-sky-500" />
            Control de Misión &bull; {(() => {
              const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
              const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
              const d = new Date();
              return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}, ${d.getFullYear()}`;
            })()}
          </p>
        </div>
        
        {(userRole === 'admin' || userRole === 'supervisor') && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <button 
              onClick={() => handleExport('Ventas Mensuales')}
              disabled={isExporting}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] shadow-xl hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-widest shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              PDF Mensual
            </button>
            <button 
              onClick={() => handleExportExcel('Ventas Mensuales')}
              disabled={isExporting}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] shadow-xl hover:bg-emerald-700 transition-all active:scale-95 uppercase tracking-widest shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              Excel Mensual
            </button>
          </div>
        )}
      </div>

      {/* Selector de Origen de Ventas (Planta vs Repartidores) y Periodos para Admin */}
      {(userRole === 'admin' || userRole === 'supervisor') && (activeTab === 'metrics' || activeTab === 'sales') && (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-[32px] border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Filtrar Canal de Origen</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Ver ventas e ingresos por procedencia</span>
            </div>
            <div className="bg-slate-100 dark:bg-slate-950 p-1 rounded-xl flex border border-slate-200/50 dark:border-slate-800/50 shadow-inner shrink-0 self-stretch sm:self-auto">
              {[
                { id: 'all', label: 'Unificadas (Global)', icon: ShieldCheck, color: 'text-indigo-500' },
                { id: 'plant', label: 'Solo Planta', icon: Store, color: 'text-emerald-500' },
                { id: 'drivers', label: 'Solo Repartidores', icon: Truck, color: 'text-sky-500' },
              ].map((scope) => {
                const Icon = scope.icon;
                const active = adminSalesScope === scope.id;
                return (
                  <button
                    key={scope.id}
                    onClick={() => setAdminSalesScope(scope.id as any)}
                    className={`py-2 px-3 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                      active
                        ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Icon size={12} className={scope.color} />
                    <span>{scope.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Rango Temporal</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Unificar ventas por período</span>
            </div>
            <div className="bg-slate-100 dark:bg-slate-950 p-1 rounded-xl flex border border-slate-200/50 dark:border-slate-800/50 shadow-inner shrink-0 self-stretch sm:self-auto">
              {[
                { id: 'today', label: 'Hoy' },
                { id: 'week', label: 'Semana' },
                { id: 'month', label: 'Mes' },
                { id: 'all', label: 'Histórico' },
              ].map((period) => {
                const active = timePeriod === period.id;
                return (
                  <button
                    key={period.id}
                    onClick={() => setTimePeriod(period.id as any)}
                    className={`py-2 px-4 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                      active
                        ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <span>{period.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tabs handled by sidebar navigation */}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {/* Buscador inteligente */}
              {(userRole === 'admin' || userRole === 'supervisor') && (
                <div className="bg-gradient-to-r from-sky-500 to-indigo-600 p-6 rounded-[32px] text-white shadow-lg shadow-sky-500/10 relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider">🔍 Buscador Inteligente de Métricas</h4>
                      <p className="text-[10px] text-sky-100/80 font-bold uppercase mt-1">
                        Escribe "Ruta 1", "Ruta 2", "Planta", "WhatsApp", un repartidor o cliente para recalcular instantáneamente todas las tarjetas y gráficas
                      </p>
                    </div>
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        placeholder="Ejem: Ruta 1, Carlos, WhatsApp..."
                        value={metricsSearch}
                        onChange={(e) => setMetricsSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white text-slate-800 rounded-2xl text-xs font-bold shadow-inner outline-none focus:ring-2 focus:ring-white/50 placeholder-slate-400"
                      />
                      {metricsSearch && (
                        <button
                          onClick={() => setMetricsSearch('')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-extrabold text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10">
                    <TrendingUp size={180} />
                  </div>
                </div>
              )}

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Volumen Total', value: `${calculateTotalVolume()} Garrafones`, icon: ShoppingBag, color: 'text-sky-600', trend: '+15%', trendUp: true },
                  { label: 'Ventas Real', value: `$${calculateVentasHoy().toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-emerald-600', trend: '+8%', trendUp: true },
                  { label: 'Ticket Prom.', value: `$${calculateTicketPromedio().toLocaleString('es-MX')}`, icon: TrendingUp, color: 'text-indigo-600', trend: '+2%', trendUp: true },
                  { label: 'Clientes Reales', value: `${calculateTotalCustomers()}`, icon: Users, color: 'text-amber-600', trend: '+10%', trendUp: true },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                        <stat.icon size={16} className={stat.color} />
                      </div>
                      <span className={`text-[10px] font-black flex items-center gap-0.5 ${stat.trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {stat.trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {stat.trend}
                      </span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 leading-none">{stat.value}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Plant vs Field sales overview & detailed breakdown */}
              {(() => {
                const { plantSalesTotal, plantSalesCount, employeePlantBreakdown } = getPlantAndFieldSalesToday();
                const {
                  santaCruzTotal,
                  santaCruzCount,
                  sanMiguelTotal,
                  sanMiguelCount,
                  laFranciaTotal,
                  laFranciaCount,
                  plantaTotal,
                  plantaCount,
                  llamadasTotal,
                  llamadasCount,
                  whatsappTotal,
                  whatsappCount,
                  totalSales
                } = getRouteMetricsForPeriod();

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Global Comparison Card */}
                    <div className="lg:col-span-1 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="font-black text-slate-800 mb-1 uppercase text-[10px] tracking-widest">Comparativa por Ruta Oficial</h3>
                        <p className="text-[10px] font-bold text-slate-400 mb-4 uppercase">
                          Período: {timePeriod === 'today' ? 'Hoy' : timePeriod === 'week' ? 'Esta Semana' : timePeriod === 'month' ? 'Este Mes' : 'Histórico (Todo)'}
                        </p>
                        
                        <div className="space-y-2.5 max-h-[360px] overflow-y-auto no-scrollbar pr-0.5">
                          {/* Santa Cruz */}
                          <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-black text-[9px]">
                                1
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase text-slate-400">1.- Santa Cruz</p>
                                <p className="text-sm font-black text-slate-900">${santaCruzTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                            <span className="text-[9px] bg-indigo-100 text-indigo-600 font-black px-2 py-1 rounded-full uppercase">{santaCruzCount} ped.</span>
                          </div>

                          {/* San Miguel-Centro */}
                          <div className="p-3.5 rounded-2xl bg-sky-50/50 border border-sky-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black text-[9px]">
                                2
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase text-slate-400">2.- San Miguel-Centro</p>
                                <p className="text-sm font-black text-slate-900">${sanMiguelTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                            <span className="text-[9px] bg-sky-100 text-sky-600 font-black px-2 py-1 rounded-full uppercase">{sanMiguelCount} ped.</span>
                          </div>

                          {/* La Francia-Los Reyes */}
                          <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-[9px]">
                                3
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase text-slate-400">3.- La Francia-Los Reyes</p>
                                <p className="text-sm font-black text-slate-900">${laFranciaTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                            <span className="text-[9px] bg-amber-100 text-amber-600 font-black px-2 py-1 rounded-full uppercase">{laFranciaCount} ped.</span>
                          </div>

                          {/* Planta o Local */}
                          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-[9px]">
                                4
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase text-slate-400">4.- Planta o Local</p>
                                <p className="text-sm font-black text-slate-900">${plantaTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                            <span className="text-[9px] bg-emerald-100 text-emerald-600 font-black px-2 py-1 rounded-full uppercase">{plantaCount} ped.</span>
                          </div>

                          {/* llamadas Telefónicas */}
                          <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black text-[9px]">
                                5
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase text-slate-400">5.- Llamadas Telefónicas</p>
                                <p className="text-sm font-black text-slate-900">${llamadasTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                            <span className="text-[9px] bg-rose-100 text-rose-600 font-black px-2 py-1 rounded-full uppercase">{llamadasCount} ped.</span>
                          </div>

                          {/* WhatsApp */}
                          <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-teal-500 text-white flex items-center justify-center font-black text-[9px]">
                                6
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase text-slate-400">6.- WhatsApp</p>
                                <p className="text-sm font-black text-slate-900">${whatsappTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                            <span className="text-[9px] bg-teal-100 text-teal-600 font-black px-2 py-1 rounded-full uppercase">{whatsappCount} ped.</span>
                          </div>
                        </div>
                      </div>

                      {/* Simple Horizontal Progress Ratio */}
                      <div className="mt-6">
                        <div className="flex justify-between text-[7px] font-black text-slate-400 uppercase mb-1.5 gap-1">
                          <span>S.Cruz</span>
                          <span>S.Miguel</span>
                          <span>L.Francia</span>
                          <span>Planta</span>
                          <span>Teléf.</span>
                          <span>WhatsApp</span>
                        </div>
                        {totalSales > 0 ? (
                          <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                            <div 
                              className="h-full bg-indigo-500 transition-all" 
                              style={{ width: `${(santaCruzTotal / totalSales) * 100}%` }} 
                            />
                            <div 
                              className="h-full bg-sky-500 transition-all" 
                              style={{ width: `${(sanMiguelTotal / totalSales) * 100}%` }} 
                            />
                            <div 
                              className="h-full bg-amber-500 transition-all" 
                              style={{ width: `${(laFranciaTotal / totalSales) * 100}%` }} 
                            />
                            <div 
                              className="h-full bg-emerald-500 transition-all" 
                              style={{ width: `${(plantaTotal / totalSales) * 100}%` }} 
                            />
                            <div 
                              className="h-full bg-rose-500 transition-all" 
                              style={{ width: `${(llamadasTotal / totalSales) * 100}%` }} 
                            />
                            <div 
                              className="h-full bg-teal-500 transition-all" 
                              style={{ width: `${(whatsappTotal / totalSales) * 100}%` }} 
                            />
                          </div>
                        ) : (
                          <div className="w-full h-3 rounded-full bg-slate-100" />
                        )}
                        <span className="text-[8px] text-slate-400 block mt-2 font-black uppercase tracking-wider text-right">
                          Distribución de Ingresos ({timePeriod})
                        </span>
                      </div>
                    </div>

                    {/* Employee Breakdown Card */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                          <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Desglose de Ventas en Planta por Empleado</h3>
                          <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md">Métricas de Hoy</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                          {Object.keys(employeePlantBreakdown).length > 0 ? (
                            Object.entries(employeePlantBreakdown).map(([name, data]: any) => (
                              <div key={name} className="flex items-center justify-between p-3.5 border border-slate-100 rounded-2xl hover:border-emerald-100 transition-colors">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-600 uppercase italic text-[11px]">
                                    {name.substring(0, 2)}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-slate-700 uppercase">{name}</p>
                                    <p className="text-xs font-semibold text-slate-500">{data.count} pedidos en planta</p>
                                  </div>
                                </div>
                                <span className="text-xs font-black text-emerald-600">${data.total.toFixed(2)}</span>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-2 flex flex-col items-center justify-center py-8 text-center text-slate-400">
                              <Store size={24} className="mb-2 text-slate-305" />
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">No hay ventas registradas en planta todavía hoy.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Total Planta Recaudado:</span>
                        <span className="text-emerald-500 text-sm font-black">${plantSalesTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                  <h3 className="font-black text-slate-800 mb-6 uppercase text-[10px] tracking-widest">Rendimiento Histórico (Ventas x Día)</h3>
                  <div className="h-64">
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={getDynamicSalesData()}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="sales" fill="#0ea5e9" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full bg-slate-50 rounded-2xl animate-pulse" />
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col items-center">
                  <h3 className="font-black text-slate-800 mb-6 uppercase text-[10px] tracking-widest w-full">Canales de Pedido</h3>
                  <div className="h-48 w-full mt-4">
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <PieChart>
                          <Pie data={getDynamicChannelData()} cx="50%" cy="50%" innerRadius={55} outerRadius={75} dataKey="value" paddingAngle={4}>
                            {getDynamicChannelData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full bg-slate-50 rounded-full animate-pulse" />
                    )}
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 w-full">
                    {getDynamicChannelData().map((item, idx) => (
                      <div key={idx} className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-[10px] font-black uppercase text-slate-400">{item.name}</span>
                        </div>
                        <span className="text-sm font-black text-slate-800">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION FOR OTHER CRITICAL ENTERPRISE MODULES */}
              <div className="pt-4">
                <div className="border-b border-slate-200 pb-3 mb-6">
                  <h3 className="font-black text-slate-800 uppercase text-[12px] tracking-widest flex items-center gap-2">
                    📋 Monitoreo Operativo de Módulos Clave
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Visualización en tiempo real de registros de Asistencia, Calidad y Existencias en Almacén
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* ATTENDANCE WORK LOGS */}
                  <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                        <div>
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest block">Asistencia del Personal</span>
                          <span className="text-[8px] font-black text-slate-400 uppercase">Últimos registros</span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => handleExportAttendance('pdf')}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-colors"
                            title="Exportar a PDF"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => handleExportAttendance('excel')}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-colors"
                            title="Exportar a Excel"
                          >
                            Excel
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[280px] overflow-y-auto no-scrollbar">
                        {metricsAttendance.length > 0 ? (
                          metricsAttendance.map((att, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-100/70 rounded-xl flex items-center justify-between text-xs">
                              <div>
                                <p className="font-extrabold text-slate-700 uppercase">{att.user_name}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{att.user_role} • {att.work_date}</p>
                              </div>
                              <div className="text-right font-mono text-[9px] text-slate-600">
                                <p><span className="text-emerald-500 font-bold">In:</span> {att.check_in ? new Date(att.check_in).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                                <p><span className="text-rose-500 font-bold">Out:</span> {att.check_out ? new Date(att.check_out).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : (att.last_location ? 'Activo' : '-')}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-slate-400 text-center py-6 uppercase italic">No hay registros de asistencia hoy.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* QUALITY LOGS */}
                  <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                        <div>
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest block">Bitácora de Calidad</span>
                          <span className="text-[8px] font-black text-slate-400 uppercase">Monitoreo de Planta</span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => handleExportQuality('pdf')}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-colors"
                            title="Exportar a PDF"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => handleExportQuality('excel')}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-colors"
                            title="Exportar a Excel"
                          >
                            Excel
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[280px] overflow-y-auto no-scrollbar">
                        {metricsQualityLogs.length > 0 ? (
                          metricsQualityLogs.map((log, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-100/70 rounded-xl text-xs space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-blue-600 uppercase text-[9px] bg-blue-50 px-2 py-0.5 rounded">{log.type}</span>
                                <span className="text-[8px] text-slate-400 font-mono">{new Date(log.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-slate-600 font-bold text-[10px]">{log.notes || log.observation || 'Sin observaciones registradas'}</p>
                              <p className="text-[8px] text-slate-400 uppercase tracking-wider text-right">Op: {log.operator_name || 'Sistema'}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-slate-400 text-center py-6 uppercase italic">No hay registros de calidad cargados.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* INVENTORY / PRODUCTS STOCK */}
                  <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                        <div>
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest block">Existencias e Inventario</span>
                          <span className="text-[8px] font-black text-slate-400 uppercase">Catálogo y Precios</span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => handleExportInventory('pdf')}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-colors"
                            title="Exportar a PDF"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => handleExportInventory('excel')}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-colors"
                            title="Exportar a Excel"
                          >
                            Excel
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[280px] overflow-y-auto no-scrollbar">
                        {metricsProducts.length > 0 ? (
                          metricsProducts.map((prod, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-100/70 rounded-xl flex items-center justify-between text-xs">
                              <div>
                                <p className="font-extrabold text-slate-700 uppercase">{prod.name}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{prod.category || 'Varios'}</p>
                              </div>
                              <div className="text-right">
                                <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${
                                  Number(prod.stock || 0) <= 5 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                                }`}>
                                  {prod.stock || 0} pzas
                                </span>
                                <p className="text-[10px] text-slate-600 font-mono mt-1 font-bold">${Number(prod.price || 0).toFixed(2)}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-slate-400 text-center py-6 uppercase italic">No hay productos en inventario.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="space-y-6">
              {!(userRole === 'admin' || userRole === 'supervisor') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Mis Ventas del Día</p>
                      <p className="text-3xl font-black text-slate-800 mt-3">
                        ${getFilteredSales().reduce((acc, sale) => acc + Number(sale.total_price || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-2 font-bold italic">Total de efectivo y crédito recaudado hoy</span>
                    <div className="absolute top-6 right-6 w-10 h-10 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
                      <DollarSign size={20} />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Mis Pedidos Entregados</p>
                      <p className="text-3xl font-black text-slate-800 mt-3">
                        {getFilteredSales().length}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-2 font-bold italic">Registrados en tu sesión como {userName || 'Usuario'}</span>
                    <div className="absolute top-6 right-6 w-10 h-10 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center">
                      <ShoppingBag size={20} />
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">
                      {userRole === 'driver' ? 'Mis Registros de Ventas' : userRole === 'operator' ? 'Historial de Caja / Ventas Planta' : 'Métricas de Ventas'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                      {userRole === 'driver' 
                        ? `Mostrando únicamente tus ventas registradas hoy como ${userName || 'Repartidor'}`
                        : userRole === 'operator'
                        ? 'Mostrando las ventas de mostrador / planta registradas en el día'
                        : 'Mostrando todas las ventas entregadas y liquidadas en el sistema'
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {loadingSales && <Loader2 size={16} className="animate-spin text-sky-500" />}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleExport('Venta_Filtro')}
                        className="flex items-center gap-2 bg-slate-100 text-slate-600 px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all shrink-0"
                      >
                        <Download size={12} /> Exportar PDF
                      </button>
                      <button 
                        onClick={() => handleExportExcel('Venta_Filtro')}
                        className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all shrink-0"
                      >
                        <Download size={12} /> Exportar Excel
                      </button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="text" 
                        placeholder="Buscar folio o cliente..." 
                        value={salesSearch}
                        onChange={(e) => setSalesSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto text-center">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Ref / Hora</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Cobrado Por</th>
                        <th className="px-6 py-4">Items / Dirección</th>
                        <th className="px-6 py-4">Fuente</th>
                        <th className="px-6 py-4 text-right">Total</th>
                        <th className="px-6 py-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {getFilteredSales().length > 0 ? getFilteredSales().map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <p className="font-black text-sky-500 text-xs">{sale.id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-black text-slate-800 uppercase italic leading-none">{sale.customer_name}</p>
                              {sale.status === 'pending_payment' && (
                                <span className="bg-rose-100 text-rose-800 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide shrink-0 animate-pulse border border-rose-200">
                                  Adeudo
                                </span>
                              )}
                              {sale.items && (sale.items.includes('[OBSEQUIO/REGALO]') || sale.items.includes('[OBSEQUIO]')) && (
                                <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide shrink-0 border border-emerald-200">
                                  Obsequio
                                </span>
                              )}
                              {(sale.payment_method === 'transfer' || (sale.items && (sale.items.toLowerCase().includes('[método de pago: transfer]') || sale.items.toLowerCase().includes('transferencia')))) && (
                                <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide shrink-0 border border-blue-200">
                                  Transferencia
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[10px] font-black uppercase text-slate-600 italic">
                              {sale.assigned_to_name || 'Mostrador'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[10px] text-slate-500 font-black uppercase">{sale.items}</p>
                            <p className="text-[9px] text-slate-400 font-bold italic truncate w-40">{sale.address?.replace(' | Planta', '')}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                              sale.source === 'local' ? 'bg-emerald-100 text-emerald-700' : 
                              sale.source === 'whatsapp' ? 'bg-green-100 text-green-700' : 
                              'bg-sky-100 text-sky-700'
                            }`}>
                              {sale.source === 'local' ? 'Planta' : sale.source === 'whatsapp' ? 'WhatsApp' : 'Teléfono'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {sale.total_price === 0 && (sale.items && (sale.items.includes('[OBSEQUIO/REGALO]') || sale.items.includes('[OBSEQUIO]'))) ? (
                              <p className="font-black text-emerald-600 text-xs uppercase italic">Regalo ($0.00)</p>
                            ) : sale.status === 'pending_payment' ? (
                              <div>
                                <p className="font-black text-rose-600">${sale.total_price.toFixed(2)}</p>
                                <span className="text-[8px] text-rose-400 font-extrabold uppercase">Por Cobrar</span>
                              </div>
                            ) : (
                              <div>
                                <p className="font-black text-slate-900">${sale.total_price.toFixed(2)}</p>
                                {sale.items?.includes('[PAGO PARCIAL]') && (
                                  <span className="text-[8px] text-emerald-500 font-extrabold uppercase">Abono / Parcial</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {sale.status === 'pending_payment' && (
                                <button
                                  onClick={() => {
                                    setDebtCustomer({ name: sale.customer_name, address: sale.address });
                                    setPaymentAmount(getCustomerDebt(sale.customer_name));
                                    setShowDebtModal(true);
                                  }}
                                  className="px-2.5 py-1 bg-rose-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 shadow-sm active:scale-95 shrink-0"
                                  title="Cobrar / Liquidar este Adeudo"
                                >
                                  <DollarSign size={10} /> Cobrar
                                </button>
                              )}
                              {(userRole === 'admin' || userRole === 'supervisor') && (
                                <button 
                                  onClick={() => handleDeleteSale(sale.id, sale.customer_name)}
                                  className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all shrink-0"
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )) : !loadingSales && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                            <History size={40} className="mx-auto mb-4 opacity-20" />
                            <p className="font-black uppercase text-[10px] tracking-widest">No hay ventas registradas hoy</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Base de Datos de Clientes</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Buscador y directorio completo de nombres, alias y zonas</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, alias o zona..."
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                      className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500/20 transition-all w-56 placeholder-slate-400"
                    />
                    {customerFilter && (
                      <button
                        onClick={() => setCustomerFilter('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 font-extrabold"
                      >
                        [x]
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => handleExport('Cartera de Clientes')}
                    className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    <Download size={14} /> Exportar PDF
                  </button>
                  <button 
                    onClick={() => handleExportExcel('customers')}
                    className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all"
                  >
                    <Download size={14} /> Exportar Excel
                  </button>
                  <button 
                    onClick={() => {
                      setEditingCustomer(null);
                      setShowNewCustomerModal(true);
                    }}
                    className="flex items-center gap-2 bg-sky-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-sky-500/20 active:scale-95 transition-all shrink-0"
                  >
                    <Plus size={16} /> Alta de Cliente
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Nombre / Zona / Alias</th>
                      <th className="px-6 py-4">Suscripción</th>
                      <th className="px-6 py-4">Saldo Pendiente</th>
                      <th className="px-6 py-4">Acumulado</th>
                      <th className="px-6 py-4">Ultimo Pedido</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {getFilteredCustomers().map((client) => (
                      <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <p className="font-black text-slate-800 text-sm">{client.name}</p>
                            {client.alias && (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 shadow-sm border border-amber-200">
                                {client.alias}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                            {client.address || client.neighborhood || 'Sin zona'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                            client.tier?.toUpperCase() === 'VIP' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                          }`}>
                            {client.tier || 'Frecuente'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {getCustomerDebt(client.name) > 0 ? (
                            <div className="flex flex-col items-start gap-1">
                              <span className="bg-rose-50 text-rose-700 hover:bg-rose-100 px-2 py-0.5 rounded-xl text-[11px] font-black border border-rose-100 inline-flex items-center gap-1 shadow-sm">
                                <DollarSign size={10} />{getCustomerDebt(client.name).toFixed(2)}
                              </span>
                              <span className="text-[8px] text-rose-400 font-extrabold uppercase select-none tracking-tight">Adeudo activo</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs font-semibold uppercase italic">
                              $0.00
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-black text-slate-800">
                          {client.totalOrders || '0'} Entregas
                        </td>
                        <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase italic">
                          {client.lastActivity || 'Hoy'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {getCustomerDebt(client.name) > 0 && (
                              <button 
                                onClick={() => {
                                  setDebtCustomer(client);
                                  setPaymentAmount(getCustomerDebt(client.name));
                                  setShowDebtModal(true);
                                }}
                                className="p-2 text-rose-500 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                                title="Cobrar / Abonar Adeudo"
                              >
                                <DollarSign size={16} />
                              </button>
                            )}
                            <button 
                              onClick={() => handleStartEditCustomer(client)}
                              className="p-2 text-slate-300 hover:text-sky-500 hover:bg-slate-100 rounded-xl transition-all"
                              title="Ver / Editar"
                            >
                              <Edit3 size={16} />
                            </button>
                            {(userRole === 'admin' || userRole === 'supervisor') && (
                              <button 
                                onClick={() => handleDeleteCustomer(client.id, client.name)}
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {getFilteredCustomers().length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-400">
                          <p className="font-black uppercase text-[10px] tracking-widest mb-1 italic">No se encontraron clientes</p>
                          <p className="text-xs">Usa otro término de búsqueda o registra un nuevo cliente arriba.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'driver_sales' && (
            <div className="space-y-6">
              {/* Widgets de Acciones Rápidas para Administradores */}
              <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-6 rounded-[32px] border border-emerald-500/20 shadow-sm space-y-4">
                <div>
                  <h4 className="text-sm font-black text-emerald-800 uppercase italic flex items-center gap-2">🚚 Despacho Rápido de Garrafones (Viaje de Carga)</h4>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1 tracking-wider">Carga e inicia viajes de reparto seleccionando las cantidades específicas por tipo de envase</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end bg-white/50 p-4 rounded-2xl border border-emerald-500/10">
                  <div className="flex flex-col gap-1 col-span-2 md:col-span-1 min-w-[150px]">
                    <span className="text-[9px] font-black uppercase text-emerald-700">Seleccionar Repartidor</span>
                    <select 
                      value={dispatchDriver}
                      onChange={(e) => setDispatchDriver(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm w-full font-black"
                    >
                      <option value="">-- Selecciona --</option>
                      {employeesList.filter(e => e.role === 'driver' || e.role === 'repartidor').map(drv => (
                        <option key={drv.id} value={drv.name}>{drv.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1 col-span-2 md:col-span-1 min-w-[150px]">
                    <span className="text-[9px] font-black uppercase text-emerald-700">Ruta de Asignación</span>
                    <select 
                      value={dispatchRoute}
                      onChange={(e) => setDispatchRoute(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm w-full font-black"
                    >
                      <option value="1.- Santa Cruz">1.- Santa Cruz</option>
                      <option value="2.- San Miguel-Centro">2.- San Miguel-Centro</option>
                      <option value="3.- La Francia-Los Reyes">3.- La Francia-Los Reyes</option>
                      <option value="4.- Planta o Local">4.- Planta o Local</option>
                      <option value="5.- Llamadas Telefónicas">5.- Llamadas Telefónicas</option>
                      <option value="6.- WhatsApp">6.- WhatsApp</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase text-rose-500 flex items-center gap-1 leading-none">🌸 Rosas</span>
                    <input 
                      type="number" 
                      min="0" 
                      value={dispatchRosa || ''}
                      placeholder="0"
                      onChange={(e) => setDispatchRosa(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm w-full font-black" 
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase text-sky-500 flex items-center gap-1 leading-none">🔷 Azules</span>
                    <input 
                      type="number" 
                      min="0" 
                      value={dispatchAzul || ''}
                      placeholder="0"
                      onChange={(e) => setDispatchAzul(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm w-full font-black" 
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase text-purple-500 flex items-center gap-1 leading-none">🌈 Color</span>
                    <input 
                      type="number" 
                      min="0" 
                      value={dispatchColor || ''}
                      placeholder="0"
                      onChange={(e) => setDispatchColor(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20 shadow-sm w-full font-black" 
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase text-amber-500 flex items-center gap-1 leading-none">🍼 Pequeños</span>
                    <input 
                      type="number" 
                      min="0" 
                      value={dispatchPequeno || ''}
                      placeholder="0"
                      onChange={(e) => setDispatchPequeno(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm w-full font-black" 
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-1 leading-none">🧼 A lavar</span>
                    <input 
                      type="number" 
                      min="0" 
                      value={dispatchLavar || ''}
                      placeholder="0"
                      onChange={(e) => setDispatchLavar(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-500/20 shadow-sm w-full font-black" 
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  <div className="text-[10px] font-black text-emerald-800 uppercase bg-emerald-500/10 px-3.5 py-2 rounded-xl border border-emerald-500/10 font-bold">
                    Total a Despachar: <span className="text-sm font-black italic text-emerald-600 ml-1">{dispatchRosa + dispatchAzul + dispatchColor + dispatchPequeno + dispatchLavar}</span> garrafones
                  </div>

                  <button
                    onClick={() => {
                      if (!dispatchDriver) {
                        alert('Por favor selecciona un repartidor registrado.');
                        return;
                      }
                      const totalQty = dispatchRosa + dispatchAzul + dispatchColor + dispatchPequeno + dispatchLavar;
                      if (totalQty <= 0) {
                        alert('Por favor ingresa cantidad para al menos uno de los tipos de garrafones.');
                        return;
                      }

                      handleAddDriverTrip(dispatchDriver, totalQty, {
                        rosa: dispatchRosa,
                        azul: dispatchAzul,
                        deColor: dispatchColor,
                        pequeno: dispatchPequeno,
                        lavar: dispatchLavar
                      }, dispatchRoute);

                      // Reset fields after successful dispatch
                      setDispatchRosa(0);
                      setDispatchAzul(20);
                      setDispatchColor(0);
                      setDispatchPequeno(0);
                      setDispatchLavar(0);
                      setDispatchDriver('');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Truck size={14} /> Asignar y Enviar Ruta
                  </button>
                </div>
              </div>

              {/* Sección de Edición de Viajes/Rutas Activas (Agregada por solicitud de edición de viajes para Admin/Supervisor) */}
              {(userRole === 'admin' || userRole === 'supervisor') && (
                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
                  <div>
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                      🚚 Monitoreo y Edición de Viajes / Rutas Despachadas
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 italic tracking-widest">
                      Edita las rutas, asignaciones y cargas de garrafones en cualquier momento
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">Repartidor</th>
                          <th className="px-6 py-4">Viaje #</th>
                          <th className="px-6 py-4">Ruta Asignada</th>
                          <th className="px-6 py-4">Carga de Garrafones</th>
                          <th className="px-6 py-4">Estatus</th>
                          <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/50">
                        {(() => {
                          const todayTripsList: any[] = [];
                          todayAttendances.forEach(att => {
                            const loc = parseJsonObj(att.last_location);
                            const trips = loc.trips || [];
                            trips.forEach((t: any) => {
                              todayTripsList.push({
                                attendanceId: att.id,
                                driverName: att.user_name,
                                workDate: att.work_date,
                                ...t
                              });
                            });
                          });

                          if (todayTripsList.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="text-center py-8 text-slate-400 text-xs font-semibold uppercase italic">
                                  No hay viajes despachados para el día de hoy.
                                </td>
                              </tr>
                            );
                          }

                          return todayTripsList.map((trip) => (
                            <tr key={trip.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-black text-slate-800 text-xs italic">{trip.driverName}</td>
                              <td className="px-6 py-4 font-mono text-[10px] font-bold text-slate-500">Viaje #{trip.trip_number}</td>
                              <td className="px-6 py-4 text-[10px] font-bold text-slate-800">
                                <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                                  {trip.assigned_route || 'Sin Ruta'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1 text-[9px] font-black">
                                  {(Number(trip.loaded_qty_rosa) || 0) > 0 && <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md border border-rose-100/50">🌸 {trip.loaded_qty_rosa} R</span>}
                                  {(Number(trip.loaded_qty_azul) || 0) > 0 && <span className="bg-sky-50 text-sky-600 px-2 py-0.5 rounded-md border border-sky-100/50">🔷 {trip.loaded_qty_azul} A</span>}
                                  {(Number(trip.loaded_qty_color) || 0) > 0 && <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md border border-purple-100/50">🌈 {trip.loaded_qty_color} C</span>}
                                  {(Number(trip.loaded_qty_pequeno) || 0) > 0 && <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md border border-amber-100/50">🍼 {trip.loaded_qty_pequeno} P</span>}
                                  {(Number(trip.loaded_qty_lavar) || 0) > 0 && <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-100/50">🧼 {trip.loaded_qty_lavar} L</span>}
                                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100/50">Total: {trip.loaded_qty}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                                  trip.status === 'active' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                }`}>
                                  {trip.status === 'active' ? 'En Ruta' : 'Liquidado'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleStartEditTrip(trip)}
                                  className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl transition-all font-black text-[9px] uppercase tracking-wider flex items-center gap-1 ml-auto border border-sky-100/40"
                                >
                                  <Edit3 size={11} /> Editar
                                </button>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Gestión de Capital Humano</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 italic tracking-widest leading-none">Administración de puestos y accesos</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleExport('Directorio de Empleados')}
                      className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      <Download size={14} /> Exportar PDF
                    </button>
                    <button 
                      onClick={() => handleExportExcel('driver_sales')}
                      className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all"
                    >
                      <Download size={14} /> Exportar Excel
                    </button>
                    {(userRole === 'admin' || userRole === 'supervisor') && (
                      <button 
                        onClick={handleClearAllEmployeesSalesHistory}
                        className="flex items-center gap-2 bg-rose-50 text-rose-600 border border-rose-100 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all shrink-0"
                        title="Vacia el historial de ventas entregadas de todos los empleados"
                      >
                        <Trash2 size={12} /> Vaciar Todo Historial
                      </button>
                    )}
                    <button 
                      onClick={() => setShowNewEmployeeModal(true)}
                      className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all shrink-0"
                    >
                      <Plus size={16} /> Alta de Empleado
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Empleado / Cargo</th>
                        <th className="px-6 py-4">Teléfono</th>
                        <th className="px-6 py-4">Ingreso</th>
                        <th className="px-6 py-4">Estatus</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {employeesList.length > 0 ? employeesList.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center font-black text-xs">
                                {emp.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-black text-slate-800 text-sm italic">{emp.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-none mt-0.5">{emp.role}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-slate-800">{emp.phone || 'N/A'}</td>
                          <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase italic">
                            {new Date(emp.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                              emp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {emp.status === 'active' ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-[10px]">
                            <div className="flex items-center justify-end gap-3 font-black uppercase tracking-widest">
                              <select 
                                onChange={(e) => handleUpdateEmployeeRole(emp.id, e.target.value)}
                                value={emp.role}
                                className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 outline-none text-sky-600 cursor-pointer"
                              >
                                <option value="admin">Admin</option>
                                <option value="supervisor">Supervisor</option>
                                <option value="operator">Operador</option>
                                <option value="driver">Repartidor</option>
                                <option value="client">Cliente</option>
                              </select>
                              
                              <button 
                                onClick={() => handleUpdateEmployeeStatus(emp.id, emp.status === 'active' ? 'inactive' : 'active')}
                                className={`px-2 py-1 rounded-lg border transition-all ${
                                  emp.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                              >
                                {emp.status === 'active' ? 'Desactivar' : 'Activar'}
                              </button>

                              {(emp.role === 'driver' || emp.role === 'repartidor') && (
                                <button
                                  onClick={() => {
                                    const numStr = prompt(`Asignar Garrafones para el viaje en ruta de ${emp.name}.\n\n¿Con cuántos garrafones llenos sale hoy? (Ejem: 20)`, '20');
                                    if (numStr !== null) {
                                      const qty = Number(numStr);
                                      if (isNaN(qty) || qty <= 0) {
                                        alert('Error: Ingresa un número válido mayor a 0.');
                                      } else {
                                        handleAddDriverTrip(emp.name, qty);
                                      }
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all flex items-center gap-1 font-black shadow-sm"
                                  title="Asignar y cargar garrafones para este repartidor en ruta"
                                >
                                  <Plus size={12} /> Cargar Garrafones
                                </button>
                              )}

                              <button 
                                onClick={() => handleExportIndividualEmployeeReport(emp)}
                                className="px-2.5 py-1 bg-sky-50 text-sky-600 border border-sky-100 rounded-lg transition-all hover:bg-sky-100 flex items-center gap-1 font-black"
                                title="Generar Reporte de Ventas de este empleado"
                              >
                                <Download size={12} />
                                Reporte Ventas
                              </button>

                              {(userRole === 'admin' || userRole === 'supervisor') && (
                                <button 
                                  onClick={() => handleClearEmployeeSalesHistory(emp.name)}
                                  className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg transition-all hover:bg-rose-100 flex items-center gap-1 font-black"
                                  title="Borrar historial diario de ventas de este empleado"
                                >
                                  <Trash2 size={12} />
                                  Vaciar Ventas
                                </button>
                              )}

                              {(userRole === 'admin' || userRole === 'supervisor') && (
                                <button 
                                  onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                                  className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                  title="Eliminar registro"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )) : SELLER_PERFORMANCE.map((emp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors opacity-50 italic">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-400 flex items-center justify-center font-black text-xs italic">
                                ?
                              </div>
                              <div>
                                <p className="font-black text-slate-400 text-sm whitespace-nowrap">{emp.name} (Demo)</p>
                                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-tight">Vendedor</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-slate-300">55 XXXX XXXX</td>
                          <td className="px-6 py-4 text-[10px] font-bold text-slate-300 uppercase italic">N/A</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-slate-50 text-slate-300 rounded-lg text-[9px] font-black uppercase">Offline</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <X size={14} className="text-slate-200" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'plant_cut' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-8">
                  <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest flex items-center gap-2">
                    <Store size={18} className="text-sky-500" />
                    Corte de Caja en Planta
                  </h3>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => handleExport('Corte de Caja')}
                      className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-sky-500 hover:bg-sky-50 transition-colors"
                      title="Exportar PDF"
                    >
                      <FileText size={18} />
                    </button>
                    <button 
                      onClick={() => handleExportExcel('Corte de Caja')}
                      className="p-2 bg-slate-50 text-emerald-600 rounded-xl hover:bg-emerald-50 transition-all"
                      title="Exportar Excel"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>
                {(() => {
                  const plantStats = getPlantSalesToday();
                  return (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Mostrador Hoy</p>
                          <p className="text-3xl font-black text-slate-800">${plantStats.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                          <ShoppingBag size={24} className="text-sky-500" />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <span>Llenado de Garrafones</span>
                          <span className="text-slate-800">{plantStats.llenados} Unidades</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <span>Envases Nuevos</span>
                          <span className="text-slate-800">{plantStats.envasesNuevos} Unidades</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-100 pt-4">
                          <span>Efectivo en Caja Planta</span>
                          <span className="text-emerald-500 font-black">${plantStats.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <button 
                        onClick={handleFinalizeCut}
                        disabled={isFinalizingCut}
                        className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-slate-800 transition-all active:scale-95 mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isFinalizingCut ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Conciliando...
                          </>
                        ) : (
                          'Finalizar Corte y Conciliar'
                        )}
                      </button>
                    </div>
                  );
                })()}
              </div>

              <div className="bg-gradient-to-br from-sky-600 to-indigo-700 p-8 rounded-[40px] text-white shadow-xl shadow-sky-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-10">
                    <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
                      <AlertCircle size={32} />
                    </div>
                    <span className="bg-white/20 text-white px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest">Insights IA</span>
                  </div>
                  <h4 className="text-2xl font-black leading-tight mb-4">La Ruta 1 está reportando mayor eficiencia que la Ruta 2.</h4>
                  <p className="text-sky-100/70 text-sm font-bold leading-relaxed italic">
                    "Detectamos que el tiempo promedio de entrega en Carlos Ruiz es 12% menor. Considera optimizar la asignación de clientes VIP en esa zona."
                  </p>
                </div>
                
                <div className="flex items-center gap-4 mt-8 bg-white/10 p-5 rounded-3xl backdrop-blur-sm">
                  <TrendingUp size={24} className="text-emerald-400" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">Mejora Estimada</p>
                    <p className="text-lg font-black leading-none">+$3,150.00 / Mensual</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'employee_sales' && (
            <div className="space-y-6">
              {/* Buscador inteligente */}
              <div className="bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 p-6 rounded-[32px] text-white shadow-xl shadow-sky-500/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                      <Award size={18} className="text-yellow-300 animate-pulse" />
                      Historial de Ventas por Colaborador
                    </h3>
                    <p className="text-[10px] text-sky-100/80 font-bold uppercase mt-1">
                      Buscador inteligente con filtros rápidos por puesto. Monitorea comisiones y entregas de repartidores y personal de planta.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleExport('employee_sales')}
                      className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      <Download size={14} /> PDF General
                    </button>
                    <button
                      onClick={() => handleExportExcel('employee_sales')}
                      className="flex items-center gap-1.5 bg-emerald-500/80 hover:bg-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      <Download size={14} /> Excel General
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <div className="relative md:col-span-2">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Escribe el nombre del repartidor o empleado de planta..."
                      value={empSalesSearch}
                      onChange={(e) => setEmpSalesSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white text-slate-800 rounded-2xl text-xs font-bold shadow-inner outline-none focus:ring-2 focus:ring-white/50 placeholder-slate-400"
                    />
                    {empSalesSearch && (
                      <button 
                        onClick={() => setEmpSalesSearch('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div>
                    <select
                      value={empSalesRoleFilter}
                      onChange={(e) => setEmpSalesRoleFilter(e.target.value)}
                      className="w-full bg-white text-slate-800 p-3 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-white/50 appearance-none border-none shadow-inner"
                    >
                      <option value="all">⚡ Todos los Puestos</option>
                      <option value="driver">🚚 Repartidores / Choferes</option>
                      <option value="operator">🌱 Planta / Mostrador</option>
                      <option value="supervisor">👮 Supervisores</option>
                      <option value="admin">💼 Administradores</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contenedor principal de dos columnas */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Columna Izquierda: Lista de Empleados con sus métricas */}
                <div className="lg:col-span-5 bg-white rounded-[40px] border border-slate-200 shadow-sm p-6 space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center justify-between">
                    <span>Directorio de Colaboradores ({employeesList.length})</span>
                    <span className="text-[10px] font-bold text-slate-400 normal-case">Haz clic para ver historial</span>
                  </h4>

                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    {(() => {
                      const filteredEmployees = employeesList.filter(emp => {
                        // Filter by search text
                        const matchesSearch = emp.name.toLowerCase().includes(empSalesSearch.toLowerCase()) ||
                          (emp.role || '').toLowerCase().includes(empSalesSearch.toLowerCase());
                        
                        // Filter by role
                        if (empSalesRoleFilter === 'all') return matchesSearch;
                        return matchesSearch && emp.role === empSalesRoleFilter;
                      });

                      if (filteredEmployees.length === 0) {
                        return (
                          <div className="text-center py-12 text-slate-400 italic font-semibold text-xs uppercase tracking-wider">
                            No se encontraron empleados con los filtros aplicados.
                          </div>
                        );
                      }

                      return filteredEmployees.map((emp) => {
                        const empSales = salesList.filter(s => namesMatch(s.assigned_to_name, emp.name));
                        const totalSalesAmount = empSales.reduce((acc, s) => acc + Number(s.total_price || 0), 0);
                        const isSelected = selectedEmployeeForSales && emp.id === selectedEmployeeForSales.id;

                        return (
                          <button
                            key={emp.id}
                            onClick={() => setSelectedEmployeeForSales(emp)}
                            className={`w-full flex items-center justify-between p-4 rounded-3xl transition-all border text-left ${
                              isSelected
                                ? 'bg-sky-50/50 border-sky-200 shadow-sm'
                                : 'bg-slate-50/50 hover:bg-slate-50 border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm uppercase ${
                                emp.role === 'driver' ? 'bg-sky-100 text-sky-600' : 'bg-emerald-100 text-emerald-600'
                              }`}>
                                {emp.name.charAt(0)}
                              </div>
                              <div>
                                <h5 className="font-black text-slate-800 text-xs italic uppercase tracking-wider">{emp.name}</h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                    emp.role === 'driver' ? 'bg-sky-50 text-sky-600 border border-sky-100/40' :
                                    emp.role === 'operator' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/40' :
                                    'bg-purple-50 text-purple-600 border border-purple-100/40'
                                  }`}>
                                    {emp.role === 'driver' ? 'Chofer' : emp.role === 'operator' ? 'Planta' : emp.role === 'supervisor' ? 'Supervisor' : 'Admin'}
                                  </span>
                                  {emp.status === 'inactive' && (
                                    <span className="bg-red-50 text-red-500 border border-red-100 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Inactivo</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-[11px] font-black text-slate-800">${totalSalesAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{empSales.length} Ventas</p>
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Columna Derecha: Historial y Detalles del Empleado Seleccionado */}
                <div className="lg:col-span-7 bg-white rounded-[40px] border border-slate-200 shadow-sm p-6">
                  {selectedEmployeeForSales ? (
                    (() => {
                      const empSales = salesList.filter(s => namesMatch(s.assigned_to_name, selectedEmployeeForSales.name));
                      const totalSalesAmount = empSales.reduce((acc, s) => acc + Number(s.total_price || 0), 0);
                      const salesToday = empSales.filter(s => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const dateStr = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '';
                        return dateStr === todayStr;
                      });
                      const totalTodayAmount = salesToday.reduce((acc, s) => acc + Number(s.total_price || 0), 0);

                      // Métodos de Pago
                      const cashSales = empSales.filter(s => s.payment_method === 'cash').reduce((acc, s) => acc + Number(s.total_price || 0), 0);
                      const transferSales = empSales.filter(s => s.payment_method === 'transfer').reduce((acc, s) => acc + Number(s.total_price || 0), 0);

                      // Canales / Source
                      const posCount = empSales.filter(s => s.source === 'pos' || s.source === 'local').length;
                      const whatsappCount = empSales.filter(s => s.source === 'whatsapp').length;

                      return (
                        <div className="space-y-6">
                          {/* Tarjeta de Encabezado del Empleado Seleccionado */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-sky-500/10">
                                {selectedEmployeeForSales.name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="text-base font-black text-slate-800 uppercase tracking-widest leading-none">{selectedEmployeeForSales.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5 flex items-center gap-2">
                                  <span>ID: {selectedEmployeeForSales.id.slice(0, 8).toUpperCase()}</span>
                                  <span>&bull;</span>
                                  <span>{selectedEmployeeForSales.phone || 'Sin Teléfono'}</span>
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="bg-slate-900 text-white text-[8px] font-black uppercase px-2 py-1 rounded-md tracking-wider">
                                    {selectedEmployeeForSales.role === 'driver' ? '🚚 Chofer Repartidor' : '🌱 Operador de Planta'}
                                  </span>
                                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md tracking-wider ${
                                    selectedEmployeeForSales.status === 'inactive' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                                  }`}>
                                    {selectedEmployeeForSales.status === 'inactive' ? 'Inactivo' : 'Activo'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 self-start sm:self-auto">
                              <button
                                onClick={() => handleExportIndividualEmployeeReport(selectedEmployeeForSales)}
                                title="Exportar PDF Individual"
                                className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95"
                              >
                                <Download size={14} />
                              </button>
                              <button
                                onClick={() => handleExportIndividualEmployeeExcel(selectedEmployeeForSales)}
                                title="Exportar Excel Individual"
                                className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                              >
                                <Download size={14} className="rotate-180" />
                              </button>
                            </div>
                          </div>

                          {/* Tarjetas de Métricas Rápidas */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Monto Total</span>
                              <p className="text-sm font-black text-slate-800">${totalSalesAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{empSales.length} Ventas</p>
                            </div>

                            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Ventas de Hoy</span>
                              <p className="text-sm font-black text-emerald-600">${totalTodayAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{salesToday.length} Ventas</p>
                            </div>

                            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Método de Pago</span>
                              <p className="text-[10px] font-black text-slate-700">💵 ${cashSales.toFixed(0)} Efe</p>
                              <p className="text-[10px] font-black text-indigo-500 mt-1">💳 ${transferSales.toFixed(0)} Trf</p>
                            </div>

                            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Canales / Origen</span>
                              <p className="text-[10px] font-black text-slate-700">🏪 {posCount} Mostrador</p>
                              <p className="text-[10px] font-black text-emerald-600 mt-1">💬 {whatsappCount} WhatsApp</p>
                            </div>
                          </div>

                          {/* Tabla de Historial */}
                          <div className="space-y-3">
                            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Listado de Ventas Entregadas ({empSales.length})</h5>
                            {empSales.length === 0 ? (
                              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100 border-dashed text-slate-400 italic text-xs uppercase tracking-wider">
                                No se registran ventas para este empleado.
                              </div>
                            ) : (
                              <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-inner max-h-[350px] overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest sticky top-0 border-b border-slate-100">
                                    <tr>
                                      <th className="px-4 py-3">Folio</th>
                                      <th className="px-4 py-3">Cliente</th>
                                      <th className="px-4 py-3">Artículos</th>
                                      <th className="px-4 py-3">Fuente</th>
                                      <th className="px-4 py-3 text-right">Total</th>
                                      <th className="px-4 py-3 text-right">Fecha</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-xs">
                                    {empSales.map((sale) => (
                                      <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3.5 font-mono text-[9px] font-black text-slate-400">#{sale.id.slice(0, 8).toUpperCase()}</td>
                                        <td className="px-4 py-3.5 font-black text-slate-700 italic">{sale.customer_name || 'Mostrador'}</td>
                                        <td className="px-4 py-3.5 text-slate-500 max-w-[150px] truncate" title={sale.items}>{sale.items || '-'}</td>
                                        <td className="px-4 py-3.5">
                                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                                            sale.source === 'whatsapp' ? 'bg-emerald-50 text-emerald-600' :
                                            sale.source === 'pos' || sale.source === 'local' ? 'bg-sky-50 text-sky-600' :
                                            'bg-slate-100 text-slate-600'
                                          }`}>
                                            {sale.source === 'whatsapp' ? 'WhatsApp' : sale.source === 'pos' || sale.source === 'local' ? 'Mostrador' : 'Reparto'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-black text-slate-800">${Number(sale.total_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3.5 text-right text-[10px] text-slate-400">{new Date(sale.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <div className="w-16 h-16 rounded-[24px] bg-sky-50 text-sky-500 flex items-center justify-center mb-4 border border-sky-100 shadow-sm shadow-sky-500/5">
                        <Award size={28} className="animate-bounce" />
                      </div>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Ningún Colaborador Seleccionado</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 max-w-sm leading-relaxed">
                        Selecciona un empleado de la lista para analizar a detalle su volumen de ventas, métodos de cobro, historial de entregas y generar sus reportes PDF y Excel individuales.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {showNewEmployeeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingEmployee && setShowNewEmployeeModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase italic">Alta de <span className="text-sky-500">Empleado</span></h3>
                <button 
                  onClick={() => setShowNewEmployeeModal(false)}
                  disabled={isSavingEmployee}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-0"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleNewEmployeeSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Trabajador</label>
                  <input name="name" required type="text" placeholder="Ej. Juan Pérez" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol / Puesto Operativo</label>
                  <select name="role" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold appearance-none">
                    <option value="driver">Chofer / Repartidor</option>
                    <option value="operator">Operador de Planta</option>
                    <option value="supervisor">Supervisor de Turno</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono Móvil</label>
                  <input name="phone" required type="tel" placeholder="55 0000 0000" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                </div>

                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-700 mt-2">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed italic">
                    Al registrar un nuevo empleado, tendrá acceso a las funciones correspondientes a su rol en el dispositivo móvil de la planta.
                  </p>
                </div>

                <button 
                  type="submit"
                  disabled={isSavingEmployee}
                  className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-slate-800 transition-all active:scale-95 mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingEmployee ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    'Guardar Empleado'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
        {showNewCustomerModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingCustomer && handleCloseCustomerModal()}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase italic">{editingCustomer ? 'Editar' : 'Alta de'} <span className="text-sky-500">Cliente</span></h3>
                <button 
                  onClick={handleCloseCustomerModal}
                  disabled={isSavingCustomer}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-0"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleNewCustomerSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                  <input name="name" required type="text" defaultValue={editingCustomer?.name || ''} placeholder="Ej. Residencial Palmas" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alias / Identificador Corto (Opcional)</label>
                  <input name="alias" type="text" defaultValue={editingCustomer?.alias || ''} placeholder="Ej. Palmas 3, Ofi Carlos, Don Pedro" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Colonia / Zona</label>
                  <input name="address" required type="text" defaultValue={editingCustomer?.address || ''} placeholder="Ej. Santa Fe" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                    <input name="phone" required type="tel" defaultValue={editingCustomer?.phone || ''} placeholder="55 1234 5678" className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nivel</label>
                    <select name="tier" defaultValue={editingCustomer?.tier || 'frequent'} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold appearance-none">
                      <option value="frequent">Frecuente</option>
                      <option value="vip">VIP</option>
                      <option value="company">Empresa</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Link de Ubicación (Google Maps / Waze)</label>
                  <input 
                    name="geolocation_url"
                    type="url" 
                    defaultValue={editingCustomer?.geolocation_url || ''}
                    placeholder="https://maps.google.com/..." 
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-bold" 
                  />
                </div>

                <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 mt-2">
                  <p className="text-[9px] text-sky-600 font-bold uppercase tracking-tight leading-relaxed italic">
                    Al guardar este cliente, se le asignará automáticamente un folio de seguimiento y se activará su historial de pedidos.
                  </p>
                </div>

                 <button 
                  type="submit"
                  disabled={isSavingCustomer}
                  className="w-full bg-sky-500 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-sky-500/20 hover:bg-sky-600 transition-all active:scale-95 mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingCustomer ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    editingCustomer ? 'Guardar Cambios' : 'Guardar Cliente'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
        {showDebtModal && debtCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !processingPayment && setShowDebtModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-6 sm:p-8 max-h-[92vh] md:max-h-[90vh] flex flex-col justify-between"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h3 className="text-xl font-black text-slate-800 uppercase italic">
                  Cobro de <span className="text-rose-500">Adeudo</span>
                </h3>
                <button 
                  onClick={() => setShowDebtModal(false)}
                  disabled={processingPayment}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-0"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 text-left space-y-4">
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente Seleccionado</p>
                  <p className="text-base font-black text-slate-800 uppercase italic mt-1">{debtCustomer.name}</p>
                  <p className="text-xs text-slate-500 font-bold mt-1 uppercase">{debtCustomer.address || 'Sin dirección registrada'}</p>
                  <div className="flex justify-between items-center bg-rose-50 border border-rose-100 p-3 rounded-2xl mt-3">
                    <span className="text-xs font-black text-rose-800 uppercase font-sans">Adeudo Pendiente:</span>
                    <span className="text-lg font-black text-rose-600 font-sans">${getCustomerDebt(debtCustomer.name).toFixed(2)}</span>
                  </div>
                </div>

                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                  Historial a Cobrar (Se jala automáticamente)
                </h4>
                
                <div className="overflow-y-auto max-h-40 space-y-2 mb-4 text-left scrollbar-thin">
                  {getCustomerDebtOrders(debtCustomer.name).length > 0 ? (
                    getCustomerDebtOrders(debtCustomer.name).map((order) => (
                      <div key={order.id} className="p-3 bg-white border border-slate-200 rounded-2xl flex justify-between items-center shadow-sm">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-[10px] font-black text-sky-500">#{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-[10px] text-slate-600 font-bold uppercase mt-1 truncate">{order.items}</p>
                          <p className="text-[8px] text-slate-400 font-bold">
                            {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className="text-xs font-black text-rose-600 shrink-0 bg-rose-50 px-2.5 py-1 rounded-xl font-mono">
                          ${Number(order.total_price || 0).toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-xs">
                      No hay historial pendiente de cobro.
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-left">
                  <label htmlFor="paymentInput" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Monto a Cobrar e Ingresar a Caja ($):
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">$</span>
                    <input 
                      type="number"
                      id="paymentInput"
                      min="0.01"
                      step="0.01"
                      max={getCustomerDebt(debtCustomer.name)}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Math.min(getCustomerDebt(debtCustomer.name), parseFloat(e.target.value) || 0))}
                      className="w-full pl-8 pr-16 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-black text-lg focus:ring-2 focus:ring-sky-500 outline-none placeholder-slate-400"
                    />
                    <button 
                      onClick={() => setPaymentAmount(getCustomerDebt(debtCustomer.name))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded-lg uppercase"
                    >
                      Completo
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 shrink-0">
                <button
                  onClick={handleApplyDebtPayment}
                  disabled={processingPayment || paymentAmount <= 0}
                  className="w-full bg-emerald-500 text-white py-4 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
                >
                  {processingPayment ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Registrando Pago...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirmar Cobro y Liquidar</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL DE EDICIÓN DE VIAJE/RUTA */}
        {editingTrip && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                    <Truck size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-wider">
                      Editar Viaje #{editingTrip.trip_number}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {editingTrip.driverName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingTrip(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {/* Repartidor */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Asignar a Repartidor (Cambiar si es necesario)
                  </label>
                  <select
                    value={editTripDriver}
                    onChange={(e) => setEditTripDriver(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20"
                  >
                    {employeesList.filter(e => e.role === 'driver' || e.role === 'repartidor').map(drv => (
                      <option key={drv.id} value={drv.name}>{drv.name}</option>
                    ))}
                  </select>
                </div>

                {/* Ruta */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Ruta de Asignación
                  </label>
                  <select
                    value={editTripRoute}
                    onChange={(e) => setEditTripRoute(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="1.- Santa Cruz">1.- Santa Cruz</option>
                    <option value="2.- San Miguel-Centro">2.- San Miguel-Centro</option>
                    <option value="3.- La Francia-Los Reyes">3.- La Francia-Los Reyes</option>
                    <option value="4.- Planta o Local">4.- Planta o Local</option>
                    <option value="5.- Llamadas Telefónicas">5.- Llamadas Telefónicas</option>
                    <option value="6.- WhatsApp">6.- WhatsApp</option>
                  </select>
                </div>

                {/* Cantidades cargadas */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Carga de Envases
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Rosas */}
                    <div className="flex flex-col gap-1 bg-rose-50/40 p-3 rounded-xl border border-rose-100">
                      <span className="text-[9px] font-black text-rose-700 uppercase">🌸 Rosas</span>
                      <input
                        type="number"
                        min="0"
                        value={editTripRosa}
                        onChange={(e) => setEditTripRosa(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-rose-200/55 rounded-lg px-2.5 py-1.5 text-xs font-black text-rose-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>

                    {/* Azules */}
                    <div className="flex flex-col gap-1 bg-sky-50/40 p-3 rounded-xl border border-sky-100">
                      <span className="text-[9px] font-black text-sky-700 uppercase">🔷 Azules</span>
                      <input
                        type="number"
                        min="0"
                        value={editTripAzul}
                        onChange={(e) => setEditTripAzul(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-sky-200/55 rounded-lg px-2.5 py-1.5 text-xs font-black text-sky-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>

                    {/* Color */}
                    <div className="flex flex-col gap-1 bg-purple-50/40 p-3 rounded-xl border border-purple-100">
                      <span className="text-[9px] font-black text-purple-700 uppercase">🌈 De Color</span>
                      <input
                        type="number"
                        min="0"
                        value={editTripColor}
                        onChange={(e) => setEditTripColor(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-purple-200/55 rounded-lg px-2.5 py-1.5 text-xs font-black text-purple-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    {/* Pequeño */}
                    <div className="flex flex-col gap-1 bg-amber-50/40 p-3 rounded-xl border border-amber-100">
                      <span className="text-[9px] font-black text-amber-700 uppercase">🍼 Pequeños</span>
                      <input
                        type="number"
                        min="0"
                        value={editTripPequeno}
                        onChange={(e) => setEditTripPequeno(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-amber-200/55 rounded-lg px-2.5 py-1.5 text-xs font-black text-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    {/* Lavar */}
                    <div className="flex flex-col gap-1 bg-slate-50 p-3 rounded-xl border border-slate-200 col-span-2">
                      <span className="text-[9px] font-black text-slate-700 uppercase">🧼 A Lavar</span>
                      <input
                        type="number"
                        min="0"
                        value={editTripLavar}
                        onChange={(e) => setEditTripLavar(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Estatus */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Estatus del Viaje
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditTripStatus('active')}
                      className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider border transition-all ${
                        editTripStatus === 'active'
                          ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      En Ruta
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditTripStatus('closed')}
                      className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider border transition-all ${
                        editTripStatus === 'closed'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Liquidado
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-slate-100 shrink-0">
                <button
                  onClick={handleSaveTripEdit}
                  className="w-full bg-sky-500 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={14} />
                  Guardar Cambios del Viaje
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
