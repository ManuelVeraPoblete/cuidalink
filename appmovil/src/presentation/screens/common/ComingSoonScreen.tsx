import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  route: RouteProp<PatientStackParams, 'ComingSoon'>;
};

export default function ComingSoonScreen({ route }: Props) {
  const { title, subtitle } = route.params;

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Ionicons name="construct-outline" size={56} color="#5ee7df" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.message}>Esta función estará disponible próximamente.</Text>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 16, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#a5d8f3', marginTop: 4, textAlign: 'center' },
  message: { fontSize: 14, color: '#e2e8f0', marginTop: 24, textAlign: 'center' },
});
