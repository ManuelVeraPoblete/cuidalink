# Pantalla "Detalle del paciente" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar `PatientDetailScreen` en la app móvil para seguir estrictamente el mockup provisto (card de paciente + grid de 7 tarjetas de navegación "Plan de cuidado"), agregando las pantallas de soporte necesarias (`ComingSoonScreen`, `ContactsScreen`) y sin romper funcionalidad existente.

**Architecture:** Hexagonal mobile ya establecida en el repo. Se extraen 3 funciones puras duplicadas a un util compartido, se crean 2 pantallas nuevas registradas en `AppNavigator`, y se reescribe `PatientDetailScreen` consumiéndolas. Ningún cambio de backend.

**Tech Stack:** React Native 0.74 + TypeScript 5 (strict), React Navigation 6 (native-stack), TanStack Query 5, Zustand 5, `@expo/vector-icons` (Ionicons), Jest + `@testing-library/react-native` + `@testing-library/jest-native`.

## Global Constraints

- `presentation/` solo importa de `domain/`; nunca de `data/` directamente. Toda la inyección de dependencias pasa por `useInjection.ts`. (CLAUDE.md)
- Zustand se usa únicamente para estado de auth (`authStore.ts`, incluyendo el `selectedPatientId` ya existente ahí) — no se agrega estado nuevo a Zustand en este plan.
- Único paquete de íconos usado en el repo: `Ionicons` de `@expo/vector-icons`. No se introducen otras familias de íconos.
- TypeScript strict (`tsconfig.json`), alias `@/*` → `src/*`.
- Sin comentarios en el código salvo que documenten un porqué no obvio (regla del repo).
- Paleta/estilo visual ya establecida en las pantallas existentes: fondo `ScreenBackground` (imagen), cards `rgba(255,255,255,0.06)` con borde `rgba(255,255,255,0.18)` y `borderRadius: 20–24`, acentos `#5ee7df` / `#38bdf8` / `#a5d8f3`, badges de estado `#1a9c7d` (ok) / `#e6b800` (alerta). Se reutiliza tal cual, no se inventan colores nuevos salvo los íconos de categoría del grid (definidos en la Tarea 4).
- Jest usa el preset `jest-expo` con `moduleNameMapper` para `@/*`; no hace type-check (solo transpila), por lo que `npx tsc --noEmit` es el chequeo de tipos autoritativo y debe correr limpio al final del plan.

---

### Task 1: Extraer utilidades compartidas de visualización de paciente

**Files:**
- Create: `src/domain/utils/patientDisplay.ts`
- Create: `src/domain/utils/__tests__/patientDisplay.test.ts`
- Modify: `src/presentation/screens/patients/PatientsListScreen.tsx:1-28,41-43,54`

**Interfaces:**
- Produces (consumido por Task 4):
  - `calcAge(birthDate: string): number`
  - `nextPendingLog(logs: MedicationLog[] | undefined): MedicationLog | undefined`
  - `needsAttention(logs: MedicationLog[] | undefined): boolean`
  - Todas exportadas desde `@/domain/utils/patientDisplay`.
- Consumes: `MedicationLog` de `@/domain/entities` (ya existe).

- [ ] **Step 1: Escribir el test de las funciones**

Crear `src/domain/utils/__tests__/patientDisplay.test.ts`:

```ts
import { calcAge, nextPendingLog, needsAttention } from '../patientDisplay';
import { MedicationLog } from '@/domain/entities';

describe('calcAge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-02T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calcula la edad cuando el cumpleaños ya pasó este año', () => {
    expect(calcAge('1948-01-15')).toBe(78);
  });

  it('calcula la edad cuando el cumpleaños todavía no ocurre este año', () => {
    expect(calcAge('1948-12-15')).toBe(77);
  });
});

describe('nextPendingLog', () => {
  const logs: MedicationLog[] = [
    { id: '1', medicationId: 'm1', medicationName: 'Paracetamol', dosage: '500mg', scheduledAt: '2026-07-02T14:00:00Z', status: 'PENDING' },
    { id: '2', medicationId: 'm2', medicationName: 'Ibuprofeno', dosage: '400mg', scheduledAt: '2026-07-02T09:00:00Z', status: 'PENDING' },
    { id: '3', medicationId: 'm3', medicationName: 'Aspirina', dosage: '100mg', scheduledAt: '2026-07-02T08:00:00Z', status: 'CONFIRMED' },
  ];

  it('retorna el log PENDING más próximo en el tiempo', () => {
    expect(nextPendingLog(logs)?.id).toBe('2');
  });

  it('retorna undefined cuando no hay logs PENDING', () => {
    expect(nextPendingLog([logs[2]])).toBeUndefined();
  });

  it('retorna undefined cuando logs es undefined', () => {
    expect(nextPendingLog(undefined)).toBeUndefined();
  });
});

describe('needsAttention', () => {
  const makeLog = (status: MedicationLog['status']): MedicationLog => ({
    id: '1', medicationId: 'm1', medicationName: 'X', dosage: '1', scheduledAt: '2026-07-02T09:00:00Z', status,
  });

  it('retorna true cuando hay un log ESCALATED', () => {
    expect(needsAttention([makeLog('ESCALATED')])).toBe(true);
  });

  it('retorna true cuando hay un log MISSED', () => {
    expect(needsAttention([makeLog('MISSED')])).toBe(true);
  });

  it('retorna false cuando todos los logs son PENDING o CONFIRMED', () => {
    expect(needsAttention([makeLog('PENDING'), makeLog('CONFIRMED')])).toBe(false);
  });

  it('retorna false cuando logs es undefined', () => {
    expect(needsAttention(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npx jest src/domain/utils/__tests__/patientDisplay.test.ts`
Expected: FAIL — `Cannot find module '../patientDisplay'`

- [ ] **Step 3: Crear el módulo `patientDisplay.ts`**

Crear `src/domain/utils/patientDisplay.ts` (código movido tal cual desde `PatientsListScreen.tsx`, sin cambios de comportamiento):

```ts
import { MedicationLog } from '@/domain/entities';

export function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  return today.getFullYear() - birth.getFullYear() -
    (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
}

export function nextPendingLog(logs: MedicationLog[] | undefined): MedicationLog | undefined {
  if (!logs) return undefined;
  return logs
    .filter((l) => l.status === 'PENDING')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
}

export function needsAttention(logs: MedicationLog[] | undefined): boolean {
  return !!logs?.some((l) => l.status === 'ESCALATED' || l.status === 'MISSED');
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npx jest src/domain/utils/__tests__/patientDisplay.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Refactorizar `PatientsListScreen.tsx` para usar el módulo compartido**

En `src/presentation/screens/patients/PatientsListScreen.tsx`, reemplazar las líneas 12–28 (las tres definiciones de función `calcAge`, `nextPendingLog`, `needsAttention`) por un import, y agregar el import junto a los existentes (línea 7):

```ts
import { Patient, MedicationLog } from '@/domain/entities';
import { calcAge, nextPendingLog, needsAttention } from '@/domain/utils/patientDisplay';
import ScreenBackground from '@/presentation/components/ScreenBackground';
```

Eliminar por completo estas tres funciones del archivo (antes en líneas 12–28):

```ts
function calcAge(birthDate: string): number { ... }
function nextPendingLog(logs: MedicationLog[] | undefined): MedicationLog | undefined { ... }
function needsAttention(logs: MedicationLog[] | undefined): boolean { ... }
```

El resto del archivo (`PatientCard`, `PatientsListScreen`, estilos) no cambia — sigue llamando `calcAge(patient.birthDate)`, `nextPendingLog(logs)` y `needsAttention(logs)` exactamente igual, ahora resueltos por el import.

- [ ] **Step 6: Verificar tipos y tests**

Run: `npx tsc --noEmit`
Expected: sin errores.

Run: `npx jest`
Expected: todos los tests existentes siguen en PASS, más los 11 nuevos de `patientDisplay`.

- [ ] **Step 7: Commit**

```bash
git add src/domain/utils/patientDisplay.ts src/domain/utils/__tests__/patientDisplay.test.ts src/presentation/screens/patients/PatientsListScreen.tsx
git commit -m "refactor: extract shared patient display utils from PatientsListScreen"
```

---

### Task 2: Crear `ComingSoonScreen` y registrar la ruta `ComingSoon`

**Files:**
- Create: `src/presentation/screens/common/ComingSoonScreen.tsx`
- Create: `src/presentation/screens/common/__tests__/ComingSoonScreen.test.tsx`
- Modify: `src/presentation/navigation/AppNavigator.tsx`

**Interfaces:**
- Produces (consumido por Task 4):
  - `ComingSoonScreen` (default export) con props `{ route: RouteProp<PatientStackParams, 'ComingSoon'> }`.
  - `PatientStackParams` extendido con `ComingSoon: { title: string; subtitle: string }`.
  - Ruta `'ComingSoon'` registrada en el `Stack.Navigator` de `AppNavigator`, con `headerShown: false`.
- Consumes: `ScreenBackground` (existente), `PatientStackParams` (existente, extendido en este mismo task).

- [ ] **Step 1: Escribir el test**

Crear `src/presentation/screens/common/__tests__/ComingSoonScreen.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import ComingSoonScreen from '../ComingSoonScreen';

describe('ComingSoonScreen', () => {
  it('muestra el título y subtítulo recibidos por route params', () => {
    const route = { params: { title: 'Hoy', subtitle: 'Pendientes de hoy' } } as any;
    render(<ComingSoonScreen route={route} />);
    expect(screen.getByText('Hoy')).toBeTruthy();
    expect(screen.getByText('Pendientes de hoy')).toBeTruthy();
    expect(screen.getByText('Esta función estará disponible próximamente.')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx jest src/presentation/screens/common/__tests__/ComingSoonScreen.test.tsx`
Expected: FAIL — `Cannot find module '../ComingSoonScreen'`

- [ ] **Step 3: Crear `ComingSoonScreen.tsx`**

Crear `src/presentation/screens/common/ComingSoonScreen.tsx`:

```tsx
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
```

- [ ] **Step 4: Registrar la ruta en `AppNavigator.tsx`**

Agregar el import junto a los otros imports de pantallas:

```ts
import ComingSoonScreen from '@/presentation/screens/common/ComingSoonScreen';
```

Extender `PatientStackParams`:

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
};
```

Agregar el `Stack.Screen` (junto a los demás, antes del cierre de `Stack.Navigator`):

```tsx
<Stack.Screen name="ComingSoon" component={ComingSoonScreen} options={{ headerShown: false }} />
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npx jest src/presentation/screens/common/__tests__/ComingSoonScreen.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/presentation/screens/common/ComingSoonScreen.tsx src/presentation/screens/common/__tests__/ComingSoonScreen.test.tsx src/presentation/navigation/AppNavigator.tsx
git commit -m "feat: add ComingSoonScreen placeholder for unimplemented patient sections"
```

---

### Task 3: Crear `ContactsScreen` y registrar la ruta `Contacts`

**Files:**
- Create: `src/presentation/screens/patients/ContactsScreen.tsx`
- Create: `src/presentation/screens/patients/__tests__/ContactsScreen.test.tsx`
- Modify: `src/presentation/navigation/AppNavigator.tsx`

**Interfaces:**
- Produces (consumido por Task 4):
  - `ContactsScreen` (default export) con props `{ navigation: NativeStackNavigationProp<PatientStackParams, 'Contacts'>, route: RouteProp<PatientStackParams, 'Contacts'> }`.
  - `PatientStackParams` extendido con `Contacts: { patientId: string }`.
  - Ruta `'Contacts'` registrada en `AppNavigator`, `headerShown: false`.
- Consumes: `useInjection` → `patientRepo.getPatient(id): Promise<Patient>` (existente), `CollaboratorsSection` (existente, sin modificar), `Patient.emergencyContact: { name: string; phone: string }` (existente).

- [ ] **Step 1: Escribir el test**

Crear `src/presentation/screens/patients/__tests__/ContactsScreen.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Linking, Alert } from 'react-native';
import ContactsScreen from '../ContactsScreen';
import { useInjection } from '@/presentation/hooks/useInjection';

jest.mock('@/presentation/hooks/useInjection');
jest.mock('@/presentation/components/CollaboratorsSection', () => {
  const { Text } = require('react-native');
  return function MockCollaboratorsSection() {
    return <Text>collaborators-section</Text>;
  };
});

const mockedUseInjection = useInjection as jest.Mock;

const basePatient = {
  id: 'p1',
  fullName: 'Rosa Martínez',
  isOwner: true,
  emergencyContact: { name: 'Juan Martínez', phone: '+56911112222' },
};

function renderScreen(patient: any, navigation: any = { navigate: jest.fn() }) {
  const getPatient = jest.fn().mockResolvedValue(patient);
  mockedUseInjection.mockReturnValue({ patientRepo: { getPatient } });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const route = { params: { patientId: 'p1' } } as any;

  render(
    <QueryClientProvider client={queryClient}>
      <ContactsScreen navigation={navigation} route={route} />
    </QueryClientProvider>
  );

  return { navigation };
}

describe('ContactsScreen', () => {
  it('muestra el botón "Editar paciente" cuando el usuario es owner', async () => {
    renderScreen(basePatient);
    expect(await screen.findByText('Editar paciente')).toBeTruthy();
  });

  it('oculta el botón "Editar paciente" cuando el usuario no es owner', async () => {
    renderScreen({ ...basePatient, isOwner: false });
    await screen.findByText('collaborators-section');
    expect(screen.queryByText('Editar paciente')).toBeNull();
  });

  it('navega a EditPatient al presionar "Editar paciente"', async () => {
    const { navigation } = renderScreen(basePatient);
    fireEvent.press(await screen.findByText('Editar paciente'));
    expect(navigation.navigate).toHaveBeenCalledWith('EditPatient', { patientId: 'p1' });
  });

  it('llama al teléfono de emergencia al presionar "Llamar"', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderScreen(basePatient);
    fireEvent.press(await screen.findByText('Llamar'));
    expect(openURLSpy).toHaveBeenCalledWith('tel:+56911112222');
  });

  it('muestra una alerta cuando no hay teléfono de emergencia', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderScreen({ ...basePatient, emergencyContact: { name: '', phone: '' } });
    fireEvent.press(await screen.findByText('Llamar'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Sin contacto de emergencia',
      'Este paciente no tiene un teléfono de emergencia registrado.'
    );
  });

  it('renderiza CollaboratorsSection', async () => {
    renderScreen(basePatient);
    expect(await screen.findByText('collaborators-section')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx jest src/presentation/screens/patients/__tests__/ContactsScreen.test.tsx`
Expected: FAIL — `Cannot find module '../ContactsScreen'`

- [ ] **Step 3: Crear `ContactsScreen.tsx`**

Crear `src/presentation/screens/patients/ContactsScreen.tsx`:

```tsx
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
    const phone = patient.emergencyContact.phone;
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
```

- [ ] **Step 4: Registrar la ruta en `AppNavigator.tsx`**

Agregar el import:

```ts
import ContactsScreen from '@/presentation/screens/patients/ContactsScreen';
```

Extender `PatientStackParams` (agregar después de `ComingSoon`):

```ts
  ComingSoon: { title: string; subtitle: string };
  Contacts: { patientId: string };
```

Agregar el `Stack.Screen`:

```tsx
<Stack.Screen name="Contacts" component={ContactsScreen} options={{ headerShown: false }} />
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npx jest src/presentation/screens/patients/__tests__/ContactsScreen.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/presentation/screens/patients/ContactsScreen.tsx src/presentation/screens/patients/__tests__/ContactsScreen.test.tsx src/presentation/navigation/AppNavigator.tsx
git commit -m "feat: add ContactsScreen with emergency contact, edit patient and collaborators"
```

---

### Task 4: Rediseñar `PatientDetailScreen` según el mockup

**Files:**
- Modify: `src/presentation/screens/patients/PatientDetailScreen.tsx` (reescritura completa)
- Create: `src/presentation/screens/patients/__tests__/PatientDetailScreen.test.tsx`
- Modify: `src/presentation/navigation/AppNavigator.tsx:37` (quitar `title: 'Detalle'`, poner `headerShown: false`, ya que la pantalla ahora dibuja su propio header)

**Interfaces:**
- Consumes:
  - `calcAge`, `nextPendingLog`, `needsAttention` de `@/domain/utils/patientDisplay` (Task 1).
  - Ruta `'ComingSoon'` con params `{ title, subtitle }` (Task 2).
  - Ruta `'Contacts'` con params `{ patientId }` (Task 3).
  - `useAuthStore().setSelectedPatientId(id: string | null): void` (ya existente en `@/presentation/stores/authStore`).
  - `medicationRepo.getDailyLogs(patientId: string, date: string): Promise<MedicationLog[]>` (ya existente, mismo query key `['medication-logs', patientId, today]` usado en `PatientsListScreen`/`DailyMedsScreen`).
- Produces: `PatientDetailScreen` (default export), sin cambios de firma respecto a la versión actual (`{ navigation, route }` con `route.params.patientId`).

- [ ] **Step 1: Escribir el test**

Crear `src/presentation/screens/patients/__tests__/PatientDetailScreen.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Linking, Alert } from 'react-native';
import PatientDetailScreen from '../PatientDetailScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

const basePatient = {
  id: 'p1',
  fullName: 'Rosa Martínez',
  birthDate: '1948-01-15',
  gender: 'FEMALE',
  isOwner: true,
  emergencyContact: { name: 'Juan Martínez', phone: '+56911112222' },
};

function renderScreen({
  patient = basePatient,
  logs = [] as any[],
  navigation = { navigate: jest.fn(), goBack: jest.fn() },
}: { patient?: any; logs?: any[]; navigation?: any } = {}) {
  const getPatient = jest.fn().mockResolvedValue(patient);
  const getDailyLogs = jest.fn().mockResolvedValue(logs);
  mockedUseInjection.mockReturnValue({
    patientRepo: { getPatient },
    medicationRepo: { getDailyLogs },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const route = { params: { patientId: 'p1' } } as any;

  render(
    <QueryClientProvider client={queryClient}>
      <PatientDetailScreen navigation={navigation} route={route} />
    </QueryClientProvider>
  );

  return { navigation };
}

describe('PatientDetailScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ selectedPatientId: null });
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-02T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renderiza las 7 tarjetas de acción', async () => {
    renderScreen();
    for (const title of ['Hoy', 'Medicamentos', 'Tareas', 'Signos vitales', 'Observaciones', 'Contactos', 'Historial']) {
      expect(await screen.findByText(title)).toBeTruthy();
    }
  });

  it('muestra "Estable" cuando no hay logs escalados o perdidos', async () => {
    renderScreen({ logs: [{ id: '1', medicationId: 'm1', medicationName: 'X', dosage: '1', scheduledAt: '2026-07-02T09:00:00Z', status: 'CONFIRMED' }] });
    expect(await screen.findByText('Estable')).toBeTruthy();
  });

  it('muestra "Requiere atención" cuando hay un log escalado', async () => {
    renderScreen({ logs: [{ id: '1', medicationId: 'm1', medicationName: 'X', dosage: '1', scheduledAt: '2026-07-02T09:00:00Z', status: 'ESCALATED' }] });
    expect(await screen.findByText('Requiere atención')).toBeTruthy();
  });

  it('muestra la hora del próximo medicamento pendiente', async () => {
    renderScreen({ logs: [{ id: '1', medicationId: 'm1', medicationName: 'X', dosage: '1', scheduledAt: '2026-07-02T09:00:00-04:00', status: 'PENDING' }] });
    expect(await screen.findByText(/09:00/)).toBeTruthy();
  });

  it('muestra "Sin pendientes" cuando no hay medicamentos pendientes', async () => {
    renderScreen({ logs: [] });
    expect(await screen.findByText('Sin pendientes')).toBeTruthy();
  });

  it('selecciona el paciente y navega a Medicamentos al presionar esa tarjeta', async () => {
    const { navigation } = renderScreen();
    fireEvent.press(await screen.findByText('Medicamentos'));
    expect(useAuthStore.getState().selectedPatientId).toBe('p1');
    expect(navigation.navigate).toHaveBeenCalledWith('Medicamentos');
  });

  it('selecciona el paciente y navega a Vitales al presionar "Signos vitales"', async () => {
    const { navigation } = renderScreen();
    fireEvent.press(await screen.findByText('Signos vitales'));
    expect(useAuthStore.getState().selectedPatientId).toBe('p1');
    expect(navigation.navigate).toHaveBeenCalledWith('Vitales');
  });

  it('navega a Contacts al presionar esa tarjeta', async () => {
    const { navigation } = renderScreen();
    fireEvent.press(await screen.findByText('Contactos'));
    expect(navigation.navigate).toHaveBeenCalledWith('Contacts', { patientId: 'p1' });
  });

  it('navega a ComingSoon con los params correctos al presionar "Hoy"', async () => {
    const { navigation } = renderScreen();
    fireEvent.press(await screen.findByText('Hoy'));
    expect(navigation.navigate).toHaveBeenCalledWith('ComingSoon', { title: 'Hoy', subtitle: 'Pendientes de hoy' });
  });

  it('llama al contacto de emergencia al presionar "Emergencia"', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderScreen();
    fireEvent.press(await screen.findByText('Emergencia'));
    expect(openURLSpy).toHaveBeenCalledWith('tel:+56911112222');
  });

  it('muestra una alerta cuando no hay teléfono de emergencia registrado', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderScreen({ patient: { ...basePatient, emergencyContact: { name: '', phone: '' } } });
    fireEvent.press(await screen.findByText('Emergencia'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Sin contacto de emergencia',
      'Este paciente no tiene un teléfono de emergencia registrado.'
    );
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx jest src/presentation/screens/patients/__tests__/PatientDetailScreen.test.tsx`
Expected: FAIL (el componente actual no tiene ninguna de las 7 tarjetas ni el botón "Emergencia").

- [ ] **Step 3: Reescribir `PatientDetailScreen.tsx`**

Reemplazar el contenido completo de `src/presentation/screens/patients/PatientDetailScreen.tsx`:

```tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, Linking, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { calcAge, nextPendingLog, needsAttention } from '@/domain/utils/patientDisplay';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'PatientDetail'>;
  route: RouteProp<PatientStackParams, 'PatientDetail'>;
};

type ActionCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  fullWidth?: boolean;
};

function ActionCard({ icon, color, title, subtitle, onPress, fullWidth }: ActionCardProps) {
  return (
    <TouchableOpacity
      style={[styles.actionCard, fullWidth && styles.actionCardFull]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.actionIconBadge, { backgroundColor: color }]}>
        <Ionicons name={icon} size={22} color="#fff" />
      </View>
      <View style={styles.actionTextColumn}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#7dd3fc" />
    </TouchableOpacity>
  );
}

export default function PatientDetailScreen({ navigation, route }: Props) {
  const { patientId } = route.params;
  const { patientRepo, medicationRepo } = useInjection();
  const setSelectedPatientId = useAuthStore((s) => s.setSelectedPatientId);
  const today = new Date().toISOString().split('T')[0];

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientRepo.getPatient(patientId),
  });

  const { data: logs } = useQuery({
    queryKey: ['medication-logs', patientId, today],
    queryFn: () => medicationRepo.getDailyLogs(patientId, today),
  });

  if (isLoading) return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#2D7DD2" /></ScreenBackground>;
  if (!patient) return null;

  const next = nextPendingLog(logs);
  const attention = needsAttention(logs);

  function handleEmergencyCall() {
    const phone = patient.emergencyContact.phone;
    if (!phone) {
      Alert.alert('Sin contacto de emergencia', 'Este paciente no tiene un teléfono de emergencia registrado.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  }

  function goToMedicamentos() {
    setSelectedPatientId(patientId);
    navigation.navigate('Medicamentos');
  }

  function goToVitales() {
    setSelectedPatientId(patientId);
    navigation.navigate('Vitales');
  }

  function goToContacts() {
    navigation.navigate('Contacts', { patientId });
  }

  function goToComingSoon(title: string, subtitle: string) {
    navigation.navigate('ComingSoon', { title, subtitle });
  }

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

        <Text style={styles.title}>Detalle del paciente</Text>

        <View style={styles.patientCard}>
          <View style={styles.patientCardTop}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={36} color="rgba(255,255,255,0.85)" />
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patient.fullName}</Text>
              <Text style={styles.patientAge}>{calcAge(patient.birthDate)} años</Text>
              {attention ? (
                <View style={[styles.statusBadge, styles.statusBadgeWarning]}>
                  <Ionicons name="warning" size={14} color="#3d2e00" />
                  <Text style={styles.statusTextWarning}>Requiere atención</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, styles.statusBadgeOk]}>
                  <Ionicons name="shield-checkmark" size={14} color="#fff" />
                  <Text style={styles.statusTextOk}>Estable</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.patientCardBottom}>
            <View style={styles.nextMedRow}>
              <Ionicons name="time-outline" size={14} color="#5ee7df" />
              <Text style={styles.nextMedText}>
                Próximo medicamento:{' '}
                <Text style={styles.nextMedTime}>
                  {next
                    ? new Date(next.scheduledAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                    : 'Sin pendientes'}
                </Text>
              </Text>
            </View>
            <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyCall}>
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={styles.emergencyButtonText}>Emergencia</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Plan de cuidado</Text>
        <Text style={styles.sectionSubtitle}>Acciones para hoy</Text>

        <View style={styles.grid}>
          <ActionCard icon="calendar" color="#2f6fed" title="Hoy" subtitle="Pendientes" onPress={() => goToComingSoon('Hoy', 'Pendientes de hoy')} />
          <ActionCard icon="medkit" color="#16a085" title="Medicamentos" subtitle="Dosis y horarios" onPress={goToMedicamentos} />
          <ActionCard icon="list" color="#7c5cfc" title="Tareas" subtitle="Cuidados diarios" onPress={() => goToComingSoon('Tareas', 'Cuidados diarios')} />
          <ActionCard icon="pulse" color="#e74c3c" title="Signos vitales" subtitle="Registrar control" onPress={goToVitales} />
          <ActionCard icon="clipboard" color="#f5a623" title="Observaciones" subtitle="Notas del cuidador" onPress={() => goToComingSoon('Observaciones', 'Notas del cuidador')} />
          <ActionCard icon="call-outline" color="#2f6fed" title="Contactos" subtitle="Familia y médico" onPress={goToContacts} />
          <ActionCard icon="time" color="#2f6fed" title="Historial" subtitle="Actividad reciente" onPress={() => goToComingSoon('Historial', 'Actividad reciente')} fullWidth />
        </View>
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

  patientCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 20,
    marginBottom: 28,
  },
  patientCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(148,180,204,0.35)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16,
  },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  patientAge: { fontSize: 14, color: '#cbd5e1', marginTop: 2, marginBottom: 8 },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  statusBadgeOk: { backgroundColor: '#1a9c7d' },
  statusTextOk: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  statusBadgeWarning: { backgroundColor: '#e6b800' },
  statusTextWarning: { color: '#3d2e00', fontWeight: 'bold', fontSize: 13 },

  patientCardBottom: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 12,
  },
  nextMedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  nextMedText: { fontSize: 13, color: '#a5d8f3' },
  nextMedTime: { fontWeight: 'bold', color: '#fff' },

  emergencyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#e05555', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 20,
  },
  emergencyButtonText: { color: '#fff', fontWeight: 'bold' },

  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  sectionSubtitle: { fontSize: 14, color: '#a5d8f3', marginTop: 2, marginBottom: 16 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  actionCard: {
    width: '47%',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  actionCardFull: { width: '100%' },
  actionIconBadge: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  actionTextColumn: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  actionSubtitle: { fontSize: 12, color: '#a5d8f3', marginTop: 2 },
});
```

- [ ] **Step 4: Actualizar `AppNavigator.tsx` para que `PatientDetail` use su propio header**

En `src/presentation/navigation/AppNavigator.tsx`, cambiar:

```tsx
<Stack.Screen name="PatientDetail" component={PatientDetailScreen} options={{ title: 'Detalle' }} />
```

por:

```tsx
<Stack.Screen name="PatientDetail" component={PatientDetailScreen} options={{ headerShown: false }} />
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npx jest src/presentation/screens/patients/__tests__/PatientDetailScreen.test.tsx`
Expected: PASS (11 tests)

- [ ] **Step 6: Correr toda la suite y verificar tipos**

Run: `npx jest`
Expected: todos los tests en PASS (existentes + nuevos).

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Verificación manual visual**

Run: `npx expo start` y abrir la app (simulador o Expo Go). Navegar Inicio → Mis pacientes → tocar un paciente. Confirmar visualmente contra el mockup: header, card de paciente con badge/hora/botón Emergencia, grid de 7 tarjetas, y que cada tarjeta navega a donde corresponde (Medicamentos y Signos vitales muestran datos reales del paciente seleccionado; el resto muestra "Próximamente"; Contactos muestra el contacto de emergencia + Editar paciente si eres owner + colaboradores).

- [ ] **Step 8: Commit**

```bash
git add src/presentation/screens/patients/PatientDetailScreen.tsx src/presentation/screens/patients/__tests__/PatientDetailScreen.test.tsx src/presentation/navigation/AppNavigator.tsx
git commit -m "feat: redesign PatientDetailScreen to match the patient detail mockup"
```
