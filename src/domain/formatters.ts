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

export interface MonthOptionGroup {
  year: number;
  label: string;
  options: { label: string; value: string }[];
}

/**
 * Generates structured month options spanning across multiple years.
 * By default covers from (currentYear - 2) to (currentYear + 6) -> 9 years total.
 * E.g., in 2026: covers 2024 through 2032!
 * Automatically includes any year requested in ensureYearOrMonth.
 */
export function generateMultiYearMonthOptions(
  ensureYearOrMonth?: string | number,
  startYearOffset = -2,
  endYearOffset = 6
): MonthOptionGroup[] {
  const currentYear = new Date().getFullYear();
  let startYear = currentYear + startYearOffset;
  let endYear = currentYear + endYearOffset;

  if (ensureYearOrMonth) {
    const y =
      typeof ensureYearOrMonth === 'number'
        ? ensureYearOrMonth
        : parseInt(String(ensureYearOrMonth).split('-')[0], 10);
    if (!isNaN(y)) {
      if (y < startYear) startYear = y;
      if (y > endYear) endYear = y;
    }
  }

  const groups: MonthOptionGroup[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const options = ID_MONTHS.map((mName, idx) => ({
      label: `${mName} ${y}`,
      value: `${y}-${String(idx + 1).padStart(2, '0')}`,
    }));
    groups.push({
      year: y,
      label: `Tahun ${y}`,
      options,
    });
  }

  return groups;
}

export function getFlatMultiYearMonthOptions(
  ensureYearOrMonth?: string | number,
  startYearOffset = -2,
  endYearOffset = 6
): { label: string; value: string; year: number }[] {
  const groups = generateMultiYearMonthOptions(ensureYearOrMonth, startYearOffset, endYearOffset);
  return groups.flatMap((g) => g.options.map((opt) => ({ ...opt, year: g.year })));
}

