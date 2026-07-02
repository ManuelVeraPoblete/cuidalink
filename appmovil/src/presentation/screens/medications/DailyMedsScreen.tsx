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
  navigation: NativeStackNavigationProp<PatientStackParams, 'Medicamentos'>;
};

type Tab = 'ALL' | 'PENDING' | 'ADMINISTERED';

function matchesTab(status: MedicationLog['status'], tab: Tab): boolean {
  if (tab === 'ALL') return true;
  if (tab === 'PENDING') return status === 'PENDING' || status === 'ESCALATED';
  return status === 'CONFIRMED';
}

export default function DailyMedsScreen({ navigation }: Props) {
  const { medicationRepo } = useInjection();
  const selectedPatientId = useAuthStore((s) => s.selectedPatientId);
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [tab, setTab] = useState<Tab>('ALL');
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

  const filtered = (data ?? []).filter((log) => matchesTab(log.status, tab));
  const todayLabel = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <ScreenBackground>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MedicationCard
            log={item}
            onPress={
              item.status === 'PENDING' || item.status === 'ESCALATED'
                ? () => setSelectedLog(item)
                : undefined
            }
          />
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

            <Text style={styles.title}>Medicamentos</Text>
            <Text style={styles.subtitle}>Medicamentos programados para hoy</Text>

            <View style={styles.dateChip}>
              <Ionicons name="calendar-outline" size={16} color="#5ee7df" />
              <Text style={styles.dateChipToday}>Hoy</Text>
              <Text style={styles.dateChipDate}>{todayLabel}</Text>
            </View>

            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.tab, tab === 'ALL' && styles.tabActive]}
                onPress={() => setTab('ALL')}
              >
                <Text style={[styles.tabText, tab === 'ALL' && styles.tabTextActive]}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tab === 'PENDING' && styles.tabActive]}
                onPress={() => setTab('PENDING')}
              >
                <Text style={[styles.tabText, tab === 'PENDING' && styles.tabTextActive]}>Pendientes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tab === 'ADMINISTERED' && styles.tabActive]}
                onPress={() => setTab('ADMINISTERED')}
              >
                <Text style={[styles.tabText, tab === 'ADMINISTERED' && styles.tabTextActive]}>Administrados</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={<Text style={styles.empty}>Sin medicamentos para mostrar.</Text>}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() =>
              navigation.navigate('ComingSoon', {
                title: 'Agregar medicamento',
                subtitle: 'Registrar un nuevo medicamento',
              })
            }
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Agregar medicamento</Text>
          </TouchableOpacity>
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
  empty: { textAlign: 'center', color: '#e2e8f0', marginTop: 40 },

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
  subtitle: { fontSize: 14, color: '#a5d8f3', marginTop: 4, marginBottom: 16 },

  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 16,
  },
  dateChipToday: { color: '#5ee7df', fontWeight: 'bold', fontSize: 13 },
  dateChipDate: { color: '#a5d8f3', fontSize: 13 },

  tabsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tab: {
    flex: 1, alignItems: 'center',
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  tabActive: { borderColor: '#5ee7df', backgroundColor: 'rgba(94,231,223,0.12)' },
  tabText: { color: '#a5d8f3', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#5ee7df' },

  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#e05555', borderRadius: 16,
    paddingVertical: 16, marginTop: 8,
  },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
