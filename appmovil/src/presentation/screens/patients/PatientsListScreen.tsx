import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { Patient } from '@/domain/entities';

type Props = { navigation: NativeStackNavigationProp<PatientStackParams, 'PatientsList'> };

export default function PatientsListScreen({ navigation }: Props) {
  const { patientRepo } = useInjection();
  const { data, isLoading, error } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientRepo.listPatients(),
  });

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2D7DD2" />;
  if (error) return <View style={styles.center}><Text style={styles.errorText}>Error al cargar pacientes</Text></View>;

  const renderItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PatientDetail', { patientId: item.id })}>
      <Text style={styles.name}>{item.fullName}</Text>
      <Text style={styles.role}>{item.isOwner ? 'Cuidador principal' : 'Colaborador'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No tienes pacientes aún.</Text>}
        contentContainerStyle={{ padding: 16 }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreatePatient')}>
        <Text style={styles.fabText}>+ Nuevo Paciente</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  name: { fontSize: 16, fontWeight: '600', color: '#1a1a2e' },
  role: { fontSize: 13, color: '#888', marginTop: 4 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  errorText: { color: '#e53e3e' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#2D7DD2', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 24, elevation: 4 },
  fabText: { color: '#fff', fontWeight: 'bold' },
});
