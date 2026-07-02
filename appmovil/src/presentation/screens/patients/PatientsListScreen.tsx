import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { Patient, MedicationLog } from '@/domain/entities';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = { navigation: NativeStackNavigationProp<PatientStackParams, 'Pacientes'> };

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  return today.getFullYear() - birth.getFullYear() -
    (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
}

function nextPendingLog(logs: MedicationLog[] | undefined): MedicationLog | undefined {
  if (!logs) return undefined;
  return logs
    .filter((l) => l.status === 'PENDING')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
}

function needsAttention(logs: MedicationLog[] | undefined): boolean {
  return !!logs?.some((l) => l.status === 'ESCALATED' || l.status === 'MISSED');
}

type PatientCardProps = { patient: Patient; onPress: () => void };

function PatientCard({ patient, onPress }: PatientCardProps) {
  const { medicationRepo } = useInjection();
  const today = new Date().toISOString().split('T')[0];

  const { data: logs } = useQuery({
    queryKey: ['medication-logs', patient.id, today],
    queryFn: () => medicationRepo.getDailyLogs(patient.id, today),
  });

  const next = nextPendingLog(logs);
  const attention = needsAttention(logs);
  const isFemale = patient.gender === 'FEMALE';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color="rgba(255,255,255,0.85)" />
        </View>
        <View style={styles.cardTopInfo}>
          <Text style={styles.name}>{patient.fullName}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{calcAge(patient.birthDate)} años</Text>
            <Text style={styles.metaSeparator}>|</Text>
            <Ionicons
              name={isFemale ? 'female' : 'male'}
              size={14}
              color={isFemale ? '#ff8fab' : '#4dabf7'}
            />
            <Text style={styles.metaText}>{isFemale ? 'Femenino' : 'Masculino'}</Text>
          </View>
        </View>
        <View style={styles.chevronCircle}>
          <Ionicons name="chevron-forward" size={18} color="#7dd3fc" />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBottom}>
        <View style={styles.cardBottomColumn}>
          <View style={styles.columnLabelRow}>
            <Ionicons name="time-outline" size={14} color="#5ee7df" />
            <Text style={styles.columnLabel}>Próximo medicamento</Text>
          </View>
          {next ? (
            <>
              <Text style={styles.medTime}>
                {new Date(next.scheduledAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.medWhen}>Hoy</Text>
            </>
          ) : (
            <Text style={styles.medTime}>Sin pendientes</Text>
          )}
        </View>

        <View style={styles.cardBottomColumn}>
          <View style={styles.columnLabelRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#5ee7df" />
            <Text style={styles.columnLabel}>Estado</Text>
          </View>
          {attention ? (
            <View style={[styles.statusBadge, styles.statusBadgeWarning]}>
              <Ionicons name="warning" size={14} color="#3d2e00" />
              <Text style={styles.statusTextWarning}>Requiere atención</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.statusBadgeOk]}>
              <Ionicons name="checkmark-circle" size={14} color="#fff" />
              <Text style={styles.statusTextOk}>Estable</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function PatientsListScreen({ navigation }: Props) {
  const { patientRepo } = useInjection();
  const { data, isLoading, error } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientRepo.listPatients(),
  });

  if (isLoading) return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#2D7DD2" /></ScreenBackground>;
  if (error) return <ScreenBackground><View style={styles.center}><Text style={styles.errorText}>Error al cargar pacientes</Text></View></ScreenBackground>;

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <FlatList
          data={data}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <PatientCard patient={item} onPress={() => navigation.navigate('PatientDetail', { patientId: item.id })} />
          )}
          ListHeaderComponent={
            <>
              <View style={styles.headerRow}>
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

              <View style={styles.topRow}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.titleRow}>
                <View style={styles.titleColumn}>
                  <Text style={styles.title}>Pacientes</Text>
                  <Text style={styles.subtitle}>Pacientes asignados a tu cuidado</Text>
                </View>
                <TouchableOpacity style={styles.addPatientIcon} onPress={() => navigation.navigate('CreatePatient')}>
                  <Ionicons name="heart-outline" size={64} color="rgba(94,231,223,0.35)" />
                  <Ionicons name="person" size={22} color="rgba(94,231,223,0.75)" style={styles.addPatientPerson} />
                  <View style={styles.addPatientBadge}>
                    <Ionicons name="add" size={14} color="#0b1f33" />
                  </View>
                </TouchableOpacity>
              </View>
            </>
          }
          ListEmptyComponent={<Text style={styles.empty}>No tienes pacientes aún.</Text>}
          ListFooterComponent={
            <View style={styles.footer}>
              <Ionicons name="shield-checkmark" size={20} color="#5ee7df" />
              <Text style={styles.footerText}>
                La información de tus pacientes está protegida y siempre segura.
              </Text>
            </View>
          }
          contentContainerStyle={{ padding: 20, paddingTop: 24 }}
        />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ff8a8a' },
  empty: { textAlign: 'center', color: '#e2e8f0', marginTop: 40 },

  headerLogoIcon: { width: 40, height: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 },
  headerTitle: { fontSize: 26, fontWeight: 'bold' },
  headerCuida: { color: '#fff' },
  headerLink: { color: '#38bdf8' },

  topRow: { flexDirection: 'row', marginBottom: 20 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  titleColumn: { flex: 1 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 15, color: '#a5d8f3', marginTop: 4 },

  addPatientIcon: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  addPatientPerson: { position: 'absolute', top: 18 },
  addPatientBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#5ee7df',
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 20,
    marginBottom: 20,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(148,180,204,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardTopInfo: { flex: 1 },
  name: { fontSize: 19, fontWeight: 'bold', color: '#fff' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { fontSize: 13, color: '#cbd5e1' },
  metaSeparator: { fontSize: 13, color: 'rgba(255,255,255,0.25)' },
  chevronCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 16 },

  cardBottom: { flexDirection: 'row' },
  cardBottomColumn: { flex: 1 },
  columnLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  columnLabel: { fontSize: 12, fontWeight: '600', color: '#5ee7df' },
  medTime: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  medWhen: { fontSize: 13, color: '#94a3b8', marginTop: 2 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeOk: { backgroundColor: '#1a9c7d' },
  statusTextOk: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  statusBadgeWarning: { backgroundColor: '#e6b800' },
  statusTextWarning: { color: '#3d2e00', fontWeight: 'bold', fontSize: 13 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, paddingHorizontal: 20 },
  footerText: { flex: 1, fontSize: 12, color: '#a5d8f3', lineHeight: 17 },
});
