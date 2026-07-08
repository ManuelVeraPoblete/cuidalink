import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, Linking, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { calcAge, nextPendingLog, needsAttention } from '@/domain/utils/patientDisplay';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'PatientDetail'>;
  route: RouteProp<PatientStackParams, 'PatientDetail'>;
};

type ActionCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  fullWidth?: boolean;
};

function ActionCard({ icon, color, title, subtitle, onPress, fullWidth }: ActionCardProps) {
  return (
    <TouchableOpacity
      style={[styles.actionCard, fullWidth && styles.actionCardFull]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.actionIconBadge, { backgroundColor: color }]}>
        <Ionicons name={icon} size={22} color="#fff" />
      </View>
      <View style={styles.actionTextColumn}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#7dd3fc" />
    </TouchableOpacity>
  );
}

export default function PatientDetailScreen({ navigation, route }: Props) {
  const { patientId } = route.params;
  const { patientRepo, medicationRepo } = useInjection();
  const setSelectedPatientId = useAuthStore((s) => s.setSelectedPatientId);
  const today = new Date().toISOString().split('T')[0];

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientRepo.getPatient(patientId),
  });

  const { data: logs } = useQuery({
    queryKey: ['medication-logs', patientId, today],
    queryFn: () => medicationRepo.getDailyLogs(patientId, today),
  });

  if (isLoading) return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#2D7DD2" /></ScreenBackground>;
  if (!patient) return null;

  const next = nextPendingLog(logs);
  const attention = needsAttention(logs);

  function handleEmergencyCall() {
    const phone = patient!.emergencyContact.phone;
    if (!phone) {
      Alert.alert('Sin contacto de emergencia', 'Este paciente no tiene un teléfono de emergencia registrado.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  }

  function goToMedicamentos() {
    setSelectedPatientId(patientId);
    navigation.navigate('Medicamentos');
  }

  function goToVitales() {
    setSelectedPatientId(patientId);
    navigation.navigate('Vitales');
  }

  function goToTasks() {
    setSelectedPatientId(patientId);
    navigation.navigate('Tasks');
  }

  function goToContacts() {
    navigation.navigate('Contacts', { patientId });
  }

  function goToComingSoon(title: string, subtitle: string) {
    navigation.navigate('ComingSoon', { title, subtitle });
  }

  return (
    <ScreenBackground>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
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
          {patient.isOwner ? (
            <TouchableOpacity
              testID="edit-patient-button"
              style={styles.backButton}
              onPress={() => navigation.navigate('EditPatient', { patientId })}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButtonSpacer} />
          )}
        </View>

        <Text style={styles.title}>Detalle del paciente</Text>

        <View style={styles.patientCard}>
          <View style={styles.patientCardTop}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={36} color="rgba(255,255,255,0.85)" />
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patient.fullName}</Text>
              <Text style={styles.patientAge}>{calcAge(patient.birthDate)} años</Text>
              {attention ? (
                <View style={[styles.statusBadge, styles.statusBadgeWarning]}>
                  <Ionicons name="warning" size={14} color="#3d2e00" />
                  <Text style={styles.statusTextWarning}>Requiere atención</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, styles.statusBadgeOk]}>
                  <Ionicons name="shield-checkmark" size={14} color="#fff" />
                  <Text style={styles.statusTextOk}>Estable</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.patientCardBottom}>
            <View style={styles.nextMedRow}>
              <Ionicons name="time-outline" size={14} color="#5ee7df" />
              <Text style={styles.nextMedText}>
                Próximo medicamento:{' '}
                <Text style={styles.nextMedTime}>
                  {next
                    ? new Date(next.scheduledAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                    : 'Sin pendientes'}
                </Text>
              </Text>
            </View>
            <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyCall}>
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={styles.emergencyButtonText}>Emergencia</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Plan de cuidado</Text>
        <Text style={styles.sectionSubtitle}>Acciones para hoy</Text>

        <View style={styles.grid}>
          <ActionCard icon="calendar" color="#2f6fed" title="Hoy" subtitle="Pendientes" onPress={() => navigation.navigate('Today')} />
          <ActionCard icon="medkit" color="#16a085" title="Medicamentos" subtitle="Dosis y horarios" onPress={goToMedicamentos} />
          <ActionCard icon="list" color="#7c5cfc" title="Tareas" subtitle="Cuidados diarios" onPress={goToTasks} />
          <ActionCard icon="pulse" color="#e74c3c" title="Signos vitales" subtitle="Registrar control" onPress={goToVitales} />
          <ActionCard icon="clipboard" color="#f5a623" title="Observaciones" subtitle="Notas del cuidador" onPress={() => goToComingSoon('Observaciones', 'Notas del cuidador')} />
          <ActionCard icon="call-outline" color="#2f6fed" title="Contactos" subtitle="Familia y médico" onPress={goToContacts} />
          <ActionCard icon="time" color="#2f6fed" title="Historial" subtitle="Actividad reciente" onPress={() => goToComingSoon('Historial', 'Actividad reciente')} fullWidth />
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', padding: 20 },

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

  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 20 },

  patientCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 20,
    marginBottom: 28,
  },
  patientCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(148,180,204,0.35)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16,
  },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  patientAge: { fontSize: 14, color: '#cbd5e1', marginTop: 2, marginBottom: 8 },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  statusBadgeOk: { backgroundColor: '#1a9c7d' },
  statusTextOk: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  statusBadgeWarning: { backgroundColor: '#e6b800' },
  statusTextWarning: { color: '#3d2e00', fontWeight: 'bold', fontSize: 13 },

  patientCardBottom: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 12,
  },
  nextMedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  nextMedText: { fontSize: 13, color: '#a5d8f3' },
  nextMedTime: { fontWeight: 'bold', color: '#fff' },

  emergencyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#e05555', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 20,
  },
  emergencyButtonText: { color: '#fff', fontWeight: 'bold' },

  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  sectionSubtitle: { fontSize: 14, color: '#a5d8f3', marginTop: 2, marginBottom: 16 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  actionCard: {
    width: '47%',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  actionCardFull: { width: '100%' },
  actionIconBadge: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  actionTextColumn: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  actionSubtitle: { fontSize: 12, color: '#a5d8f3', marginTop: 2 },
});
