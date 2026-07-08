import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TasksScreen from '../TasksScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { CareTaskLog } from '@/domain/entities';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

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

function renderScreen(logs: CareTaskLog[], navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const getDailyLogs = jest.fn().mockResolvedValue(logs);
  const completeLog = jest.fn().mockResolvedValue(logs[0] ?? null);
  mockedUseInjection.mockReturnValue({
    careTaskRepo: { getDailyLogs, completeLog },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <TasksScreen navigation={navigation} />
    </QueryClientProvider>
  );

  return { navigation, completeLog };
}

describe('TasksScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ selectedPatientId: 'p1' });
  });

  afterEach(() => {
    useAuthStore.setState({ selectedPatientId: null });
  });

  it('muestra todas las tareas bajo la pestaña "Todas" por defecto', async () => {
    renderScreen([
      buildLog({ id: 'l1', taskName: 'Tomar presión', status: 'PENDING' }),
      buildLog({ id: 'l2', taskName: 'Dar desayuno', status: 'DONE' }),
    ]);
    expect(await screen.findByText('Tomar presión')).toBeTruthy();
    expect(screen.getByText('Dar desayuno')).toBeTruthy();
  });

  it('filtra solo pendientes bajo "Pendientes"', async () => {
    renderScreen([
      buildLog({ id: 'l1', taskName: 'Tomar presión', status: 'PENDING' }),
      buildLog({ id: 'l2', taskName: 'Dar desayuno', status: 'DONE' }),
    ]);
    await screen.findByText('Tomar presión');
    fireEvent.press(screen.getByText('Pendientes'));
    expect(screen.getByText('Tomar presión')).toBeTruthy();
    expect(screen.queryByText('Dar desayuno')).toBeNull();
  });

  it('filtra solo realizadas bajo "Realizadas"', async () => {
    renderScreen([
      buildLog({ id: 'l1', taskName: 'Tomar presión', status: 'PENDING' }),
      buildLog({ id: 'l2', taskName: 'Dar desayuno', status: 'DONE' }),
    ]);
    await screen.findByText('Tomar presión');
    fireEvent.press(screen.getByText('Realizadas'));
    expect(screen.getByText('Dar desayuno')).toBeTruthy();
    expect(screen.queryByText('Tomar presión')).toBeNull();
  });

  it('abre el modal de acción al tocar una tarjeta pendiente y completa', async () => {
    const { completeLog } = renderScreen([buildLog({ id: 'l1', status: 'PENDING' })]);
    fireEvent.press(await screen.findByText('Tomar presión'));
    fireEvent.press(await screen.findByText('Marcar como realizada'));
    await waitFor(() => expect(completeLog).toHaveBeenCalledWith('l1'));
  });

  it('navega a CreateTask al presionar "Agregar tarea"', async () => {
    const { navigation } = renderScreen([]);
    fireEvent.press(await screen.findByText('Agregar tarea'));
    expect(navigation.navigate).toHaveBeenCalledWith('CreateTask');
  });
});
