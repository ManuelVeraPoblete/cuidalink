# Pantalla "Hoy" (TodayScreen) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la pantalla "Hoy" en la app móvil CuidaLink — muestra solo los medicamentos pendientes de hoy para el paciente, y queda vacía cuando ya se administraron/omitieron todos.

**Architecture:** Reutiliza `MedicationCard`/`MedicationActionModal` y la misma query de `medication-logs` ya establecida (`DailyMedsScreen`), filtrada a `PENDING`/`ESCALATED`, sin tabs ni botón de gestión — pantalla de solo lectura/acción rápida.

**Tech Stack:** React Native 0.74, TypeScript 5 (strict), TanStack Query 5, Jest + `@testing-library/react-native`.

## Global Constraints

- `presentation/` solo importa de `domain/`, nunca de `data/` directamente.
- Único paquete de íconos: `Ionicons` de `@expo/vector-icons`.
- TypeScript strict, alias `@/*` → `src/*`.
- Sin comentarios en el código salvo que documenten un porqué no obvio.
- Tema oscuro ya establecido: `ScreenBackground`, header back+logo igual patrón que `DailyMedsScreen`,
  acentos `#5ee7df`/`#38bdf8`/`#a5d8f3`.
- No se modifican `MedicationCard.tsx`, `MedicationActionModal.tsx` ni `DailyMedsScreen.tsx`.

---

### Task 1: `TodayScreen` + navegación desde `PatientDetailScreen`

**Files:**
- Create: `appmovil/src/presentation/screens/medications/TodayScreen.tsx`
- Test: `appmovil/src/presentation/screens/medications/__tests__/TodayScreen.test.tsx`
- Modify: `appmovil/src/presentation/navigation/AppNavigator.tsx`
- Modify: `appmovil/src/presentation/screens/patients/PatientDetailScreen.tsx:162`
- Modify: `appmovil/src/presentation/screens/patients/__tests__/PatientDetailScreen.test.tsx:103-107`

**Interfaces:**
- Consumes: `medicationRepo.getDailyLogs`/`confirmLog`/`missLog` (ya existentes), `MedicationCard`
  (props `{ log, onPress? }`), `MedicationActionModal` (props `{ visible, log, onConfirm, onMiss, onClose }`)
  — ambos sin cambios.
- Produces: `TodayScreen` (default export) con props `{ navigation: NativeStackNavigationProp<PatientStackParams, 'Today'> }`.
  Ruta `'Today'` registrada en `AppNavigator`.

- [ ] **Step 1: Escribir el test**

Crear `appmovil/src/presentation/screens/medications/__tests__/TodayScreen.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TodayScreen from '../TodayScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { MedicationLog } from '@/domain/entities';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

function buildLog(overrides: Partial<MedicationLog> = {}): MedicationLog {
  return {
    id: 'l1',
    medicationId: 'm1',
    medicationName: 'Paracetamol',
    dosage: '1 tableta',
    instructions: 'Después del desayuno',
    type: 'TABLET',
    scheduledAt: '2026-07-03T08:00:00-04:00',
    status: 'PENDING',
    ...overrides,
  };
}

function renderScreen(logs: MedicationLog[], navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const getDailyLogs = jest.fn().mockResolvedValue(logs);
  const confirmLog = jest.fn().mockResolvedValue(logs[0] ?? null);
  const missLog = jest.fn().mockResolvedValue(logs[0] ?? null);
  mockedUseInjection.mockReturnValue({
    medicationRepo: { getDailyLogs, confirmLog, missLog },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <TodayScreen navigation={navigation} />
    </QueryClientProvider>
  );

  return { navigation, confirmLog, missLog };
}

describe('TodayScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ selectedPatientId: 'p1' });
  });

  afterEach(() => {
    useAuthStore.setState({ selectedPatientId: null });
  });

  it('muestra solo los logs pendientes o escalados', async () => {
    renderScreen([
      buildLog({ id: 'l1', medicationName: 'Paracetamol', status: 'PENDING' }),
      buildLog({ id: 'l2', medicationName: 'Insulina', status: 'CONFIRMED' }),
      buildLog({ id: 'l3', medicationName: 'Loratadina', status: 'ESCALATED' }),
      buildLog({ id: 'l4', medicationName: 'Enoxaparina', status: 'MISSED' }),
    ]);
    expect(await screen.findByText('Paracetamol')).toBeTruthy();
    expect(await screen.findByText('Loratadina')).toBeTruthy();
    expect(screen.queryByText('Insulina')).toBeNull();
    expect(screen.queryByText('Enoxaparina')).toBeNull();
  });

  it('muestra el estado vacío cuando no hay pendientes', async () => {
    renderScreen([buildLog({ status: 'CONFIRMED' })]);
    expect(await screen.findByText('¡Todo al día!')).toBeTruthy();
    expect(screen.getByText('No hay medicamentos pendientes por ahora.')).toBeTruthy();
  });

  it('abre el modal de acción al tocar una tarjeta pendiente y confirma', async () => {
    const { confirmLog } = renderScreen([buildLog({ id: 'l1', status: 'PENDING' })]);
    fireEvent.press(await screen.findByText('Paracetamol'));
    fireEvent.press(await screen.findByText('Confirmar'));
    await waitFor(() => expect(confirmLog).toHaveBeenCalledWith('l1'));
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd appmovil && npx jest src/presentation/screens/medications/__tests__/TodayScreen.test.tsx`
Expected: FAIL — `Cannot find module '../TodayScreen'`.

- [ ] **Step 3: Crear `TodayScreen.tsx`**

Crear `appmovil/src/presentation/screens/medications/TodayScreen.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { MedicationLog } from '@/domain/entities';
import MedicationCard from '@/presentation/components/MedicationCard';
import MedicationActionModal from '@/presentation/components/MedicationActionModal';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'Today'>;
};

function isPending(status: MedicationLog['status']): boolean {
  return status === 'PENDING' || status === 'ESCALATED';
}

export default function TodayScreen({ navigation }: Props) {
  const { medicationRepo } = useInjection();
  const selectedPatientId = useAuthStore((s) => s.selectedPatientId);
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [selectedLog, setSelectedLog] = useState<MedicationLog | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['medication-logs', selectedPatientId, today],
    queryFn: () =>
      selectedPatientId
        ? medicationRepo.getDailyLogs(selectedPatientId, today)
        : Promise.resolve([]),
    enabled: !!selectedPatientId,
  });

  const confirmMutation = useMutation({
    mutationFn: (logId: string) => medicationRepo.confirmLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-logs'] });
      setSelectedLog(null);
    },
    onError: () => Alert.alert('Error', 'No se pudo confirmar la dosis.'),
  });

  const missMutation = useMutation({
    mutationFn: (logId: string) => medicationRepo.missLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-logs'] });
      setSelectedLog(null);
    },
    onError: () => Alert.alert('Error', 'No se pudo omitir la dosis.'),
  });

  if (!selectedPatientId) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <Text style={styles.hint}>Selecciona un paciente desde Inicio → Mis pacientes.</Text>
        </View>
      </ScreenBackground>
    );
  }

  if (isLoading) return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#2D7DD2" /></ScreenBackground>;

  const pending = (data ?? []).filter((log) => isPending(log.status));

  return (
    <ScreenBackground>
      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MedicationCard log={item} onPress={() => setSelectedLog(item)} />
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

            <Text style={styles.title}>Hoy</Text>
            <Text style={styles.subtitle}>Medicamentos pendientes de hoy</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={56} color="#5ee7df" />
            <Text style={styles.emptyTitle}>¡Todo al día!</Text>
            <Text style={styles.emptySubtitle}>No hay medicamentos pendientes por ahora.</Text>
          </View>
        }
        contentContainerStyle={{ padding: 20, paddingTop: 24 }}
      />

      <MedicationActionModal
        visible={!!selectedLog}
        log={selectedLog}
        onConfirm={() => selectedLog && confirmMutation.mutate(selectedLog.id)}
        onMiss={() => selectedLog && missMutation.mutate(selectedLog.id)}
        onClose={() => setSelectedLog(null)}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  hint: { color: '#e2e8f0', textAlign: 'center' },

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
  subtitle: { fontSize: 14, color: '#a5d8f3', marginTop: 4, marginBottom: 20 },

  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#a5d8f3', marginTop: 6, textAlign: 'center' },
});
```

- [ ] **Step 4: Registrar la ruta en `AppNavigator.tsx`**

Agregar el import junto a los otros imports de pantallas de medicamentos:

```ts
import TodayScreen from '@/presentation/screens/medications/TodayScreen';
```

Extender `PatientStackParams` (agregar `Today: undefined;` junto a las demás claves):

```ts
export type PatientStackParams = {
  Home: undefined;
  Pacientes: undefined;
  PatientDetail: { patientId: string };
  CreatePatient: undefined;
  EditPatient: { patientId: string };
  RecordVitals: { patientId: string };
  Medicamentos: undefined;
  Vitales: undefined;
  Perfil: undefined;
  ComingSoon: { title: string; subtitle: string };
  Contacts: { patientId: string };
  CreateMedication: undefined;
  Today: undefined;
};
```

Agregar el `Stack.Screen`:

```tsx
<Stack.Screen name="Today" component={TodayScreen} options={{ headerShown: false }} />
```

- [ ] **Step 5: Actualizar la tarjeta "Hoy" en `PatientDetailScreen.tsx`**

En `appmovil/src/presentation/screens/patients/PatientDetailScreen.tsx:162`, reemplazar:

```tsx
          <ActionCard icon="calendar" color="#2f6fed" title="Hoy" subtitle="Pendientes" onPress={() => goToComingSoon('Hoy', 'Pendientes de hoy')} />
```

por:

```tsx
          <ActionCard icon="calendar" color="#2f6fed" title="Hoy" subtitle="Pendientes" onPress={() => navigation.navigate('Today')} />
```

(La función `goToComingSoon` se mantiene sin cambios — la siguen usando las tarjetas "Tareas",
"Observaciones" e "Historial".)

- [ ] **Step 6: Actualizar el test existente de `PatientDetailScreen` que quedó desactualizado**

En `appmovil/src/presentation/screens/patients/__tests__/PatientDetailScreen.test.tsx:103-107`,
reemplazar:

```tsx
  it('navega a ComingSoon con los params correctos al presionar "Hoy"', async () => {
    const { navigation } = renderScreen();
    fireEvent.press(await screen.findByText('Hoy'));
    expect(navigation.navigate).toHaveBeenCalledWith('ComingSoon', { title: 'Hoy', subtitle: 'Pendientes de hoy' });
  });
```

por:

```tsx
  it('navega a Today al presionar "Hoy"', async () => {
    const { navigation } = renderScreen();
    fireEvent.press(await screen.findByText('Hoy'));
    expect(navigation.navigate).toHaveBeenCalledWith('Today');
  });
```

- [ ] **Step 7: Correr el test nuevo y verificar que pasa**

Run: `cd appmovil && npx jest src/presentation/screens/medications/__tests__/TodayScreen.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 8: Correr toda la suite y verificar tipos**

Run: `cd appmovil && npx jest`
Expected: todos los tests en PASS (existentes + nuevos).

Run: `cd appmovil && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 9: Commit**

```bash
git add appmovil/src/presentation/screens/medications/TodayScreen.tsx appmovil/src/presentation/screens/medications/__tests__/TodayScreen.test.tsx appmovil/src/presentation/navigation/AppNavigator.tsx appmovil/src/presentation/screens/patients/PatientDetailScreen.tsx appmovil/src/presentation/screens/patients/__tests__/PatientDetailScreen.test.tsx
git commit -m "feat(appmovil): add TodayScreen showing today's pending medications"
```
