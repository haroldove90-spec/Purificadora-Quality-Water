export const getOrderRoute = (order: any): string => {
  if (!order) return 'Venta planta';
  
  // 1. If explicit route column exists
  if (order.route) return order.route;
  
  // 2. If [Ruta: ...] is embedded in items
  const match = order.items?.match(/\[Ruta:\s*([^\]]+)\]/);
  if (match) return match[1];

  // 3. Fallbacks based on business logic
  const source = (order.source || '').toLowerCase();
  const driverName = (order.assigned_to_name || '').toLowerCase();

  if (source === 'pos' || source === 'local' || order.address?.includes('| Planta') || order.address?.includes('Mostrador')) {
    if (!order.assigned_to_name || driverName.includes('mostrador') || driverName.includes('planta')) {
      return 'Venta planta';
    }
  }

  if (source === 'whatsapp' || source === 'phone' || source === 'whatsapp_chat') {
    if (!order.assigned_to_name) {
      return 'Llamadas telefónicas - whatsapp';
    }
  }

  if (order.assigned_to_name) {
    if (driverName.includes('mario') || driverName.includes('santos') || driverName.includes('santa cruz')) {
      return 'Ruta Santa Cruz';
    }
    if (driverName.includes('mostrador') || driverName.includes('planta')) {
      return 'Venta planta';
    }
    return 'Ruta Centro';
  }

  return 'Venta planta';
};
