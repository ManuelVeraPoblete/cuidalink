import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import RecordVitalsScreen from '../RecordVitalsScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { Patient, VitalSignDefinition } from '@/domain/entities';
import { DEFAULT_VITAL_DEFINITIONS } from '@/domain/utils/defaultVitalDefinitions';

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
  { id: 'd1', patientId: 'p1', name: 'Temperatura', unit: '°C', normalRangeMin: 36, normalRangeMax: 37.5 },
  { id: 'd2', patientId: 'p1', name: 'Presión arterial', unit: 'mmHg' },
  { id: 'd3', patientId: 'p1', name: 'Observaciones', unit: '' },
];

function renderScreen(navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const getPatient = jest.fn().mockResolvedValue(patient);
  const listDefinitions = jest.fn().mockResolvedValue(definitions);
  const recordVitals = jest.fn().mockResolvedValue({});
  mockedUseInjection.mockReturnValue({
    vitalRepo: { listDefinitions, recordVitals },
    patientRepo: { getPatient },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const route = { params: { patientId: 'p1' } } as any;

  render(
    <QueryClientProvider client={queryClient}>
      <RecordVitalsScreen navigation={navigation} route={route} />
    </QueryClientProvider>
  );

  return { navigation, recordVitals };
}

describe('RecordVitalsScreen', () => {
  it('muestra el nombre del paciente', async () => {
    renderScreen();
    expect(await screen.findByText('Paciente: Rosa Martínez')).toBeTruthy();
  });

  it('muestra un campo por cada definición del paciente', async () => {
    renderScreen();
    expect(await screen.findByText('Temperatura (°C)')).toBeTruthy();
    expect(screen.getByText('Presión arterial (mmHg)')).toBeTruthy();
    expect(screen.getByText('Observaciones')).toBeTruthy();
  });

  it('guarda solo las mediciones completadas y vuelve atrás', async () => {
    const { navigation, recordVitals } = renderScreen();
    await screen.findByText('Temperatura (°C)');
    fireEvent.changeText(screen.getByTestId('vital-input-d1'), '37.2');
    fireEvent.changeText(screen.getByTestId('vital-input-d3'), 'Paciente tranquilo');
    fireEvent.press(screen.getByText('Guardar registro'));
    await waitFor(() =>
      expect(recordVitals).toHaveBeenCalledWith('p1', [
        { definitionId: 'd1', value: '37.2' },
        { definitionId: 'd3', value: 'Paciente tranquilo' },
      ]),
    );
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('no guarda si no se completó ningún campo', async () => {
    const { recordVitals } = renderScreen();
    await screen.findByText('Temperatura (°C)');
    fireEvent.press(screen.getByText('Guardar registro'));
    await waitFor(() => expect(recordVitals).not.toHaveBeenCalled());
  });

  it('vuelve atrás al presionar "Cancelar" sin guardar', async () => {
    const { navigation, recordVitals } = renderScreen();
    await screen.findByText('Temperatura (°C)');
    fireEvent.press(screen.getByText('Cancelar'));
    expect(navigation.goBack).toHaveBeenCalled();
    expect(recordVitals).not.toHaveBeenCalled();
  });

  it('muestra una alerta si falla el guardado', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    const getPatient = jest.fn().mockResolvedValue(patient);
    const listDefinitions = jest.fn().mockResolvedValue(definitions);
    const recordVitals = jest.fn().mockRejectedValue(new Error('fail'));
    mockedUseInjection.mockReturnValue({
      vitalRepo: { listDefinitions, recordVitals },
      patientRepo: { getPatient },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const route = { params: { patientId: 'p1' } } as any;
    render(
      <QueryClientProvider client={queryClient}>
        <RecordVitalsScreen navigation={navigation as any} route={route} />
      </QueryClientProvider>
    );
    await screen.findByText('Temperatura (°C)');
    fireEvent.changeText(screen.getByTestId('vital-input-d1'), '37.2');
    fireEvent.press(screen.getByText('Guardar registro'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudieron guardar los registros.'));
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('crea las 8 definiciones por defecto cuando el owner no tiene ninguna configurada', async () => {
    const getPatient = jest.fn().mockResolvedValue(patient);
    const listDefinitions = jest.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValue(definitions);
    const createDefinition = jest.fn().mockResolvedValue({});
    const recordVitals = jest.fn().mockResolvedValue({});
    mockedUseInjection.mockReturnValue({
      vitalRepo: { listDefinitions, createDefinition, recordVitals },
      patientRepo: { getPatient },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const route = { params: { patientId: 'p1' } } as any;
    render(
      <QueryClientProvider client={queryClient}>
        <RecordVitalsScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() } as any} route={route} />
      </QueryClientProvider>
    );

    await waitFor(() => expect(createDefinition).toHaveBeenCalledTimes(DEFAULT_VITAL_DEFINITIONS.length));
    DEFAULT_VITAL_DEFINITIONS.forEach((def) => {
      expect(createDefinition).toHaveBeenCalledWith('p1', def);
    });
    expect(await screen.findByText('Temperatura (°C)')).toBeTruthy();
  });

  it('muestra un aviso cuando un colaborador no tiene signos vitales configurados', async () => {
    const getPatient = jest.fn().mockResolvedValue({ ...patient, isOwner: false });
    const listDefinitions = jest.fn().mockResolvedValue([]);
    const createDefinition = jest.fn().mockResolvedValue({});
    const recordVitals = jest.fn().mockResolvedValue({});
    mockedUseInjection.mockReturnValue({
      vitalRepo: { listDefinitions, createDefinition, recordVitals },
      patientRepo: { getPatient },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const route = { params: { patientId: 'p1' } } as any;
    render(
      <QueryClientProvider client={queryClient}>
        <RecordVitalsScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() } as any} route={route} />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Aún no hay signos vitales configurados para este paciente.')).toBeTruthy();
    expect(createDefinition).not.toHaveBeenCalled();
  });
});
