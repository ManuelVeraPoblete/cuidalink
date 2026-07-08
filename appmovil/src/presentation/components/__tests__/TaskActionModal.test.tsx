import { render, screen, fireEvent } from '@testing-library/react-native';
import TaskActionModal from '../TaskActionModal';
import { CareTaskLog } from '@/domain/entities';

const log: CareTaskLog = {
  id: 'l1',
  careTaskId: 't1',
  taskName: 'Tomar presión',
  instructions: 'Registrar resultado',
  priority: 'MEDIUM',
  scheduledAt: '2026-07-07T08:00:00-04:00',
  status: 'PENDING',
};

describe('TaskActionModal', () => {
  it('no renderiza contenido cuando log es null', () => {
    const { toJSON } = render(
      <TaskActionModal visible={true} log={null} onComplete={jest.fn()} onClose={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it('muestra el nombre de la tarea', () => {
    render(<TaskActionModal visible={true} log={log} onComplete={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Tomar presión')).toBeTruthy();
  });

  it('llama a onComplete al presionar "Marcar como realizada"', () => {
    const onComplete = jest.fn();
    render(<TaskActionModal visible={true} log={log} onComplete={onComplete} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText('Marcar como realizada'));
    expect(onComplete).toHaveBeenCalled();
  });

  it('llama a onClose al presionar Cancelar', () => {
    const onClose = jest.fn();
    render(<TaskActionModal visible={true} log={log} onComplete={jest.fn()} onClose={onClose} />);
    fireEvent.press(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });
});
