import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VitalsHistoryScreen from '../VitalsHistoryScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { Patient, VitalRecord, VitalSignDefinition } from '@/domain/entities';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

const patient: Patient = {
  id: 'p1',
  fullName: 'Rosa Martínez',
  birthDate: '1950-01-01',
  gender: 'FEMALE',
  identificationNumber: '11111111-1',
  address: 'Calle Falsa 123',
  healthInsurance: 'Fonasa',
  bloodType: 'O+',
  emergencyContact: { name: 'Juan Martínez', phone: '+56911111111' },
  isOwner: true,
  active: true,
};

const definitions: VitalSignDefinition[] = [
  { id: 'd1', patientId: 'p1', name: 'Temperatura', unit: '°C' },
  { id: 'd2', patientId: 'p1', name: 'Presión arterial', unit: 'mmHg' },
  { id: 'd3', patientId: 'p1', name: 'Observaciones', unit: '' },
];

function buildRecord(overrides: Partial<VitalRecord> = {}): VitalRecord {
  return {
    id: 'r1',
    patientId: 'p1',
    recordedById: 'u1',
    recordedAt: '2026-05-24T09:15:00-04:00',
    measurements: [
      { definitionId: 'd1', value: '37.2' },
      { definitionId: 'd2', value: '120/80' },
      { definitionId: 'd3', value: 'Paciente tranquilo, comió bien' },
    ],
    ...overrides,
  };
}

function renderScreen(records: VitalRecord[], navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const listRecords = jest.fn().mockResolvedValue(records);
  const listDefinitions = jest.fn().mockResolvedValue(definitions);
  const getPatient = jest.fn().mockResolvedValue(patient);
  mockedUseInjection.mockReturnValue({
    vitalRepo: { listRecords, listDefinitions },
    patientRepo: { getPatient },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <VitalsHistoryScreen navigation={navigation} />
    </QueryClientProvider>
  );

  return { navigation, listRecords, listDefinitions, getPatient };
}

describe('VitalsHistoryScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ selectedPatientId: 'p1' });
  });

  afterEach(() => {
    useAuthStore.setState({ selectedPatientId: null });
  });

  it('muestra el nombre del paciente', async () => {
    renderScreen([buildRecord()]);
    expect(await screen.findByText('Paciente: Rosa Martínez')).toBeTruthy();
  });

  it('muestra el chip "Hoy"', async () => {
    renderScreen([buildRecord()]);
    expect(await screen.findByText('Hoy')).toBeTruthy();
  });

  it('navega a RecordVitals con el patientId al presionar "Registrar signos vitales"', async () => {
    const { navigation } = renderScreen([buildRecord()]);
    fireEvent.press(await screen.findByText('Registrar signos vitales'));
    expect(navigation.navigate).toHaveBeenCalledWith('RecordVitals', { patientId: 'p1' });
  });

  it('muestra las mediciones de cada registro', async () => {
    renderScreen([buildRecord()]);
    expect(await screen.findByText('Temperatura')).toBeTruthy();
    expect(screen.getByText('37.2 °C')).toBeTruthy();
    expect(screen.getByText('Presión arterial')).toBeTruthy();
    expect(screen.getByText('120/80 mmHg')).toBeTruthy();
  });

  it('muestra la medición de observaciones aparte, sin unidad', async () => {
    renderScreen([buildRecord()]);
    expect(await screen.findByText('Observaciones')).toBeTruthy();
    expect(screen.getByText('Paciente tranquilo, comió bien')).toBeTruthy();
  });

  it('abre y cierra el detalle al presionar "Ver detalle"', async () => {
    renderScreen([buildRecord()]);
    expect(screen.queryByText('Detalle del registro')).toBeNull();
    fireEvent.press(await screen.findByText('Ver detalle'));
    expect(await screen.findByText('Detalle del registro')).toBeTruthy();
    fireEvent.press(screen.getByText('Cerrar'));
    await waitFor(() => expect(screen.queryByText('Detalle del registro')).toBeNull());
  });

  it('muestra un estado vacío cuando no hay registros', async () => {
    renderScreen([]);
    expect(await screen.findByText('Sin registros para este día.')).toBeTruthy();
  });

  it('muestra un aviso cuando no hay paciente seleccionado', async () => {
    useAuthStore.setState({ selectedPatientId: null });
    renderScreen([]);
    expect(await screen.findByText('Selecciona un paciente desde Inicio → Mis pacientes.')).toBeTruthy();
  });
});
