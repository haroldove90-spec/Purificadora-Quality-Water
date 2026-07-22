export const getGarrafonesCount = (itemsStr: string): number => {
  if (!itemsStr) return 0;
  
  // Split items by comma, newline or plus
  const parts = itemsStr.split(/,|\n|\+/);
  let total = 0;
  
  parts.forEach(part => {
    const trimmed = part.trim();
    if (!trimmed) return;
    
    // Skip status flags or non-product tags
    if (trimmed.includes('[SALDO') || trimmed.includes('[RECOGER DE CLIENTE-LAVADO]')) return;
    
    // Match patterns like: "2x Garrafón", "2 Garrafones", "2 Garrafón 20L", "3 G. Grandes", "1 Garrafón Rosa"
    const match = trimmed.match(/(\d+)\s*x?\s*(garrafón|garrafon|garrafones|garr|g\.|envase|llenado|rosa|azul|color|pequeño|pequeno|20l|19l)/i);
    if (match) {
      total += parseInt(match[1], 10);
    } else {
      // Fallback if line starts with a number like "2 ..."
      const fallback = trimmed.match(/^(\d+)/);
      if (fallback) {
        if (/garraf|garr|g\.|envase|llenado|rosa|azul|color|pequeño|pequeno/i.test(trimmed)) {
          total += parseInt(fallback[1], 10);
        } else if (!/botella|hielo|sello|bolsa/i.test(trimmed)) {
          // If no other non-jug product is specified, assume default garrafones
          total += parseInt(fallback[1], 10);
        }
      }
    }
  });
  
  // Safety check: if total is still 0 but string mentions garrafones and contains a digit
  if (total === 0 && /garraf|garr|g\.|envase/i.test(itemsStr)) {
    const singleMatch = itemsStr.match(/(\d+)/);
    if (singleMatch) total = parseInt(singleMatch[1], 10);
  }

  return total;
};
