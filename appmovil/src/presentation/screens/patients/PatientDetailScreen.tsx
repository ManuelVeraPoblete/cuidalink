import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import CollaboratorsSection from '@/presentation/components/CollaboratorsSection';

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

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2D7DD2" />;
  if (!patient) return null;

  return (
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', padding: 20 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4 },
  meta: { fontSize: 14, color: '#888', marginBottom: 24 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  btn: { flex: 1, backgroundColor: '#2D7DD2', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2D7DD2' },
  btnSecondaryText: { color: '#2D7DD2', fontWeight: '600' },
});
