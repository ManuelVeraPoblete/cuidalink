import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BitacoraScreen from '../BitacoraScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { BitacoraEntry, Patient } from '@/domain/entities';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

const patient: Patient = {
  id: 'p1',
  fullName: 'Rosa Elena Martínez Silva',
  birthDate: '1948-01-15',
  gender: 'FEMALE',
  identificationNumber: '11111111-1',
  address: 'Calle Falsa 123',
  healthInsurance: 'Fonasa',
  bloodType: 'O+',
  emergencyContact: { name: 'Juan Martínez', phone: '+56911112222' },
  isOwner: true,
  active: true,
};

function buildEntry(overrides: Partial<BitacoraEntry> = {}): BitacoraEntry {
  return {
    id: 'e1',
    patientId: 'p1',
    authorId: 'u1',
    type: 'ENTRY',
    note: 'Paciente despertó tranquila y durmió bien durante la noche.',
    recordedAt: '2026-07-08T08:15:00',
    ...overrides,
  };
}

function renderScreen(entries: BitacoraEntry[], navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const listEntries = jest.fn().mockResolvedValue(entries);
  const getPatient = jest.fn().mockResolvedValue(patient);
  mockedUseInjection.mockReturnValue({
    bitacoraEntryRepo: { listEntries },
    patientRepo: { getPatient },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const route = { params: { patientId: 'p1' } } as any;

  render(
    <QueryClientProvider client={queryClient}>
      <BitacoraScreen navigation={navigation} route={route} />
    </QueryClientProvider>
  );

  return { navigation, listEntries };
}

describe('BitacoraScreen', () => {
  it('muestra el nombre del paciente', async () => {
    renderScreen([buildEntry()]);
    expect(await screen.findByText('Paciente: Rosa Elena Martínez Silva')).toBeTruthy();
  });

  it('muestra las entradas con nota y badge', async () => {
    renderScreen([buildEntry(), buildEntry({ id: 'e2', type: 'OBSERVATION', note: 'Comió bien el almuerzo.' })]);
    expect(await screen.findByText('Paciente despertó tranquila y durmió bien durante la noche.')).toBeTruthy();
    expect(screen.getByText('Comió bien el almuerzo.')).toBeTruthy();
    expect(screen.getByText('Entrada')).toBeTruthy();
    expect(screen.getByText('Observación')).toBeTruthy();
  });

  it('muestra un estado vacío cuando no hay entradas', async () => {
    renderScreen([]);
    expect(await screen.findByText('Sin entradas para este período.')).toBeTruthy();
  });

  it('cambia el rango de fechas al elegir "Todo" y vuelve a consultar', async () => {
    const { listEntries } = renderScreen([buildEntry()]);
    await screen.findByText(/despertó/);
    const firstCallFrom = listEntries.mock.calls[0][1];

    fireEvent.press(screen.getByText('Últimos 7 días'));
    fireEvent.press(await screen.findByTestId('range-option-ALL'));

    await waitFor(() => {
      const lastCall = listEntries.mock.calls[listEntries.mock.calls.length - 1];
      expect(lastCall[1]).toBe('2020-01-01');
    });
    expect(listEntries.mock.calls[listEntries.mock.calls.length - 1][1]).not.toBe(firstCallFrom);
  });

  it('filtra por tipo al elegir "Entrada" en Filtrar', async () => {
    const { listEntries } = renderScreen([buildEntry()]);
    await screen.findByText(/despertó/);

    fireEvent.press(screen.getByText('Filtrar'));
    fireEvent.press(await screen.findByTestId('type-option-ENTRY'));

    await waitFor(() => {
      const lastCall = listEntries.mock.calls[listEntries.mock.calls.length - 1];
      expect(lastCall[3]).toBe('ENTRY');
    });
  });

  it('navega a AddBitacoraEntry al presionar "Agregar entrada"', async () => {
    const { navigation } = renderScreen([]);
    fireEvent.press(await screen.findByText('Agregar entrada'));
    expect(navigation.navigate).toHaveBeenCalledWith('AddBitacoraEntry', { patientId: 'p1' });
  });
});
