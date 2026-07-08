import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Linking } from 'react-native';
import ContactsScreen from '../ContactsScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { Patient, PatientContact } from '@/domain/entities';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

const ownerPatient: Patient = {
  id: 'p1',
  fullName: 'Rosa Martínez',
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

function buildContact(overrides: Partial<PatientContact> = {}): PatientContact {
  return {
    id: 'c1',
    patientId: 'p1',
    name: 'Ana Martínez',
    category: 'FAMILY',
    relationship: 'Hija',
    phone: '+56912345678',
    email: 'ana@email.com',
    note: null,
    priority: false,
    ...overrides,
  };
}

function renderScreen(contacts: PatientContact[], patient: Patient = ownerPatient, navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const listContacts = jest.fn().mockResolvedValue(contacts);
  const getPatient = jest.fn().mockResolvedValue(patient);
  mockedUseInjection.mockReturnValue({
    patientContactRepo: { listContacts },
    patientRepo: { getPatient },
  });

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
  it('muestra el nombre del paciente', async () => {
    renderScreen([buildContact()]);
    expect(await screen.findByText('Paciente: Rosa Martínez')).toBeTruthy();
  });

  it('muestra los contactos con su categoría y relación', async () => {
    renderScreen([buildContact()]);
    expect(await screen.findByText('Ana Martínez')).toBeTruthy();
    expect(screen.getAllByText('Familia').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Hija')).toBeTruthy();
    expect(screen.getByText('ana@email.com')).toBeTruthy();
  });

  it('muestra la nota en vez del email cuando no hay email', async () => {
    renderScreen([buildContact({ email: null, note: 'Llamar primero en caso de urgencia', category: 'EMERGENCY', priority: true })]);
    expect(await screen.findByText('Llamar primero en caso de urgencia')).toBeTruthy();
    expect(screen.getByText('Prioritario')).toBeTruthy();
  });

  it('filtra por categoría al presionar una pestaña', async () => {
    renderScreen([
      buildContact({ id: 'c1', name: 'Ana Martínez', category: 'FAMILY' }),
      buildContact({ id: 'c2', name: 'Dr. Pablo Rojas', category: 'DOCTOR', email: 'pablo@clinica.cl' }),
    ]);
    await screen.findByText('Ana Martínez');
    fireEvent.press(screen.getByTestId('contacts-tab-DOCTOR'));
    expect(screen.getByText('Dr. Pablo Rojas')).toBeTruthy();
    expect(screen.queryByText('Ana Martínez')).toBeNull();
  });

  it('llama al teléfono al presionar "Llamar"', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderScreen([buildContact()]);
    await screen.findByText('Ana Martínez');
    fireEvent.press(screen.getByText('Llamar'));
    expect(openURLSpy).toHaveBeenCalledWith('tel:+56912345678');
  });

  it('navega a ContactForm con el contactId al presionar "Editar"', async () => {
    const { navigation } = renderScreen([buildContact()]);
    await screen.findByText('Ana Martínez');
    fireEvent.press(screen.getByText('Editar'));
    expect(navigation.navigate).toHaveBeenCalledWith('ContactForm', { patientId: 'p1', contactId: 'c1' });
  });

  it('muestra el botón "Agregar contacto" cuando el usuario es owner', async () => {
    renderScreen([]);
    expect(await screen.findByText('Agregar contacto')).toBeTruthy();
  });

  it('oculta el botón "Agregar contacto" cuando el usuario no es owner', async () => {
    renderScreen([], { ...ownerPatient, isOwner: false });
    await screen.findByText('Contactos vinculados al paciente');
    expect(screen.queryByText('Agregar contacto')).toBeNull();
  });

  it('navega a ContactForm sin contactId al presionar "Agregar contacto"', async () => {
    const { navigation } = renderScreen([]);
    fireEvent.press(await screen.findByText('Agregar contacto'));
    expect(navigation.navigate).toHaveBeenCalledWith('ContactForm', { patientId: 'p1', contactId: undefined });
  });

  it('muestra un estado vacío cuando no hay contactos', async () => {
    renderScreen([]);
    expect(await screen.findByText('Sin contactos para mostrar.')).toBeTruthy();
  });
});
