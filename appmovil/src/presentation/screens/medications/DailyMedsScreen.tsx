import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { MedicationLog } from '@/domain/entities';
import MedicationCard from '@/presentation/components/MedicationCard';
import MedicationActionModal from '@/presentation/components/MedicationActionModal';
import ScreenBackground from '@/presentation/components/ScreenBackground';

export default function DailyMedsScreen() {
  const { medicationRepo } = useInjection();
  const selectedPatientId = useAuthStore((s) => s.selectedPatientId);
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [selectedLog, setSelectedLog] = useState<MedicationLog | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['medication-logs', selectedPatientId, today],
    queryFn: () =>
      selectedPatientId
        ? medicationRepo.getDailyLogs(selectedPatientId, today)
        : Promise.resolve([]),
    enabled: !!selectedPatientId,
  });

  const confirmMutation = useMutation({
    mutationFn: (logId: string) => medicationRepo.confirmLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-logs'] });
      setModalVisible(false);
    },
    onError: () => Alert.alert('Error', 'No se pudo confirmar la dosis.'),
  });

  const missMutation = useMutation({
    mutationFn: (logId: string) => medicationRepo.missLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-logs'] });
      setModalVisible(false);
    },
    onError: () => Alert.alert('Error', 'No se pudo marcar la dosis.'),
  });

  const handleCardPress = (log: MedicationLog) => {
    setSelectedLog(log);
    setModalVisible(true);
  };

  if (!selectedPatientId) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <Text style={styles.hint}>Selecciona un paciente desde Inicio → Mis pacientes.</Text>
        </View>
      </ScreenBackground>
    );
  }

  if (isLoading) return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#2D7DD2" /></ScreenBackground>;

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.header}>Medicamentos de hoy</Text>
        <FlatList
          data={data}
          keyExtractor={(i: MedicationLog) => i.id}
          renderItem={({ item }) => (
            <MedicationCard
              log={item}
              onPress={() => handleCardPress(item)}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>Sin medicamentos programados para hoy.</Text>}
          contentContainerStyle={{ padding: 16 }}
        />
        <MedicationActionModal
          visible={modalVisible}
          log={selectedLog}
          onConfirm={() => selectedLog && confirmMutation.mutate(selectedLog.id)}
          onMiss={() => selectedLog && missMutation.mutate(selectedLog.id)}
          onClose={() => setModalVisible(false)}
        />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { fontSize: 18, fontWeight: '600', padding: 16, color: '#fff' },
  hint: { color: '#e2e8f0', textAlign: 'center' },
  empty: { textAlign: 'center', color: '#e2e8f0', marginTop: 40 },
});
