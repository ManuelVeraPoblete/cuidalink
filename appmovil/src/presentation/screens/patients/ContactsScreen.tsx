import { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { PatientContact, PatientContactCategory } from '@/domain/entities';
import PatientContactCard from '@/presentation/components/PatientContactCard';
import PatientChip from '@/presentation/components/PatientChip';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'Contacts'>;
  route: RouteProp<PatientStackParams, 'Contacts'>;
};

type Tab = 'ALL' | PatientContactCategory;

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'ALL', label: 'Todos', icon: 'people-circle' },
  { key: 'FAMILY', label: 'Familia', icon: 'people' },
  { key: 'DOCTOR', label: 'Médico', icon: 'medkit' },
  { key: 'EMERGENCY', label: 'Emergencia', icon: 'alarm' },
];

export default function ContactsScreen({ navigation, route }: Props) {
  const { patientId } = route.params;
  const { patientContactRepo, patientRepo } = useInjection();
  const [tab, setTab] = useState<Tab>('ALL');

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientRepo.getPatient(patientId),
  });

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['patient-contacts', patientId],
    queryFn: () => patientContactRepo.listContacts(patientId),
  });

  const filtered = useMemo(
    () => (contacts ?? []).filter((c: PatientContact) => tab === 'ALL' || c.category === tab),
    [contacts, tab],
  );

  if (isLoading) return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#5ee7df" /></ScreenBackground>;

  return (
    <ScreenBackground>
      <FlatList
        data={filtered}
        keyExtractor={(item: PatientContact) => item.id}
        renderItem={({ item }) => (
          <PatientContactCard
            contact={item}
            isOwner={!!patient?.isOwner}
            onEdit={() => navigation.navigate('ContactForm', { patientId, contactId: item.id })}
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

            <Text style={styles.title}>Contactos</Text>
            <Text style={styles.subtitle}>Contactos vinculados al paciente</Text>

            {patient && <PatientChip name={patient.fullName} />}

            <View style={styles.tabsRow}>
              {TABS.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  testID={`contacts-tab-${t.key}`}
                  style={[styles.tab, tab === t.key && styles.tabActive]}
                  onPress={() => setTab(t.key)}
                >
                  <Ionicons name={t.icon} size={14} color={tab === t.key ? '#5ee7df' : '#a5d8f3'} />
                  <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={<Text style={styles.empty}>Sin contactos para mostrar.</Text>}
        ListFooterComponent={
          patient?.isOwner ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('ContactForm', { patientId, contactId: undefined })}
            >
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Agregar contacto</Text>
            </TouchableOpacity>
          ) : null
        }
        contentContainerStyle={{ padding: 20, paddingTop: 24 }}
      />
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

  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12,
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
