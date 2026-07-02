import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, ImageBackground, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParams } from '@/presentation/navigation/AuthNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type FormData = z.infer<typeof schema>;

type Props = { navigation: NativeStackNavigationProp<AuthStackParams, 'Login'> };

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function LoginScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { loginUseCase } = useInjection();
  const setUser = useAuthStore((s) => s.setUser);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const user = await loginUseCase.execute(data.email, data.password);
      setUser(user);
    } catch {
      Alert.alert('Error', 'Credenciales incorrectas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../../../assets/fondo.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.iconBadge}>
            <Image
              source={require('../../../../assets/cuidalink-icon.png')}
              style={styles.iconImage}
              resizeMode="contain"
            />
          </View>

          <Image
            source={require('../../../../assets/cuidalink-wordmark.png')}
            style={styles.wordmark}
            resizeMode="contain"
          />

          <Text style={styles.welcomeTitle}>Bienvenido a CuidaLink</Text>
          <Text style={styles.welcomeSubtitle}>
            Conectamos cuidado, familiares y cuidadores en un solo lugar.
          </Text>

          <View style={styles.card}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#2D7DD2" style={styles.inputIcon} />
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Correo electrónico"
                    placeholderTextColor="#8a8a8a"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>
            {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#2D7DD2" style={styles.inputIcon} />
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    placeholderTextColor="#8a8a8a"
                    secureTextEntry={!showPassword}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

            <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Ingresar</Text>}
            </TouchableOpacity>

            <TouchableOpacity>
              <Text style={styles.forgotLink}>Olvidé mi contraseña</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>¿No tienes cuenta? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Regístrate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingTop: '10%', paddingBottom: 24 },
  iconBadge: {
    width: 110,
    height: 110,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  iconImage: { width: 82, height: 82 },
  wordmark: { width: 220, height: 68, marginTop: 12 },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 24, textAlign: 'center' },
  welcomeSubtitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  card: {
    alignSelf: 'stretch',
    marginHorizontal: '10%',
    marginTop: 28 + SCREEN_HEIGHT * 0.2,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#333' },
  error: { color: '#e53e3e', fontSize: 12, marginTop: -10, marginBottom: 10 },
  button: { backgroundColor: '#2D7DD2', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  forgotLink: { color: '#2D7DD2', textAlign: 'center', marginTop: 18, fontSize: 14 },
  divider: { height: 1, backgroundColor: '#ddd', marginTop: 20, marginBottom: 16 },
  registerRow: { flexDirection: 'row', justifyContent: 'center' },
  registerText: { color: '#444', fontSize: 14 },
  registerLink: { color: '#2D7DD2', fontSize: 14, fontWeight: 'bold' },
});
