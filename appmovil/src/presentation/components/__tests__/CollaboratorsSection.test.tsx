import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import CollaboratorsSection from '../CollaboratorsSection';
import { useInjection } from '@/presentation/hooks/useInjection';

jest.mock('@/presentation/hooks/useInjection');
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(true) }));

const mockedUseInjection = useInjection as jest.Mock;

function renderSection(getInvitationCode: jest.Mock) {
  mockedUseInjection.mockReturnValue({
    patientRepo: {
      getCollaborators: jest.fn().mockResolvedValue([{ id: 'u2', name: 'Ana', email: 'ana@mail.cl' }]),
      getInvitationCode,
    },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <CollaboratorsSection patientId="p1" isOwner />
    </QueryClientProvider>
  );
}

describe('CollaboratorsSection', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => alertSpy.mockRestore());

  it('no ofrece unirse con código (el dueño no puede ser colaborador)', async () => {
    renderSection(jest.fn());
    expect(await screen.findByText(/Ana/)).toBeTruthy();
    expect(screen.queryByText('Unirme con código')).toBeNull();
  });

  it('copia el código generado', async () => {
    renderSection(jest.fn().mockResolvedValue('AB12CD34'));
    fireEvent.press(await screen.findByText('Generar código de invitación'));
    await waitFor(() => expect(Clipboard.setStringAsync).toHaveBeenCalledWith('AB12CD34'));
    expect(alertSpy).toHaveBeenCalledWith('Código copiado', expect.stringContaining('AB12CD34'));
  });

  it('avisa si no se pudo generar el código', async () => {
    renderSection(jest.fn().mockRejectedValue(new Error('boom')));
    fireEvent.press(await screen.findByText('Generar código de invitación'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo generar el código de invitación. Intenta de nuevo.'));
  });
});
