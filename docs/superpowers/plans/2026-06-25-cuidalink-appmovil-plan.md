# CuidaLink App Móvil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la app móvil CuidaLink en React Native 0.74 + TypeScript con arquitectura hexagonal estricta: dominio puro sin dependencias de infraestructura, repositorios como contratos de interfaz, y adaptadores que implementan la comunicación con la API Java.

**Architecture:** Hexagonal en tres capas: `domain/` (entidades + interfaces de use cases + contratos de repositorios), `data/` (adaptadores que implementan los contratos via Axios), `presentation/` (screens + components que llaman a los use cases). La capa `presentation` nunca importa de `data` directamente — solo usa interfaces del dominio.

**Tech Stack:** React Native 0.74, TypeScript 5, React Navigation 6, Axios 1.x, TanStack Query 5, Zustand 5, React Hook Form 7, Zod 3, AsyncStorage, Firebase React Native (auth + messaging), Jest, React Native Testing Library, Detox.

## Global Constraints

- React Native 0.74 con TypeScript estricto (`strict: true` en tsconfig.json)
- Alias `@/` = `src/` en tsconfig y babel config
- `presentation/` nunca importa de `data/` — toda comunicación vía interfaces de `domain/`
- Zustand SOLO para auth state — TanStack Query para todos los datos remotos
- El dominio no importa Axios, AsyncStorage ni Firebase — esas son dependencias de `data/`
- La API base URL en variable de entorno: `API_BASE_URL` en `.env`
- Todos los formularios usan React Hook Form + Zod
- Pantallas de solo-lectura usan TanStack Query con `staleTime: 1000 * 60` (1 minuto)

---

## Mapa de archivos

```
cuidalink/appmovil/
├── package.json
├── tsconfig.json
├── babel.config.js
├── .env
├── .env.example
├── index.js
├── App.tsx
└── src/
    ├── domain/
    │   ├── entities/
    │   │   ├── User.ts
    │   │   ├── Patient.ts
    │   │   ├── Medication.ts
    │   │   ├── MedicationLog.ts
    │   │   ├── VitalSignDefinition.ts
    │   │   ├── VitalRecord.ts
    │   │   └── Collaborator.ts
    │   ├── repositories/
    │   │   ├── AuthRepository.ts
    │   │   ├── PatientRepository.ts
    │   │   ├── MedicationRepository.ts
    │   │   ├── VitalRepository.ts
    │   │   └── ReportRepository.ts
    │   └── usecases/
    │       ├── auth/
    │       │   ├── LoginUseCase.ts
    │       │   ├── RegisterUseCase.ts
    │       │   └── UpdateFcmTokenUseCase.ts
    │       ├── patient/
    │       │   ├── CreatePatientUseCase.ts
    │       │   ├── ListPatientsUseCase.ts
    │       │   └── GenerateInvitationUseCase.ts
    │       ├── medication/
    │       │   ├── CreateMedicationUseCase.ts
    │       │   ├── GetDailyLogsUseCase.ts
    │       │   └── ConfirmMedicationLogUseCase.ts
    │       ├── vital/
    │       │   ├── RecordVitalsUseCase.ts
    │       │   └── ListVitalRecordsUseCase.ts
    │       └── report/
    │           └── DownloadReportUseCase.ts
    ├── data/
    │   ├── http/
    │   │   └── apiClient.ts          ← Axios instance + interceptor
    │   └── repositories/
    │       ├── ApiAuthRepository.ts
    │       ├── ApiPatientRepository.ts
    │       ├── ApiMedicationRepository.ts
    │       ├── ApiVitalRepository.ts
    │       └── ApiReportRepository.ts
    └── presentation/
        ├── navigation/
        │   ├── RootNavigator.tsx
        │   ├── AuthNavigator.tsx
        │   └── AppNavigator.tsx      ← Bottom Tab + stacks privados
        ├── stores/
        │   └── authStore.ts          ← Zustand, solo auth state
        ├── hooks/
        │   └── useInjection.ts       ← DI: retorna instancias de repositorios/use cases
        ├── screens/
        │   ├── auth/
        │   │   ├── LoginScreen.tsx
        │   │   └── RegisterScreen.tsx
        │   ├── home/
        │   │   └── HomeScreen.tsx
        │   ├── patients/
        │   │   ├── PatientsListScreen.tsx
        │   │   ├── PatientDetailScreen.tsx
        │   │   ├── CreatePatientScreen.tsx
        │   │   └── EditPatientScreen.tsx
        │   ├── medications/
        │   │   └── DailyMedsScreen.tsx
        │   ├── vitals/
        │   │   ├── VitalsHistoryScreen.tsx
        │   │   └── RecordVitalsScreen.tsx
        │   └── profile/
        │       └── ProfileScreen.tsx
        └── components/
            ├── MedicationCard.tsx
            ├── VitalCard.tsx
            ├── CollaboratorsSection.tsx
            ├── JoinCodeDialog.tsx
            └── DateRangePicker.tsx
```

---

### Task 1: Bootstrap del proyecto React Native

**Files:**
- Create: `cuidalink/appmovil/package.json` (via `npx @react-native-community/cli init`)
- Create: `cuidalink/appmovil/tsconfig.json`
- Create: `cuidalink/appmovil/babel.config.js`
- Create: `cuidalink/appmovil/.env` y `.env.example`
- Create: `cuidalink/appmovil/src/` estructura de carpetas

**Interfaces:** ninguna — solo infraestructura

- [ ] **Step 1: Inicializar proyecto React Native con TypeScript**

```bash
cd cuidalink
npx @react-native-community/cli init appmovil --template react-native-template-typescript
cd appmovil
```

- [ ] **Step 2: Instalar dependencias**

```bash
npm install \
  @react-navigation/native@6 \
  @react-navigation/native-stack@6 \
  @react-navigation/bottom-tabs@6 \
  react-native-screens \
  react-native-safe-area-context \
  axios \
  @tanstack/react-query \
  zustand \
  react-hook-form \
  zod \
  @hookform/resolvers \
  @react-native-async-storage/async-storage \
  @react-native-firebase/app \
  @react-native-firebase/auth \
  @react-native-firebase/messaging \
  react-native-blob-util \
  react-native-dotenv

npm install --save-dev \
  @testing-library/react-native \
  @testing-library/jest-native
```

- [ ] **Step 3: Configurar `tsconfig.json`**

```json
{
  "extends": "@react-native/typescript-config/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 4: Configurar `babel.config.js`**

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
      safe: true,
    }],
    ['module-resolver', {
      root: ['./src'],
      alias: { '@': './src' },
    }],
  ],
};
```

- [ ] **Step 5: Crear `.env.example` y `.env`**

```bash
# .env.example
API_BASE_URL=http://10.0.2.2:8080/api/v1
FIREBASE_PROJECT_ID=tu-proyecto-firebase
```

```bash
# .env (gitignored)
API_BASE_URL=http://10.0.2.2:8080/api/v1
```

- [ ] **Step 6: Crear estructura de carpetas `src/`**

```bash
mkdir -p src/domain/{entities,repositories,usecases/{auth,patient,medication,vital,report}}
mkdir -p src/data/{http,repositories}
mkdir -p src/presentation/{navigation,stores,hooks,screens/{auth,home,patients,medications,vitals,profile},components}
```

- [ ] **Step 7: Verificar que compila**

```bash
npx tsc --noEmit
```
Esperado: sin errores

- [ ] **Step 8: Commit**

```bash
git add cuidalink/appmovil/
git commit -m "feat(appmovil): bootstrap React Native 0.74 + TypeScript with hexagonal folder structure"
```

---

### Task 2: Capa de Dominio — Entidades e Interfaces

**Files:**
- Create: `src/domain/entities/` (7 archivos)
- Create: `src/domain/repositories/` (5 interfaces)
- Create: `src/domain/usecases/` (11 interfaces)
- Test: `src/domain/usecases/auth/__tests__/LoginUseCase.test.ts`

**Interfaces:**
- Produce: `AuthRepository`, `PatientRepository`, `MedicationRepository`, `VitalRepository`, `ReportRepository`
- Produce: todos los use cases como interfaces tipadas

- [ ] **Step 1: Escribir test fallido para un use case del dominio**

```typescript
// src/domain/usecases/auth/__tests__/LoginUseCase.test.ts
import { LoginUseCase, LoginCommand } from '../LoginUseCase';
import { AuthRepository } from '@/domain/repositories/AuthRepository';
import { User } from '@/domain/entities/User';

describe('LoginUseCase', () => {
  it('calls repository.login and returns user', async () => {
    const mockRepo: AuthRepository = {
      loginWithEmail: jest.fn().mockResolvedValue({ id: '1', name: 'Ana', email: 'ana@test.com', role: 'CAREGIVER' } as User),
      loginWithGoogle: jest.fn(),
      register: jest.fn(),
      updateFcmToken: jest.fn(),
      logout: jest.fn(),
    };
    const useCase = new LoginUseCase(mockRepo);

    const result = await useCase.execute({ email: 'ana@test.com', password: '123456' });

    expect(mockRepo.loginWithEmail).toHaveBeenCalledWith('ana@test.com', '123456');
    expect(result.email).toBe('ana@test.com');
  });
});
```

- [ ] **Step 2: Implementar entidades del dominio**

```typescript
// src/domain/entities/User.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'CAREGIVER';
}

// src/domain/entities/Patient.ts
export interface Patient {
  id: string;
  fullName: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  identificationNumber: string;
  healthCondition: string;
  allergies: string;
  emergencyContact: { name: string; phone: string };
  isOwner: boolean;
  active: boolean;
}

// src/domain/entities/Medication.ts
export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  instructions: string;
  schedule: MedicationSchedule;
  active: boolean;
}

export interface MedicationSchedule {
  times: string[];
  frequency: 'DAILY' | 'EVERY_X_DAYS' | 'WEEKLY';
  daysOfWeek?: string[];
  startDate: string;
  endDate?: string;
}

// src/domain/entities/MedicationLog.ts
export type LogStatus = 'PENDING' | 'CONFIRMED' | 'MISSED' | 'SKIPPED' | 'ESCALATED';

export interface MedicationLog {
  id: string;
  medicationId: string;
  medicationName: string;
  scheduledAt: string;
  status: LogStatus;
  administeredBy?: string;
  confirmedAt?: string;
}

// src/domain/entities/VitalSignDefinition.ts
export interface VitalSignDefinition {
  id: string;
  patientId: string;
  name: string;
  unit: string;
  normalRangeMin?: number;
  normalRangeMax?: number;
}

// src/domain/entities/VitalRecord.ts
export interface VitalRecord {
  id: string;
  patientId: string;
  recordedBy: string;
  recordedAt: string;
  measurements: VitalMeasurement[];
}

export interface VitalMeasurement {
  definitionId: string;
  value: string;
}

// src/domain/entities/Collaborator.ts
export interface Collaborator {
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
}
```

- [ ] **Step 3: Implementar contratos de repositorios**

```typescript
// src/domain/repositories/AuthRepository.ts
import { User } from '@/domain/entities/User';

export interface AuthRepository {
  loginWithEmail(email: string, password: string): Promise<User>;
  loginWithGoogle(idToken: string): Promise<User>;
  register(name: string, email: string, password: string): Promise<User>;
  updateFcmToken(token: string): Promise<void>;
  logout(): Promise<void>;
}

// src/domain/repositories/PatientRepository.ts
import { Patient } from '@/domain/entities/Patient';
import { Collaborator } from '@/domain/entities/Collaborator';

export interface PatientRepository {
  list(): Promise<Patient[]>;
  findById(id: string): Promise<Patient>;
  create(data: CreatePatientData): Promise<Patient>;
  update(id: string, data: Partial<CreatePatientData>): Promise<Patient>;
  archive(id: string): Promise<void>;
  generateInvitation(patientId: string): Promise<{ code: string; expiresAt: string }>;
  joinWithCode(code: string): Promise<void>;
  listCollaborators(patientId: string): Promise<Collaborator[]>;
  revokeCollaborator(patientId: string, userId: string): Promise<void>;
}

export interface CreatePatientData {
  fullName: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  identificationNumber: string;
  healthCondition: string;
  allergies: string;
  emergencyContact: { name: string; phone: string };
}

// src/domain/repositories/MedicationRepository.ts
import { Medication, MedicationLog, LogStatus } from '@/domain/entities/';

export interface MedicationRepository {
  listByPatient(patientId: string): Promise<Medication[]>;
  create(patientId: string, data: CreateMedicationData): Promise<Medication>;
  update(patientId: string, medId: string, data: Partial<CreateMedicationData>): Promise<Medication>;
  deactivate(patientId: string, medId: string): Promise<void>;
  getDailyLogs(patientId: string, date: string): Promise<MedicationLog[]>;
  confirmLog(logId: string, status: LogStatus, notes?: string): Promise<MedicationLog>;
}

export interface CreateMedicationData {
  name: string;
  dosage: string;
  instructions: string;
  schedule: import('@/domain/entities/Medication').MedicationSchedule;
}

// src/domain/repositories/VitalRepository.ts
import { VitalSignDefinition, VitalRecord, VitalMeasurement } from '@/domain/entities/';

export interface VitalRepository {
  listDefinitions(patientId: string): Promise<VitalSignDefinition[]>;
  createDefinition(patientId: string, data: CreateDefinitionData): Promise<VitalSignDefinition>;
  updateDefinition(patientId: string, defId: string, data: Partial<CreateDefinitionData>): Promise<VitalSignDefinition>;
  deleteDefinition(patientId: string, defId: string): Promise<void>;
  recordVitals(patientId: string, measurements: VitalMeasurement[]): Promise<VitalRecord>;
  listRecords(patientId: string, from: string, to: string): Promise<VitalRecord[]>;
}

export interface CreateDefinitionData {
  name: string;
  unit: string;
  normalRangeMin?: number;
  normalRangeMax?: number;
}

// src/domain/repositories/ReportRepository.ts
export interface ReportRepository {
  downloadPdf(patientId: string, from: string, to: string): Promise<string>; // retorna file path local
}
```

- [ ] **Step 4: Implementar use cases concretos**

```typescript
// src/domain/usecases/auth/LoginUseCase.ts
import { AuthRepository } from '@/domain/repositories/AuthRepository';
import { User } from '@/domain/entities/User';

export interface LoginCommand {
  email: string;
  password: string;
}

export class LoginUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(command: LoginCommand): Promise<User> {
    return this.authRepository.loginWithEmail(command.email, command.password);
  }
}

// src/domain/usecases/auth/RegisterUseCase.ts
export class RegisterUseCase {
  constructor(private readonly authRepository: AuthRepository) {}
  async execute(name: string, email: string, password: string): Promise<User> {
    return this.authRepository.register(name, email, password);
  }
}

// src/domain/usecases/medication/ConfirmMedicationLogUseCase.ts
import { MedicationRepository } from '@/domain/repositories/MedicationRepository';
import { MedicationLog, LogStatus } from '@/domain/entities/MedicationLog';

export class ConfirmMedicationLogUseCase {
  constructor(private readonly medicationRepository: MedicationRepository) {}

  async execute(logId: string, status: 'CONFIRMED' | 'MISSED', notes?: string): Promise<MedicationLog> {
    if (status !== 'CONFIRMED' && status !== 'MISSED')
      throw new Error('Solo se puede confirmar como CONFIRMED o MISSED');
    return this.medicationRepository.confirmLog(logId, status, notes);
  }
}

// src/domain/usecases/report/DownloadReportUseCase.ts
export class DownloadReportUseCase {
  constructor(private readonly reportRepository: ReportRepository) {}

  async execute(patientId: string, from: string, to: string): Promise<string> {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 90) throw new Error('El rango no puede superar 90 días');
    return this.reportRepository.downloadPdf(patientId, from, to);
  }
}
```

- [ ] **Step 5: Ejecutar tests**

```bash
npm test -- --testPathPattern="domain" --watchAll=false
```
Esperado: 1 test PASS

- [ ] **Step 6: Commit**

```bash
git add cuidalink/appmovil/src/domain/
git commit -m "feat(appmovil/domain): add entities, repository contracts and use case classes"
```

---

### Task 3: Capa de Datos — Axios Client y Repositorios API

**Files:**
- Create: `src/data/http/apiClient.ts`
- Create: `src/data/repositories/ApiAuthRepository.ts`
- Create: `src/data/repositories/ApiPatientRepository.ts`
- Create: `src/data/repositories/ApiMedicationRepository.ts`
- Create: `src/data/repositories/ApiVitalRepository.ts`
- Create: `src/data/repositories/ApiReportRepository.ts`
- Test: `src/data/repositories/__tests__/ApiAuthRepository.test.ts`

**Interfaces:**
- Consume: contratos de `domain/repositories/` (Task 2)
- Produce: implementaciones concretas de todos los repositorios

- [ ] **Step 1: Test para ApiAuthRepository**

```typescript
// src/data/repositories/__tests__/ApiAuthRepository.test.ts
import axios from 'axios';
import { ApiAuthRepository } from '../ApiAuthRepository';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiAuthRepository', () => {
  it('loginWithEmail posts to /auth/login and returns user', async () => {
    const mockUser = { id: '1', name: 'Ana', email: 'ana@test.com', role: 'CAREGIVER' };
    mockedAxios.post.mockResolvedValueOnce({ data: mockUser });

    const repo = new ApiAuthRepository();
    const result = await repo.loginWithEmail('ana@test.com', '123456');

    expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login',
      { email: 'ana@test.com', password: '123456' });
    expect(result.email).toBe('ana@test.com');
  });
});
```

- [ ] **Step 2: Implementar `apiClient.ts`**

```typescript
// src/data/http/apiClient.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('firebase_id_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message ?? error.message ?? 'Error desconocido';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
```

- [ ] **Step 3: Implementar `ApiAuthRepository`**

```typescript
// src/data/repositories/ApiAuthRepository.ts
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '@/data/http/apiClient';
import { AuthRepository } from '@/domain/repositories/AuthRepository';
import { User } from '@/domain/entities/User';

export class ApiAuthRepository implements AuthRepository {

  async loginWithEmail(email: string, password: string): Promise<User> {
    const cred = await auth().signInWithEmailAndPassword(email, password);
    const idToken = await cred.user.getIdToken();
    await AsyncStorage.setItem('firebase_id_token', idToken);
    const res = await apiClient.post<User>('/auth/login', { email, firebaseUid: cred.user.uid });
    return res.data;
  }

  async loginWithGoogle(idToken: string): Promise<User> {
    const googleCred = auth.GoogleAuthProvider.credential(idToken);
    const cred = await auth().signInWithCredential(googleCred);
    const firebaseToken = await cred.user.getIdToken();
    await AsyncStorage.setItem('firebase_id_token', firebaseToken);
    const res = await apiClient.post<User>('/auth/google', { idToken: firebaseToken });
    return res.data;
  }

  async register(name: string, email: string, password: string): Promise<User> {
    const cred = await auth().createUserWithEmailAndPassword(email, password);
    const idToken = await cred.user.getIdToken();
    await AsyncStorage.setItem('firebase_id_token', idToken);
    const res = await apiClient.post<User>('/auth/register',
      { name, email, firebaseUid: cred.user.uid });
    return res.data;
  }

  async updateFcmToken(token: string): Promise<void> {
    await apiClient.post('/auth/fcm-token', { token });
  }

  async logout(): Promise<void> {
    await auth().signOut();
    await AsyncStorage.removeItem('firebase_id_token');
  }
}
```

- [ ] **Step 4: Implementar `ApiPatientRepository`**

```typescript
// src/data/repositories/ApiPatientRepository.ts
import apiClient from '@/data/http/apiClient';
import { PatientRepository, CreatePatientData } from '@/domain/repositories/PatientRepository';
import { Patient } from '@/domain/entities/Patient';
import { Collaborator } from '@/domain/entities/Collaborator';

export class ApiPatientRepository implements PatientRepository {
  async list(): Promise<Patient[]> {
    const res = await apiClient.get<Patient[]>('/patients');
    return res.data;
  }

  async findById(id: string): Promise<Patient> {
    const res = await apiClient.get<Patient>(`/patients/${id}`);
    return res.data;
  }

  async create(data: CreatePatientData): Promise<Patient> {
    const res = await apiClient.post<Patient>('/patients', data);
    return res.data;
  }

  async update(id: string, data: Partial<CreatePatientData>): Promise<Patient> {
    const res = await apiClient.put<Patient>(`/patients/${id}`, data);
    return res.data;
  }

  async archive(id: string): Promise<void> {
    await apiClient.patch(`/patients/${id}/archive`);
  }

  async generateInvitation(patientId: string): Promise<{ code: string; expiresAt: string }> {
    const res = await apiClient.post(`/patients/${patientId}/invitations`);
    return res.data;
  }

  async joinWithCode(code: string): Promise<void> {
    await apiClient.post('/invitations/join', { code });
  }

  async listCollaborators(patientId: string): Promise<Collaborator[]> {
    const res = await apiClient.get<Collaborator[]>(`/patients/${patientId}/collaborators`);
    return res.data;
  }

  async revokeCollaborator(patientId: string, userId: string): Promise<void> {
    await apiClient.delete(`/patients/${patientId}/collaborators/${userId}`);
  }
}
```

- [ ] **Step 5: Implementar `ApiMedicationRepository`**

```typescript
// src/data/repositories/ApiMedicationRepository.ts
import apiClient from '@/data/http/apiClient';
import { MedicationRepository, CreateMedicationData } from '@/domain/repositories/MedicationRepository';
import { Medication, MedicationLog, LogStatus } from '@/domain/entities/';

export class ApiMedicationRepository implements MedicationRepository {
  async listByPatient(patientId: string): Promise<Medication[]> {
    const res = await apiClient.get<Medication[]>(`/patients/${patientId}/medications`);
    return res.data;
  }

  async create(patientId: string, data: CreateMedicationData): Promise<Medication> {
    const res = await apiClient.post<Medication>(`/patients/${patientId}/medications`, data);
    return res.data;
  }

  async update(patientId: string, medId: string, data: Partial<CreateMedicationData>): Promise<Medication> {
    const res = await apiClient.put<Medication>(`/patients/${patientId}/medications/${medId}`, data);
    return res.data;
  }

  async deactivate(patientId: string, medId: string): Promise<void> {
    await apiClient.patch(`/patients/${patientId}/medications/${medId}/deactivate`);
  }

  async getDailyLogs(patientId: string, date: string): Promise<MedicationLog[]> {
    const res = await apiClient.get<MedicationLog[]>(
      `/patients/${patientId}/medication-logs`, { params: { date } });
    return res.data;
  }

  async confirmLog(logId: string, status: LogStatus, notes?: string): Promise<MedicationLog> {
    const res = await apiClient.patch<MedicationLog>(`/medication-logs/${logId}`, { status, notes });
    return res.data;
  }
}
```

- [ ] **Step 6: Implementar `ApiVitalRepository` y `ApiReportRepository`**

```typescript
// src/data/repositories/ApiVitalRepository.ts
export class ApiVitalRepository implements VitalRepository {
  async listDefinitions(patientId: string): Promise<VitalSignDefinition[]> {
    const res = await apiClient.get(`/patients/${patientId}/vital-definitions`);
    return res.data;
  }
  async createDefinition(patientId: string, data: CreateDefinitionData): Promise<VitalSignDefinition> {
    const res = await apiClient.post(`/patients/${patientId}/vital-definitions`, data);
    return res.data;
  }
  async updateDefinition(patientId: string, defId: string, data: Partial<CreateDefinitionData>): Promise<VitalSignDefinition> {
    const res = await apiClient.put(`/patients/${patientId}/vital-definitions/${defId}`, data);
    return res.data;
  }
  async deleteDefinition(patientId: string, defId: string): Promise<void> {
    await apiClient.delete(`/patients/${patientId}/vital-definitions/${defId}`);
  }
  async recordVitals(patientId: string, measurements: VitalMeasurement[]): Promise<VitalRecord> {
    const res = await apiClient.post(`/patients/${patientId}/vital-records`, { measurements });
    return res.data;
  }
  async listRecords(patientId: string, from: string, to: string): Promise<VitalRecord[]> {
    const res = await apiClient.get(`/patients/${patientId}/vital-records`, { params: { from, to } });
    return res.data;
  }
}

// src/data/repositories/ApiReportRepository.ts
import ReactNativeBlobUtil from 'react-native-blob-util';

export class ApiReportRepository implements ReportRepository {
  async downloadPdf(patientId: string, from: string, to: string): Promise<string> {
    const token = await AsyncStorage.getItem('firebase_id_token');
    const url = `${API_BASE_URL}/patients/${patientId}/reports/pdf?from=${from}&to=${to}`;
    const destPath = ReactNativeBlobUtil.fs.dirs.DownloadDir + `/informe-cuidalink-${from}-${to}.pdf`;
    const res = await ReactNativeBlobUtil.config({
      fileCache: true, path: destPath,
    }).fetch('GET', url, { Authorization: `Bearer ${token}` });
    return res.path();
  }
}
```

- [ ] **Step 7: Crear hook de inyección de dependencias**

```typescript
// src/presentation/hooks/useInjection.ts
import { useMemo } from 'react';
import { ApiAuthRepository } from '@/data/repositories/ApiAuthRepository';
import { ApiPatientRepository } from '@/data/repositories/ApiPatientRepository';
import { ApiMedicationRepository } from '@/data/repositories/ApiMedicationRepository';
import { ApiVitalRepository } from '@/data/repositories/ApiVitalRepository';
import { ApiReportRepository } from '@/data/repositories/ApiReportRepository';
import { LoginUseCase } from '@/domain/usecases/auth/LoginUseCase';
import { RegisterUseCase } from '@/domain/usecases/auth/RegisterUseCase';
import { ConfirmMedicationLogUseCase } from '@/domain/usecases/medication/ConfirmMedicationLogUseCase';
import { DownloadReportUseCase } from '@/domain/usecases/report/DownloadReportUseCase';

const authRepo = new ApiAuthRepository();
const patientRepo = new ApiPatientRepository();
const medicationRepo = new ApiMedicationRepository();
const vitalRepo = new ApiVitalRepository();
const reportRepo = new ApiReportRepository();

export function useInjection() {
  return useMemo(() => ({
    authRepo,
    patientRepo,
    medicationRepo,
    vitalRepo,
    loginUseCase: new LoginUseCase(authRepo),
    registerUseCase: new RegisterUseCase(authRepo),
    confirmLogUseCase: new ConfirmMedicationLogUseCase(medicationRepo),
    downloadReportUseCase: new DownloadReportUseCase(reportRepo),
  }), []);
}
```

- [ ] **Step 8: Ejecutar tests**

```bash
npm test -- --testPathPattern="repositories" --watchAll=false
```
Esperado: PASS

- [ ] **Step 9: Commit**

```bash
git add cuidalink/appmovil/src/data/
git commit -m "feat(appmovil/data): add Axios client and all API repository adapters"
```

---

### Task 4: Navegación, Auth Store y App entry point

**Files:**
- Create: `src/presentation/stores/authStore.ts`
- Create: `src/presentation/navigation/RootNavigator.tsx`
- Create: `src/presentation/navigation/AuthNavigator.tsx`
- Create: `src/presentation/navigation/AppNavigator.tsx`
- Modify: `App.tsx`

**Interfaces:**
- Consume: `authStore` para decidir si mostrar stack público o privado

- [ ] **Step 1: Implementar `authStore`**

```typescript
// src/presentation/stores/authStore.ts
import { create } from 'zustand';
import { User } from '@/domain/entities/User';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
```

- [ ] **Step 2: Implementar `AuthNavigator`**

```tsx
// src/presentation/navigation/AuthNavigator.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '@/presentation/screens/auth/LoginScreen';
import RegisterScreen from '@/presentation/screens/auth/RegisterScreen';

export type AuthStackParams = {
  Login: undefined;
  Register: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParams>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 3: Implementar `AppNavigator` (bottom tabs)**

```tsx
// src/presentation/navigation/AppNavigator.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '@/presentation/screens/home/HomeScreen';
import PatientsListScreen from '@/presentation/screens/patients/PatientsListScreen';
import PatientDetailScreen from '@/presentation/screens/patients/PatientDetailScreen';
import CreatePatientScreen from '@/presentation/screens/patients/CreatePatientScreen';
import DailyMedsScreen from '@/presentation/screens/medications/DailyMedsScreen';
import VitalsHistoryScreen from '@/presentation/screens/vitals/VitalsHistoryScreen';
import RecordVitalsScreen from '@/presentation/screens/vitals/RecordVitalsScreen';
import ProfileScreen from '@/presentation/screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();
const PatientStack = createNativeStackNavigator();

function PatientStackNavigator() {
  return (
    <PatientStack.Navigator>
      <PatientStack.Screen name="PatientsList" component={PatientsListScreen} options={{ title: 'Pacientes' }} />
      <PatientStack.Screen name="PatientDetail" component={PatientDetailScreen} options={{ title: 'Detalle' }} />
      <PatientStack.Screen name="CreatePatient" component={CreatePatientScreen} options={{ title: 'Nuevo Paciente' }} />
    </PatientStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Pacientes" component={PatientStackNavigator} />
      <Tab.Screen name="Medicamentos" component={DailyMedsScreen} />
      <Tab.Screen name="Vitales" component={VitalsHistoryScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 4: Implementar `RootNavigator`**

```tsx
// src/presentation/navigation/RootNavigator.tsx
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '@/presentation/stores/authStore';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import { ActivityIndicator, View } from 'react-native';

export default function RootNavigator() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
```

- [ ] **Step 5: Modificar `App.tsx`**

```tsx
// App.tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from '@/presentation/navigation/RootNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add cuidalink/appmovil/
git commit -m "feat(appmovil/nav): add navigation, auth store and App entry point"
```

---

### Task 5: Feature Auth — Login y Register

**Files:**
- Create: `src/presentation/screens/auth/LoginScreen.tsx`
- Create: `src/presentation/screens/auth/RegisterScreen.tsx`
- Test: `src/presentation/screens/auth/__tests__/LoginScreen.test.tsx`

**Interfaces:**
- Consume: `LoginUseCase`, `RegisterUseCase` via `useInjection()`
- Consume: `useAuthStore` para setUser tras login exitoso

- [ ] **Step 1: Test fallido para LoginScreen**

```tsx
// __tests__/LoginScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';
import { useInjection } from '@/presentation/hooks/useInjection';

jest.mock('@/presentation/hooks/useInjection');

describe('LoginScreen', () => {
  it('calls loginUseCase.execute on form submit', async () => {
    const mockLogin = jest.fn().mockResolvedValue({ id: '1', name: 'Ana', email: 'ana@test.com', role: 'CAREGIVER' });
    (useInjection as jest.Mock).mockReturnValue({ loginUseCase: { execute: mockLogin } });

    const { getByPlaceholderText, getByText } = render(<LoginScreen navigation={{} as any} route={{} as any} />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'ana@test.com');
    fireEvent.changeText(getByPlaceholderText('Contraseña'), '123456');
    fireEvent.press(getByText('Ingresar'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ email: 'ana@test.com', password: '123456' });
    });
  });
});
```

- [ ] **Step 2: Implementar `LoginScreen`**

```tsx
// src/presentation/screens/auth/LoginScreen.tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/presentation/stores/authStore';
import { useInjection } from '@/presentation/hooks/useInjection';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParams } from '@/presentation/navigation/AuthNavigator';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type FormData = z.infer<typeof schema>;

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParams, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const { loginUseCase } = useInjection();
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = React.useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      const user = await loginUseCase.execute(data);
      setUser(user);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CuidaLink</Text>
      <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
        <TextInput style={styles.input} placeholder="Email" value={value}
          onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" />
      )} />
      {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

      <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
        <TextInput style={styles.input} placeholder="Contraseña" value={value}
          onChangeText={onChange} secureTextEntry />
      )} />
      {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Ingresar</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>¿No tienes cuenta? Regístrate</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 32, color: '#2563EB' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, marginBottom: 4, fontSize: 16 },
  error: { color: '#EF4444', fontSize: 12, marginBottom: 8 },
  button: { backgroundColor: '#2563EB', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', marginTop: 16, color: '#2563EB' },
});
```

- [ ] **Step 3: Implementar `RegisterScreen`**

```tsx
// src/presentation/screens/auth/RegisterScreen.tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/presentation/stores/authStore';
import { useInjection } from '@/presentation/hooks/useInjection';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParams } from '@/presentation/navigation/AuthNavigator';

const schema = z.object({
  name: z.string().min(2, 'Nombre demasiado corto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

type Props = { navigation: NativeStackNavigationProp<AuthStackParams, 'Register'> };

export default function RegisterScreen({ navigation }: Props) {
  const { registerUseCase } = useInjection();
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = React.useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      const user = await registerUseCase.execute(data.name, data.email, data.password);
      setUser(user);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear cuenta</Text>
      {(['name', 'email', 'password', 'confirmPassword'] as const).map((field) => (
        <Controller key={field} control={control} name={field} render={({ field: { onChange, value } }) => (
          <>
            <TextInput style={styles.input}
              placeholder={field === 'name' ? 'Nombre completo' : field === 'email' ? 'Email' :
                field === 'password' ? 'Contraseña' : 'Repetir contraseña'}
              value={value} onChangeText={onChange}
              secureTextEntry={field === 'password' || field === 'confirmPassword'}
              keyboardType={field === 'email' ? 'email-address' : 'default'}
              autoCapitalize={field === 'email' ? 'none' : 'words'}
            />
            {errors[field] && <Text style={styles.error}>{errors[field]?.message}</Text>}
          </>
        )} />
      ))}
      <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Registrarse</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, color: '#2563EB' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, marginBottom: 4, fontSize: 16 },
  error: { color: '#EF4444', fontSize: 12, marginBottom: 8 },
  button: { backgroundColor: '#2563EB', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', marginTop: 16, color: '#2563EB' },
});
```

- [ ] **Step 4: Ejecutar tests**

```bash
npm test -- --testPathPattern="LoginScreen" --watchAll=false
```
Esperado: PASS

- [ ] **Step 5: Commit**

```bash
git add cuidalink/appmovil/src/presentation/screens/auth/
git commit -m "feat(appmovil/auth): add LoginScreen and RegisterScreen with React Hook Form + Zod"
```

---

### Task 6: Feature Patients — Lista, Detalle, Crear, Editar

**Files:**
- Create: `src/presentation/screens/patients/PatientsListScreen.tsx`
- Create: `src/presentation/screens/patients/PatientDetailScreen.tsx` (con tabs Medicamentos, Vitales, Colaboradores)
- Create: `src/presentation/screens/patients/CreatePatientScreen.tsx`
- Create: `src/presentation/screens/patients/EditPatientScreen.tsx`
- Create: `src/presentation/components/CollaboratorsSection.tsx`
- Create: `src/presentation/components/JoinCodeDialog.tsx`
- Test: `src/presentation/screens/patients/__tests__/PatientsListScreen.test.tsx`

**Interfaces:**
- Consume: `patientRepo.list()` vía TanStack Query
- Consume: `patientRepo.generateInvitation()`, `patientRepo.joinWithCode()`

- [ ] **Step 1: Test para PatientsListScreen**

```tsx
// __tests__/PatientsListScreen.test.tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import PatientsListScreen from '../PatientsListScreen';
import { useInjection } from '@/presentation/hooks/useInjection';

jest.mock('@/presentation/hooks/useInjection');
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockReturnValue({
    data: [{ id: '1', fullName: 'María García', isOwner: true, active: true }],
    isLoading: false,
  }),
}));

it('renders patient list', () => {
  (useInjection as jest.Mock).mockReturnValue({ patientRepo: {} });
  const { getByText } = render(<PatientsListScreen navigation={{} as any} route={{} as any} />);
  expect(getByText('María García')).toBeTruthy();
});
```

- [ ] **Step 2: Implementar `PatientsListScreen`**

```tsx
// src/presentation/screens/patients/PatientsListScreen.tsx
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useInjection } from '@/presentation/hooks/useInjection';
import { Patient } from '@/domain/entities/Patient';

export default function PatientsListScreen({ navigation }: any) {
  const { patientRepo } = useInjection();
  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientRepo.list(),
  });

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={patients}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}
            onPress={() => navigation.navigate('PatientDetail', { patientId: item.id })}>
            <Text style={styles.name}>{item.fullName}</Text>
            <Text style={styles.badge}>{item.isOwner ? 'Cuidador principal' : 'Colaborador'}</Text>
          </TouchableOpacity>
        )}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <TouchableOpacity style={styles.joinButton}
              onPress={() => {/* abrir JoinCodeDialog */}}>
              <Text style={styles.joinText}>Tengo un código</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createButton}
              onPress={() => navigation.navigate('CreatePatient')}>
              <Text style={styles.createText}>+ Agregar paciente</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  card: { backgroundColor: '#fff', margin: 8, padding: 16, borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  name: { fontSize: 16, fontWeight: '600', color: '#111827' },
  badge: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  joinButton: { padding: 8, borderWidth: 1, borderColor: '#2563EB', borderRadius: 8 },
  joinText: { color: '#2563EB', fontWeight: '500' },
  createButton: { padding: 8, backgroundColor: '#2563EB', borderRadius: 8 },
  createText: { color: '#fff', fontWeight: '500' },
});
```

- [ ] **Step 3: Implementar `PatientDetailScreen` con tab view**

```tsx
// src/presentation/screens/patients/PatientDetailScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useInjection } from '@/presentation/hooks/useInjection';
import CollaboratorsSection from '@/presentation/components/CollaboratorsSection';

type Tab = 'medications' | 'vitals' | 'collaborators';

export default function PatientDetailScreen({ route, navigation }: any) {
  const { patientId } = route.params;
  const { patientRepo } = useInjection();
  const [activeTab, setActiveTab] = useState<Tab>('medications');

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientRepo.findById(patientId),
  });

  if (!patient) return null;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.name}>{patient.fullName}</Text>
        {patient.isOwner && (
          <TouchableOpacity onPress={() => navigation.navigate('EditPatient', { patientId })}>
            <Text style={styles.editLink}>Editar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['medications', 'vitals', 'collaborators'] as Tab[]).map((tab) => (
          (tab !== 'collaborators' || patient.isOwner) && (
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'medications' ? 'Medicamentos' : tab === 'vitals' ? 'Vitales' : 'Colaboradores'}
              </Text>
            </TouchableOpacity>
          )
        ))}
      </View>

      {activeTab === 'collaborators' && patient.isOwner && (
        <CollaboratorsSection patientId={patientId} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 20, fontWeight: 'bold' },
  editLink: { color: '#2563EB' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, padding: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#2563EB' },
  tabText: { color: '#6B7280' },
  activeTabText: { color: '#2563EB', fontWeight: '600' },
});
```

- [ ] **Step 4: Implementar `CreatePatientScreen`**

```tsx
// src/presentation/screens/patients/CreatePatientScreen.tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInjection } from '@/presentation/hooks/useInjection';

const schema = z.object({
  fullName: z.string().min(2, 'Nombre requerido'),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  identificationNumber: z.string().optional(),
  healthCondition: z.string().optional(),
  allergies: z.string().optional(),
  emergencyName: z.string().min(2, 'Nombre del contacto requerido'),
  emergencyPhone: z.string().min(6, 'Teléfono requerido'),
});
type FormData = z.infer<typeof schema>;

export default function CreatePatientScreen({ navigation }: any) {
  const { patientRepo } = useInjection();
  const queryClient = useQueryClient();
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { gender: 'FEMALE' },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => patientRepo.create({
      fullName: data.fullName, birthDate: data.birthDate, gender: data.gender,
      identificationNumber: data.identificationNumber ?? '',
      healthCondition: data.healthCondition ?? '',
      allergies: data.allergies ?? '',
      emergencyContact: { name: data.emergencyName, phone: data.emergencyPhone },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const fields: { name: keyof FormData; label: string; placeholder: string }[] = [
    { name: 'fullName', label: 'Nombre completo', placeholder: 'María García' },
    { name: 'birthDate', label: 'Fecha de nacimiento', placeholder: '1945-03-10' },
    { name: 'identificationNumber', label: 'RUT / Identificación', placeholder: '12345678-9' },
    { name: 'healthCondition', label: 'Condición de salud', placeholder: 'Diabetes tipo 2' },
    { name: 'allergies', label: 'Alergias', placeholder: 'Penicilina' },
    { name: 'emergencyName', label: 'Contacto de emergencia — Nombre', placeholder: 'Juan García' },
    { name: 'emergencyPhone', label: 'Contacto de emergencia — Teléfono', placeholder: '+56912345678' },
  ];

  return (
    <ScrollView style={styles.container}>
      {fields.map(({ name, label, placeholder }) => (
        <Controller key={name} control={control} name={name} render={({ field: { onChange, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput style={styles.input} placeholder={placeholder}
              value={value as string} onChangeText={onChange} />
            {errors[name] && <Text style={styles.error}>{String(errors[name]?.message)}</Text>}
          </View>
        )} />
      ))}
      <TouchableOpacity style={styles.button}
        onPress={handleSubmit((d) => createMutation.mutate(d))}
        disabled={createMutation.isPending}>
        {createMutation.isPending
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Crear paciente</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 15 },
  error: { color: '#EF4444', fontSize: 11, marginTop: 2 },
  button: { backgroundColor: '#2563EB', padding: 14, borderRadius: 8, alignItems: 'center', marginVertical: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 5: Implementar `CollaboratorsSection`**

```tsx
// src/presentation/components/CollaboratorsSection.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInjection } from '@/presentation/hooks/useInjection';

export default function CollaboratorsSection({ patientId }: { patientId: string }) {
  const { patientRepo } = useInjection();
  const queryClient = useQueryClient();
  const [inviteCode, setInviteCode] = useState<{ code: string; expiresAt: string } | null>(null);

  const { data: collaborators } = useQuery({
    queryKey: ['collaborators', patientId],
    queryFn: () => patientRepo.listCollaborators(patientId),
  });

  const generateMutation = useMutation({
    mutationFn: () => patientRepo.generateInvitation(patientId),
    onSuccess: (data) => setInviteCode(data),
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => patientRepo.revokeCollaborator(patientId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collaborators', patientId] }),
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={() => generateMutation.mutate()}>
        <Text style={styles.buttonText}>Generar código de invitación</Text>
      </TouchableOpacity>

      {inviteCode && (
        <View style={styles.codeBox}>
          <Text style={styles.code}>{inviteCode.code}</Text>
          <Text style={styles.expiry}>Expira: {new Date(inviteCode.expiresAt).toLocaleString()}</Text>
        </View>
      )}

      <FlatList
        data={collaborators}
        keyExtractor={(c) => c.userId}
        renderItem={({ item }) => (
          <View style={styles.collabRow}>
            <Text>{item.name} ({item.email})</Text>
            <TouchableOpacity onPress={() => Alert.alert('Revocar', '¿Seguro?', [
              { text: 'Cancelar' },
              { text: 'Revocar', onPress: () => revokeMutation.mutate(item.userId), style: 'destructive' }
            ])}>
              <Text style={styles.revoke}>Revocar</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  button: { backgroundColor: '#2563EB', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  codeBox: { backgroundColor: '#EFF6FF', padding: 16, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  code: { fontSize: 24, fontWeight: 'bold', letterSpacing: 4, color: '#1D4ED8' },
  expiry: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  collabRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  revoke: { color: '#EF4444' },
});
```

- [ ] **Step 5: Ejecutar tests**

```bash
npm test -- --testPathPattern="patients" --watchAll=false
```
Esperado: PASS

- [ ] **Step 6: Commit**

```bash
git add cuidalink/appmovil/src/presentation/screens/patients/ \
        cuidalink/appmovil/src/presentation/components/CollaboratorsSection.tsx
git commit -m "feat(appmovil/patients): add patients list, detail with tabs, create/edit and collaborators"
```

---

### Task 7: Feature Medications — DailyMedsScreen

**Files:**
- Create: `src/presentation/screens/medications/DailyMedsScreen.tsx`
- Create: `src/presentation/components/MedicationCard.tsx`
- Test: `src/presentation/screens/medications/__tests__/DailyMedsScreen.test.tsx`

**Interfaces:**
- Consume: `medicationRepo.getDailyLogs(patientId, date)` vía TanStack Query
- Consume: `confirmLogUseCase.execute(logId, status)` vía useMutation

- [ ] **Step 1: Test para DailyMedsScreen**

```tsx
// __tests__/DailyMedsScreen.test.tsx
it('renders medication cards and calls confirm on press', async () => {
  const mockConfirm = jest.fn().mockResolvedValue({ id: '1', status: 'CONFIRMED' });
  (useInjection as jest.Mock).mockReturnValue({
    confirmLogUseCase: { execute: mockConfirm },
    medicationRepo: {},
  });
  jest.mock('@tanstack/react-query', () => ({
    useQuery: jest.fn().mockReturnValue({
      data: [{ id: '1', medicationName: 'Metformina', scheduledAt: '2026-06-25T08:00:00',
               status: 'PENDING' }],
      isLoading: false,
    }),
    useMutation: jest.fn().mockReturnValue({ mutate: mockConfirm, isPending: false }),
    useQueryClient: jest.fn().mockReturnValue({ invalidateQueries: jest.fn() }),
  }));

  const { getByText } = render(<DailyMedsScreen route={{ params: { patientId: '1' } } as any} navigation={{} as any} />);
  fireEvent.press(getByText('Confirmar'));
  await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
});
```

- [ ] **Step 2: Implementar `MedicationCard`**

```tsx
// src/presentation/components/MedicationCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MedicationLog, LogStatus } from '@/domain/entities/MedicationLog';

interface Props {
  log: MedicationLog;
  onConfirm: (logId: string) => void;
  onMiss: (logId: string) => void;
}

const STATUS_COLORS: Record<LogStatus, string> = {
  PENDING: '#FEF3C7', CONFIRMED: '#D1FAE5', MISSED: '#FEE2E2',
  SKIPPED: '#F3F4F6', ESCALATED: '#FEE2E2',
};

export default function MedicationCard({ log, onConfirm, onMiss }: Props) {
  const isPending = log.status === 'PENDING' || log.status === 'ESCALATED';
  const time = new Date(log.scheduledAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.card, { backgroundColor: STATUS_COLORS[log.status] }]}>
      <View style={styles.info}>
        <Text style={styles.name}>{log.medicationName}</Text>
        <Text style={styles.time}>{time}</Text>
        {log.status === 'ESCALATED' && <Text style={styles.escalated}>⚠️ Sin confirmar</Text>}
      </View>
      {isPending && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.confirmBtn} onPress={() => onConfirm(log.id)}>
            <Text style={styles.confirmText}>Confirmar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.missBtn} onPress={() => onMiss(log.id)}>
            <Text style={styles.missText}>Omitir</Text>
          </TouchableOpacity>
        </View>
      )}
      {!isPending && <Text style={styles.status}>{log.status}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, marginHorizontal: 16, marginVertical: 6 },
  info: { marginBottom: 8 },
  name: { fontSize: 16, fontWeight: '600', color: '#111827' },
  time: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  escalated: { color: '#B91C1C', fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  confirmBtn: { flex: 1, backgroundColor: '#059669', padding: 8, borderRadius: 8, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '600' },
  missBtn: { flex: 1, backgroundColor: '#DC2626', padding: 8, borderRadius: 8, alignItems: 'center' },
  missText: { color: '#fff', fontWeight: '600' },
  status: { color: '#374151', fontStyle: 'italic' },
});
```

- [ ] **Step 3: Implementar `DailyMedsScreen`**

```tsx
// src/presentation/screens/medications/DailyMedsScreen.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInjection } from '@/presentation/hooks/useInjection';
import MedicationCard from '@/presentation/components/MedicationCard';

export default function DailyMedsScreen({ route }: any) {
  const { patientId } = route.params;
  const { medicationRepo, confirmLogUseCase } = useInjection();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: logs, isLoading } = useQuery({
    queryKey: ['medication-logs', patientId, today],
    queryFn: () => medicationRepo.getDailyLogs(patientId, today),
    refetchInterval: 60_000,
  });

  const confirmMutation = useMutation({
    mutationFn: ({ logId, status }: { logId: string; status: 'CONFIRMED' | 'MISSED' }) =>
      confirmLogUseCase.execute(logId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['medication-logs', patientId, today] }),
  });

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.date}>Medicamentos del día — {today}</Text>
      <FlatList
        data={logs}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => (
          <MedicationCard
            log={item}
            onConfirm={(id) => confirmMutation.mutate({ logId: id, status: 'CONFIRMED' })}
            onMiss={(id) => confirmMutation.mutate({ logId: id, status: 'MISSED' })}
          />
        )}
        ListEmptyComponent={() => (
          <Text style={styles.empty}>No hay medicamentos programados para hoy</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  date: { padding: 16, fontSize: 14, color: '#6B7280', fontWeight: '500' },
  empty: { textAlign: 'center', marginTop: 40, color: '#9CA3AF' },
});
```

- [ ] **Step 4: Ejecutar tests**

```bash
npm test -- --testPathPattern="DailyMeds" --watchAll=false
```
Esperado: PASS

- [ ] **Step 5: Commit**

```bash
git add cuidalink/appmovil/src/presentation/screens/medications/ \
        cuidalink/appmovil/src/presentation/components/MedicationCard.tsx
git commit -m "feat(appmovil/medications): add DailyMedsScreen with confirm/skip actions"
```

---

### Task 8: Feature Vitals — RecordVitalsScreen (formulario dinámico) e Historial

**Files:**
- Create: `src/presentation/screens/vitals/RecordVitalsScreen.tsx`
- Create: `src/presentation/screens/vitals/VitalsHistoryScreen.tsx`
- Create: `src/presentation/components/VitalCard.tsx`

**Interfaces:**
- Consume: `vitalRepo.listDefinitions(patientId)` para generar formulario dinámico
- Consume: `vitalRepo.recordVitals(patientId, measurements)` para guardar

- [ ] **Step 1: Implementar `RecordVitalsScreen`** (formulario generado dinámicamente desde definiciones)

```tsx
// src/presentation/screens/vitals/RecordVitalsScreen.tsx
import React from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInjection } from '@/presentation/hooks/useInjection';

export default function RecordVitalsScreen({ route, navigation }: any) {
  const { patientId } = route.params;
  const { vitalRepo } = useInjection();
  const queryClient = useQueryClient();

  const [values, setValues] = React.useState<Record<string, string>>({});

  const { data: definitions } = useQuery({
    queryKey: ['vital-definitions', patientId],
    queryFn: () => vitalRepo.listDefinitions(patientId),
  });

  const recordMutation = useMutation({
    mutationFn: () => {
      const measurements = Object.entries(values)
        .filter(([, v]) => v.trim() !== '')
        .map(([definitionId, value]) => ({ definitionId, value }));
      if (measurements.length === 0) throw new Error('Ingresa al menos un valor');
      return vitalRepo.recordVitals(patientId, measurements);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vital-records', patientId] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Registrar Signos Vitales</Text>
      {definitions?.map((def) => (
        <View key={def.id} style={styles.field}>
          <Text style={styles.label}>{def.name} ({def.unit})</Text>
          {def.normalRangeMin != null && (
            <Text style={styles.range}>Rango normal: {def.normalRangeMin} – {def.normalRangeMax}</Text>
          )}
          <TextInput
            style={styles.input}
            placeholder={`Ej: ${def.unit === '°C' ? '36.5' : def.unit === 'mmHg' ? '120/80' : '0'}`}
            value={values[def.id] ?? ''}
            onChangeText={(v) => setValues((prev) => ({ ...prev, [def.id]: v }))}
            keyboardType="decimal-pad"
          />
        </View>
      ))}
      <TouchableOpacity style={styles.button} onPress={() => recordMutation.mutate()}>
        <Text style={styles.buttonText}>Guardar registro</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#111827' },
  field: { marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 },
  range: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 16 },
  button: { backgroundColor: '#2563EB', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8, marginBottom: 32 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 2: Implementar `VitalsHistoryScreen`**

```tsx
// src/presentation/screens/vitals/VitalsHistoryScreen.tsx
export default function VitalsHistoryScreen({ route, navigation }: any) {
  const { patientId } = route.params;
  const { vitalRepo } = useInjection();
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: records } = useQuery({
    queryKey: ['vital-records', patientId],
    queryFn: () => vitalRepo.listRecords(patientId, from, to),
  });

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity style={styles.recordBtn}
        onPress={() => navigation.navigate('RecordVitals', { patientId })}>
        <Text style={styles.recordText}>+ Registrar signos vitales</Text>
      </TouchableOpacity>
      <FlatList
        data={records}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <VitalCard record={item} definitions={[]} />}
      />
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add cuidalink/appmovil/src/presentation/screens/vitals/
git commit -m "feat(appmovil/vitals): add dynamic vital recording form and history screen"
```

---

### Task 9: Feature Reports — Descarga PDF

**Files:**
- Create: `src/presentation/components/DateRangePicker.tsx`
- Modify: `src/presentation/screens/patients/PatientDetailScreen.tsx` (agregar botón informe PDF)

**Interfaces:**
- Consume: `downloadReportUseCase.execute(patientId, from, to) → filePath`
- Produce: abre el PDF con el visor nativo usando `Linking.openURL`

- [ ] **Step 1: Implementar descarga de PDF en PatientDetailScreen**

```tsx
// Agregar al PatientDetailScreen:
import { Linking, Platform } from 'react-native';
import { useMutation } from '@tanstack/react-query';

// Dentro del componente:
const downloadMutation = useMutation({
  mutationFn: ({ from, to }: { from: string; to: string }) =>
    downloadReportUseCase.execute(patientId, from, to),
  onSuccess: (filePath) => {
    const url = Platform.OS === 'android' ? `file://${filePath}` : filePath;
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'No se pudo abrir el PDF. Revisa la carpeta de Descargas.'));
  },
  onError: (e: any) => Alert.alert('Error', e.message),
});

// Botón (solo visible si isOwner):
{patient.isOwner && (
  <TouchableOpacity style={styles.pdfButton}
    onPress={() => {
      const to = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      downloadMutation.mutate({ from, to });
    }}>
    <Text style={styles.pdfText}>📄 Informe PDF (últimos 30 días)</Text>
  </TouchableOpacity>
)}
```

- [ ] **Step 2: Commit**

```bash
git add cuidalink/appmovil/src/
git commit -m "feat(appmovil/reports): add PDF report download with native viewer"
```

---

### Task 10: Push Notifications (FCM) y HomeScreen

**Files:**
- Create: `src/presentation/screens/home/HomeScreen.tsx`
- Modify: `App.tsx` (agregar setup de FCM al inicio)

**Interfaces:**
- Consume: `authRepo.updateFcmToken(token)` cuando cambia el token FCM
- Produce: manejo de notificaciones en background y foreground

- [ ] **Step 1: Configurar FCM en `App.tsx`**

```tsx
// En App.tsx agregar:
import messaging from '@react-native-firebase/messaging';
import { useInjection } from '@/presentation/hooks/useInjection';

function FcmSetup() {
  const { authRepo } = useInjection();
  const user = useAuthStore((s) => s.user);

  React.useEffect(() => {
    if (!user) return;
    const setup = async () => {
      await messaging().requestPermission();
      const token = await messaging().getToken();
      await authRepo.updateFcmToken(token);
    };
    setup();

    const unsubscribe = messaging().onTokenRefresh((token) => {
      authRepo.updateFcmToken(token);
    });

    return unsubscribe;
  }, [user]);

  return null;
}
// Agregar <FcmSetup /> dentro de QueryClientProvider
```

- [ ] **Step 2: Implementar `HomeScreen`**

```tsx
// src/presentation/screens/home/HomeScreen.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';

export default function HomeScreen({ navigation }: any) {
  const { patientRepo, medicationRepo } = useInjection();
  const user = useAuthStore((s) => s.user);
  const today = new Date().toISOString().split('T')[0];

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientRepo.list(),
  });

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hola, {user?.name} 👋</Text>
      <Text style={styles.subtitle}>Pacientes a tu cargo hoy</Text>
      <FlatList
        data={patients?.filter((p) => p.active)}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}
            onPress={() => navigation.navigate('Pacientes', {
              screen: 'PatientDetail', params: { patientId: item.id }
            })}>
            <Text style={styles.patientName}>{item.fullName}</Text>
            <Text style={styles.role}>{item.isOwner ? '👤 Cuidador principal' : '🤝 Colaborador'}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No tienes pacientes aún.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Pacientes', { screen: 'CreatePatient' })}>
              <Text style={styles.addLink}>Agregar primer paciente →</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  patientName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  role: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#9CA3AF', marginBottom: 12 },
  addLink: { color: '#2563EB', fontWeight: '600' },
});
```

- [ ] **Step 3: Ejecutar todos los tests**

```bash
npm test -- --watchAll=false
```
Esperado: todos PASS

- [ ] **Step 4: Commit final**

```bash
git add cuidalink/appmovil/
git commit -m "feat(appmovil): add HomeScreen, FCM setup and complete mobile app"
```
