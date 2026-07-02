import { render, screen, fireEvent } from '@testing-library/react-native';
import MedicationActionModal from '../MedicationActionModal';
import { MedicationLog } from '@/domain/entities';

const log: MedicationLog = {
  id: 'l1',
  medicationId: 'm1',
  medicationName: 'Paracetamol',
  dosage: '1 tableta',
  instructions: 'Después del desayuno',
  type: 'TABLET',
  scheduledAt: '2026-07-02T08:00:00-04:00',
  status: 'PENDING',
};

describe('MedicationActionModal', () => {
  it('no renderiza contenido cuando log es null', () => {
    const { toJSON } = render(
      <MedicationActionModal visible={true} log={null} onConfirm={jest.fn()} onMiss={jest.fn()} onClose={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it('muestra el nombre y la dosis del medicamento', () => {
    render(<MedicationActionModal visible={true} log={log} onConfirm={jest.fn()} onMiss={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Paracetamol')).toBeTruthy();
    expect(screen.getByText(/1 tableta/)).toBeTruthy();
  });

  it('llama a onConfirm al presionar Confirmar', () => {
    const onConfirm = jest.fn();
    render(<MedicationActionModal visible={true} log={log} onConfirm={onConfirm} onMiss={jest.fn()} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText('Confirmar'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('llama a onMiss al presionar Omitir', () => {
    const onMiss = jest.fn();
    render(<MedicationActionModal visible={true} log={log} onConfirm={jest.fn()} onMiss={onMiss} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText('Omitir'));
    expect(onMiss).toHaveBeenCalled();
  });

  it('llama a onClose al presionar Cancelar', () => {
    const onClose = jest.fn();
    render(<MedicationActionModal visible={true} log={log} onConfirm={jest.fn()} onMiss={jest.fn()} onClose={onClose} />);
    fireEvent.press(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });
});
