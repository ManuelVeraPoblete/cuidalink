# Módulo "Tareas" (CareTask) — programación y ejecución diaria

**Fecha:** 2026-07-07
**Módulos:** `backend` (nuevo hexágono `caretask`) — `appmovil` (`presentation/screens/tasks`)

## Contexto

En `PatientDetailScreen`, la tarjeta "Tareas" (subtítulo "Cuidados diarios") navega hoy a
`ComingSoonScreen`. No existe módulo de backend, tabla ni pantalla real para tareas. El usuario
proporcionó dos mockups a seguir de forma exacta:

1. **"Programar tarea"**: formulario de creación (nombre, hora, tipo de programación — días de la
   semana o rango de fechas —, instrucciones, prioridad, recordatorio activo).
2. **"Tareas"**: lista de tareas del día con filtros (Todas/Pendientes/Realizadas), tarjetas con
   ícono, hora, indicaciones y badge de estado (Pendiente/Realizada), botón "Agregar tarea".

La pantalla 2 implica estado diario por tarea (pendiente → realizada), no solo una definición
estática. Esto es estructuralmente idéntico a lo que ya existe para `medication`/`medication_logs`
(`MedicationSchedule` + `MedicationLog` generado por cron + confirmación). Este diseño replica ese
mismo patrón para tareas, con las simplificaciones que el mockup exige (sin dosis, sin tipo de
medicamento, un solo estado de "completado" en vez de Confirmado/Omitido/Escalado).

## Alcance

**Incluye:**
- Nuevo hexágono backend `com.cuidalink.caretask`: dominio `CareTask` + `CareTaskLog`, casos de uso,
  adaptadores REST y JPA, siguiendo exactamente el patrón de `medication`.
- Cron que genera los `CareTaskLog` del día a las 00:01 (mirror de `DailyMedicationLogScheduler`).
- Scheduler de recordatorio: si `reminderActive=true`, envía push FCM al cuidador principal cuando
  llega la hora programada y el log sigue `PENDING` (mirror de `EscalationScheduler`, pero disparado
  a la hora exacta en vez de 30 min después).
- Tablas nuevas `care_tasks` y `care_task_logs` en `schema.sql`.
- Pantallas `appmovil`: `CreateTaskScreen` ("Programar tarea") y `TasksScreen` ("Tareas"), entidades,
  repositorio, DI, rutas nuevas en `AppNavigator`.
- La tarjeta "Tareas" de `PatientDetailScreen` deja de ir a `ComingSoon` y navega a `Tasks`.
- Tests backend (unit + integración) y frontend (Jest/RNTL) de todo lo nuevo.

**No incluye (fuera de alcance, trabajo futuro):**
- Pantalla de detalle de una tarea individual (el chevron ">" de las tarjetas solo abre el modal de
  "marcar como realizada" cuando está pendiente; no hay pantalla de detalle separada, porque no fue
  provista en los mockups).
- Editar/desactivar una tarea desde la UI (el backend expone `PUT`/`deactivate`, igual que
  medicamentos, pero no se construye pantalla de edición en esta iteración — mismo criterio que se
  usó para otras tarjetas de "Plan de cuidado").
- Estado "Omitida"/"MISSED" — el mockup solo muestra Pendiente/Realizada.
- Selector de otra fecha distinta de "hoy" en `TasksScreen` (el chip de fecha es informativo, igual
  que en `DailyMedsScreen` hoy).
- Fotos de paciente reales (se sigue usando el ícono `person` como en el resto de la app).

## Diseño — Backend

### 1. Dominio (`com.cuidalink.caretask.domain.model`)

```java
public enum CareTaskPriority { LOW, MEDIUM, HIGH }
public enum CareTaskScheduleType { DAYS_OF_WEEK, DATE_RANGE }
public enum CareTaskLogStatus { PENDING, DONE }

public record CareTaskSchedule(
    LocalTime time,
    CareTaskScheduleType scheduleType,
    List<DayOfWeek> daysOfWeek,   // no vacío si DAYS_OF_WEEK; [] si DATE_RANGE
    LocalDate startDate,          // DAYS_OF_WEEK: fecha de creación (recurrencia indefinida desde ahí)
    LocalDate endDate             // DAYS_OF_WEEK: null; DATE_RANGE: obligatorio
) {
    // validación en el constructor compacto, mismo estilo que MedicationSchedule.fromDailyInterval:
    // - time obligatorio
    // - DAYS_OF_WEEK requiere daysOfWeek no vacío
    // - DATE_RANGE requiere startDate y endDate, con endDate >= startDate
}
```

`CareTask` (clase, no record — mismo motivo que `Medication`: tiene mutación vía `update`/
`deactivate`): `id`, `patientId`, `name`, `instructions`, `schedule`, `priority`, `reminderActive`,
`active`.

`CareTaskLog` (clase, mismo patrón que `MedicationLog`): `id`, `careTaskId`, `patientId`,
`scheduledAt`, `status`, `completedBy` (`UserId`, nullable), `completedAt` (nullable). Método
`complete(UserId completedBy)`: valida `status == PENDING` (si no, `IllegalStateException`), setea
`DONE`, `completedBy`, `completedAt = now()`. A diferencia de `MedicationLog.confirm`, no recibe un
`newStatus` porque solo hay una transición posible.

`shouldRunToday(CareTaskSchedule schedule, LocalDate today)` (método estático o en el scheduler,
igual que `DailyMedicationLogScheduler.shouldRunToday`):
```java
switch (schedule.scheduleType()) {
    case DAYS_OF_WEEK -> schedule.daysOfWeek().contains(today.getDayOfWeek())
                         && !today.isBefore(schedule.startDate());
    case DATE_RANGE   -> !today.isBefore(schedule.startDate()) && !today.isAfter(schedule.endDate());
}
```

### 2. Puertos y casos de uso

`port/out`: `CareTaskRepository` (`save`, `findById`, `findByPatientId`, `findAllActive`),
`CareTaskLogRepository` (`save`, `findById`, `findByPatientIdAndDate`,
`existsByCareTaskIdAndScheduledAt`, `findPendingAt(LocalDateTime)` — para el scheduler de
recordatorio).

`port/in` (una interfaz por caso de uso, mismo estilo que `medication`):
`CreateCareTaskUseCase`, `ListCareTasksUseCase`, `GetCareTaskUseCase`, `UpdateCareTaskUseCase`,
`DeactivateCareTaskUseCase`, `GetDailyCareTaskLogsUseCase`, `CompleteCareTaskLogUseCase`.

`CareTaskService implements` las 7 interfaces (mismo patrón que `MedicationService`).
Autorización — mismo criterio que medicamentos, porque definir el plan de cuidado es responsabilidad
del cuidador principal:
- `create`/`update`/`deactivate`: requiere `patient.isOwner(requesterId)`.
- `list`/`get`/`getLogs`/`complete`: requiere `patient.hasAccess(requesterId)` (owner o colaborador).

### 3. Adaptador REST

`CareTaskController` (mirror de `MedicationController`):
```
POST   /patients/{patientId}/tasks
GET    /patients/{patientId}/tasks
GET    /patients/{patientId}/tasks/{taskId}
PUT    /patients/{patientId}/tasks/{taskId}
PATCH  /patients/{patientId}/tasks/{taskId}/deactivate
```

`CareTaskLogController` (mirror de `MedicationLogController`, ruta plana igual que
`/medication-logs`):
```
GET    /patients/{patientId}/task-logs?date=YYYY-MM-DD
PATCH  /task-logs/{logId}/complete
```

DTOs: `CreateCareTaskRequest`, `UpdateCareTaskRequest`, `CareTaskScheduleDto`, `CareTaskResponse`,
`CareTaskLogResponse` — mismos records simples que sus equivalentes en `medication`. `complete` no
lleva body (a diferencia de `ConfirmLogRequest`, porque solo existe una transición).

`toScheduleDomain` (helper del controller, mismo rol que en `MedicationController`): si
`scheduleType == DAYS_OF_WEEK` y el DTO no trae `startDate` (el formulario no lo pide en ese modo),
se usa `LocalDate.now()` — la recurrencia semanal arranca el día de creación. Si
`scheduleType == DATE_RANGE`, `startDate`/`endDate` vienen del DTO tal cual y son obligatorios.

Errores: reutiliza `GlobalExceptionHandler` existente (`IllegalArgumentException` → 400). No se
agrega manejo nuevo.

### 4. Persistencia (JPA)

`CareTaskJpaEntity` (tabla `care_tasks`) y `CareTaskLogJpaEntity` (tabla `care_task_logs`), con sus
`JpaCareTaskRepositoryAdapter`/`JpaCareTaskLogRepositoryAdapter` y `SpringCareTaskRepository`/
`SpringCareTaskLogRepository`, mismo estilo mapper manual que `JpaMedicationRepositoryAdapter`
(`daysOfWeek` serializado como CSV, igual que hoy).

`schema.sql` — se agregan al final del archivo (antes de la sección de índices):

```sql
CREATE TABLE care_tasks (
    id                      VARCHAR(36)  PRIMARY KEY,
    patient_id              VARCHAR(36)  NOT NULL,
    name                    VARCHAR(255) NOT NULL,
    instructions            TEXT,
    priority                VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    reminder_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    active                  BOOLEAN      NOT NULL DEFAULT TRUE,

    schedule_time           VARCHAR(5)   NOT NULL,              -- "HH:mm"
    schedule_type           VARCHAR(20)  NOT NULL,              -- DAYS_OF_WEEK | DATE_RANGE
    schedule_days_of_week   VARCHAR(255),                       -- "MONDAY,FRIDAY" (solo DAYS_OF_WEEK)
    schedule_start_date     DATE         NOT NULL,
    schedule_end_date       DATE,                               -- solo DATE_RANGE

    CONSTRAINT fk_care_tasks_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
);

CREATE TABLE care_task_logs (
    id                  VARCHAR(36)  PRIMARY KEY,
    care_task_id        VARCHAR(36)  NOT NULL,
    patient_id          VARCHAR(36)  NOT NULL,
    scheduled_at        TIMESTAMP    NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    completed_by_id     VARCHAR(36),
    completed_at        TIMESTAMP,

    CONSTRAINT fk_task_logs_task    FOREIGN KEY (care_task_id) REFERENCES care_tasks (id),
    CONSTRAINT fk_task_logs_patient FOREIGN KEY (patient_id)   REFERENCES patients (id),
    CONSTRAINT uq_task_logs_task_scheduled UNIQUE (care_task_id, scheduled_at)
);

CREATE INDEX idx_care_tasks_patient          ON care_tasks (patient_id);
CREATE INDEX idx_care_tasks_active           ON care_tasks (active);
CREATE INDEX idx_task_log_patient_scheduled  ON care_task_logs (patient_id, scheduled_at);
CREATE INDEX idx_task_log_status_scheduled   ON care_task_logs (status, scheduled_at);
CREATE INDEX idx_task_log_task               ON care_task_logs (care_task_id);
```

(Hibernate `ddl-auto` genera el esquema real; `schema.sql` queda como documentación, igual que hoy.)

### 5. Schedulers (`com.cuidalink.notification.scheduler`)

`DailyCareTaskLogScheduler` — `@Scheduled(cron = "0 1 0 * * *")`, mismo cron que
`DailyMedicationLogScheduler`. Para cada `CareTask` activa donde `shouldRunToday(...)` es verdadero,
crea un `CareTaskLog` con `scheduledAt = today.atTime(schedule.time())` si no existe ya
(`existsByCareTaskIdAndScheduledAt`).

`CareTaskReminderScheduler` — `@Scheduled(fixedDelay = 60_000)` (cada minuto). Busca logs
`PENDING` con `scheduledAt` igual al minuto actual truncado (`findPendingAt(now)`); para cada uno,
carga la `CareTask` — si `reminderActive`, busca el paciente y su `primaryCaregiver`, y si tiene
`fcmToken` le envía un push ("Tarea pendiente" / `task.getName()` + hora), reutilizando
`NotificationSender` existente. No cambia el estado del log (a diferencia de `escalate()`); es solo
una notificación puntual.

## Diseño — Frontend (`appmovil`)

### 1. Entidades (`src/domain/entities`)

`CareTask.ts`:
```ts
export type CareTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type CareTaskScheduleType = 'DAYS_OF_WEEK' | 'DATE_RANGE';

export interface CareTaskSchedule {
  time: string;                 // "HH:mm"
  scheduleType: CareTaskScheduleType;
  daysOfWeek: string[];         // nombres DayOfWeek, solo DAYS_OF_WEEK
  startDate: string;
  endDate: string | null;
}

export interface CareTask {
  id: string;
  patientId: string;
  name: string;
  instructions: string;
  priority: CareTaskPriority;
  reminderActive: boolean;
  schedule: CareTaskSchedule;
  active: boolean;
}
```

`CareTaskLog.ts`:
```ts
export type CareTaskLogStatus = 'PENDING' | 'DONE';

export interface CareTaskLog {
  id: string;
  careTaskId: string;
  taskName: string;
  instructions: string;
  priority: CareTaskPriority;
  scheduledAt: string;
  status: CareTaskLogStatus;
}
```

Se agregan los `export *` correspondientes en `entities/index.ts`.

### 2. Repositorio (`domain/repositories/CareTaskRepository.ts` + `data/repositories/ApiCareTaskRepository.ts`)

```ts
export interface CreateCareTaskData {
  name: string;
  instructions: string;
  priority: CareTaskPriority;
  reminderActive: boolean;
  time: string;
  scheduleType: CareTaskScheduleType;
  daysOfWeek: string[];
  startDate: string | null;   // solo DATE_RANGE
  endDate: string | null;     // solo DATE_RANGE
}

export interface CareTaskRepository {
  listTasks(patientId: string): Promise<CareTask[]>;
  createTask(patientId: string, data: CreateCareTaskData): Promise<CareTask>;
  getDailyLogs(patientId: string, date: string): Promise<CareTaskLog[]>;
  completeLog(logId: string): Promise<CareTaskLog>;
}
```

`ApiCareTaskRepository` implementa contra `/patients/{id}/tasks`, `/patients/{id}/task-logs?date=`,
`/task-logs/{logId}/complete` (mismo patrón `axios` que `ApiMedicationRepository`). Se agrega
`careTaskRepo` a `useInjection.ts`.

### 3. Utilidad de ícono por palabra clave (`domain/utils/careTaskDisplay.ts`)

Los mockups muestran íconos distintos por tarea ("Tomar presión" → clipboard, "Dar desayuno" →
comida, "Cambiar apósito" → curación, "Ejercicios de movilidad" → actividad física), pero el
formulario de creación no pide categoría/ícono. Se deriva por palabras clave del nombre, función pura
y testeable:

```ts
export function pickTaskIcon(name: string): { icon: keyof typeof Ionicons.glyphMap; color: string } {
  const n = name.toLowerCase();
  if (/(presión|presion|glicemia|glucosa|temperatura|signos)/.test(n))
    return { icon: 'clipboard', color: '#2f6fed' };
  if (/(desayuno|almuerzo|cena|comida|alimentaci)/.test(n))
    return { icon: 'restaurant', color: '#f5a623' };
  if (/(apósito|aposito|curaci|herida|venda)/.test(n))
    return { icon: 'bandage', color: '#e74c3c' };
  if (/(ejercicio|movilidad|caminar|terapia)/.test(n))
    return { icon: 'walk', color: '#16a085' };
  return { icon: 'checkbox', color: '#7c5cfc' };  // mismo morado que la tarjeta "Tareas" hoy
}
```

### 4. `TasksScreen.tsx` (pantalla "Tareas")

Reutiliza casi 1:1 la estructura de `DailyMedsScreen.tsx` (header, título, subtítulo, `dateChip`
"Hoy | {fecha}", tabs, `FlatList` con `ListHeaderComponent`/`ListFooterComponent`):

- Título "Tareas", subtítulo "Tareas programadas para hoy".
- `dateChip` con la fecha de hoy (`toLocaleDateString('es-CL', {day, month:'long', year})`).
- Tabs `Todas` / `Pendientes` / `Realizadas` (mismo componente visual que `tabsRow` de
  `DailyMedsScreen`, filtro local sobre `status`).
- `TaskCard` por cada log (ver componente abajo).
- Footer: botón "Agregar tarea" → `navigation.navigate('CreateTask')`.
- `TaskActionModal` para marcar como realizada al tocar una tarjeta `PENDING`.
- Si no hay `selectedPatientId`: mismo mensaje que `DailyMedsScreen`
  ("Selecciona un paciente desde Inicio → Mis pacientes.").

### 5. `TaskCard.tsx` (nuevo componente, mirror de `MedicationCard.tsx`)

Tarjeta con: ícono cuadrado (color/ícono de `pickTaskIcon`), nombre + badge de estado
(`Pendiente` ámbar / `Realizada` verde, mismos colores que `STATUS_BADGE` de `MedicationCard`), fila
inferior con dos columnas "Hora" / "Indicaciones" (a diferencia de `MedicationCard` que tiene tres:
aquí no hay "Dosis"). Chevron ">" siempre visible (a diferencia de `MedicationCard`, que solo lo
muestra si es pendiente) — el mockup lo muestra también en la tarjeta "Realizada"; solo es
interactiva (`onPress`) cuando `status === 'PENDING'`.

### 6. `TaskActionModal.tsx` (nuevo, mirror simplificado de `MedicationActionModal.tsx`)

Un solo botón de acción "Marcar como realizada" (no hay "Omitir" — el mockup no lo contempla) +
"Cancelar".

### 7. `CreateTaskScreen.tsx` (pantalla "Programar tarea")

Estructura calcada de `CreateMedicationScreen.tsx` (header, título, subtítulo, card de formulario,
botones Cancelar/Guardar), con un elemento nuevo antes del formulario — la **tarjeta resumen del
paciente**, que no existe en `CreateMedicationScreen`:

```tsx
<View style={styles.patientCard}>
  <View style={styles.avatar}><Ionicons name="person" size={36} color="rgba(255,255,255,0.85)" /></View>
  <View>
    <Text style={styles.patientName}>{patient.fullName}</Text>
    {attention ? <Badge "Requiere atención" /> : <Badge "Estable" />}
  </View>
</View>
```
Reutiliza `patientRepo.getPatient(selectedPatientId)` + `medicationRepo.getDailyLogs(...)` +
`needsAttention` de `domain/utils/patientDisplay.ts` — misma lógica ya centralizada que usa
`PatientDetailScreen`.

Campos del formulario (numerados igual que el mockup, validados con Zod + React Hook Form):

1. **Nombre de la tarea** — texto libre, requerido.
2. **Hora** — `DateTimePicker` mode="time" (igual patrón que "Hora de inicio" en
   `CreateMedicationScreen`).
3. **Tipo de programación** — segmented control de 2 botones (`DAYS_OF_WEEK` / `DATE_RANGE`,
   default `DAYS_OF_WEEK` seleccionado en verde como el mockup). Renderizado condicional (no
   simultáneo):
   - `DAYS_OF_WEEK`: fila de 7 chips Lun–Dom (multi-selección, ≥1 requerido).
   - `DATE_RANGE`: "Fecha de inicio" / "Fecha de término" (`DateTimePicker` mode="date", ambas
     requeridas, término ≥ inicio).
4. **Instrucciones** — textarea multilinea, opcional (igual que "Condiciones de administración").
5. **Prioridad** — 3 botones (Baja/verde con `arrow-down`, Media/naranja con `remove`,
   Alta/rojo con `arrow-up`), selección única, default `MEDIUM`.
6. **Recordatorio activo** — `Switch`, default `true`.

Al enviar: `careTaskRepo.createTask(selectedPatientId, {...})`, invalida
`['care-task-logs', selectedPatientId]` y `navigation.goBack()`. Mismo manejo de error
(`Alert.alert('Error', 'No se pudo guardar la tarea.')`) que `CreateMedicationScreen`.

### 8. Navegación (`AppNavigator.tsx`)

```ts
export type PatientStackParams = {
  // ...existentes
  Tasks: undefined;
  CreateTask: undefined;
};
```
```ts
<Stack.Screen name="Tasks" component={TasksScreen} options={{ headerShown: false }} />
<Stack.Screen name="CreateTask" component={CreateTaskScreen} options={{ headerShown: false }} />
```

`PatientDetailScreen`: se agrega `goToTasks()` (mismo patrón que `goToMedicamentos`/`goToVitales`:
`setSelectedPatientId(patientId); navigation.navigate('Tasks');`) y la tarjeta "Tareas" pasa de
`onPress={() => goToComingSoon(...)}` a `onPress={goToTasks}`.

## Manejo de errores

- Backend: mismas reglas que `medication` — `IllegalArgumentException` (paciente/tarea no
  encontrados, sin acceso, solo-owner) → 400 vía `GlobalExceptionHandler`; validación de schedule
  (días vacíos, rango de fechas inválido) lanza `IllegalArgumentException` en el constructor
  compacto de `CareTaskSchedule`, igual que `MedicationSchedule.fromDailyInterval`.
- `CompleteCareTaskLogUseCase`: completar un log que no está `PENDING` lanza `IllegalStateException`
  (mismo criterio que `MedicationLog.confirm`).
- Frontend: `Alert.alert` en fallos de mutación (crear tarea, completar log), mismo patrón que
  medicamentos. Sin paciente seleccionado → mensaje informativo, no crash.

## Testing

**Backend:**
- `CareTaskScheduleTest` (unit): validaciones del constructor compacto + `shouldRunToday` para
  ambos `scheduleType`, incluyendo límites de fecha.
- `CareTaskServiceTest` (unit, Mockito): autorización (owner vs colaborador vs sin acceso) para cada
  caso de uso, y la transición `PENDING → DONE` de `complete`.
- `DailyCareTaskLogSchedulerTest` (unit): genera logs solo para tareas activas que corresponden hoy,
  no duplica si ya existe (`existsByCareTaskIdAndScheduledAt`).
- `CareTaskReminderSchedulerTest` (unit, mirror de `EscalationSchedulerTest`): envía push solo si
  `reminderActive=true` y el owner tiene `fcmToken`; no envía si `reminderActive=false`.
- `CareTaskIntegrationTest` (Testcontainers, mirror de `MedicationIntegrationTest`): crear → listar →
  generar log → completar, contra PostgreSQL real.

**Frontend:**
- `careTaskDisplay.test.ts`: `pickTaskIcon` para cada categoría de palabra clave y el caso default.
- `CreateTaskScreen.test.tsx` (RNTL, mirror de `CreateMedicationScreen.test.tsx`): validaciones
  requeridas, alternancia `DAYS_OF_WEEK`/`DATE_RANGE`, envío exitoso llama `createTask` con el
  payload correcto y navega atrás.
- `TasksScreen.test.tsx` (mirror de `DailyMedsScreen.test.tsx`/`TodayScreen.test.tsx`): filtros
  Todas/Pendientes/Realizadas, tocar una tarjeta pendiente abre el modal, completar invalida la
  query y cierra el modal.
- `TaskCard.test.tsx`: badge correcto por estado, ícono correcto por palabra clave.
