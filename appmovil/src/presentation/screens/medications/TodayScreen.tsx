import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { MedicationLog } from '@/domain/entities';
import MedicationCard from '@/presentation/components/MedicationCard';
import MedicationActionModal from '@/presentation/components/MedicationActionModal';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'Today'>;
};

function isPending(status: MedicationLog['status']): boolean {
  return status === 'PENDING' || status === 'ESCALATED';
}

export default function TodayScreen({ navigation }: Props) {
  const { medicationRepo } = useInjection();
  const selectedPatientId = useAuthStore((s) => s.selectedPatientId);
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [selectedLog, setSelectedLog] = useState<MedicationLog | null>(null);

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
      setSelectedLog(null);
    },
    onError: () => Alert.alert('Error', 'No se pudo confirmar la dosis.'),
  });

  const missMutation = useMutation({
    mutationFn: (logId: string) => medicationRepo.missLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-logs'] });
      setSelectedLog(null);
    },
    onError: () => Alert.alert('Error', 'No se pudo omitir la dosis.'),
  });

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

  const pending = (data ?? []).filter((log) => isPending(log.status));

  return (
    <ScreenBackground>
      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MedicationCard log={item} onPress={() => setSelectedLog(item)} />
        )}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerLogoRow}>
                <Image
                  source={require('../../../../assets/cuidalink-icon.png')}
                  style={styles.headerLogoIcon}
                  resizeMode="contain"
                />
                <Text style={styles.headerTitle}>
                  <Text style={styles.headerCuida}>Cuida</Text>
                  <Text style={styles.headerLink}>Link</Text>
                </Text>
              </View>
              <View style={styles.backButtonSpacer} />
            </View>

            <Text style={styles.title}>Hoy</Text>
            <Text style={styles.subtitle}>Medicamentos pendientes de hoy</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={56} color="#5ee7df" />
            <Text style={styles.emptyTitle}>¡Todo al día!</Text>
            <Text style={styles.emptySubtitle}>No hay medicamentos pendientes por ahora.</Text>
          </View>
        }
        contentContainerStyle={{ padding: 20, paddingTop: 24 }}
      />

      <MedicationActionModal
        visible={!!selectedLog}
        log={selectedLog}
        onConfirm={() => selectedLog && confirmMutation.mutate(selectedLog.id)}
        onMiss={() => selectedLog && missMutation.mutate(selectedLog.id)}
        onClose={() => setSelectedLog(null)}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  hint: { color: '#e2e8f0', textAlign: 'center' },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  backButtonSpacer: { width: 44 },
  headerLogoRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerLogoIcon: { width: 32, height: 32 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  headerCuida: { color: '#fff' },
  headerLink: { color: '#38bdf8' },

  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#a5d8f3', marginTop: 4, marginBottom: 20 },

  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#a5d8f3', marginTop: 6, textAlign: 'center' },
});
