import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import EditProfileScreen from '../EditProfileScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

function renderScreen(navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const updateProfile = jest.fn().mockResolvedValue({
    id: 'u1', name: 'Manuel Vera', email: 'manuel.vera@email.com', role: 'CAREGIVER',
    phone: '+56912345678', address: 'Nueva dirección', specialty: 'Cuidado de adultos mayores',
    experience: '5 años',
  });
  mockedUseInjection.mockReturnValue({ authRepo: { updateProfile } });

  render(<EditProfileScreen navigation={navigation} />);
  return { navigation, updateProfile };
}

describe('EditProfileScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'u1', name: 'Manuel Vera', email: 'manuel.vera@email.com', role: 'CAREGIVER',
        phone: '+56912345678', address: 'Av. Los Leones 1234',
        specialty: 'Cuidado de adultos mayores', experience: '5 años',
      },
    });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('precarga los datos actuales del usuario', () => {
    renderScreen();
    expect(screen.getByDisplayValue('Manuel Vera')).toBeTruthy();
    expect(screen.getByDisplayValue('manuel.vera@email.com')).toBeTruthy();
    expect(screen.getByDisplayValue('912345678')).toBeTruthy();
    expect(screen.getByDisplayValue('Av. Los Leones 1234')).toBeTruthy();
  });

  it('muestra error si el nombre queda vacío', async () => {
    renderScreen();
    fireEvent.changeText(screen.getByDisplayValue('Manuel Vera'), '');
    fireEvent.press(screen.getByText('Guardar Cambios'));
    expect(await screen.findByText('El nombre debe tener al menos 2 caracteres')).toBeTruthy();
  });

  it('guarda exitosamente, actualiza el store y navega atrás', async () => {
    const { updateProfile, navigation } = renderScreen();

    fireEvent.changeText(screen.getByDisplayValue('Av. Los Leones 1234'), 'Nueva dirección');
    fireEvent.press(screen.getByText('Guardar Cambios'));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({
      name: 'Manuel Vera',
      email: 'manuel.vera@email.com',
      phone: '+56912345678',
      address: 'Nueva dirección',
      specialty: 'Cuidado de adultos mayores',
      experience: '5 años',
    }));
    expect(navigation.goBack).toHaveBeenCalled();
    expect(useAuthStore.getState().user?.address).toBe('Nueva dirección');
  });

  it('muestra una alerta específica cuando el correo ya está en uso (409)', async () => {
    const updateProfile = jest.fn().mockRejectedValue({
      isAxiosError: true, response: { status: 409 },
    });
    mockedUseInjection.mockReturnValue({ authRepo: { updateProfile } });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});

    render(<EditProfileScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() } as any} />);
    fireEvent.press(screen.getByText('Guardar Cambios'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'Este correo ya está en uso.'));
  });

  it('muestra una alerta genérica para otros errores', async () => {
    const updateProfile = jest.fn().mockRejectedValue(new Error('network'));
    mockedUseInjection.mockReturnValue({ authRepo: { updateProfile } });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});

    render(<EditProfileScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() } as any} />);
    fireEvent.press(screen.getByText('Guardar Cambios'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo actualizar el perfil.'));
  });
});
