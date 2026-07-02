import { render, screen, fireEvent } from '@testing-library/react-native';
import MedicationCard from '../MedicationCard';
import { MedicationLog } from '@/domain/entities';

function buildLog(overrides: Partial<MedicationLog> = {}): MedicationLog {
  return {
    id: 'l1',
    medicationId: 'm1',
    medicationName: 'Paracetamol',
    dosage: '1 tableta',
    instructions: 'Después del desayuno',
    type: 'TABLET',
    scheduledAt: '2026-07-02T08:00:00-04:00',
    status: 'PENDING',
    ...overrides,
  };
}

describe('MedicationCard', () => {
  it('muestra nombre, dosis e indicaciones', () => {
    render(<MedicationCard log={buildLog()} />);
    expect(screen.getByText('Paracetamol')).toBeTruthy();
    expect(screen.getByText('1 tableta')).toBeTruthy();
    expect(screen.getByText('Después del desayuno')).toBeTruthy();
  });

  it('muestra el badge "Pendiente" para PENDING y ESCALATED', () => {
    render(<MedicationCard log={buildLog({ status: 'PENDING' })} />);
    expect(screen.getByText('Pendiente')).toBeTruthy();
  });

  it('muestra el badge "Administrado" para CONFIRMED', () => {
    render(<MedicationCard log={buildLog({ status: 'CONFIRMED' })} />);
    expect(screen.getByText('Administrado')).toBeTruthy();
  });

  it('muestra el badge "Omitido" para MISSED', () => {
    render(<MedicationCard log={buildLog({ status: 'MISSED' })} />);
    expect(screen.getByText('Omitido')).toBeTruthy();
  });

  it('llama a onPress al tocar una tarjeta pendiente', () => {
    const onPress = jest.fn();
    render(<MedicationCard log={buildLog({ status: 'PENDING' })} onPress={onPress} />);
    fireEvent.press(screen.getByText('Paracetamol'));
    expect(onPress).toHaveBeenCalled();
  });

  it('no llama a onPress en una tarjeta ya administrada', () => {
    const onPress = jest.fn();
    render(<MedicationCard log={buildLog({ status: 'CONFIRMED' })} onPress={onPress} />);
    fireEvent.press(screen.getByText('Paracetamol'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
