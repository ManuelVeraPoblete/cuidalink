import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import CollaboratorsSection from '@/presentation/components/CollaboratorsSection';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'PatientDetail'>;
  route: RouteProp<PatientStackParams, 'PatientDetail'>;
};

export default function PatientDetailScreen({ navigation, route }: Props) {
  const { patientId } = route.params;
  const { patientRepo } = useInjection();

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientRepo.getPatient(patientId),
  });

  if (isLoading) return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#2D7DD2" /></ScreenBackground>;
  if (!patient) return null;

  return (
    <ScreenBackground>
      <ScrollView style={styles.container}>
        <Text style={styles.name}>{patient.fullName}</Text>
        <Text style={styles.meta}>Nacimiento: {patient.birthDate}</Text>

        {patient.isOwner && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('EditPatient', { patientId })}>
              <Text style={styles.btnText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => navigation.navigate('RecordVitals', { patientId })}>
              <Text style={styles.btnSecondaryText}>Registrar Vitales</Text>
            </TouchableOpacity>
          </View>
        )}

        <CollaboratorsSection patientId={patientId} isOwner={patient.isOwner} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', padding: 20 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  meta: { fontSize: 14, color: '#e2e8f0', marginBottom: 24 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  btn: { flex: 1, backgroundColor: '#2D7DD2', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2D7DD2' },
  btnSecondaryText: { color: '#2D7DD2', fontWeight: '600' },
});
