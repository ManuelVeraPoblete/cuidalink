import { presetRange, validateReportRange } from '../reportRange';

const today = new Date(2026, 8, 28, 22, 30);

describe('presetRange', () => {
  it('últimos 7 días incluye hoy', () => {
    expect(presetRange(7, today)).toEqual({ from: '2026-09-22', to: '2026-09-28' });
  });

  it('últimos 30 días cruza el cambio de mes', () => {
    expect(presetRange(30, today)).toEqual({ from: '2026-08-30', to: '2026-09-28' });
  });

  it('últimos 90 días', () => {
    expect(presetRange(90, today)).toEqual({ from: '2026-07-01', to: '2026-09-28' });
  });
});

describe('validateReportRange', () => {
  it('acepta un rango válido', () => {
    expect(validateReportRange('2026-09-01', '2026-09-28', today)).toBeNull();
  });

  it('acepta un rango de un solo día', () => {
    expect(validateReportRange('2026-09-28', '2026-09-28', today)).toBeNull();
  });

  it('acepta exactamente 90 días de diferencia (límite del backend)', () => {
    expect(validateReportRange('2026-06-30', '2026-09-28', today)).toBeNull();
  });

  it('rechaza más de 90 días de diferencia', () => {
    expect(validateReportRange('2026-06-29', '2026-09-28', today)).toBe('El rango no puede superar 90 días.');
  });

  it('rechaza "Desde" posterior a "Hasta"', () => {
    expect(validateReportRange('2026-09-20', '2026-09-10', today)).toBe('La fecha "Desde" debe ser anterior o igual a "Hasta".');
  });

  it('rechaza "Hasta" en el futuro', () => {
    expect(validateReportRange('2026-09-20', '2026-09-29', today)).toBe('La fecha "Hasta" no puede ser futura.');
  });
});
