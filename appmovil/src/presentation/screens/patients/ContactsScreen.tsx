import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Linking, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import CollaboratorsSection from '@/presentation/components/CollaboratorsSection';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'Contacts'>;
  route: RouteProp<PatientStackParams, 'Contacts'>;
};

export default function ContactsScreen({ navigation, route }: Props) {
  const { patientId } = route.params;
  const { patientRepo } = useInjection();

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientRepo.getPatient(patientId),
  });

  if (isLoading) return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#2D7DD2" /></ScreenBackground>;
  if (!patient) return null;

  function callEmergencyContact() {
    const phone = patient!.emergencyContact.phone;
    if (!phone) {
      Alert.alert('Sin contacto de emergencia', 'Este paciente no tiene un teléfono de emergencia registrado.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  }

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Contactos</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contacto de emergencia</Text>
          <Text style={styles.contactName}>{patient.emergencyContact.name || 'No registrado'}</Text>
          {!!patient.emergencyContact.phone && (
            <Text style={styles.contactPhone}>{patient.emergencyContact.phone}</Text>
          )}
          <TouchableOpacity style={styles.callBtn} onPress={callEmergencyContact}>
            <Ionicons name="call" size={16} color="#fff" />
            <Text style={styles.callBtnText}>Llamar</Text>
          </TouchableOpacity>
        </View>

        {patient.isOwner && (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditPatient', { patientId })}
          >
            <Ionicons name="create-outline" size={18} color="#2D7DD2" />
            <Text style={styles.editBtnText}>Editar paciente</Text>
          </TouchableOpacity>
        )}

        <CollaboratorsSection patientId={patientId} isOwner={patient.isOwner} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#5ee7df', marginBottom: 8 },
  contactName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  contactPhone: { fontSize: 15, color: '#e2e8f0', marginTop: 2 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#e05555', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 16,
    alignSelf: 'flex-start', marginTop: 14,
  },
  callBtnText: { color: '#fff', fontWeight: '600' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    paddingVertical: 12, justifyContent: 'center',
    marginBottom: 20,
  },
  editBtnText: { color: '#2D7DD2', fontWeight: '600' },
});
