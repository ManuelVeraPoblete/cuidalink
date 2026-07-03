import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ImageSourcePropType } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/presentation/stores/authStore';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type HomeCardProps = {
  icon: ImageSourcePropType;
  label: string;
  onPress?: () => void;
};

function HomeCard({ icon, label, onPress }: HomeCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Image source={icon} style={styles.cardIcon} resizeMode="contain" />
      <Text style={styles.cardLabel}>{label}</Text>
      <View style={styles.chevronCircle}>
        <Ionicons name="chevron-forward" size={16} color="#7dd3fc" />
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Image
            source={require('../../../../assets/cuidalink-icon.png')}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>
            <Text style={styles.headerCuida}>Cuida</Text>
            <Text style={styles.headerLink}>Link</Text>
          </Text>
        </View>

        <Text style={styles.greeting}>Hola, {user?.name ?? 'cuidador'}</Text>
        <Text style={styles.subtitle}>¿Qué necesitas revisar hoy?</Text>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Ionicons name="heart" size={18} color="#ff8a80" />
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.grid}>
          <HomeCard
            icon={require('../../../../assets/icons/pacientes.png')}
            label="Mis pacientes"
            onPress={() => navigation.navigate('Pacientes')}
          />
          <HomeCard
            icon={require('../../../../assets/icons/perfil.png')}
            label="Perfil"
            onPress={() => navigation.navigate('Perfil')}
          />
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  headerIcon: { width: 48, height: 48 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  headerCuida: { color: '#fff' },
  headerLink: { color: '#38bdf8' },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginTop: 28 },
  subtitle: { fontSize: 16, color: '#a5d8f3', textAlign: 'center', marginTop: 4 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20, marginBottom: 24, paddingHorizontal: 60 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  card: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: { width: 84, height: 84, marginBottom: 14 },
  cardLabel: { color: '#fff', fontWeight: 'bold', fontSize: 15, textAlign: 'center', marginBottom: 14, lineHeight: 20 },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
