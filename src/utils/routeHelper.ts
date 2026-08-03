export const getOrderRoute = (order: any): string => {
  if (!order) return '4.- Planta o Local';
  
  const driverName = (order.assigned_to_name || '').toLowerCase().trim();
  const isDriverAssigned = Boolean(
    driverName && 
    !driverName.includes('mostrador') && 
    !driverName.includes('planta') && 
    !driverName.includes('operador') &&
    !driverName.includes('whatsapp') &&
    !driverName.includes('teléfono') &&
    !driverName.includes('llamada')
  );

  // 1. Raw route explicitly provided in order object
  let rawRoute = order.route || order.assigned_route || '';
  
  // 2. If [Ruta: ...] is embedded in items text
  const match = order.items?.match(/\[Ruta:\s*([^\]]+)\]/);
  if (match) rawRoute = match[1];

  // 3. Normalize rawRoute if present
  if (rawRoute && rawRoute.trim()) {
    const routeLower = rawRoute.toLowerCase();
    if (routeLower.includes('santa cruz') || routeLower.includes('1.-') || routeLower.includes('ruta 1') || routeLower.includes('santa_cruz')) return '1.- Santa Cruz';
    if (routeLower.includes('la francia') || routeLower.includes('reyes') || routeLower.includes('los reyes') || routeLower.includes('3.-') || routeLower.includes('ruta 3') || routeLower.includes('francia')) return '3.- La Francia-Los Reyes';
    if (routeLower.includes('san miguel') || routeLower.includes('centro') || routeLower.includes('2.-') || routeLower.includes('ruta 2')) return '2.- San Miguel-Centro';
    if (routeLower.includes('whatsapp') || routeLower.includes('6.-') || routeLower.includes('ruta 6')) return '6.- WhatsApp';
    if (routeLower.includes('llamadas') || routeLower.includes('telefono') || routeLower.includes('5.-') || routeLower.includes('ruta 5')) return '5.- Llamadas Telefónicas';
    
    // If rawRoute is "4.- Planta o Local" BUT an actual driver is assigned, fall through to check address/items or driver mapping
    if (routeLower.includes('planta') || routeLower.includes('local') || routeLower.includes('mostrador') || routeLower.includes('4.-') || routeLower.includes('ruta 4')) {
      if (!isDriverAssigned) {
        return '4.- Planta o Local';
      }
    } else {
      return rawRoute.trim();
    }
  }

  // 4. Check address and items text for explicit route keywords
  const textContext = `${order.address || ''} ${order.items || ''}`.toLowerCase();
  if (textContext.includes('la francia') || textContext.includes('los reyes') || textContext.includes('reyes') || textContext.includes('francia')) {
    return '3.- La Francia-Los Reyes';
  }
  if (textContext.includes('santa cruz') || textContext.includes('santa_cruz')) {
    return '1.- Santa Cruz';
  }
  if (textContext.includes('san miguel') || textContext.includes('centro')) {
    return '2.- San Miguel-Centro';
  }

  // 5. Driver name mapping
  if (isDriverAssigned) {
    if (driverName.includes('juan') || driverName.includes('mario') || driverName.includes('santos') || driverName.includes('santa cruz') || driverName.includes('ruta 1')) {
      return '1.- Santa Cruz';
    }
    if (driverName.includes('luis') || driverName.includes('francia') || driverName.includes('reyes') || driverName.includes('la francia') || driverName.includes('ruta 3')) {
      return '3.- La Francia-Los Reyes';
    }
    if (driverName.includes('hector') || driverName.includes('héctor') || driverName.includes('miguel') || driverName.includes('centro') || driverName.includes('ruta 2')) {
      return '2.- San Miguel-Centro';
    }
    return '2.- San Miguel-Centro';
  }

  // 6. Fallbacks based on source
  const source = (order.source || '').toLowerCase();
  if (order.items?.includes('[Origen: WhatsApp]') || source === 'whatsapp' || source === 'whatsapp_chat') {
    return '6.- WhatsApp';
  }
  if (source === 'phone') {
    return '5.- Llamadas Telefónicas';
  }

  return '4.- Planta o Local';
};


