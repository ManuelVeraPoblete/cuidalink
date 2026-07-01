import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/presentation/stores/authStore';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.greeting}>Hola, {user?.name ?? 'Cuidador'}</Text>
      <Text style={styles.subtitle}>¿Qué necesitas hacer hoy?</Text>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Pacientes')}>
        <Text style={styles.cardTitle}>Mis Pacientes</Text>
        <Text style={styles.cardDesc}>Ver y gestionar tus pacientes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Medicamentos')}>
        <Text style={styles.cardTitle}>Medicamentos de hoy</Text>
        <Text style={styles.cardDesc}>Confirmar o marcar dosis perdidas</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Vitales')}>
        <Text style={styles.cardTitle}>Signos Vitales</Text>
        <Text style={styles.cardDesc}>Ver historial y registrar nuevas mediciones</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', padding: 20 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e', marginTop: 16 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#2D7DD2', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#666' },
});
