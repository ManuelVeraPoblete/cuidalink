# CuidaLink — App Móvil Expo (diseño)

**Fecha:** 2026-06-28
**Reemplaza:** implementación anterior con React Native CLI

## Objetivo

Construir la app móvil de CuidaLink desde cero usando **Expo (managed workflow)**, compatible con **Expo Go** (escanear QR sin compilar). Misma funcionalidad que la versión anterior: gestión de medicamentos, signos vitales, pacientes y reportes.

---

## Stack

| Capa | Tecnología |
|---|---|
| Base | Expo SDK (latest), TypeScript strict |
| Navegación | React Navigation v7 (`native-stack` + `bottom-tabs`) |
| Auth | Firebase JS SDK v10 (`firebase` package) |
| Push | `expo-notifications` (con guard para Expo Go) |
| HTTP | Axios 1.x + TanStack Query v5 |
| Estado | Zustand v5 (auth), TanStack Query (datos remotos) |
| Formularios | React Hook Form v7 + Zod v3 |
| PDF | `expo-file-system` + `expo-sharing` |
| Almacenamiento | `expo-secure-store` (token Firebase) |

---

## Arquitectura — Hexagonal estricta

```
src/
├── domain/
│   ├── entities/        ← interfaces TypeScript puras (sin imports externos)
│   ├── repositories/    ← contratos (interfaces)
│   └── usecases/        ← interfaces agrupadas por módulo
├── data/
│   ├── firebase/
│   │   └── firebaseClient.ts   ← initializeApp() único punto de entrada
│   ├── http/
│   │   └── apiClient.ts        ← Axios + interceptor Bearer token
│   ├── notifications/
│   │   └── NotificationService.ts  ← wrapper expo-notifications
│   └── repositories/           ← ApiXxxRepository implementan interfaces domain
└── presentation/
    ├── navigation/      ← RootNavigator → AuthNavigator / AppNavigator
    ├── stores/          ← authStore.ts (Zustand, solo auth)
    ├── hooks/           ← useInjection.ts (DI)
    └── screens/         ← auth, home, patients, medications, vitals, profile
```

**Regla de dependencias:** `presentation/` solo importa de `domain/`. `data/` solo importa de `domain/`. Nunca al revés.

---

## Sección 1 — Entry point y configuración Expo

**`index.ts`:**
```ts
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
```

**`app.json`** (formato Expo):
```json
{
  "expo": {
    "name": "CuidaLink",
    "slug": "cuidalink",
    "version": "1.0.0",
    "platforms": ["android", "ios"],
    "android": { "package": "com.cuidalink.app" },
    "ios": { "bundleIdentifier": "com.cuidalink.app" },
    "plugins": ["expo-notifications"]
  }
}
```

**Variables de entorno** — archivo `.env` con prefijo `EXPO_PUBLIC_`:
```
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080/api/v1
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

Acceso: `process.env.EXPO_PUBLIC_*` (sin plugin, Expo lo lee automáticamente).

---

## Sección 2 — Firebase Auth (JS SDK)

**`src/data/firebase/firebaseClient.ts`:**
```ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!getApps().length) initializeApp(config);
export const firebaseAuth = getAuth();
```

**`ApiAuthRepository`** usa el SDK funcional de Firebase v10:

| Operación | API |
|---|---|
| Login email | `signInWithEmailAndPassword(firebaseAuth, e, p)` |
| Registro | `createUserWithEmailAndPassword(firebaseAuth, e, p)` |
| Google Sign-In | `signInWithCredential(firebaseAuth, GoogleAuthProvider.credential(token))` |
| Logout | `signOut(firebaseAuth)` |
| Listener estado | `onAuthStateChanged(firebaseAuth, callback)` en `App.tsx` |

Token almacenado con `expo-secure-store` (reemplaza `AsyncStorage` para el token).

---

## Sección 3 — Push Notifications

**Comportamiento por contexto:**

| Contexto | Token devuelto | Acción |
|---|---|---|
| Expo Go | `null` (guard activo) | No registra token — sin push en desarrollo |
| Build final | FCM token nativo | Registra en backend normalmente |

**`src/data/notifications/NotificationService.ts`:**
```ts
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export async function requestPermissionAndGetToken(): Promise<string | null> {
  if (Constants.appOwnership === 'expo') return null; // Expo Go guard

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  const token = await Notifications.getDevicePushTokenAsync();
  return token.data;
}

export function onTokenRefresh(cb: (token: string) => void) {
  return Notifications.addPushTokenListener((t) => cb(t.data));
}

export function onForegroundMessage(cb: (title: string, body: string) => void) {
  return Notifications.addNotificationReceivedListener((n) => {
    cb(n.request.content.title ?? 'Notificación', n.request.content.body ?? '');
  });
}
```

El backend (Spring Boot) no necesita cambios — en build final recibe FCM token como antes.

---

## Sección 4 — Descarga de PDF

**`ApiReportRepository`** usa `expo-file-system` + `expo-sharing`:

```ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

async downloadPdf(patientId, from, to): Promise<string> {
  const token = await SecureStore.getItemAsync('firebase_id_token');
  const url = `${API_BASE_URL}/patients/${patientId}/reports/pdf?from=${from}&to=${to}`;
  const dest = FileSystem.documentDirectory + `informe-${from}-${to}.pdf`;

  const res = await FileSystem.downloadAsync(dest, url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status !== 200) throw new Error('Error al descargar PDF');

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf' });
  }
  return res.uri;
}
```

El PDF se abre con el visor nativo del SO. El usuario puede guardarlo desde ahí.

---

## Screens (sin cambios respecto a versión anterior)

- **Auth:** LoginScreen, RegisterScreen
- **Home:** HomeScreen (resumen del día)
- **Patients:** PatientsListScreen, PatientDetailScreen, CreatePatientScreen, EditPatientScreen
- **Medications:** DailyMedsScreen (confirmar/omitir logs del día)
- **Vitals:** VitalsHistoryScreen, RecordVitalsScreen
- **Profile:** ProfileScreen (logout, datos usuario)

Navegación: Bottom Tab (Inicio / Pacientes / Medicamentos / Vitales / Perfil), con stack anidado en Pacientes para el flujo de detalle.

---

## Testing

- **Unit (Jest):** use cases del dominio, mappers
- **Componente (RNTL):** screens con repositorios mockeados
- No hay E2E en esta etapa (Detox no aplica a Expo Go)

---

## Lo que NO cambia

- Toda la lógica de dominio (`domain/entities`, `domain/repositories`, `domain/usecases`)
- La arquitectura hexagonal y la regla de dependencias
- El backend Spring Boot (ningún cambio requerido)
- Las reglas de negocio documentadas en CLAUDE.md
