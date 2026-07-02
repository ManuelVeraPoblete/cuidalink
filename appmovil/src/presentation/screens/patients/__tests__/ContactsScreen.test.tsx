import { render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Linking, Alert } from 'react-native';
import ContactsScreen from '../ContactsScreen';
import { useInjection } from '@/presentation/hooks/useInjection';

jest.mock('@/presentation/hooks/useInjection');
jest.mock('@/presentation/components/CollaboratorsSection', () => {
  const { Text } = require('react-native');
  return function MockCollaboratorsSection() {
    return <Text>collaborators-section</Text>;
  };
});

const mockedUseInjection = useInjection as jest.Mock;

const basePatient = {
  id: 'p1',
  fullName: 'Rosa Martínez',
  isOwner: true,
  emergencyContact: { name: 'Juan Martínez', phone: '+56911112222' },
};

function renderScreen(patient: any, navigation: any = { navigate: jest.fn() }) {
  const getPatient = jest.fn().mockResolvedValue(patient);
  mockedUseInjection.mockReturnValue({ patientRepo: { getPatient } });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const route = { params: { patientId: 'p1' } } as any;

  render(
    <QueryClientProvider client={queryClient}>
      <ContactsScreen navigation={navigation} route={route} />
    </QueryClientProvider>
  );

  return { navigation };
}

describe('ContactsScreen', () => {
  it('muestra el botón "Editar paciente" cuando el usuario es owner', async () => {
    renderScreen(basePatient);
    expect(await screen.findByText('Editar paciente')).toBeTruthy();
  });

  it('oculta el botón "Editar paciente" cuando el usuario no es owner', async () => {
    renderScreen({ ...basePatient, isOwner: false });
    await screen.findByText('collaborators-section');
    expect(screen.queryByText('Editar paciente')).toBeNull();
  });

  it('navega a EditPatient al presionar "Editar paciente"', async () => {
    const { navigation } = renderScreen(basePatient);
    fireEvent.press(await screen.findByText('Editar paciente'));
    expect(navigation.navigate).toHaveBeenCalledWith('EditPatient', { patientId: 'p1' });
  });

  it('llama al teléfono de emergencia al presionar "Llamar"', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderScreen(basePatient);
    fireEvent.press(await screen.findByText('Llamar'));
    expect(openURLSpy).toHaveBeenCalledWith('tel:+56911112222');
  });

  it('muestra una alerta cuando no hay teléfono de emergencia', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderScreen({ ...basePatient, emergencyContact: { name: '', phone: '' } });
    fireEvent.press(await screen.findByText('Llamar'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Sin contacto de emergencia',
      'Este paciente no tiene un teléfono de emergencia registrado.'
    );
  });

  it('renderiza CollaboratorsSection', async () => {
    renderScreen(basePatient);
    expect(await screen.findByText('collaborators-section')).toBeTruthy();
  });
});
