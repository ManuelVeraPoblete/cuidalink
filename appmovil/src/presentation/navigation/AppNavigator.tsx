import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '@/presentation/screens/home/HomeScreen';
import PatientsListScreen from '@/presentation/screens/patients/PatientsListScreen';
import PatientDetailScreen from '@/presentation/screens/patients/PatientDetailScreen';
import CreatePatientScreen from '@/presentation/screens/patients/CreatePatientScreen';
import EditPatientScreen from '@/presentation/screens/patients/EditPatientScreen';
import DailyMedsScreen from '@/presentation/screens/medications/DailyMedsScreen';
import VitalsHistoryScreen from '@/presentation/screens/vitals/VitalsHistoryScreen';
import RecordVitalsScreen from '@/presentation/screens/vitals/RecordVitalsScreen';
import ProfileScreen from '@/presentation/screens/profile/ProfileScreen';

export type PatientStackParams = {
  PatientsList: undefined;
  PatientDetail: { patientId: string };
  CreatePatient: undefined;
  EditPatient: { patientId: string };
  RecordVitals: { patientId: string };
};

const Tab = createBottomTabNavigator();
const PatientStack = createNativeStackNavigator<PatientStackParams>();

function PatientStackNavigator() {
  return (
    <PatientStack.Navigator>
      <PatientStack.Screen name="PatientsList" component={PatientsListScreen} options={{ title: 'Pacientes' }} />
      <PatientStack.Screen name="PatientDetail" component={PatientDetailScreen} options={{ title: 'Detalle' }} />
      <PatientStack.Screen name="CreatePatient" component={CreatePatientScreen} options={{ title: 'Nuevo Paciente' }} />
      <PatientStack.Screen name="EditPatient" component={EditPatientScreen} options={{ title: 'Editar Paciente' }} />
      <PatientStack.Screen name="RecordVitals" component={RecordVitalsScreen} options={{ title: 'Registrar Signos Vitales' }} />
    </PatientStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Pacientes" component={PatientStackNavigator} options={{ headerShown: false }} />
      <Tab.Screen name="Medicamentos" component={DailyMedsScreen} />
      <Tab.Screen name="Vitales" component={VitalsHistoryScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
