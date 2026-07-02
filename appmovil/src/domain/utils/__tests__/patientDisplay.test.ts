import { calcAge, nextPendingLog, needsAttention } from '../patientDisplay';
import { MedicationLog } from '@/domain/entities';

describe('calcAge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-02T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calcula la edad cuando el cumpleaños ya pasó este año', () => {
    expect(calcAge('1948-01-15')).toBe(78);
  });

  it('calcula la edad cuando el cumpleaños todavía no ocurre este año', () => {
    expect(calcAge('1948-12-15')).toBe(77);
  });
});

describe('nextPendingLog', () => {
  const logs: MedicationLog[] = [
    { id: '1', medicationId: 'm1', medicationName: 'Paracetamol', dosage: '500mg', instructions: 'Take with water', type: 'TABLET', scheduledAt: '2026-07-02T14:00:00Z', status: 'PENDING' },
    { id: '2', medicationId: 'm2', medicationName: 'Ibuprofeno', dosage: '400mg', instructions: 'Take with food', type: 'TABLET', scheduledAt: '2026-07-02T09:00:00Z', status: 'PENDING' },
    { id: '3', medicationId: 'm3', medicationName: 'Aspirina', dosage: '100mg', instructions: 'Once daily', type: 'TABLET', scheduledAt: '2026-07-02T08:00:00Z', status: 'CONFIRMED' },
  ];

  it('retorna el log PENDING más próximo en el tiempo', () => {
    expect(nextPendingLog(logs)?.id).toBe('2');
  });

  it('retorna undefined cuando no hay logs PENDING', () => {
    expect(nextPendingLog([logs[2]])).toBeUndefined();
  });

  it('retorna undefined cuando logs es undefined', () => {
    expect(nextPendingLog(undefined)).toBeUndefined();
  });
});

describe('needsAttention', () => {
  const makeLog = (status: MedicationLog['status']): MedicationLog => ({
    id: '1', medicationId: 'm1', medicationName: 'X', dosage: '1', instructions: 'Take as needed', type: 'TABLET', scheduledAt: '2026-07-02T09:00:00Z', status,
  });

  it('retorna true cuando hay un log ESCALATED', () => {
    expect(needsAttention([makeLog('ESCALATED')])).toBe(true);
  });

  it('retorna true cuando hay un log MISSED', () => {
    expect(needsAttention([makeLog('MISSED')])).toBe(true);
  });

  it('retorna false cuando todos los logs son PENDING o CONFIRMED', () => {
    expect(needsAttention([makeLog('PENDING'), makeLog('CONFIRMED')])).toBe(false);
  });

  it('retorna false cuando logs es undefined', () => {
    expect(needsAttention(undefined)).toBe(false);
  });
});
