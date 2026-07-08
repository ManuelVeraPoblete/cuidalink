import { render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Linking, Alert } from 'react-native';
import PatientDetailScreen from '../PatientDetailScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

const basePatient = {
  id: 'p1',
  fullName: 'Rosa Martínez',
  birthDate: '1948-01-15',
  gender: 'FEMALE',
  isOwner: true,
  emergencyContact: { name: 'Juan Martínez', phone: '+56911112222' },
};

function renderScreen({
  patient = basePatient,
  logs = [] as any[],
  navigation = { navigate: jest.fn(), goBack: jest.fn() },
}: { patient?: any; logs?: any[]; navigation?: any } = {}) {
  const getPatient = jest.fn().mockResolvedValue(patient);
  const getDailyLogs = jest.fn().mockResolvedValue(logs);
  mockedUseInjection.mockReturnValue({
    patientRepo: { getPatient },
    medicationRepo: { getDailyLogs },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const route = { params: { patientId: 'p1' } } as any;

  render(
    <QueryClientProvider client={queryClient}>
      <PatientDetailScreen navigation={navigation} route={route} />
    </QueryClientProvider>
  );

  return { navigation };
}

describe('PatientDetailScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ selectedPatientId: null });
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-02T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renderiza las 7 tarjetas de acción', async () => {
    renderScreen();
    for (const title of ['Hoy', 'Medicamentos', 'Tareas', 'Signos vitales', 'Observaciones', 'Contactos', 'Historial']) {
      expect(await screen.findByText(title)).toBeTruthy();
    }
  });

  it('muestra "Estable" cuando no hay logs escalados o perdidos', async () => {
    renderScreen({ logs: [{ id: '1', medicationId: 'm1', medicationName: 'X', dosage: '1', scheduledAt: '2026-07-02T09:00:00Z', status: 'CONFIRMED' }] });
    expect(await screen.findByText('Estable')).toBeTruthy();
  });

  it('muestra "Requiere atención" cuando hay un log escalado', async () => {
    renderScreen({ logs: [{ id: '1', medicationId: 'm1', medicationName: 'X', dosage: '1', scheduledAt: '2026-07-02T09:00:00Z', status: 'ESCALATED' }] });
    expect(await screen.findByText('Requiere atención')).toBeTruthy();
  });

  it('muestra la hora del próximo medicamento pendiente', async () => {
    renderScreen({ logs: [{ id: '1', medicationId: 'm1', medicationName: 'X', dosage: '1', scheduledAt: '2026-07-02T09:00:00-04:00', status: 'PENDING' }] });
    expect(await screen.findByText(/09:00/)).toBeTruthy();
  });

  it('muestra "Sin pendientes" cuando no hay medicamentos pendientes', async () => {
    renderScreen({ logs: [] });
    expect(await screen.findByText('Sin pendientes')).toBeTruthy();
  });

  it('selecciona el paciente y navega a Medicamentos al presionar esa tarjeta', async () => {
    const { navigation } = renderScreen();
    fireEvent.press(await screen.findByText('Medicamentos'));
    expect(useAuthStore.getState().selectedPatientId).toBe('p1');
    expect(navigation.navigate).toHaveBeenCalledWith('Medicamentos');
  });

  it('selecciona el paciente y navega a Tasks al presionar "Tareas"', async () => {
    const { navigation } = renderScreen();
    fireEvent.press(await screen.findByText('Tareas'));
    expect(useAuthStore.getState().selectedPatientId).toBe('p1');
    expect(navigation.navigate).toHaveBeenCalledWith('Tasks');
  });

  it('selecciona el paciente y navega a Vitales al presionar "Signos vitales"', async () => {
    const { navigation } = renderScreen();
    fireEvent.press(await screen.findByText('Signos vitales'));
    expect(useAuthStore.getState().selectedPatientId).toBe('p1');
    expect(navigation.navigate).toHaveBeenCalledWith('Vitales');
  });

  it('navega a Contacts al presionar esa tarjeta', async () => {
    const { navigation } = renderScreen();
    fireEvent.press(await screen.findByText('Contactos'));
    expect(navigation.navigate).toHaveBeenCalledWith('Contacts', { patientId: 'p1' });
  });

  it('navega a Today al presionar "Hoy"', async () => {
    const { navigation } = renderScreen();
    fireEvent.press(await screen.findByText('Hoy'));
    expect(navigation.navigate).toHaveBeenCalledWith('Today');
  });

  it('llama al contacto de emergencia al presionar "Emergencia"', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderScreen();
    fireEvent.press(await screen.findByText('Emergencia'));
    expect(openURLSpy).toHaveBeenCalledWith('tel:+56911112222');
  });

  it('muestra una alerta cuando no hay teléfono de emergencia registrado', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderScreen({ patient: { ...basePatient, emergencyContact: { name: '', phone: '' } } });
    fireEvent.press(await screen.findByText('Emergencia'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Sin contacto de emergencia',
      'Este paciente no tiene un teléfono de emergencia registrado.'
    );
  });
});
