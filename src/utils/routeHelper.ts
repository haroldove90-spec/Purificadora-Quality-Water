export const getOrderRoute = (order: any): string => {
  if (!order) return '4.- Planta o Local';
  
  // 1. Raw route explicitly provided in order object
  let rawRoute = order.assigned_route || order.route || '';
  
  // 2. If [Ruta: ...] is embedded in items text
  const match = order.items?.match(/\[Ruta:\s*([^\]]+)\]/i);
  if (match && match[1]) rawRoute = match[1].trim();

  // 3. Normalize rawRoute if present
  if (rawRoute && rawRoute.trim()) {
    const routeLower = rawRoute.toLowerCase().trim();
    if (routeLower.includes('santa cruz') || routeLower.includes('santa_cruz') || routeLower.startsWith('1.-') || routeLower === 'ruta 1') {
      return '1.- Santa Cruz';
    }
    if (routeLower.includes('san miguel') || routeLower.startsWith('2.-') || routeLower === 'ruta 2') {
      return '2.- San Miguel-Centro';
    }
    if (routeLower.includes('la francia') || routeLower.includes('los reyes') || routeLower.includes('francia') || routeLower.startsWith('3.-') || routeLower === 'ruta 3') {
      return '3.- La Francia-Los Reyes';
    }
    if (routeLower.includes('whatsapp') || routeLower.startsWith('6.-')) {
      return '6.- WhatsApp';
    }
    if (routeLower.includes('llamadas') || routeLower.includes('telefono') || routeLower.includes('teléfono') || routeLower.startsWith('5.-')) {
      return '5.- Llamadas Telefónicas';
    }
    if (routeLower.includes('planta') || routeLower.includes('local') || routeLower.includes('mostrador') || routeLower.startsWith('4.-')) {
      // If it says Planta/Local, keep it as Planta o Local
      return '4.- Planta o Local';
    }
    return rawRoute.trim();
  }

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

  // 4. Check address and items text for explicit route keywords
  const textContext = `${order.address || ''} ${order.items || ''}`.toLowerCase();
  if (textContext.includes('santa cruz') || textContext.includes('santa_cruz') || textContext.includes('sta cruz') || textContext.includes('sta. cruz')) {
    return '1.- Santa Cruz';
  }
  if (textContext.includes('san miguel')) {
    return '2.- San Miguel-Centro';
  }
  if (textContext.includes('la francia') || textContext.includes('los reyes') || textContext.includes('reyes') || textContext.includes('francia')) {
    return '3.- La Francia-Los Reyes';
  }

  // 5. Driver name mapping (specific, never wildcard fallbacks)
  if (isDriverAssigned) {
    if (driverName.includes('santos') || driverName.includes('santa cruz') || driverName.includes('mario') || driverName.includes('ruta 1')) {
      return '1.- Santa Cruz';
    }
    if (driverName.includes('luis') || driverName.includes('francia') || driverName.includes('ruta 3')) {
      return '3.- La Francia-Los Reyes';
    }
    if (driverName.includes('hector') || driverName.includes('héctor') || driverName.includes('miguel') || driverName.includes('ruta 2')) {
      return '2.- San Miguel-Centro';
    }
    // If driver is not mapped and text mentions centro explicitly with san miguel
    if (textContext.includes('colonia centro') || textContext.includes('zona centro')) {
      return '2.- San Miguel-Centro';
    }
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


