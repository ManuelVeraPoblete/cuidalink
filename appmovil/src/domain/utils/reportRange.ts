import { localDateString } from './localDate';

/** Diferencia máxima en días entre "desde" y "hasta" que acepta el backend. */
export const MAX_REPORT_DAYS = 90;

export type ReportRange = { from: string; to: string };

/** Rango de los últimos `days` días, incluyendo hoy. */
export function presetRange(days: number, today: Date = new Date()): ReportRange {
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  return { from: localDateString(from), to: localDateString(today) };
}

function toUtcDay(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** Devuelve un mensaje de error, o null si el rango es válido. */
export function validateReportRange(from: string, to: string, today: Date = new Date()): string | null {
  if (to > localDateString(today)) return 'La fecha "Hasta" no puede ser futura.';
  if (from > to) return 'La fecha "Desde" debe ser anterior o igual a "Hasta".';
  if (toUtcDay(to) - toUtcDay(from) > MAX_REPORT_DAYS) return `El rango no puede superar ${MAX_REPORT_DAYS} días.`;
  return null;
}
