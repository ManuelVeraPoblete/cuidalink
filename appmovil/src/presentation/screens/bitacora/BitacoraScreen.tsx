import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Modal } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { BitacoraEntry, BitacoraEntryType } from '@/domain/entities';
import BitacoraEntryCard from '@/presentation/components/BitacoraEntryCard';
import PatientChip from '@/presentation/components/PatientChip';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'Bitacora'>;
  route: RouteProp<PatientStackParams, 'Bitacora'>;
};

type RangeKey = 'TODAY' | 'LAST_7' | 'LAST_30' | 'ALL';
type TypeKey = BitacoraEntryType | 'ALL';

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'TODAY', label: 'Hoy' },
  { key: 'LAST_7', label: 'Últimos 7 días' },
  { key: 'LAST_30', label: 'Últimos 30 días' },
  { key: 'ALL', label: 'Todo' },
];

const TYPE_OPTIONS: { key: TypeKey; label: string }[] = [
  { key: 'ALL', label: 'Todas' },
  { key: 'ENTRY', label: 'Entrada' },
  { key: 'OBSERVATION', label: 'Observación' },
];

function toLocalDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function rangeToDates(range: RangeKey): { from: string; to: string } {
  const today = new Date();
  const to = toLocalDateString(today);
  if (range === 'TODAY') return { from: to, to };
  if (range === 'LAST_7') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: toLocalDateString(from), to };
  }
  if (range === 'LAST_30') {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: toLocalDateString(from), to };
  }
  return { from: '2020-01-01', to };
}

export default function BitacoraScreen({ navigation, route }: Props) {
  const { patientId } = route.params;
  const { bitacoraEntryRepo, patientRepo } = useInjection();
  const [range, setRange] = useState<RangeKey>('LAST_7');
  const [typeFilter, setTypeFilter] = useState<TypeKey>('ALL');
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  const { from, to } = rangeToDates(range);

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientRepo.getPatient(patientId),
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ['bitacora-entries', patientId, from, to, typeFilter],
    queryFn: () => bitacoraEntryRepo.listEntries(patientId, from, to, typeFilter === 'ALL' ? undefined : typeFilter),
  });

  const rangeLabel = RANGE_OPTIONS.find((o) => o.key === range)!.label;

  if (isLoading) return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#5ee7df" /></ScreenBackground>;

  return (
    <ScreenBackground>
      <FlatList
        data={entries ?? []}
        keyExtractor={(item: BitacoraEntry) => item.id}
        renderItem={({ item }) => <BitacoraEntryCard entry={item} />}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerLogoRow}>
                <Image source={require('../../../../assets/cuidalink-icon.png')} style={styles.headerLogoIcon} resizeMode="contain" />
                <Text style={styles.headerTitle}>
                  <Text style={styles.headerCuida}>Cuida</Text>
                  <Text style={styles.headerLink}>Link</Text>
                </Text>
              </View>
              <View style={styles.backButtonSpacer} />
            </View>

            <Text style={styles.title}>Bitácora</Text>
            <Text style={styles.subtitle}>Registro diario de observaciones</Text>

            {patient && <PatientChip name={patient.fullName} />}

            <View style={styles.filtersRow}>
              <TouchableOpacity style={styles.filterChip} onPress={() => setShowRangeModal(true)}>
                <Ionicons name="calendar-outline" size={16} color="#5ee7df" />
                <Text style={styles.filterChipText}>{rangeLabel}</Text>
                <Ionicons name="chevron-down" size={16} color="#a5d8f3" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip} onPress={() => setShowTypeModal(true)}>
                <Ionicons name="filter" size={16} color="#5ee7df" />
                <Text style={styles.filterChipText}>Filtrar</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={<Text style={styles.empty}>Sin entradas para este período.</Text>}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddBitacoraEntry', { patientId })}
          >
            <Ionicons name="document-text" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Agregar entrada</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={{ padding: 20, paddingTop: 24 }}
      />

      <Modal visible={showRangeModal} transparent animationType="fade" onRequestClose={() => setShowRangeModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            {RANGE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                testID={`range-option-${opt.key}`}
                style={styles.optionRow}
                onPress={() => { setRange(opt.key); setShowRangeModal(false); }}
              >
                <Text style={[styles.optionText, range === opt.key && styles.optionTextActive]}>{opt.label}</Text>
                {range === opt.key && <Ionicons name="checkmark" size={18} color="#5ee7df" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={showTypeModal} transparent animationType="fade" onRequestClose={() => setShowTypeModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            {TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                testID={`type-option-${opt.key}`}
                style={styles.optionRow}
                onPress={() => { setTypeFilter(opt.key); setShowTypeModal(false); }}
              >
                <Text style={[styles.optionText, typeFilter === opt.key && styles.optionTextActive]}>{opt.label}</Text>
                {typeFilter === opt.key && <Ionicons name="checkmark" size={18} color="#5ee7df" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
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

  filtersRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
  },
  filterChipText: { color: '#a5d8f3', fontSize: 13, fontWeight: '600' },

  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#e05555', borderRadius: 16,
    paddingVertical: 16, marginTop: 8,
  },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dialog: {
    backgroundColor: '#12283f', borderRadius: 16, padding: 12, width: '85%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 12,
  },
  optionText: { color: '#e2e8f0', fontSize: 15 },
  optionTextActive: { color: '#5ee7df', fontWeight: 'bold' },
});
