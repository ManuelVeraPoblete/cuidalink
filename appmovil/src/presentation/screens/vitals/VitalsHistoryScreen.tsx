import { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { VitalRecord, VitalSignDefinition } from '@/domain/entities';
import VitalCard from '@/presentation/components/VitalCard';
import VitalRecordDetailModal from '@/presentation/components/VitalRecordDetailModal';
import PatientChip from '@/presentation/components/PatientChip';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'Vitales'>;
};

function toLocalDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function VitalsHistoryScreen({ navigation }: Props) {
  const { vitalRepo, patientRepo } = useInjection();
  const selectedPatientId = useAuthStore((s) => s.selectedPatientId);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<VitalRecord | null>(null);

  const dateStr = toLocalDateString(selectedDate);
  const isToday = dateStr === toLocalDateString(new Date());
  const dateLabel = selectedDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

  const { data: patient } = useQuery({
    queryKey: ['patient', selectedPatientId],
    queryFn: () => patientRepo.getPatient(selectedPatientId!),
    enabled: !!selectedPatientId,
  });

  const { data: definitions } = useQuery({
    queryKey: ['vital-definitions', selectedPatientId],
    queryFn: () => vitalRepo.listDefinitions(selectedPatientId!),
    enabled: !!selectedPatientId,
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ['vital-records', selectedPatientId, dateStr],
    queryFn: () => vitalRepo.listRecords(selectedPatientId!, dateStr, dateStr),
    enabled: !!selectedPatientId,
  });

  const definitionsById = useMemo(() => {
    const map = new Map<string, VitalSignDefinition>();
    (definitions ?? []).forEach((def) => map.set(def.id, def));
    return map;
  }, [definitions]);

  if (!selectedPatientId) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <Text style={styles.hint}>Selecciona un paciente desde Inicio → Mis pacientes.</Text>
        </View>
      </ScreenBackground>
    );
  }

  if (isLoading) return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#5ee7df" /></ScreenBackground>;

  return (
    <ScreenBackground>
      <FlatList
        data={records ?? []}
        keyExtractor={(item: VitalRecord) => item.id}
        renderItem={({ item }) => (
          <VitalCard
            record={item}
            definitionsById={definitionsById}
            onViewDetail={() => setSelectedRecord(item)}
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

            <Text style={styles.title}>Signos vitales</Text>
            <Text style={styles.subtitle}>Registros del paciente</Text>

            {patient && <PatientChip name={patient.fullName} />}

            <TouchableOpacity
              style={styles.recordButton}
              onPress={() => navigation.navigate('RecordVitals', { patientId: selectedPatientId })}
            >
              <Ionicons name="pulse" size={20} color="#fff" />
              <Text style={styles.recordButtonText}>Registrar signos vitales</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dateChip} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={16} color="#5ee7df" />
              {isToday && <Text style={styles.dateChipToday}>Hoy</Text>}
              <Text style={styles.dateChipDate}>{dateLabel}</Text>
              <Ionicons name="chevron-down" size={16} color="#a5d8f3" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selected) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selected) setSelectedDate(selected);
                }}
              />
            )}

            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={16} color="#a5d8f3" />
              <Text style={styles.infoText}>Todos los campos son opcionales</Text>
            </View>
          </>
        }
        ListEmptyComponent={<Text style={styles.empty}>Sin registros para este día.</Text>}
        contentContainerStyle={{ padding: 20, paddingTop: 24 }}
      />

      <VitalRecordDetailModal
        visible={!!selectedRecord}
        record={selectedRecord}
        definitionsById={definitionsById}
        onClose={() => setSelectedRecord(null)}
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

  recordButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#e05555', borderRadius: 16,
    paddingVertical: 16, marginBottom: 16,
  },
  recordButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

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

  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  infoText: { color: '#a5d8f3', fontSize: 13 },
});
