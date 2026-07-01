# CuidaLink — Documento de Diseño

**Fecha:** 2026-06-25  
**Estado:** Aprobado por usuario — pendiente implementación  
**Versión:** 1.0

---

## 1. Descripción General

CuidaLink es una aplicación móvil para cuidadores de personas enfermas en el hogar. Permite a un **cuidador principal** gestionar los medicamentos, signos vitales y bitácora diaria de uno o más pacientes, e invitar a **colaboradores** para que le ayuden cuando no está disponible.

### Características principales

- Registro y gestión de pacientes
- Programación de medicamentos con notificaciones push
- Confirmación de medicamentos administrados con escalación al cuidador principal
- Signos vitales configurables por paciente (bitácora diaria)
- Sistema de colaboradores con permisos limitados (código de invitación)
- Generación de informes PDF para presentar al médico tratante

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|---|---|
| App móvil | React Native 0.74 + TypeScript |
| Backend | Java 17 + Spring Boot 3.x |
| Base de datos | PostgreSQL 15 |
| Autenticación | Spring Security + JWT propio (jjwt 0.12, HS256) + BCrypt |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Generación PDF | iText 7 (Java) |
| Scheduler | Spring `@Scheduled` |

---

## 3. Arquitectura Hexagonal

### Principio central

El núcleo de dominio no tiene ninguna dependencia de frameworks externos (Spring, JPA, Firebase). Toda la lógica de negocio reside en clases Java puras, testeables sin infraestructura.

```
        ┌─────────────────────────────────────────┐
        │          ADAPTADORES PRIMARIOS           │
        │   REST Controllers, Tests               │
        └──────────────┬──────────────────────────┘
                       │ llama a
                       ▼
        ┌──────────────────────────────────────────┐
        │            PUERTOS DE ENTRADA            │
        │  CreatePatientUseCase (interface)        │
        │  RegisterMedicationUseCase (interface)   │
        │──────────────────────────────────────────│
        │         NÚCLEO DE DOMINIO                │
        │  Patient, Medication, Vital (entidades)  │
        │  Reglas de negocio puras en Java         │
        │──────────────────────────────────────────│
        │            PUERTOS DE SALIDA             │
        │  PatientRepository (interface)           │
        │  NotificationSender (interface)          │
        │  ReportGenerator (interface)             │
        └──────────────┬───────────────────────────┘
                       │ implementado por
                       ▼
        ┌─────────────────────────────────────────┐
        │         ADAPTADORES SECUNDARIOS          │
        │   JpaPatientRepository                  │
        │   FcmNotificationSender                 │
        │   ITextReportGenerator                  │
        └─────────────────────────────────────────┘
```

### Estructura de carpetas por módulo (backend)

```
com.cuidalink.[modulo]/
├── domain/
│   ├── model/           ← Entidades y Value Objects (Java puro)
│   ├── port/
│   │   ├── in/          ← Interfaces de casos de uso (inbound ports)
│   │   └── out/         ← Interfaces de repositorios/servicios (outbound ports)
│   └── service/         ← Implementaciones de casos de uso
└── adapter/
    ├── in/rest/         ← Controllers REST
    └── out/
        ├── persistence/ ← Implementaciones JPA
        ├── firebase/    ← FCM adapter (solo notificaciones, sin auth)
        └── pdf/         ← iText adapter
```

### Estructura de carpetas (React Native)

```
src/
├── domain/
│   ├── entities/        ← Interfaces/tipos puros (Patient, Medication, Vital)
│   ├── usecases/        ← Interfaces de casos de uso
│   └── repositories/    ← Contratos de repositorios (interfaces)
├── data/
│   ├── repositories/    ← Implementaciones que llaman a la API REST
│   └── datasources/     ← Axios HTTP client
└── presentation/
    ├── screens/         ← Pantallas por módulo
    ├── components/      ← Componentes reutilizables
    └── navigation/      ← React Navigation
```

**Regla de dependencia:** `presentation → domain ← data`. La capa `presentation` nunca importa de `data` directamente.

---

## 4. Modelo de Dominio

### Agregado 1: `User`

```
User
├── id: UserId
├── name: String
├── email: Email              ← Value Object con validación de formato
├── passwordHash: String      ← BCrypt hash de la contraseña
├── fcmToken: FcmToken        ← token para recibir push notifications
└── role: UserRole            ← CAREGIVER (único rol)
```

### Agregado 2: `Patient`

```
Patient
├── id: PatientId
├── fullName: String
├── birthDate: LocalDate
├── gender: Gender
├── healthCondition: String
├── allergies: String
├── emergencyContact: EmergencyContact   ← { name: String, phone: String }
├── primaryCaregiverId: UserId
├── collaborators: List<Collaborator>
│   └── Collaborator { userId: UserId, joinedAt: LocalDateTime }
└── invitationCodes: List<InvitationCode>
    └── InvitationCode { code: String, expiresAt: LocalDateTime, used: boolean }
```

**Reglas:**
- Solo `primaryCaregiverId` puede editar el paciente, agregar medicamentos y definir signos vitales
- Un colaborador no puede ser simultáneamente `primaryCaregiver` del mismo paciente
- `InvitationCode` expira a las 24h y es de un solo uso (8 caracteres alfanuméricos)

### Agregado 3: `Medication`

```
Medication
├── id: MedicationId
├── patientId: PatientId
├── name: String
├── dosage: String                        ← "500mg", "2 pastillas"
├── instructions: String
├── schedule: MedicationSchedule
│   ├── times: List<LocalTime>            ← ej. [08:00, 20:00]
│   ├── frequency: Frequency             ← DAILY | EVERY_X_DAYS | WEEKLY
│   ├── daysOfWeek: List<DayOfWeek>       ← si es WEEKLY
│   └── startDate / endDate: LocalDate
├── active: boolean
└── logs: List<MedicationLog>
    └── MedicationLog
        ├── id: MedicationLogId
        ├── scheduledAt: LocalDateTime
        ├── status: LogStatus            ← PENDING | CONFIRMED | MISSED | SKIPPED | ESCALATED
        ├── administeredBy: UserId
        └── confirmedAt: LocalDateTime
```

**Reglas:**
- Solo `primaryCaregiver` puede crear/editar/desactivar medicamentos
- Colaboradores solo pueden cambiar `PENDING → CONFIRMED` o `PENDING → MISSED`
- Si a los 30 min de `scheduledAt` el log sigue `PENDING`, se escala al `primaryCaregiver` y el status pasa a `ESCALATED`

### Agregado 4: `VitalRecord`

```
VitalSignDefinition             ← configurada por primaryCaregiver, una vez por paciente
├── id: VitalSignDefinitionId
├── patientId: PatientId
├── name: String                ← "Presión arterial", "Temperatura", "Glucosa"
├── unit: String                ← "mmHg", "°C", "mg/dL"
├── normalRangeMin: Double      ← opcional, para alertas visuales
└── normalRangeMax: Double

VitalRecord                     ← entrada registrada en la bitácora diaria
├── id: VitalRecordId
├── patientId: PatientId
├── recordedBy: UserId
├── recordedAt: LocalDateTime
└── measurements: List<VitalMeasurement>
    └── VitalMeasurement
        ├── definitionId: VitalSignDefinitionId
        └── value: String       ← String para soportar "120/80", "36.5", etc.
```

**Reglas:**
- Tanto `primaryCaregiver` como colaboradores pueden registrar `VitalRecord`
- Un `VitalRecord` registrado no se puede editar, solo agregar uno nuevo
- Se muestra alerta visual si el valor está fuera del rango normal definido

### Agregado 5: `Report` (solo lectura)

```
Report                          ← proyección, no persiste en BD
├── patientId: PatientId
├── patientName: String
├── generatedBy: UserId
├── generatedAt: LocalDateTime
├── period: DateRange           ← { from: LocalDate, to: LocalDate }
├── medicationSummary: List<MedicationLogEntry>
│   └── { medicationName, scheduledAt, status, administeredBy }
└── vitalSummary: List<VitalRecordEntry>
    └── { recordedAt, recordedBy, measurements: [{ vitalName, value, unit, outOfRange }] }
```

**Puerto de salida:**
```java
public interface ReportGenerator {
    byte[] generatePdf(Report report);
}
```

**Reglas:**
- Solo `primaryCaregiver` puede generar informes
- Rango máximo: 90 días por informe
- El PDF incluye datos del paciente, tabla de medicamentos con estados y responsables, y tabla de signos vitales con marcadores de valores fuera de rango

---

## 5. API REST

**Base URL:** `https://api.cuidalink.app/api/v1`  
**Autenticación:** Bearer JWT firmado con clave secreta (HS256, jjwt), validado en cada request por `JwtAuthFilter`

### Auth

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|--------|
| `POST` | `/auth/register` | Registro con email y contraseña — retorna JWT | Público |
| `POST` | `/auth/login` | Login con email y contraseña — retorna JWT | Público |
| `POST` | `/auth/fcm-token` | Registra/actualiza token FCM del dispositivo | Autenticado |
| `GET` | `/auth/me` | Datos del usuario autenticado | Autenticado |

### Patients

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|--------|
| `POST` | `/patients` | Crear paciente | Autenticado |
| `GET` | `/patients` | Listar propios + colaborados (`isOwner: boolean`) | Autenticado |
| `GET` | `/patients/:id` | Detalle del paciente | Owner + Colaborador |
| `PUT` | `/patients/:id` | Editar datos del paciente | Solo Owner |
| `PATCH` | `/patients/:id/archive` | Archivar paciente | Solo Owner |

### Collaborators

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|--------|
| `POST` | `/patients/:id/invitations` | Generar código de invitación (8 chars, expira 24h) | Solo Owner |
| `POST` | `/invitations/join` | Unirse con código `{ code }` | Autenticado |
| `GET` | `/patients/:id/collaborators` | Listar colaboradores activos | Solo Owner |
| `DELETE` | `/patients/:id/collaborators/:userId` | Revocar acceso a colaborador | Solo Owner |

### Medications

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|--------|
| `POST` | `/patients/:id/medications` | Crear medicamento con horario | Solo Owner |
| `GET` | `/patients/:id/medications` | Listar medicamentos activos | Owner + Colaborador |
| `GET` | `/patients/:id/medications/:medId` | Detalle de medicamento | Owner + Colaborador |
| `PUT` | `/patients/:id/medications/:medId` | Editar medicamento | Solo Owner |
| `PATCH` | `/patients/:id/medications/:medId/deactivate` | Desactivar medicamento | Solo Owner |

### Medication Logs

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|--------|
| `GET` | `/patients/:id/medication-logs?date=YYYY-MM-DD` | Logs del día | Owner + Colaborador |
| `PATCH` | `/medication-logs/:logId` | Confirmar o marcar como omitido `{ status, notes }` | Owner + Colaborador |

### Vital Signs

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|--------|
| `POST` | `/patients/:id/vital-definitions` | Crear definición de signo vital | Solo Owner |
| `GET` | `/patients/:id/vital-definitions` | Listar definiciones del paciente | Owner + Colaborador |
| `PUT` | `/patients/:id/vital-definitions/:defId` | Editar definición | Solo Owner |
| `DELETE` | `/patients/:id/vital-definitions/:defId` | Eliminar definición | Solo Owner |
| `POST` | `/patients/:id/vital-records` | Registrar mediciones del día | Owner + Colaborador |
| `GET` | `/patients/:id/vital-records?from=&to=` | Historial por rango de fechas | Owner + Colaborador |
| `GET` | `/patients/:id/vital-records/:recordId` | Detalle de un registro | Owner + Colaborador |

### Reports

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|--------|
| `GET` | `/patients/:id/reports/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD` | Genera y descarga PDF (máx 90 días) | Solo Owner |

Responde con `Content-Type: application/pdf`.

---

## 6. Flujos Internos del Backend (Cron Jobs)

### 6.1 Generación diaria de logs de medicamentos

```
1. Cron job ejecuta cada día a las 00:01
2. Para cada Medication activa, por cada hora en schedule.times del día actual:
   a. Crea un MedicationLog con status=PENDING y scheduledAt correspondiente
   b. Envía push FCM al primaryCaregiver y a todos los colaboradores del paciente:
      "💊 [Medicamento] programado para las [hora]"
```

### 6.2 Escalación por confirmación pendiente

```
1. Cron job ejecuta cada 5 minutos
2. Busca MedicationLogs con status=PENDING y scheduledAt < now() - 30min
3. Por cada log encontrado:
   a. Envía push FCM al primaryCaregiver:
      "⚠️ [Medicamento] no fue confirmado a las [hora]"
   b. Cambia status a ESCALATED
   c. Registra evento en log de auditoría
```

---

## 7. Pantallas de la App Móvil

### Estructura de navegación

```
App
├── Stack Público
│   ├── SplashScreen
│   ├── LoginScreen           ← email/password + botón "Continuar con Google"
│   └── RegisterScreen
└── Stack Privado (Bottom Tab Navigator)
    ├── Tab: Inicio
    │   └── HomeScreen        ← resumen del día: meds pendientes + últimas vitales
    ├── Tab: Pacientes
    │   ├── PatientsListScreen
    │   ├── PatientDetailScreen
    │   │   ├── MedicationsTab
    │   │   ├── VitalsTab
    │   │   └── CollaboratorsTab   ← solo visible si isOwner === true
    │   ├── CreatePatientScreen    ← solo Owner
    │   └── EditPatientScreen      ← solo Owner
    ├── Tab: Medicamentos
    │   └── DailyMedsScreen   ← lista del día con botones Confirmar / Omitir
    ├── Tab: Vitales
    │   ├── VitalsHistoryScreen
    │   └── RecordVitalsScreen ← formulario dinámico según definiciones del paciente
    └── Tab: Perfil
        └── ProfileScreen     ← nombre, email, cerrar sesión
```

### Flujos clave

| Flujo | Descripción |
|---|---|
| Confirmar medicamento | `DailyMedsScreen → modal confirmación → PATCH /medication-logs/:id` |
| Registrar vitales | `RecordVitalsScreen → carga definiciones → formulario dinámico → POST /vital-records` |
| Invitar colaborador | `CollaboratorsTab → Generar código → muestra código + expiración + botón copiar` |
| Unirse como colaborador | `HomeScreen → "Tengo un código" → ingresa código → POST /invitations/join` |
| Descargar informe PDF | `PatientDetailScreen → "Informe PDF" → DateRangePicker → GET /reports/pdf → visor nativo` |

---

## 8. Seguridad

| Aspecto | Implementación |
|---|---|
| Autenticación | Backend genera JWT (HS256, jjwt) en login/register → `JwtAuthFilter` valida en cada request |
| Autorización | Verificación en capa de use case: `patient.isOwner(currentUserId)` antes de cualquier mutación |
| HTTPS | Obligatorio en producción |
| Rate limiting | Spring Bucket4j — máx 100 req/min por IP en endpoints públicos |
| Validación de entrada | Bean Validation (`@Valid`) en todos los DTOs de entrada |
| JWT | Firmado con clave secreta HS256, expiración configurable (por defecto 24h) |
| FCM Token | Se renueva en cada login, se invalida en logout |
| Código de invitación | 8 caracteres alfanuméricos aleatorios, expira 24h, un solo uso |
| Datos sensibles | `healthCondition` y `allergies` nunca se loguean en consola ni en errores |

---

## 9. Estrategia de Testing

### Backend (Java)

| Tipo | Herramienta | Qué cubre |
|---|---|---|
| Unit tests | JUnit 5 + Mockito | Use cases del dominio en memoria (sin Spring, sin DB) |
| Integration tests | Spring Boot Test + Testcontainers (PostgreSQL) | Adapters JPA contra BD real |
| API tests | MockMvc | Endpoints completos con contexto Spring levantado |

### React Native

| Tipo | Herramienta | Qué cubre |
|---|---|---|
| Unit tests | Jest | Use cases y mappers del dominio |
| Component tests | React Native Testing Library | Pantallas con repositorios mockeados |
| E2E | Detox | Flujos críticos: login, confirmar medicamento, registrar vitales |

---

## 10. Módulos del Backend (resumen)

| Módulo | Responsabilidad |
|---|---|
| `auth` | Registro, login con BCrypt, generación y validación de JWT propio, gestión de FCM tokens |
| `patient` | CRUD de pacientes, colaboradores, códigos de invitación |
| `medication` | CRUD de medicamentos, programación, generación de logs diarios |
| `vital` | Definiciones configurables, registro de mediciones |
| `notification` | Envío FCM, cron de escalación, log de auditoría |
| `report` | Proyección de datos, generación PDF con iText 7 |
