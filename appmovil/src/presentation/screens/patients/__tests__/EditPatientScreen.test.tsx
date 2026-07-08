import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditPatientScreen from '../EditPatientScreen';
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
  identificationNumber: '11.111.111-1',
  birthDate: '1948-01-15',
  gender: 'FEMALE',
  address: 'Calle Falsa 123',
  emergencyContact: { name: 'Juan Martínez', phone: '+56911112222' },
  healthInsurance: 'Fonasa',
  bloodType: 'O+',
  isOwner: true,
};

describe('EditPatientScreen', () => {
  it('renderiza CollaboratorsSection', async () => {
    const getPatient = jest.fn().mockResolvedValue(basePatient);
    mockedUseInjection.mockReturnValue({ patientRepo: { getPatient, updatePatient: jest.fn() } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const route = { params: { patientId: 'p1' } } as any;
    const navigation = { navigate: jest.fn(), goBack: jest.fn() } as any;

    render(
      <QueryClientProvider client={queryClient}>
        <EditPatientScreen navigation={navigation} route={route} />
      </QueryClientProvider>
    );

    expect(await screen.findByText('collaborators-section')).toBeTruthy();
  });
});
