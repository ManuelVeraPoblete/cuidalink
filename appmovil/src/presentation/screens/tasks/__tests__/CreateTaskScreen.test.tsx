import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateTaskScreen from '../CreateTaskScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';

jest.mock('@/presentation/hooks/useInjection');

jest.mock('@react-native-community/datetimepicker', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockDateTimePicker({ onChange, testID }: any) {
    return (
      <TouchableOpacity testID={testID} onPress={() => onChange({}, new Date(2026, 7, 1, 9, 0, 0))}>
        <Text>mock-picker</Text>
      </TouchableOpacity>
    );
  };
});

const mockedUseInjection = useInjection as jest.Mock;

const patient = { id: 'p1', fullName: 'Rosa Martínez', birthDate: '1948-01-15', gender: 'FEMALE', isOwner: true, emergencyContact: { name: 'Juan', phone: '+56911112222' } };

function renderScreen(navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const createTask = jest.fn().mockResolvedValue({});
  const getPatient = jest.fn().mockResolvedValue(patient);
  const getDailyLogs = jest.fn().mockResolvedValue([]);
  mockedUseInjection.mockReturnValue({
    careTaskRepo: { createTask },
    patientRepo: { getPatient },
    medicationRepo: { getDailyLogs },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <CreateTaskScreen navigation={navigation} />
    </QueryClientProvider>
  );

  return { navigation, createTask };
}

describe('CreateTaskScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ selectedPatientId: 'p1' });
  });

  afterEach(() => {
    useAuthStore.setState({ selectedPatientId: null });
  });

  it('muestra la tarjeta del paciente con estado Estable', async () => {
    renderScreen();
    expect(await screen.findByText('Rosa Martínez')).toBeTruthy();
    expect(screen.getByText('Estable')).toBeTruthy();
  });

  it('muestra los 6 campos del formulario', async () => {
    renderScreen();
    await screen.findByText('Rosa Martínez');
    expect(screen.getByText('1. Nombre de la tarea')).toBeTruthy();
    expect(screen.getByText('2. Hora')).toBeTruthy();
    expect(screen.getByText('3. Tipo de programación')).toBeTruthy();
    expect(screen.getByText('4. Instrucciones')).toBeTruthy();
    expect(screen.getByText('5. Prioridad')).toBeTruthy();
    expect(screen.getByText('6. Recordatorio activo')).toBeTruthy();
  });

  it('por defecto muestra días de la semana y no rango de fechas', async () => {
    renderScreen();
    await screen.findByText('Rosa Martínez');
    expect(screen.getByText('Lun')).toBeTruthy();
    expect(screen.queryByText('Fecha de inicio')).toBeNull();
  });

  it('cambiar a "Rango de fechas" oculta los chips de día y muestra fechas', async () => {
    renderScreen();
    await screen.findByText('Rosa Martínez');
    fireEvent.press(screen.getByText('Rango de fechas'));
    expect(screen.queryByText('Lun')).toBeNull();
    expect(screen.getByText('Fecha de inicio')).toBeTruthy();
    expect(screen.getByText('Fecha de término')).toBeTruthy();
  });

  it('muestra error si falta el nombre al guardar', async () => {
    renderScreen();
    await screen.findByText('Rosa Martínez');
    fireEvent.press(screen.getByText('Guardar tarea'));
    expect(await screen.findByText('Nombre requerido')).toBeTruthy();
  });

  it('guarda exitosamente con días de la semana y navega atrás', async () => {
    const { createTask, navigation } = renderScreen();
    await screen.findByText('Rosa Martínez');

    fireEvent.changeText(screen.getByPlaceholderText('Ej: Tomar presión, Dar almuerzo, Cambiar apósito'), 'Tomar presión');
    fireEvent.press(screen.getByTestId('time-trigger'));
    fireEvent.press(screen.getByTestId('time-picker'));
    fireEvent.press(screen.getByText('Lun'));

    fireEvent.press(screen.getByText('Guardar tarea'));

    await waitFor(() => expect(createTask).toHaveBeenCalledWith('p1', {
      name: 'Tomar presión',
      instructions: '',
      priority: 'MEDIUM',
      reminderActive: true,
      time: '09:00',
      scheduleType: 'DAYS_OF_WEEK',
      daysOfWeek: ['MONDAY'],
      startDate: null,
      endDate: null,
    }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('muestra una alerta cuando falla la creación', async () => {
    const createTask = jest.fn().mockRejectedValue(new Error('network'));
    const getPatient = jest.fn().mockResolvedValue(patient);
    const getDailyLogs = jest.fn().mockResolvedValue([]);
    mockedUseInjection.mockReturnValue({
      careTaskRepo: { createTask },
      patientRepo: { getPatient },
      medicationRepo: { getDailyLogs },
    });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    render(
      <QueryClientProvider client={queryClient}>
        <CreateTaskScreen navigation={navigation as any} />
      </QueryClientProvider>
    );

    await screen.findByText('Rosa Martínez');
    fireEvent.changeText(screen.getByPlaceholderText('Ej: Tomar presión, Dar almuerzo, Cambiar apósito'), 'Tomar presión');
    fireEvent.press(screen.getByTestId('time-trigger'));
    fireEvent.press(screen.getByTestId('time-picker'));
    fireEvent.press(screen.getByText('Lun'));
    fireEvent.press(screen.getByText('Guardar tarea'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo guardar la tarea.'));
  });
});
