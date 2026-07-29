const removeAccents = (str: string): string => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/**
 * Helper to normalize and unify employee names across the system.
 * Handles Name Inversion (Gomez Aleman Luis Alberto -> Luis Alberto Gomez Aleman)
 * and Aliases (Juan Luis guerrero sanchez -> Gil).
 */
export const normalizeEmployeeName = (name?: string | null): string => {
  if (!name) return '';
  
  const trimmed = name.trim();
  const cleanStr = removeAccents(trimmed);
  const lowerClean = cleanStr.toLowerCase().replace(/\s+/g, ' ');

  // 1. Synonym / Alias Mapping: Resolve 'Gil' or variations to full correct name 'Juan Luis Guerrero Sanchez'
  if (
    lowerClean === 'gil' || 
    lowerClean === 'juan luis guerrero sanchez' || 
    lowerClean === 'juan luis guerrero' || 
    lowerClean === 'guerrero sanchez juan luis' ||
    lowerClean.includes('guerrero sanchez') ||
    (lowerClean.includes('juan luis') && lowerClean.includes('guerrero')) ||
    lowerClean === 'g'
  ) {
    return 'Juan Luis Guerrero Sanchez';
  }

  // 2. Name Inversion checking for Luis Alberto Gomez Aleman
  const sortedWords = lowerClean.split(' ').sort().filter(w => w.length > 1).join(' ');
  const targetSortedGomez = 'luis alberto gomez aleman'.split(' ').sort().filter(w => w.length > 1).join(' ');
  
  if (
    sortedWords === targetSortedGomez ||
    (lowerClean.includes('gomez') && lowerClean.includes('aleman') && lowerClean.includes('luis'))
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
  const n1 = removeAccents(normalizeEmployeeName(name1)).toLowerCase().replace(/\s+/g, ' ').trim();
  const n2 = removeAccents(normalizeEmployeeName(name2)).toLowerCase().replace(/\s+/g, ' ').trim();
  return n1 === n2;
};

/**
 * Returns the current local date of the user in YYYY-MM-DD format, avoiding timezone timezone shifts from UTC.
 */
export const getLocalDateString = (input?: Date | string | null): string => {
  if (!input) {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
