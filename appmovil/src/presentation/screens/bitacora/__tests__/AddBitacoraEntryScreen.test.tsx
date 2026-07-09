import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddBitacoraEntryScreen from '../AddBitacoraEntryScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { BitacoraEntry } from '@/domain/entities';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

const createdEntry: BitacoraEntry = {
  id: 'e1', patientId: 'p1', authorId: 'u1', type: 'ENTRY',
  note: 'Paciente estable', recordedAt: '2026-07-09T10:00:00',
};

function renderScreen(navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const createEntry = jest.fn().mockResolvedValue(createdEntry);
  mockedUseInjection.mockReturnValue({
    bitacoraEntryRepo: { createEntry },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const route = { params: { patientId: 'p1' } } as any;

  render(
    <QueryClientProvider client={queryClient}>
      <AddBitacoraEntryScreen navigation={navigation} route={route} />
    </QueryClientProvider>
  );

  return { navigation, createEntry };
}

describe('AddBitacoraEntryScreen', () => {
  it('valida que la nota sea requerida', async () => {
    renderScreen();
    await screen.findByText('Nueva entrada');
    fireEvent.press(screen.getByText('Guardar'));
    expect(await screen.findByText('La nota es obligatoria')).toBeTruthy();
  });

  it('crea la entrada y vuelve atrás', async () => {
    const { navigation, createEntry } = renderScreen();
    await screen.findByText('Nueva entrada');
    fireEvent.changeText(screen.getByTestId('bitacora-note-input'), 'Paciente estable');
    fireEvent.press(screen.getByText('Guardar'));

    await waitFor(() => expect(createEntry).toHaveBeenCalledWith('p1', 'Paciente estable'));
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
  });

  it('cancelar vuelve atrás sin guardar', async () => {
    const { navigation, createEntry } = renderScreen();
    await screen.findByText('Nueva entrada');
    fireEvent.press(screen.getByText('Cancelar'));
    expect(navigation.goBack).toHaveBeenCalled();
    expect(createEntry).not.toHaveBeenCalled();
  });
});
