import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { VitalRecord } from '@/domain/entities';
import VitalCard from '@/presentation/components/VitalCard';

export default function VitalsHistoryScreen() {
  const { vitalRepo } = useInjection();
  const selectedPatientId = useAuthStore((s) => s.selectedPatientId);
  const navigation = useNavigation<any>();

  const { data, isLoading } = useQuery({
    queryKey: ['vital-records', selectedPatientId],
    queryFn: () =>
      selectedPatientId ? vitalRepo.listRecords(selectedPatientId) : Promise.resolve([]),
    enabled: !!selectedPatientId,
  });

  if (!selectedPatientId) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Selecciona un paciente desde la pestaña Pacientes.</Text>
      </View>
    );
  }

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2D7DD2" />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Historial de Signos Vitales</Text>
      <FlatList
        data={data}
        keyExtractor={(i: VitalRecord) => i.id}
        renderItem={({ item }) => <VitalCard record={item} />}
        ListEmptyComponent={<Text style={styles.empty}>Sin registros aún.</Text>}
        contentContainerStyle={{ padding: 16 }}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Pacientes', { screen: 'RecordVitals', params: { patientId: selectedPatientId } })}
      >
        <Text style={styles.fabText}>+ Registrar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { fontSize: 18, fontWeight: '600', padding: 16, color: '#1a1a2e' },
  hint: { color: '#aaa', textAlign: 'center' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#2D7DD2', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 24, elevation: 4 },
  fabText: { color: '#fff', fontWeight: 'bold' },
});
