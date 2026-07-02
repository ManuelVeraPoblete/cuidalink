import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/presentation/stores/authStore';
import { useInjection } from '@/presentation/hooks/useInjection';
import DateRangePicker from '@/presentation/components/DateRangePicker';
import ScreenBackground from '@/presentation/components/ScreenBackground';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const selectedPatientId = useAuthStore((s) => s.selectedPatientId);
  const { setUser } = useAuthStore();
  const { authRepo, downloadReportUseCase } = useInjection();
  const queryClient = useQueryClient();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await authRepo.logout();
      queryClient.clear();
      setUser(null);
    } catch {
      Alert.alert('Error', 'No se pudo cerrar sesión.');
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleDownloadReport = async (from: string, to: string) => {
    if (!selectedPatientId) {
      Alert.alert('Aviso', 'Selecciona un paciente primero.');
      return;
    }
    setReportLoading(true);
    try {
      await downloadReportUseCase.execute(selectedPatientId, from, to);
    } catch {
      Alert.alert('Error', 'No se pudo generar el informe.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <Text style={styles.sectionTitle}>Generar Informe PDF</Text>
        <DateRangePicker onGenerate={handleDownloadReport} loading={reportLoading} />

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={logoutLoading}>
          {logoutLoading ? <ActivityIndicator color="#e53e3e" /> : <Text style={styles.logoutText}>Cerrar sesión</Text>}
        </TouchableOpacity>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: 'transparent' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 24, elevation: 2 },
  name: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e' },
  email: { fontSize: 14, color: '#888', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  logoutBtn: { marginTop: 32, borderWidth: 1, borderColor: '#e53e3e', borderRadius: 8, padding: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.85)' },
  logoutText: { color: '#e53e3e', fontWeight: '600' },
});
