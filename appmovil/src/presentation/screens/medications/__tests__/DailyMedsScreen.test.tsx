import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DailyMedsScreen from '../DailyMedsScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { MedicationLog } from '@/domain/entities';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

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

function renderScreen(logs: MedicationLog[], navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const getDailyLogs = jest.fn().mockResolvedValue(logs);
  const confirmLog = jest.fn().mockResolvedValue(logs[0] ?? null);
  const missLog = jest.fn().mockResolvedValue(logs[0] ?? null);
  mockedUseInjection.mockReturnValue({
    medicationRepo: { getDailyLogs, confirmLog, missLog },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <DailyMedsScreen navigation={navigation} />
    </QueryClientProvider>
  );

  return { navigation, confirmLog, missLog };
}

describe('DailyMedsScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ selectedPatientId: 'p1' });
  });

  afterEach(() => {
    useAuthStore.setState({ selectedPatientId: null });
  });

  it('muestra todos los logs bajo la pestaña "Todos" por defecto', async () => {
    renderScreen([
      buildLog({ id: 'l1', medicationName: 'Paracetamol', status: 'PENDING' }),
      buildLog({ id: 'l2', medicationName: 'Insulina', status: 'CONFIRMED' }),
    ]);
    expect(await screen.findByText('Paracetamol')).toBeTruthy();
    expect(screen.getByText('Insulina')).toBeTruthy();
  });

  it('filtra solo pendientes bajo "Pendientes"', async () => {
    renderScreen([
      buildLog({ id: 'l1', medicationName: 'Paracetamol', status: 'PENDING' }),
      buildLog({ id: 'l2', medicationName: 'Insulina', status: 'CONFIRMED' }),
    ]);
    await screen.findByText('Paracetamol');
    fireEvent.press(screen.getByText('Pendientes'));
    expect(screen.getByText('Paracetamol')).toBeTruthy();
    expect(screen.queryByText('Insulina')).toBeNull();
  });

  it('filtra solo administrados bajo "Administrados"', async () => {
    renderScreen([
      buildLog({ id: 'l1', medicationName: 'Paracetamol', status: 'PENDING' }),
      buildLog({ id: 'l2', medicationName: 'Insulina', status: 'CONFIRMED' }),
    ]);
    await screen.findByText('Paracetamol');
    fireEvent.press(screen.getByText('Administrados'));
    expect(screen.getByText('Insulina')).toBeTruthy();
    expect(screen.queryByText('Paracetamol')).toBeNull();
  });

  it('abre el modal de acción al tocar una tarjeta pendiente y confirma', async () => {
    const { confirmLog } = renderScreen([buildLog({ id: 'l1', status: 'PENDING' })]);
    fireEvent.press(await screen.findByText('Paracetamol'));
    fireEvent.press(await screen.findByText('Confirmar'));
    await waitFor(() => expect(confirmLog).toHaveBeenCalledWith('l1'));
  });

  it('navega a CreateMedication al presionar "Agregar medicamento"', async () => {
    const { navigation } = renderScreen([]);
    fireEvent.press(await screen.findByText('Agregar medicamento'));
    expect(navigation.navigate).toHaveBeenCalledWith('CreateMedication');
  });
});
