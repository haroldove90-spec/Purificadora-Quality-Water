/**
 * Helper to normalize and unify employee names across the system.
 * Handles Name Inversion (Gomez Aleman Luis Alberto -> Luis Alberto Gomez Aleman)
 * and Aliases (Juan Luis guerrero sanchez -> Gil).
 */
export const normalizeEmployeeName = (name?: string | null): string => {
  if (!name) return '';
  
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase().replace(/\s+/g, ' ');

  // 1. Synonym / Alias Mapping: Resolve 'Gil' or variations to full correct name 'Juan Luis Guerrero Sanchez'
  if (
    lower === 'gil' || 
    lower === 'juan luis guerrero sanchez' || 
    lower === 'juan luis guerrero' || 
    lower === 'guerrero sanchez juan luis' ||
    lower.includes('guerrero sanchez') ||
    (lower.includes('juan luis') && lower.includes('guerrero')) ||
    lower === 'g'
  ) {
    return 'Juan Luis Guerrero Sanchez';
  }

  // 2. Name Inversion checking for Luis Alberto Gomez Aleman
  const sortedWords = lower.split(' ').sort().filter(w => w.length > 1).join(' ');
  const targetSortedGomez = 'luis alberto gomez aleman'.toLowerCase().split(' ').sort().filter(w => w.length > 1).join(' ');
  
  if (
    sortedWords === targetSortedGomez ||
    (lower.includes('gomez') && lower.includes('aleman') && lower.includes('luis'))
  ) {
    return 'Luis Alberto Gomez Aleman';
  }

  // 3. Clean and generic name-first formatting for common other inversions if detected
  // Title-casing general names
  return trimmed
    .split(' ')
    .map(word => {
      if (!word) return '';
      const lowerWord = word.toLowerCase();
      // Keep spanish prepositions/connectors lowercase
      if (['de', 'la', 'del', 'y', 'los', 'las'].includes(lowerWord)) {
        return lowerWord;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Compare two names flexibly, normalising both first.
 */
export const namesMatch = (name1?: string | null, name2?: string | null): boolean => {
  if (!name1 || !name2) return false;
  const n1 = normalizeEmployeeName(name1).toLowerCase().replace(/\s+/g, ' ').trim();
  const n2 = normalizeEmployeeName(name2).toLowerCase().replace(/\s+/g, ' ').trim();
  return n1 === n2;
};
