# Pantalla "Detalle del paciente" — rediseño

**Fecha:** 2026-07-02
**Módulo:** `appmovil` — `presentation/screens/patients`

## Contexto

Al presionar un paciente en `PatientsListScreen`, la app navega a `PatientDetailScreen`. La versión
actual muestra solo nombre, fecha de nacimiento, botones "Editar"/"Registrar Vitales" (solo owner) y
la sección de colaboradores. El usuario proporcionó un mockup con un diseño específico que se debe
seguir de forma estricta:

- Header con botón volver, logo CuidaLink, título "Detalle del paciente".
- Card de paciente: avatar, nombre, edad, badge de estado, "Próximo medicamento: HH:MM", botón
  "Emergencia".
- Sección "Plan de cuidado — Acciones para hoy": grid de 7 tarjetas de navegación (Hoy, Medicamentos,
  Tareas, Signos vitales, Observaciones, Contactos, Historial).

De estas 7 tarjetas, solo **Medicamentos** y **Signos vitales** tienen pantalla y backend reales hoy.
Las otras 5 (Hoy, Tareas, Observaciones, Contactos, Historial) no tienen endpoint ni pantalla.
Decisión de alcance (confirmada con el usuario): implementar la UI completa y navegable; las 5
tarjetas sin backend llevan a una pantalla placeholder "Próximamente" en lugar de simularse con datos
falsos.

## Alcance

**Incluye:**
- Rediseño completo de `PatientDetailScreen.tsx` según el mockup.
- Componente `ComingSoonScreen` genérico y reutilizable.
- Nueva `ContactsScreen` que absorbe las funciones que hoy viven en `PatientDetailScreen`
  (Editar paciente, sección de colaboradores) y muestra el contacto de emergencia.
- Botón "Emergencia" funcional (llamada telefónica).
- Rutas nuevas en `AppNavigator.tsx`.
- Tests Jest/RNTL de los componentes nuevos/modificados.

**No incluye (fuera de alcance, trabajo futuro):**
- Backend o pantallas reales para Hoy, Tareas, Observaciones, Historial.
- Múltiples contactos de emergencia (el dominio `Patient.emergencyContact` sigue siendo uno solo).
- Fotos de perfil reales (se sigue usando ícono `person` como placeholder de avatar).

## Diseño

### 1. `PatientDetailScreen.tsx` (rediseño)

Estructura (de arriba hacia abajo), envuelta en `ScreenBackground` + `ScrollView`:

1. **Header row**: logo `cuidalink-icon.png` + texto "CuidaLink" centrado (mismo patrón que
   `PatientsListScreen`/`HomeScreen`).
2. **Top row**: botón volver circular (`Ionicons name="arrow-back"`) que llama `navigation.goBack()`.
3. **Título**: "Detalle del paciente" (`fontSize: 28/32`, bold, blanco). La cruz decorativa del
   mockup es parte de la imagen de fondo (`fondoapp.png`, vía `ScreenBackground`) — no se agrega
   ningún ícono adicional para replicarla.
4. **Card de paciente** (`rgba(255,255,255,0.06)` bg, `borderRadius: 24`, borde sutil — mismo
   lenguaje visual que las cards de `PatientsListScreen`):
   - Avatar circular 72×72 con `Ionicons name="person"`.
   - Nombre (`fontSize: 20`, bold).
   - Edad: `{calcAge(patient.birthDate)} años` (función ya existente, se mueve a un util compartido
     o se duplica igual que hoy — ver sección "Reutilización de código").
   - Badge de estado: mismo componente visual que `statusBadgeOk`/`statusBadgeWarning` de
     `PatientsListScreen` ("Estable" / "Requiere atención").
   - "Próximo medicamento: HH:MM" con ícono `time-outline`, o "Sin pendientes" si no hay logs
     `PENDING`.
   - Botón "Emergencia" (rojo `#e05555`-ish, ícono `call`), alineado a la derecha del card.
5. **Sección "Plan de cuidado"**: título + subtítulo "Acciones para hoy".
6. **Grid de 7 tarjetas**: reutiliza el patrón `HomeCard`/`grid` de `HomeScreen.tsx` (cards al 47% de
   ancho, `flexWrap: 'wrap'`), salvo la última ("Historial") que ocupa el 100% del ancho. Cada tarjeta
   tiene ícono (color de fondo distinto por categoría, según mockup), título y subtítulo, terminando
   en chevron:

   | Tarjeta | Ícono | Subtítulo | Ruta |
   |---|---|---|---|
   | Hoy | `calendar` | "Pendientes" | `ComingSoon` |
   | Medicamentos | `medical` (cápsula) | "Dosis y horarios" | `Medicamentos` |
   | Tareas | `checkbox` | "Cuidados diarios" | `ComingSoon` |
   | Signos vitales | `heart` | "Registrar control" | `Vitales` |
   | Observaciones | `create` | "Notas del cuidador" | `ComingSoon` |
   | Contactos | `call` / `people` | "Familia y médico" | `Contacts` |
   | Historial | `time` | "Actividad reciente" | `ComingSoon` |

### 2. Datos y lógica de estado

Se reutiliza exactamente la lógica hoy embebida en `PatientCard` (`PatientsListScreen.tsx`):

```ts
function nextPendingLog(logs) { ... }   // ya existe
function needsAttention(logs) { ... }   // ya existe
function calcAge(birthDate) { ... }     // ya existe
```

Estas tres funciones están duplicadas hoy solo en `PatientsListScreen.tsx`. Para evitar
divergencia, se extraen a `src/domain/utils/patientDisplay.ts` (funciones puras, sin dependencias de
React Native) y ambas pantallas (`PatientsListScreen` y `PatientDetailScreen`) importan desde ahí.
Esto es una extracción mínima justificada porque la misma lógica se necesita en dos pantallas ahora;
no se generaliza más allá de eso.

`PatientDetailScreen` hace su propio `useQuery(['medication-logs', patientId, today])` (mismo query
key que ya usa `PatientCard`, por lo que TanStack Query cachea/comparte si el usuario viene de la
lista).

### 3. Botón "Emergencia"

```ts
import { Linking, Alert } from 'react-native';

function handleEmergencyCall(patient: Patient) {
  const phone = patient.emergencyContact?.phone;
  if (!phone) {
    Alert.alert('Sin contacto de emergencia', 'Este paciente no tiene un teléfono de emergencia registrado.');
    return;
  }
  Linking.openURL(`tel:${phone}`);
}
```

### 4. `ComingSoonScreen` (nuevo componente de pantalla)

`src/presentation/screens/common/ComingSoonScreen.tsx`. Recibe `{ title, subtitle }` vía route
params y muestra un layout centrado simple: ícono `construct-outline`, `title`, `subtitle`, y texto
fijo "Esta función estará disponible próximamente.". Se registra **una vez** en el navigator; cada
tarjeta pasa sus propios params al navegar, p. ej.:

```ts
navigation.navigate('ComingSoon', { title: 'Hoy', subtitle: 'Pendientes de hoy' })
```

### 5. `ContactsScreen` (nueva pantalla)

`src/presentation/screens/patients/ContactsScreen.tsx`. Recibe `{ patientId }`. Responsabilidades:

- Hace su propio `useQuery` de `patientRepo.getPatient(patientId)` para leer `isOwner` y
  `emergencyContact`.
- Muestra el contacto de emergencia actual (nombre, teléfono, botón de llamada — mismo
  `handleEmergencyCall`).
- Si `isOwner`: botón "Editar paciente" → `navigation.navigate('EditPatient', { patientId })`.
- Monta `<CollaboratorsSection patientId={patientId} isOwner={patient.isOwner} />` tal cual existe
  hoy, sin modificarla.

Esto reemplaza el hueco dejado por remover "Editar"/"Registrar Vitales"/colaboradores de
`PatientDetailScreen`. "Registrar Vitales" directo ya no está como botón propio: se accede desde
`Vitales` (VitalsHistoryScreen), que ya tiene su propio FAB "+ Registrar".

### 6. Navegación (`AppNavigator.tsx`)

```ts
export type PatientStackParams = {
  // ...existentes
  ComingSoon: { title: string; subtitle: string };
  Contacts: { patientId: string };
};
```

Al navegar a `Medicamentos` o `Vitales` desde `PatientDetailScreen`, se llama primero
`useAuthStore.getState().setSelectedPatientId(patientId)` (estas pantallas leen el paciente activo
del store, no de route params — patrón ya existente en `DailyMedsScreen`/`VitalsHistoryScreen`).

## Manejo de errores

- `patientRepo.getPatient` en estado `isLoading` → `ActivityIndicator` (mismo patrón ya usado).
- Si `patient` es `null`/`undefined` tras cargar → se mantiene el `return null` actual (no se agrega
  manejo adicional; no es un caso alcanzable en la práctica dado que se navega con un id válido).
- Emergencia sin teléfono registrado → `Alert.alert` (ver punto 3), no lanza excepción ni bloquea la
  pantalla.

## Testing

- **`PatientDetailScreen.test.tsx`** (RNTL): mockea `patientRepo.getPatient` y
  `medicationRepo.getDailyLogs`. Verifica:
  - Se renderizan las 7 tarjetas con sus títulos.
  - Badge muestra "Estable" cuando no hay logs ESCALATED/MISSED, y "Requiere atención" cuando sí los
    hay.
  - "Próximo medicamento" muestra la hora del log PENDING más próximo, o "Sin pendientes".
  - Tocar la tarjeta "Medicamentos" llama `navigation.navigate('Medicamentos')` y
    `setSelectedPatientId`.
  - Tocar "Hoy" navega a `ComingSoon` con los params correctos.
  - Tocar el botón "Emergencia" con/sin teléfono registrado dispara `Linking.openURL` o `Alert.alert`
    respectivamente (mockeando `Linking`).
- **`ComingSoonScreen.test.tsx`**: renderiza con distintos `title`/`subtitle` via route params mock y
  verifica que se muestren.
- **`ContactsScreen.test.tsx`**: verifica que "Editar paciente" solo aparece si `isOwner`, y que se
  monta `CollaboratorsSection` con los props correctos.
- **`patientDisplay.test.ts`** (nuevo, para las funciones extraídas `calcAge`/`nextPendingLog`/
  `needsAttention`): casos ya cubiertos implícitamente hoy, se agregan tests unitarios explícitos
  dado que ahora es un módulo compartido.

No hay cambios de backend; no se agregan tests de backend.
