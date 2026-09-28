import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import PatientsListScreen from '../PatientsListScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { JoinPatientError } from '@/domain/repositories/PatientRepository';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

const patient = { id: 'p1', fullName: 'Rosa Martínez', birthDate: '1948-01-15', gender: 'FEMALE', isOwner: false, emergencyContact: { name: 'Juan', phone: '+56911112222' } };

function renderScreen({
  listPatients = jest.fn().mockResolvedValue([]),
  joinPatient = jest.fn().mockResolvedValue(undefined),
} = {}) {
  mockedUseInjection.mockReturnValue({
    patientRepo: { listPatients, joinPatient },
    medicationRepo: { getDailyLogs: jest.fn().mockResolvedValue([]) },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <PatientsListScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() } as any} />
    </QueryClientProvider>
  );
  return { listPatients, joinPatient };
}

async function joinWithCode(code: string) {
  fireEvent.press(await screen.findByText('Tengo un código'));
  fireEvent.changeText(screen.getByPlaceholderText('Código de 8 caracteres'), code);
  fireEvent.press(screen.getByText('Unirse'));
}

describe('PatientsListScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => alertSpy.mockRestore());

  it('en la lista vacía explica cómo crear un paciente o unirse con código', async () => {
    renderScreen();
    expect(await screen.findByText(/únete con el código de invitación/)).toBeTruthy();
    expect(screen.getByText('Tengo un código')).toBeTruthy();
  });

  it('se une con el código y refresca la lista', async () => {
    const listPatients = jest.fn().mockResolvedValueOnce([]).mockResolvedValue([patient]);
    const { joinPatient } = renderScreen({ listPatients });

    await joinWithCode('ab12cd34');

    await waitFor(() => expect(joinPatient).toHaveBeenCalledWith('AB12CD34'));
    expect(await screen.findByText('Rosa Martínez')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledWith('Listo', expect.stringContaining('colaborador'));
  });

  it('avisa cuando el código es inválido o expiró', async () => {
    renderScreen({ joinPatient: jest.fn().mockRejectedValue(new JoinPatientError('INVALID_CODE')) });
    await joinWithCode('AB12CD34');
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('No se pudo unir', 'El código es inválido, ya fue usado o expiró.'));
  });

  it('avisa cuando ya es colaborador del paciente', async () => {
    renderScreen({ joinPatient: jest.fn().mockRejectedValue(new JoinPatientError('ALREADY_MEMBER')) });
    await joinWithCode('AB12CD34');
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('No se pudo unir', 'Ya eres colaborador de este paciente.'));
  });

  it('avisa cuando no hay conexión', async () => {
    renderScreen({ joinPatient: jest.fn().mockRejectedValue(new JoinPatientError('NETWORK')) });
    await joinWithCode('AB12CD34');
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Sin conexión', expect.any(String)));
  });
});
