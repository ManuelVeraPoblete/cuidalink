import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import ReportScreen from '../ReportScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { ReportDownloadError } from '@/domain/repositories/ReportRepository';

jest.mock('@/presentation/hooks/useInjection');

jest.mock('@react-native-community/datetimepicker', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockDateTimePicker({ onChange, testID }: any) {
    return (
      <TouchableOpacity testID={testID} onPress={() => onChange({}, new Date(2026, 5, 1, 12, 0, 0))}>
        <Text>mock-picker</Text>
      </TouchableOpacity>
    );
  };
});

const mockedUseInjection = useInjection as jest.Mock;

const owner = { id: 'p1', fullName: 'Rosa Martínez', birthDate: '1948-01-15', gender: 'FEMALE', isOwner: true, emergencyContact: { name: 'Juan', phone: '+56911112222' } };

function renderScreen({ patient = owner, execute = jest.fn().mockResolvedValue('file:///informe.pdf') } = {}) {
  mockedUseInjection.mockReturnValue({
    patientRepo: { getPatient: jest.fn().mockResolvedValue(patient) },
    downloadReportUseCase: { execute },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ReportScreen navigation={{ goBack: jest.fn() } as any} route={{ params: { patientId: 'p1' } } as any} />
    </QueryClientProvider>
  );
  return { execute };
}

describe('ReportScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 28, 12, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('genera el informe de los últimos 30 días por defecto', async () => {
    const { execute } = renderScreen();
    fireEvent.press(await screen.findByTestId('generate-button'));
    await waitFor(() => expect(execute).toHaveBeenCalledWith('p1', '2026-08-30', '2026-09-28'));
  });

  it('usa el rango del acceso rápido seleccionado', async () => {
    const { execute } = renderScreen();
    fireEvent.press(await screen.findByText('Últimos 7 días'));
    expect(screen.getByText('2026-09-22')).toBeTruthy();
    fireEvent.press(screen.getByTestId('generate-button'));
    await waitFor(() => expect(execute).toHaveBeenCalledWith('p1', '2026-09-22', '2026-09-28'));
  });

  it('muestra el error y no genera si el rango personalizado supera 90 días', async () => {
    const { execute } = renderScreen();
    fireEvent.press(await screen.findByTestId('from-field'));
    fireEvent.press(screen.getByTestId('from-picker'));

    expect(screen.getByText('2026-06-01')).toBeTruthy();
    expect(screen.getByText('El rango no puede superar 90 días.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('generate-button'));
    expect(execute).not.toHaveBeenCalled();
  });

  it('avisa cuando el backend rechaza la solicitud', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderScreen({ execute: jest.fn().mockRejectedValue(new ReportDownloadError('REJECTED')) });
    fireEvent.press(await screen.findByTestId('generate-button'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('No se pudo generar', expect.stringContaining('permiso')));
  });

  it('avisa cuando no hay conexión', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderScreen({ execute: jest.fn().mockRejectedValue(new ReportDownloadError('NETWORK')) });
    fireEvent.press(await screen.findByTestId('generate-button'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Sin conexión', expect.any(String)));
  });

  it('no permite generar a un colaborador', async () => {
    renderScreen({ patient: { ...owner, isOwner: false } });
    expect(await screen.findByText('Solo el cuidador principal puede generar informes.')).toBeTruthy();
    expect(screen.queryByTestId('generate-button')).toBeNull();
  });
});
