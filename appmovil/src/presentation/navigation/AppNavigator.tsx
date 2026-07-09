import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '@/presentation/screens/home/HomeScreen';
import PatientsListScreen from '@/presentation/screens/patients/PatientsListScreen';
import PatientDetailScreen from '@/presentation/screens/patients/PatientDetailScreen';
import CreatePatientScreen from '@/presentation/screens/patients/CreatePatientScreen';
import EditPatientScreen from '@/presentation/screens/patients/EditPatientScreen';
import DailyMedsScreen from '@/presentation/screens/medications/DailyMedsScreen';
import CreateMedicationScreen from '@/presentation/screens/medications/CreateMedicationScreen';
import TodayScreen from '@/presentation/screens/medications/TodayScreen';
import VitalsHistoryScreen from '@/presentation/screens/vitals/VitalsHistoryScreen';
import RecordVitalsScreen from '@/presentation/screens/vitals/RecordVitalsScreen';
import ProfileScreen from '@/presentation/screens/profile/ProfileScreen';
import EditProfileScreen from '@/presentation/screens/profile/EditProfileScreen';
import ComingSoonScreen from '@/presentation/screens/common/ComingSoonScreen';
import ContactsScreen from '@/presentation/screens/patients/ContactsScreen';
import ContactFormScreen from '@/presentation/screens/patients/ContactFormScreen';
import TasksScreen from '@/presentation/screens/tasks/TasksScreen';
import CreateTaskScreen from '@/presentation/screens/tasks/CreateTaskScreen';
import BitacoraScreen from '@/presentation/screens/bitacora/BitacoraScreen';
import AddBitacoraEntryScreen from '@/presentation/screens/bitacora/AddBitacoraEntryScreen';

export type PatientStackParams = {
  Home: undefined;
  Pacientes: undefined;
  PatientDetail: { patientId: string };
  CreatePatient: undefined;
  EditPatient: { patientId: string };
  RecordVitals: { patientId: string };
  Medicamentos: undefined;
  Vitales: undefined;
  Perfil: undefined;
  ComingSoon: { title: string; subtitle: string };
  Contacts: { patientId: string };
  ContactForm: { patientId: string; contactId?: string };
  Bitacora: { patientId: string };
  AddBitacoraEntry: { patientId: string };
  CreateMedication: undefined;
  Tasks: undefined;
  CreateTask: undefined;
  Today: undefined;
  EditProfile: undefined;
};

const Stack = createNativeStackNavigator<PatientStackParams>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#12283f' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Pacientes" component={PatientsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PatientDetail" component={PatientDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreatePatient" component={CreatePatientScreen} options={{ title: 'Nuevo Paciente' }} />
      <Stack.Screen name="EditPatient" component={EditPatientScreen} options={{ title: 'Editar Paciente' }} />
      <Stack.Screen name="RecordVitals" component={RecordVitalsScreen} options={{ title: 'Registrar Signos Vitales' }} />
      <Stack.Screen name="Medicamentos" component={DailyMedsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Vitales" component={VitalsHistoryScreen} options={{ title: 'Signos Vitales' }} />
      <Stack.Screen name="Perfil" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Editar Perfil' }} />
      <Stack.Screen name="ComingSoon" component={ComingSoonScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Contacts" component={ContactsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ContactForm" component={ContactFormScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Bitacora" component={BitacoraScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddBitacoraEntry" component={AddBitacoraEntryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateMedication" component={CreateMedicationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Tasks" component={TasksScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateTask" component={CreateTaskScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Today" component={TodayScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
