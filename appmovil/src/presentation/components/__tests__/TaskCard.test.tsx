import { render, screen, fireEvent } from '@testing-library/react-native';
import TaskCard from '../TaskCard';
import { CareTaskLog } from '@/domain/entities';

function buildLog(overrides: Partial<CareTaskLog> = {}): CareTaskLog {
  return {
    id: 'l1',
    careTaskId: 't1',
    taskName: 'Tomar presión',
    instructions: 'Registrar resultado en la app',
    priority: 'MEDIUM',
    scheduledAt: '2026-07-07T08:00:00-04:00',
    status: 'PENDING',
    ...overrides,
  };
}

describe('TaskCard', () => {
  it('muestra nombre e indicaciones', () => {
    render(<TaskCard log={buildLog()} />);
    expect(screen.getByText('Tomar presión')).toBeTruthy();
    expect(screen.getByText('Registrar resultado en la app')).toBeTruthy();
  });

  it('muestra el badge "Pendiente" y llama a onPress al tocar', () => {
    const onPress = jest.fn();
    render(<TaskCard log={buildLog()} onPress={onPress} />);
    expect(screen.getByText('Pendiente')).toBeTruthy();
    fireEvent.press(screen.getByText('Tomar presión'));
    expect(onPress).toHaveBeenCalled();
  });

  it('muestra el badge "Realizada" y no llama a onPress al tocar', () => {
    const onPress = jest.fn();
    render(<TaskCard log={buildLog({ status: 'DONE' })} onPress={onPress} />);
    expect(screen.getByText('Realizada')).toBeTruthy();
    fireEvent.press(screen.getByText('Tomar presión'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
