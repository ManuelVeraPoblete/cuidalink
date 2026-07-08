import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import ContactFormScreen from '../ContactFormScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { PatientContact } from '@/domain/entities';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

const existingContact: PatientContact = {
  id: 'c1',
  patientId: 'p1',
  name: 'Ana Martínez',
  category: 'FAMILY',
  relationship: 'Hija',
  phone: '+56912345678',
  email: 'ana@email.com',
  note: null,
  priority: false,
};

function renderScreen(contactId: string | undefined, navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const listContacts = jest.fn().mockResolvedValue([existingContact]);
  const createContact = jest.fn().mockResolvedValue(existingContact);
  const updateContact = jest.fn().mockResolvedValue(existingContact);
  mockedUseInjection.mockReturnValue({
    patientContactRepo: { listContacts, createContact, updateContact },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const route = { params: { patientId: 'p1', contactId } } as any;

  render(
    <QueryClientProvider client={queryClient}>
      <ContactFormScreen navigation={navigation} route={route} />
    </QueryClientProvider>
  );

  return { navigation, createContact, updateContact };
}

describe('ContactFormScreen', () => {
  it('en modo creación, el nombre está vacío', async () => {
    renderScreen(undefined);
    expect(await screen.findByText('Nuevo contacto')).toBeTruthy();
    expect(screen.getByTestId('contact-name-input').props.value).toBe('');
  });

  it('en modo edición, precarga los datos del contacto', async () => {
    renderScreen('c1');
    expect(await screen.findByText('Editar contacto')).toBeTruthy();
    expect(screen.getByTestId('contact-name-input').props.value).toBe('Ana Martínez');
    expect(screen.getByTestId('contact-phone-input').props.value).toBe('912345678');
  });

  it('valida que el nombre y el teléfono sean requeridos', async () => {
    renderScreen(undefined);
    await screen.findByText('Nuevo contacto');
    fireEvent.press(screen.getByText('Guardar'));
    expect(await screen.findByText('Nombre requerido')).toBeTruthy();
    expect(screen.getByText('Ingresa los 9 dígitos del celular, sin el +56')).toBeTruthy();
  });

  it('crea un contacto nuevo y vuelve atrás', async () => {
    const { navigation, createContact } = renderScreen(undefined);
    await screen.findByText('Nuevo contacto');
    fireEvent.changeText(screen.getByTestId('contact-name-input'), 'Luis Martínez');
    fireEvent.press(screen.getByText('Emergencia'));
    fireEvent.changeText(screen.getByTestId('contact-relationship-input'), 'Hermano');
    fireEvent.changeText(screen.getByTestId('contact-phone-input'), '955551111');
    fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(createContact).toHaveBeenCalledWith('p1', {
      name: 'Luis Martínez',
      category: 'EMERGENCY',
      relationship: 'Hermano',
      phone: '+56955551111',
      email: null,
      note: null,
      priority: false,
    }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('actualiza un contacto existente', async () => {
    const { navigation, updateContact } = renderScreen('c1');
    await screen.findByText('Editar contacto');
    fireEvent.changeText(screen.getByTestId('contact-name-input'), 'Ana M. Martínez');
    fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(updateContact).toHaveBeenCalledWith('p1', 'c1', {
      name: 'Ana M. Martínez',
      category: 'FAMILY',
      relationship: 'Hija',
      phone: '+56912345678',
      email: 'ana@email.com',
      note: null,
      priority: false,
    }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('muestra una alerta si falla el guardado', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const listContacts = jest.fn().mockResolvedValue([]);
    const createContact = jest.fn().mockRejectedValue(new Error('fail'));
    mockedUseInjection.mockReturnValue({
      patientContactRepo: { listContacts, createContact, updateContact: jest.fn() },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    const route = { params: { patientId: 'p1', contactId: undefined } } as any;
    render(
      <QueryClientProvider client={queryClient}>
        <ContactFormScreen navigation={navigation as any} route={route} />
      </QueryClientProvider>
    );
    await screen.findByText('Nuevo contacto');
    fireEvent.changeText(screen.getByTestId('contact-name-input'), 'Luis Martínez');
    fireEvent.changeText(screen.getByTestId('contact-phone-input'), '955551111');
    fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo guardar el contacto.'));
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});
