import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateMedicationScreen from '../CreateMedicationScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';

jest.mock('@/presentation/hooks/useInjection');

jest.mock('@react-native-community/datetimepicker', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockDateTimePicker({ onChange, testID }: any) {
    return (
      <TouchableOpacity testID={testID} onPress={() => onChange({}, new Date(2026, 7, 1, 8, 0, 0))}>
        <Text>mock-picker</Text>
      </TouchableOpacity>
    );
  };
});

const mockedUseInjection = useInjection as jest.Mock;

function renderScreen(navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const createMedication = jest.fn().mockResolvedValue({});
  mockedUseInjection.mockReturnValue({ medicationRepo: { createMedication } });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <CreateMedicationScreen navigation={navigation} />
    </QueryClientProvider>
  );

  return { navigation, createMedication };
}

describe('CreateMedicationScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ selectedPatientId: 'p1' });
  });

  afterEach(() => {
    useAuthStore.setState({ selectedPatientId: null });
  });

  it('muestra los 8 campos del formulario', () => {
    renderScreen();
    expect(screen.getByText('1. Nombre del medicamento')).toBeTruthy();
    expect(screen.getByText('2. Dosis')).toBeTruthy();
    expect(screen.getByText('3. Hora de inicio')).toBeTruthy();
    expect(screen.getByText('4. Frecuencia (en horas)')).toBeTruthy();
    expect(screen.getByText('5. Fecha de inicio')).toBeTruthy();
    expect(screen.getByText('6. Fecha de término')).toBeTruthy();
    expect(screen.getByText('7. Indefinido')).toBeTruthy();
    expect(screen.getByText('8. Condiciones de administración')).toBeTruthy();
  });

  it('el stepper de frecuencia respeta el rango 1-24', () => {
    renderScreen();
    expect(screen.getByText('8')).toBeTruthy();
    for (let i = 0; i < 10; i++) fireEvent.press(screen.getByText('−'));
    expect(screen.getByText('1')).toBeTruthy();
    for (let i = 0; i < 30; i++) fireEvent.press(screen.getByText('+'));
    expect(screen.getByText('24')).toBeTruthy();
  });

  it('el toggle "Indefinido" deshabilita el campo de fecha de término', () => {
    renderScreen();
    expect(screen.getByTestId('end-date-trigger').props.accessibilityState?.disabled).toBe(true);

    fireEvent(screen.getByTestId('indefinite-switch'), 'valueChange', false);

    expect(screen.getByTestId('end-date-trigger').props.accessibilityState?.disabled).toBeFalsy();
  });

  it('muestra error si falta el nombre al guardar', async () => {
    renderScreen();
    fireEvent.press(screen.getByText('Guardar medicamento'));
    expect(await screen.findByText('Nombre requerido')).toBeTruthy();
  });

  it('guarda exitosamente y navega atrás', async () => {
    const { createMedication, navigation } = renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('Ingresa el nombre del medicamento'), 'Paracetamol');
    fireEvent.changeText(screen.getByPlaceholderText('Ej: 1 tableta / 10 ml'), '1 tableta');

    fireEvent.press(screen.getByTestId('start-time-trigger'));
    fireEvent.press(screen.getByTestId('start-time-picker'));

    fireEvent.press(screen.getByTestId('start-date-trigger'));
    fireEvent.press(screen.getByTestId('start-date-picker'));

    fireEvent.press(screen.getByText('Guardar medicamento'));

    await waitFor(() => expect(createMedication).toHaveBeenCalledWith('p1', {
      name: 'Paracetamol',
      dosage: '1 tableta',
      instructions: '',
      startTime: '08:00',
      frequencyHours: 8,
      startDate: '2026-08-01',
      endDate: null,
    }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('muestra una alerta cuando falla la creación', async () => {
    const createMedication = jest.fn().mockRejectedValue(new Error('network'));
    mockedUseInjection.mockReturnValue({ medicationRepo: { createMedication } });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    render(
      <QueryClientProvider client={queryClient}>
        <CreateMedicationScreen navigation={navigation as any} />
      </QueryClientProvider>
    );

    fireEvent.changeText(screen.getByPlaceholderText('Ingresa el nombre del medicamento'), 'Paracetamol');
    fireEvent.changeText(screen.getByPlaceholderText('Ej: 1 tableta / 10 ml'), '1 tableta');
    fireEvent.press(screen.getByTestId('start-time-trigger'));
    fireEvent.press(screen.getByTestId('start-time-picker'));
    fireEvent.press(screen.getByTestId('start-date-trigger'));
    fireEvent.press(screen.getByTestId('start-date-picker'));
    fireEvent.press(screen.getByText('Guardar medicamento'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo crear el medicamento.'));
  });
});
