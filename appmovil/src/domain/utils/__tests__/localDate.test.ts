import { localDateString } from '../localDate';

describe('localDateString', () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = 'America/Santiago';
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it('devuelve la fecha local de noche, cuando en UTC ya es el día siguiente', () => {
    expect(localDateString(new Date(2026, 8, 28, 22, 30))).toBe('2026-09-28');
  });

  it('devuelve la fecha local justo después de medianoche', () => {
    expect(localDateString(new Date(2026, 8, 29, 0, 5))).toBe('2026-09-29');
  });

  it('rellena mes y día con cero a la izquierda', () => {
    expect(localDateString(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
  });

  it('usa la fecha actual cuando no recibe argumento', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 28, 23, 59));
    expect(localDateString()).toBe('2026-09-28');
    jest.useRealTimers();
  });
});
