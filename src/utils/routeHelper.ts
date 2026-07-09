export const getOrderRoute = (order: any): string => {
  if (!order) return '4.- Planta o Local';
  
  // 1. If explicit route column exists, try matching it
  let rawRoute = order.route || '';
  
  // 2. If [Ruta: ...] is embedded in items
  const match = order.items?.match(/\[Ruta:\s*([^\]]+)\]/);
  if (match) rawRoute = match[1];

  // 3. Normalize route if rawRoute is present
  if (rawRoute) {
    const routeLower = rawRoute.toLowerCase();
    if (routeLower.includes('santa cruz') || routeLower.includes('1.-') || routeLower.includes('santa_cruz')) return '1.- Santa Cruz';
    if (routeLower.includes('san miguel') || routeLower.includes('centro') || routeLower.includes('2.-')) return '2.- San Miguel-Centro';
    if (routeLower.includes('la francia') || routeLower.includes('reyes') || routeLower.includes('los reyes') || routeLower.includes('3.-')) return '3.- La Francia-Los Reyes';
    if (routeLower.includes('planta') || routeLower.includes('local') || routeLower.includes('4.-')) return '4.- Planta o Local';
    if (routeLower.includes('llamadas') || routeLower.includes('whatsapp') || routeLower.includes('telefono') || routeLower.includes('5.-')) return '5.- llamadas Telefónicas y WhatsApp';
  }
  
  // 4. Fallbacks based on source and driver assignments
  const source = (order.source || '').toLowerCase();
  const driverName = (order.assigned_to_name || '').toLowerCase();

  // If order items specifies origin or is labeled WhatsApp
  if (order.items?.includes('[Origen: WhatsApp]')) {
    return '5.- llamadas Telefónicas y WhatsApp';
  }
  if (order.items?.includes('[Origen: Mostrador]')) {
    return '4.- Planta o Local';
  }

  if (source === 'pos' || source === 'local' || order.address?.includes('| Planta') || order.address?.includes('Mostrador')) {
    if (!order.assigned_to_name || driverName.includes('mostrador') || driverName.includes('planta')) {
      return '4.- Planta o Local';
    }
  }

  if (source === 'whatsapp' || source === 'phone' || source === 'whatsapp_chat') {
    if (!order.assigned_to_name) {
      return '5.- llamadas Telefónicas y WhatsApp';
    }
  }

  if (order.assigned_to_name) {
    if (driverName.includes('mario') || driverName.includes('santos') || driverName.includes('santa cruz')) {
      return '1.- Santa Cruz';
    }
    if (driverName.includes('mostrador') || driverName.includes('planta')) {
      return '4.- Planta o Local';
    }
    if (driverName.includes('francia') || driverName.includes('reyes')) {
      return '3.- La Francia-Los Reyes';
    }
    return '2.- San Miguel-Centro';
  }

  return '4.- Planta o Local';
};

