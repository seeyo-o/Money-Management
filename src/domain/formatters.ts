/**
 * Domain Formatter: Indonesian Rupiah (IDR) & Date Standards
 */

export function formatIDR(value: number, withPrefix = true): string {
  if (isNaN(value) || value === null || value === undefined) {
    return withPrefix ? 'Rp 0' : '0';
  }

  const isNegative = value < 0;
  const absValue = Math.round(Math.abs(value));

  // Dot as thousands separator (e.g. 1.250.000)
  const formatted = absValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (withPrefix) {
    return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`;
  }
  return isNegative ? `-${formatted}` : formatted;
}

export function formatCompactIDR(value: number): string {
  if (isNaN(value)) return 'Rp 0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1).replace('.0', '')}M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace('.0', '')}jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${(abs / 1_000).toFixed(0)}rb`;
  }
  return `${sign}Rp ${abs}`;
}

export function parseSmartAmount(input: string | number): number {
  if (typeof input === 'number') return Math.max(0, input);
  if (!input || typeof input !== 'string') return 0;

  const clean = input.trim().toLowerCase().replace(/rp\s*/g, '');

  if (clean.includes('jt') || clean.endsWith('m')) {
    const numPart = clean.replace(/jt|m/g, '').replace(/\./g, '').replace(/,/g, '.').trim();
    const val = parseFloat(numPart);
    return isNaN(val) ? 0 : Math.round(val * 1_000_000);
  }

  if (clean.includes('k') || clean.includes('rb')) {
    const numPart = clean.replace(/k|rb/g, '').replace(/\./g, '').replace(/,/g, '.').trim();
    const val = parseFloat(numPart);
    return isNaN(val) ? 0 : Math.round(val * 1_000);
  }

  const numericOnly = clean.replace(/\D/g, '');
  const parsed = parseInt(numericOnly, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export const ID_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const ID_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

export function formatDateID(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = ID_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

export function formatShortDateID(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = ID_MONTHS_SHORT[d.getMonth()];
    return `${day} ${month}`;
  } catch {
    return dateStr;
  }
}

export function getMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const mIndex = parseInt(month, 10) - 1;
  return `${ID_MONTHS[mIndex] || month} ${year}`;
}
