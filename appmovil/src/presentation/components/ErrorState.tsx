import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  onRetry: () => void;
  onBack?: () => void;
};

export default function ErrorState({ onRetry, onBack }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={56} color="#a5d8f3" />
      <Text style={styles.title}>No pudimos cargar la información</Text>
      <Text style={styles.subtitle}>Revisa tu conexión e intenta de nuevo.</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Ionicons name="refresh" size={18} color="#fff" />
        <Text style={styles.retryText}>Reintentar</Text>
      </TouchableOpacity>
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 16 },
  subtitle: { color: '#a5d8f3', fontSize: 14, textAlign: 'center', marginTop: 6 },
  retryButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2D7DD2', borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 24,
  },
  retryText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  backButton: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 12,
  },
  backText: { color: '#e2e8f0', fontSize: 15 },
});
