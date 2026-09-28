import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TodayScreen from '../TodayScreen';
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
    scheduledAt: '2026-07-03T08:00:00-04:00',
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
      <TodayScreen navigation={navigation} />
    </QueryClientProvider>
  );

  return { navigation, confirmLog, missLog };
}

describe('TodayScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ selectedPatientId: 'p1' });
  });

  afterEach(() => {
    useAuthStore.setState({ selectedPatientId: null });
  });

  it('muestra solo los logs pendientes o escalados', async () => {
    renderScreen([
      buildLog({ id: 'l1', medicationName: 'Paracetamol', status: 'PENDING' }),
      buildLog({ id: 'l2', medicationName: 'Insulina', status: 'CONFIRMED' }),
      buildLog({ id: 'l3', medicationName: 'Loratadina', status: 'ESCALATED' }),
      buildLog({ id: 'l4', medicationName: 'Enoxaparina', status: 'MISSED' }),
    ]);
    expect(await screen.findByText('Paracetamol')).toBeTruthy();
    expect(await screen.findByText('Loratadina')).toBeTruthy();
    expect(screen.queryByText('Insulina')).toBeNull();
    expect(screen.queryByText('Enoxaparina')).toBeNull();
  });

  it('muestra el estado vacío cuando no hay pendientes', async () => {
    renderScreen([buildLog({ status: 'CONFIRMED' })]);
    expect(await screen.findByText('¡Todo al día!')).toBeTruthy();
    expect(screen.getByText('No hay medicamentos pendientes por ahora.')).toBeTruthy();
  });

  it('abre el modal de acción al tocar una tarjeta pendiente y confirma', async () => {
    const { confirmLog } = renderScreen([buildLog({ id: 'l1', status: 'PENDING' })]);
    fireEvent.press(await screen.findByText('Paracetamol'));
    fireEvent.press(await screen.findByText('Confirmar'));
    await waitFor(() => expect(confirmLog).toHaveBeenCalledWith('l1'));
  });
});

describe('TodayScreen con error de carga', () => {
  beforeEach(() => useAuthStore.setState({ selectedPatientId: 'p1' }));

  it('muestra el estado de error y reintenta la carga', async () => {
    const primary = jest.fn().mockRejectedValueOnce(new Error('Network Error')).mockResolvedValue([]);
    mockedUseInjection.mockReturnValue({ medicationRepo: { getDailyLogs: primary, confirmLog: jest.fn(), missLog: jest.fn() } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <TodayScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() } as any} />
      </QueryClientProvider>
    );

    expect(await screen.findByText('No pudimos cargar la información')).toBeTruthy();
    expect(screen.queryByText('No hay medicamentos pendientes por ahora.')).toBeNull();
    fireEvent.press(screen.getByText('Reintentar'));
    await waitFor(() => expect(primary).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('No pudimos cargar la información')).toBeNull(), { timeout: 5000 });
  });
});
