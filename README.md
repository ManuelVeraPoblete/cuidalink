# CuidaLink

App de gestión de cuidado en el hogar. Un cuidador principal administra medicamentos, signos vitales y registros diarios de sus pacientes, y puede invitar colaboradores con acceso limitado de escritura.

---

## Estructura del repositorio

```
cuidalink/
├── backend/     ← Java 17 + Spring Boot 3.2 + Maven       ✅ Completo
├── appmovil/    ← React Native 0.86 + TypeScript strict    ✅ Completo
└── docs/        ← Spec de diseño y planes de implementación
```

---

## Stack tecnológico

### Backend

| Capa | Tecnología |
|---|---|
| Lenguaje | Java 17 |
| Framework | Spring Boot 3.2, Spring Security, Spring Data JPA |
| Base de datos | PostgreSQL 15 (local, sin Docker) |
| Autenticación | Firebase Authentication (Email/Password + Google OAuth) |
| Push | Firebase Cloud Messaging (FCM) |
| PDF | iText 7.2.5 |
| Rate limiting | Bucket4j 8.7 |
| Tests | JUnit 5, Mockito, Testcontainers |

### App Móvil

| Capa | Tecnología |
|---|---|
| Framework | React Native 0.86 + TypeScript 5 (strict) |
| Navegación | React Navigation 6 (stack + bottom tabs) |
| Estado auth | Zustand 5 (solo auth state) |
| Datos remotos | TanStack Query 5 (`staleTime: 60_000`) |
| HTTP | Axios 1.x + interceptor Bearer token |
| Formularios | React Hook Form 7 + Zod 3 |
| Auth | Firebase Authentication (`@react-native-firebase/auth`) |
| Push | Firebase Cloud Messaging (`@react-native-firebase/messaging`) |
| PDF download | react-native-blob-util |
| Tests | Jest + React Native Testing Library |

---

## Arquitectura hexagonal estricta

Cada módulo sigue la estructura:

```
com.cuidalink.<módulo>/
├── domain/
│   ├── model/       ← Java records/clases puras — SIN Spring, SIN JPA
│   ├── port/in/     ← Interfaces de casos de uso (puertos de entrada)
│   ├── port/out/    ← Interfaces de repositorios/servicios (puertos de salida)
│   └── service/     ← Implementaciones de casos de uso (@Service)
└── adapter/
    ├── in/rest/     ← @RestController + DTOs
    └── out/
        ├── persistence/   ← Entidades JPA + adaptadores de repositorio
        ├── firebase/      ← Adaptadores FCM / FirebaseVerifier
        └── pdf/           ← Adaptador iText 7
```

**Regla dura:** `domain/model/` y `domain/service/` nunca importan `jakarta.persistence`, `org.springframework.data`, ni clases de Firebase.

---

## Módulos implementados

### auth
Registro y autenticación de usuarios via Firebase JWT.

**Dominio:** `User`, `UserId`, `Email`, `FcmToken`, `UserRole`

**Casos de uso:** `RegisterUserUseCase`, `AuthenticateUserUseCase`, `UpdateFcmTokenUseCase`

**Endpoints:**
```
POST /api/v1/auth/register          Registrar nuevo usuario (Email/Password)
POST /api/v1/auth/google            Autenticar con Google OAuth
PUT  /api/v1/auth/fcm-token         Actualizar token FCM
```

---

### patient
Gestión de pacientes, colaboradores y códigos de invitación.

**Dominio:** `Patient`, `PatientId`, `Collaborator`, `InvitationCode`, `EmergencyContact`, `Gender`

**Casos de uso:** `CreatePatientUseCase`, `FindPatientUseCase`, `UpdatePatientUseCase`, `ArchivePatientUseCase`, `ListPatientsUseCase`, `GenerateInvitationUseCase`, `JoinWithCodeUseCase`, `ListCollaboratorsUseCase`, `RevokeCollaboratorUseCase`

**Reglas:**
- Solo el `primaryCaregiver` (owner) puede crear/editar pacientes y gestionar colaboradores
- `InvitationCode`: 8 caracteres alfanuméricos mayúsculas, expira en 24h, de un solo uso
- `healthCondition` y `allergies` nunca se exponen en logs ni en mensajes de error

**Endpoints:**
```
GET    /api/v1/patients                        Listar pacientes del usuario autenticado
POST   /api/v1/patients                        Crear paciente
GET    /api/v1/patients/{id}                   Obtener paciente
PUT    /api/v1/patients/{id}                   Actualizar paciente
DELETE /api/v1/patients/{id}                   Archivar paciente (soft delete)

POST   /api/v1/patients/{id}/invitations       Generar código de invitación
POST   /api/v1/patients/join                   Unirse como colaborador con código

GET    /api/v1/patients/{id}/collaborators     Listar colaboradores
DELETE /api/v1/patients/{id}/collaborators/{uid}  Revocar colaborador
```

---

### medication
Medicamentos activos y logs diarios de administración.

**Dominio:** `Medication`, `MedicationId`, `MedicationLog`, `MedicationLogId`, `MedicationSchedule`, `Frequency`, `LogStatus`

**Casos de uso:** `CreateMedicationUseCase`, `GetMedicationUseCase`, `ListMedicationsUseCase`, `UpdateMedicationUseCase`, `DeactivateMedicationUseCase`, `GetDailyMedicationLogsUseCase`, `ConfirmMedicationLogUseCase`

**Frecuencias soportadas:** `DAILY`, `EVERY_X_DAYS` (con `intervalDays`), `WEEKLY` (con `daysOfWeek`)

**Estados de log:** `PENDING` → `CONFIRMED` | `MISSED` | `SKIPPED` | `ESCALATED`

**Reglas:**
- Solo el owner puede crear/editar/desactivar medicamentos
- Colaboradores pueden confirmar/marcar como perdido un log
- Si un log sigue en `PENDING` 30 min después de `scheduledAt`, el scheduler lo escala a `ESCALATED` y envía push al owner
- Los logs diarios se generan a las 00:01 por el scheduler; la operación es idempotente

**Endpoints:**
```
GET    /api/v1/patients/{id}/medications                   Listar medicamentos
POST   /api/v1/patients/{id}/medications                   Crear medicamento
GET    /api/v1/patients/{id}/medications/{medId}           Obtener medicamento
PUT    /api/v1/patients/{id}/medications/{medId}           Actualizar medicamento
DELETE /api/v1/patients/{id}/medications/{medId}           Desactivar medicamento

GET    /api/v1/patients/{id}/medication-logs?date=YYYY-MM-DD  Logs del día
PATCH  /api/v1/patients/{id}/medication-logs/{logId}          Confirmar/marcar log
```

---

### vital
Definiciones de signos vitales y registros inmutables.

**Dominio:** `VitalSignDefinition`, `VitalSignDefinitionId`, `VitalRecord`, `VitalRecordId`, `VitalMeasurement`

**Casos de uso:** `CreateVitalDefinitionUseCase`, `ListVitalDefinitionsUseCase`, `UpdateVitalDefinitionUseCase`, `DeleteVitalDefinitionUseCase`, `RecordVitalsUseCase`, `ListVitalRecordsUseCase`, `GetVitalRecordUseCase`

**Reglas:**
- `VitalRecord` es inmutable una vez creado — para corregir se crea un nuevo registro
- Owner define las definiciones; colaboradores pueden registrar mediciones

**Endpoints:**
```
GET    /api/v1/patients/{id}/vital-definitions             Listar definiciones
POST   /api/v1/patients/{id}/vital-definitions             Crear definición
PUT    /api/v1/patients/{id}/vital-definitions/{defId}     Actualizar definición
DELETE /api/v1/patients/{id}/vital-definitions/{defId}     Eliminar definición

GET    /api/v1/patients/{id}/vital-records                 Listar registros (filtro por rango de fechas)
POST   /api/v1/patients/{id}/vital-records                 Registrar mediciones
GET    /api/v1/patients/{id}/vital-records/{recId}         Obtener registro
```

---

### notification
Scheduler de logs diarios y escalación de logs pendientes vía FCM.

**`DailyMedicationLogScheduler`** — Cron `0 1 0 * * *` (00:01 cada día)
- Itera todos los medicamentos activos
- Calcula si corresponde el día según la frecuencia (`EVERY_X_DAYS` usa `intervalDays`)
- Crea un `MedicationLog` en estado `PENDING` por cada horario del día
- Operación idempotente: verifica `existsByMedicationIdAndScheduledAt` antes de crear

**`EscalationScheduler`** — `fixedDelay=300_000` (cada 5 minutos)
- Busca logs en estado `PENDING` con `scheduledAt < now - 30 min`
- Los cambia a `ESCALATED` y envía push FCM al owner del paciente

---

### report
Generación de reportes PDF con iText 7.

**Dominio:** `Report`, `DateRange`, `MedicationLogEntry`, `VitalRecordEntry`, `VitalMeasurementEntry`

**Reglas:**
- Solo el owner puede generar reportes
- Rango máximo: 90 días
- `healthCondition` y `allergies` no aparecen en el PDF

**Endpoints:**
```
GET /api/v1/patients/{id}/reports/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD   Descargar PDF
```

---

### config
Configuración transversal de seguridad.

- **`SecurityConfig`** — CORS, filtro JWT, rutas públicas (`/auth/**`)
- **`JwtAuthFilter`** — valida el Bearer token con Firebase Admin SDK
- **`GlobalExceptionHandler`** — `IllegalArgumentException` → 400, `IllegalStateException` → 409, `Exception` → 500
- **`RateLimitFilter`** — Bucket4j por IP (100 req/min), aplica a todas las rutas
- **`FirebaseConfig`** — inicializa Firebase Admin SDK desde `firebase-service-account.json`

**Autorización:** El ownership se verifica en la capa de servicio (no en controllers). Si se deniega el acceso, se lanza `IllegalArgumentException` → HTTP 400.

---

## Base de datos

**PostgreSQL 15 — base de datos:** `cuidalink`

El DDL completo está en `backend/src/main/resources/schema.sql`.

### Tablas

| Tabla | Descripción |
|---|---|
| `users` | Usuarios Firebase registrados |
| `patients` | Pacientes con datos clínicos sensibles |
| `patient_collaborators` | Colaboradores de cada paciente |
| `patient_invitation_codes` | Códigos de invitación (8 chars, 24h, single-use) |
| `medications` | Medicamentos con schedule embebido |
| `medication_logs` | Logs diarios (UNIQUE por medicamento+hora para idempotencia) |
| `vital_definitions` | Definiciones de signos vitales por paciente |
| `vital_records` | Registros inmutables de mediciones (TEXT serializado) |

### Relaciones

```
users ──< patients (primary_caregiver_id)
patients ──< patient_collaborators (patient_id)
patients ──< patient_invitation_codes (patient_id)
patients ──< medications (patient_id)
medications ──< medication_logs (medication_id)
patients ──< medication_logs (patient_id, desnormalizado)
patients ──< vital_definitions (patient_id)
patients ──< vital_records (patient_id)
```

### Índices destacados

| Índice | Tabla | Propósito |
|---|---|---|
| `idx_users_firebase_uid` | `users` | Lookup en cada request autenticado |
| `idx_med_log_patient_scheduled` | `medication_logs` | Logs del día + reportes |
| `idx_med_log_status_scheduled` | `medication_logs` | EscalationScheduler (cada 5 min) |
| `uq_med_logs_med_scheduled` | `medication_logs` | Idempotencia del DailyScheduler |
| `idx_invite_code` | `patient_invitation_codes` | Lookup de código al hacer join |
| `idx_collab_user` | `patient_collaborators` | findAllForUser (LEFT JOIN) |

---

## Configuración

### `application.properties`

```properties
server.port=8080
server.servlet.context-path=/api/v1

spring.datasource.url=jdbc:postgresql://localhost:5432/cuidalink
spring.datasource.username=postgres
spring.datasource.password=postgres

spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

firebase.service-account-path=classpath:firebase-service-account.json
```

### Firebase

Reemplazar `backend/src/main/resources/firebase-service-account.json` con las credenciales reales del proyecto Firebase (archivo descargado desde Firebase Console → Project Settings → Service Accounts).

---

## Comandos

```bash
cd cuidalink/backend

# Compilar
mvn compile -q

# Tests unitarios y de controller (no requieren Docker)
mvn test -Dtest='!AuthIntegrationTest,!PatientIntegrationTest,!MedicationIntegrationTest,!VitalIntegrationTest' -q

# Todos los tests (requiere Docker para Testcontainers)
mvn test -q

# Correr la app (requiere PostgreSQL en localhost:5432)
mvn spring-boot:run

# Empaquetar
mvn package -q
```

---

## Crear la base de datos

```bash
# Crear la base de datos
PGPASSWORD=postgres psql -U postgres -h localhost -c "CREATE DATABASE cuidalink ENCODING='UTF8' LC_COLLATE='es_ES.UTF-8' LC_CTYPE='es_ES.UTF-8' TEMPLATE=template0;"

# Ejecutar el DDL completo (tablas, FKs, índices)
PGPASSWORD=postgres psql -U postgres -h localhost -d cuidalink -f backend/src/main/resources/schema.sql
```

---

## Tests

**Tests unitarios (JUnit 5 + Mockito):** prueban los servicios de dominio en aislamiento, sin Spring context.

**Tests de controller (`@WebMvcTest`):** prueban los controladores REST con MockMvc y beans de casos de uso mockeados.

**Tests de integración (Testcontainers):** levantan PostgreSQL real via `@DynamicPropertySource`. Requieren Docker Engine instalado.

```
backend/src/test/java/com/cuidalink/
├── auth/domain/service/AuthServiceTest.java          (3 tests)
├── auth/adapter/in/rest/AuthControllerTest.java       (1 test)
├── patient/domain/service/PatientServiceTest.java     (4 tests)
├── medication/domain/service/MedicationServiceTest.java (6 tests)
├── vital/domain/service/VitalServiceTest.java         (9 tests)
├── report/domain/service/ReportServiceTest.java       (3 tests)
├── notification/scheduler/EscalationSchedulerTest.java (1 test)
├── AuthIntegrationTest.java       ← requiere Docker
├── PatientIntegrationTest.java    ← requiere Docker
├── MedicationIntegrationTest.java ← requiere Docker
└── VitalIntegrationTest.java      ← requiere Docker
```

**27 tests unitarios/controller — todos verdes.**

---

## App Móvil

### Arquitectura hexagonal estricta (Mobile)

```
appmovil/src/
├── domain/
│   ├── entities/      ← Interfaces TypeScript puras — SIN Axios, SIN Firebase
│   ├── repositories/  ← Contratos de repositorios (interfaces)
│   └── usecases/      ← Lógica de negocio pura
├── data/
│   ├── http/          ← apiClient Axios + interceptor Bearer token
│   └── repositories/  ← ApiXxxRepository implementan contratos del dominio
└── presentation/
    ├── navigation/    ← RootNavigator → AuthNavigator / AppNavigator (5 tabs)
    ├── stores/        ← authStore.ts (Zustand — solo auth state)
    ├── hooks/         ← useInjection.ts (DI: conecta repositorios con use cases)
    ├── components/    ← MedicationCard, VitalCard, CollaboratorsSection, DateRangePicker, JoinCodeDialog
    └── screens/       ← auth/, home/, patients/, medications/, vitals/, profile/
```

**Regla dura:** `presentation/` nunca importa de `data/` — solo de `domain/`. La única excepción es `useInjection.ts` que es el punto de inyección de dependencias.

**Estado:**
- Zustand: solo auth state (`user`, `isLoading`, `selectedPatientId`)
- TanStack Query: todos los datos remotos (`staleTime: 60_000`)
- Formularios: React Hook Form + Zod

### Pantallas implementadas

| Módulo | Pantallas |
|--------|-----------|
| Auth | LoginScreen, RegisterScreen |
| Home | HomeScreen (bienvenida + lista de pacientes) |
| Patients | PatientsListScreen, PatientDetailScreen (tabs), CreatePatientScreen, EditPatientScreen |
| Medications | DailyMedsScreen + MedicationCard (confirm/miss) |
| Vitals | RecordVitalsScreen (form dinámico), VitalsHistoryScreen + VitalCard |
| Reports | DateRangePicker + descarga PDF via react-native-blob-util |
| Profile | ProfileScreen |

### Reglas de dominio aplicadas

- Solo el owner puede crear/editar medicamentos, gestionar colaboradores, descargar reportes
- Colaboradores pueden: confirmar/marcar como perdido logs, registrar mediciones vitales
- `healthCondition` y `allergies` nunca aparecen en mensajes de error ni en logs
- `VitalRecord` es inmutable — sin acción de edición en la UI
- Rango máximo de reportes: 90 días (validado en `DownloadReportUseCase`)
- `InvitationCode`: 8 caracteres alfanuméricos, expira 24h, de un solo uso

### Tests (Mobile)

**11 tests — todos verdes.**

```
appmovil/
├── __tests__/App.test.tsx
├── src/domain/usecases/auth/__tests__/LoginUseCase.test.ts
├── src/data/repositories/__tests__/ApiAuthRepository.test.ts
├── src/presentation/screens/auth/__tests__/LoginScreen.test.tsx
├── src/presentation/screens/home/__tests__/HomeScreen.test.tsx
├── src/presentation/screens/patients/__tests__/PatientsListScreen.test.tsx
├── src/presentation/screens/medications/__tests__/DailyMedsScreen.test.tsx
└── src/presentation/screens/vitals/__tests__/RecordVitalsScreen.test.tsx
```

### Comandos (Mobile)

```bash
cd cuidalink/appmovil

# Configuración inicial
cp .env.example .env          # ajustar API_BASE_URL=http://localhost:8080
npm install
cd ios && pod install && cd .. # solo iOS

# Desarrollo
npx react-native start         # Metro bundler
npx react-native run-android
npx react-native run-ios

# Tests
npm test                       # todos los tests (11)
npm test -- --watchAll=false   # una sola pasada
npx tsc --noEmit               # verificación de tipos (0 errores)
```

---

## Pendientes para producción

### Backend
- [ ] Reemplazar `backend/src/main/resources/firebase-service-account.json` con credenciales reales
- [ ] Instalar Docker Engine para correr los tests de integración con Testcontainers
- [ ] Configurar variables de entorno para credenciales (no hardcodear en `application.properties`)

### App Móvil
- [ ] Crear `appmovil/.env` con `API_BASE_URL` apuntando al backend en producción
- [ ] Configurar `google-services.json` (Android) y `GoogleService-Info.plist` (iOS) con el proyecto Firebase real
- [ ] Instalar pods iOS: `cd appmovil/ios && pod install`
- [ ] Implementar `ProfileScreen` con botón de cierre de sesión
- [ ] Solicitar permisos de notificación en iOS (Info.plist)
