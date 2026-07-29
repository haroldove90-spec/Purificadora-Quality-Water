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

export const getStartOfWeekLocalDate = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return getLocalDateString(d);
};

export const getStartOfMonthLocalDate = (): string => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return getLocalDateString(d);
};
