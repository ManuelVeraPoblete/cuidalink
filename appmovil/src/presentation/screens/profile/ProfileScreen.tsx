import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useAuthStore } from '@/presentation/stores/authStore';
import { useInjection } from '@/presentation/hooks/useInjection';
import ScreenBackground from '@/presentation/components/ScreenBackground';

const ROLE_LABELS: Record<string, string> = { CAREGIVER: 'Cuidador' };

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'Perfil'>;
};

type ProfileFieldProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | null | undefined;
  onPress: () => void;
};

function ProfileField({ icon, label, value, onPress }: ProfileFieldProps) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldLeft}>
        <Ionicons name={icon} size={18} color="#5ee7df" />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <View style={styles.fieldDivider} />
      <Text style={styles.fieldValue} numberOfLines={2}>{value || 'No especificado'}</Text>
      <TouchableOpacity onPress={onPress} hitSlop={8}>
        <Ionicons name="create-outline" size={18} color="#7dd3fc" />
      </TouchableOpacity>
    </View>
  );
}

type ConfigRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

function ConfigRow({ icon, label, onPress }: ConfigRowProps) {
  return (
    <TouchableOpacity style={styles.configRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.configIconCircle}>
        <Ionicons name={icon} size={18} color="#5ee7df" />
      </View>
      <Text style={styles.configLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#7dd3fc" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { authRepo } = useInjection();
  const queryClient = useQueryClient();
  const [logoutLoading, setLogoutLoading] = useState(false);

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

  function goToEdit() {
    navigation.navigate('EditProfile');
  }

  function goToComingSoon(title: string, subtitle: string) {
    navigation.navigate('ComingSoon', { title, subtitle });
  }

  if (!user) return null;

  return (
    <ScreenBackground>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
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

        <Text style={styles.title}>Perfil del cuidador</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color="rgba(255,255,255,0.85)" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.name}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#5ee7df" />
              <Text style={styles.roleBadgeText}>{ROLE_LABELS[user.role] ?? user.role}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={goToEdit}>
            <Ionicons name="create-outline" size={16} color="#ff8a80" />
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={18} color="#5ee7df" />
          <Text style={styles.sectionTitle}>Datos personales</Text>
        </View>

        <ProfileField icon="person-outline" label="Nombre" value={user.name} onPress={goToEdit} />
        <ProfileField icon="mail-outline" label="Correo electrónico" value={user.email} onPress={goToEdit} />
        <ProfileField icon="call-outline" label="Teléfono" value={user.phone} onPress={goToEdit} />
        <ProfileField icon="location-outline" label="Dirección" value={user.address} onPress={goToEdit} />
        <ProfileField icon="medkit-outline" label="Especialidad" value={user.specialty} onPress={goToEdit} />
        <ProfileField icon="star-outline" label="Experiencia" value={user.experience} onPress={goToEdit} />

        <View style={styles.sectionHeader}>
          <Ionicons name="settings-outline" size={18} color="#5ee7df" />
          <Text style={styles.sectionTitle}>Configuración</Text>
        </View>

        <ConfigRow
          icon="lock-closed-outline"
          label="Cambiar contraseña"
          onPress={() => goToComingSoon('Cambiar contraseña', 'Configuración de seguridad')}
        />
        <ConfigRow
          icon="notifications-outline"
          label="Notificaciones"
          onPress={() => goToComingSoon('Notificaciones', 'Preferencias de notificación')}
        />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={logoutLoading}>
          {logoutLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
              <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', padding: 20 },

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

  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 20 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    padding: 20, marginBottom: 28, gap: 16,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(148,180,204,0.35)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    borderWidth: 1, borderColor: '#5ee7df', backgroundColor: 'rgba(94,231,223,0.12)',
  },
  roleBadgeText: { color: '#5ee7df', fontWeight: 'bold', fontSize: 12 },
  editButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(255,138,128,0.5)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
  },
  editButtonText: { color: '#ff8a80', fontWeight: 'bold', fontSize: 13 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#5ee7df' },

  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12,
  },
  fieldLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 100 },
  fieldLabel: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', flexShrink: 1 },
  fieldDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.18)' },
  fieldValue: { flex: 1, color: '#fff', fontSize: 14 },

  configRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12,
  },
  configIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(94,231,223,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  configLabel: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },

  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#e05555', borderRadius: 16,
    paddingVertical: 16, marginTop: 8,
  },
  logoutButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
