import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfileScreen from '../ProfileScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

function renderScreen(navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const logout = jest.fn().mockResolvedValue(undefined);
  mockedUseInjection.mockReturnValue({ authRepo: { logout } });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ProfileScreen navigation={navigation} />
    </QueryClientProvider>
  );
  return { navigation, logout };
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'u1', name: 'Manuel Vera', email: 'manuel.vera@email.com', role: 'CAREGIVER',
        phone: '+56912345678', address: 'Av. Los Leones 1234, Piso 5',
        specialty: 'Cuidado de adultos mayores', experience: '5 años',
      },
    });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('muestra los datos personales del cuidador', () => {
    renderScreen();
    expect(screen.getAllByText('Manuel Vera').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Cuidador')).toBeTruthy();
    expect(screen.getByText('manuel.vera@email.com')).toBeTruthy();
    expect(screen.getByText('+56912345678')).toBeTruthy();
    expect(screen.getByText('Av. Los Leones 1234, Piso 5')).toBeTruthy();
    expect(screen.getByText('Cuidado de adultos mayores')).toBeTruthy();
    expect(screen.getByText('5 años')).toBeTruthy();
  });

  it('muestra "No especificado" cuando faltan campos', () => {
    useAuthStore.setState({
      user: { id: 'u1', name: 'Manuel Vera', email: 'manuel.vera@email.com', role: 'CAREGIVER' },
    });
    renderScreen();
    expect(screen.getAllByText('No especificado').length).toBe(4);
  });

  it('el botón Editar navega a EditProfile', () => {
    const { navigation } = renderScreen();
    fireEvent.press(screen.getByText('Editar'));
    expect(navigation.navigate).toHaveBeenCalledWith('EditProfile');
  });

  it('las filas de configuración navegan a ComingSoon', () => {
    const { navigation } = renderScreen();
    fireEvent.press(screen.getByText('Cambiar contraseña'));
    expect(navigation.navigate).toHaveBeenCalledWith('ComingSoon', {
      title: 'Cambiar contraseña', subtitle: 'Configuración de seguridad',
    });

    fireEvent.press(screen.getByText('Notificaciones'));
    expect(navigation.navigate).toHaveBeenCalledWith('ComingSoon', {
      title: 'Notificaciones', subtitle: 'Preferencias de notificación',
    });
  });

  it('cierra sesión al presionar Cerrar sesión', async () => {
    const { logout } = renderScreen();
    fireEvent.press(screen.getByText('Cerrar sesión'));
    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(useAuthStore.getState().user).toBeNull();
  });
});
