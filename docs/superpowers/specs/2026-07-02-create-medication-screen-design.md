# Pantalla "Nuevo medicamento" — creación de medicamentos

**Fecha:** 2026-07-02
**Módulos:** `backend` (medication) + `appmovil` — `presentation/screens/medications`

## Contexto

No existe ninguna pantalla de crear/editar medicamento en la app móvil — solo el backend soporta el
CRUD (`POST`/`GET`/`PUT`/`PATCH /patients/{id}/medications...`). El botón "Agregar medicamento" en
`DailyMedsScreen` navega hoy a un placeholder genérico (`ComingSoonScreen`). El usuario proveyó un
mockup específico a seguir de forma estricta para la pantalla de creación, y pidió agregar a la base
de datos los campos que falten para soportarla.

El formulario del mockup captura un horario mediante **hora de inicio + frecuencia en horas** (ej.
"cada 8 horas desde las 08:00"). El modelo de dominio actual, `MedicationSchedule`, no tiene ese
concepto — tiene una lista explícita de horas del día (`times`) más una frecuencia de **días**
(`DAILY` / `EVERY_X_DAYS` / `WEEKLY`, con `daysOfWeek`/`intervalDays`). Se decidió con el usuario
agregar campos reales a la base de datos (`startTime`, `frequencyHours`) en vez de calcular las horas
solo en el cliente y descartar el concepto de "cada N horas" una vez guardado.

## Alcance

**Incluye:**
- Backend: agregar `startTime`/`frequencyHours` a `MedicationSchedule` (dominio, persistencia, DTO,
  respuesta), con un factory que calcula `times[]` automáticamente para que el cron existente
  (`DailyMedicationLogScheduler`) siga funcionando sin cambios.
- Mobile: corregir el desalineamiento de tipos ya detectado (`Medication.ts` declaraba
  `frequency`/`scheduledTimes` sueltos; el backend siempre serializa un objeto `schedule` anidado).
- Mobile: nueva pantalla `CreateMedicationScreen`, siguiendo el mockup al pie de la letra, más el
  método `createMedication` en el repositorio de medicamentos (no existía).
- Wiring: nueva ruta `CreateMedication` en `AppNavigator`; el botón "Agregar medicamento" en
  `DailyMedsScreen` pasa de navegar a `ComingSoon` a navegar a esta pantalla real.

**No incluye (fuera de alcance):**
- Pantalla de editar medicamento (`EditMedicationScreen` — no existe, no se construye ahora).
- Selección de `type` (tableta/cápsula/inyección) en el formulario — el mockup no lo muestra; se
  mantiene el default `TABLET` del backend (decisión de un plan anterior).
- Selección de días de la semana o "cada X días" — el mockup solo cubre el caso "todos los días, cada
  N horas"; los caminos `WEEKLY`/`EVERY_X_DAYS` del dominio existente quedan intactos pero
  inalcanzables desde esta pantalla.
- Cambios al cron/`DailyMedicationLogScheduler` — sigue leyendo `schedule.times()` exactamente igual.

## Diseño

### 1. Backend — `MedicationSchedule` (dominio)

Se agregan dos componentes nuevos al record: `startTime: LocalTime`, `frequencyHours: Integer`
(ambos nullable — solo se usan cuando el medicamento se crea con el horario "cada N horas"). Se
agrega un constructor de conveniencia con la firma actual de 6 parámetros (delega al nuevo de 8
pasando `startTime=null, frequencyHours=null`) — mismo patrón ya usado para `Medication`/
`MedicationLog` en trabajo anterior — así los 3 call-sites existentes (`MedicationServiceTest.java`,
`JpaMedicationRepositoryAdapter.java`, `MedicationController.java`) no requieren cambios salvo donde
se detalla abajo.

Se agrega un factory estático:

```java
MedicationSchedule.fromDailyInterval(LocalTime startTime, int frequencyHours,
                                      LocalDate startDate, LocalDate endDate)
```

Calcula `times` recorriendo un ciclo de 24 horas desde `startTime` en pasos de `frequencyHours` (ej.
`startTime=08:00, frequencyHours=8` → `times=[08:00, 16:00, 00:00]`), fija `frequency=DAILY`,
`daysOfWeek=List.of()`, `intervalDays=null`, y conserva `startTime`/`frequencyHours` en el objeto
resultante. Valida: `frequencyHours` debe estar en `[1, 24]`, `startDate` no puede ser `null`, y si
`endDate` no es `null` no puede ser anterior a `startDate` — cualquier violación lanza
`IllegalArgumentException` (mapeado a HTTP 400 por `GlobalExceptionHandler`, patrón ya establecido en
el proyecto).

### 2. Backend — persistencia y DTOs

- `MedicationJpaEntity`: dos columnas nuevas nullable (`scheduleStartTime: String` en formato
  `HH:mm:ss` o similar serialización de `LocalTime`, `scheduleFrequencyHours: Integer`).
  `ddl-auto=update` las crea solas.
- `JpaMedicationRepositoryAdapter`: `toJpa`/`toDomain` mapean los dos campos nuevos igual que los
  existentes (nulos se preservan como nulos, sin fallback — a diferencia del `type` del plan anterior,
  aquí `null` es un valor legítimo para medicamentos con horario "clásico").
- `MedicationScheduleDto`: es un `record`, así que agregar campos cambia su aridad, no solo el orden.
  Se agregan `startTime: LocalTime`, `frequencyHours: Integer` (nullable) como los dos últimos
  componentes, y se agrega un constructor de conveniencia de 6 parámetros (la firma actual) que
  delega al canónico de 8 pasando `startTime=null, frequencyHours=null` — mismo patrón que el punto 1.
  Así los call-sites existentes que construyen el DTO con 6 argumentos posicionales (tests,
  `MedicationController.toResponse` para el camino legado) siguen compilando sin cambios.
- `MedicationController.toScheduleDomain`: si `dto.times()` es `null`/vacío y
  `dto.startTime()`/`dto.frequencyHours()` no son `null`, usa
  `MedicationSchedule.fromDailyInterval(...)`. Si no, usa exactamente la construcción actual
  (sin cambios de comportamiento para los tests/integraciones existentes que ya envían `times`
  explícitos).
- `MedicationController.toResponse`: al construir el `MedicationScheduleDto` de salida, se agregan
  `s.startTime()`, `s.frequencyHours()` — si no se agregan, el valor guardado nunca vuelve al cliente
  aunque esté persistido.

### 3. Mobile — corregir `Medication.ts`

Reemplaza los campos sueltos `frequency: string` / `scheduledTimes: string[]` por un objeto anidado
que refleja la forma real del backend:

```ts
export interface MedicationSchedule {
  times: string[];
  frequency: 'DAILY' | 'EVERY_X_DAYS' | 'WEEKLY';
  daysOfWeek: string[];
  startDate: string;
  endDate: string | null;
  intervalDays: number | null;
  startTime: string | null;
  frequencyHours: number | null;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  instructions: string;
  type: MedicationType;
  schedule: MedicationSchedule;
  active: boolean;
}
```

(Se agrega también `instructions`, que el backend ya devuelve en `MedicationResponse` pero el tipo
actual de `Medication.ts` no declaraba.)

### 4. Mobile — repositorio

`MedicationRepository` gana:

```ts
createMedication(patientId: string, data: CreateMedicationData): Promise<Medication>
```

```ts
export interface CreateMedicationData {
  name: string;
  dosage: string;
  instructions: string;
  startTime: string;       // "HH:mm"
  frequencyHours: number;
  startDate: string;       // "yyyy-MM-dd"
  endDate: string | null;
}
```

`ApiMedicationRepository.createMedication` hace `POST /patients/{patientId}/medications` con body
`{ name, dosage, instructions, schedule: { startTime, frequencyHours, startDate, endDate } }` —
coincide exactamente con lo que `MedicationController.toScheduleDomain` (punto 2) espera para tomar
el camino nuevo.

### 5. Mobile — `CreateMedicationScreen` (nueva)

Tema oscuro (`ScreenBackground` + tarjeta `rgba(255,255,255,0.06)`), igual lenguaje visual que
`PatientDetailScreen`/`DailyMedsScreen`/`ContactsScreen` — el mockup es ese estilo, no el tema claro
que usa `CreatePatientScreen` hoy (pantalla más antigua, no se toca). React Hook Form + Zod (stack ya
establecido en el proyecto).

Header: back button + logo CuidaLink (mismo patrón exacto ya usado). Título "Nuevo medicamento" +
subtítulo "Configura dosis, horario y duración del tratamiento". Un solo card con los 8 campos
numerados literalmente como el mockup:

1. **Nombre del medicamento** — `TextInput`, requerido.
2. **Dosis** — `TextInput`, requerido, placeholder "Ej: 1 tableta / 10 ml".
3. **Hora de inicio** — `TouchableOpacity` + `DateTimePicker` (`mode="time"`, mismo patrón que
   `CreatePatientScreen` usa para `mode="date"`), requerido.
4. **Frecuencia (en horas)** — stepper `−`/`+`, valor entero 1–24, default 8.
5. **Fecha de inicio** — `TouchableOpacity` + `DateTimePicker` (`mode="date"`), requerido.
6. **Fecha de término** — igual que el campo 5, pero deshabilitado (y su valor forzado a `null`)
   cuando el toggle "Indefinido" está activo.
7. **Indefinido** — `Switch` (track rojo `#e05555` activo, pulgar blanco), default `true` (igual que
   el mockup, que lo muestra ya activado). Texto de ayuda debajo: "La fecha de inicio es obligatoria."
   (tal cual el mockup).
8. **Condiciones de administración** — `TextInput` multilínea, opcional, placeholder "Ej: Después de
   comer, En ayunas, Con abundante agua, etc.".

Botones: "Guardar medicamento" (rojo `#e05555`, ícono `save-outline`) y "Cancelar" (outline, texto
`#5ee7df`). Usa `selectedPatientId` del `authStore` (mismo patrón que `Medicamentos`/`Vitales` —
sin route params). Al guardar: invalida `['medications', selectedPatientId]` y navega hacia atrás
(`navigation.goBack()`). Error de red → `Alert.alert`.

### 6. Navegación

`AppNavigator.PatientStackParams` gana `CreateMedication: undefined`, registrada con
`headerShown: false`. `DailyMedsScreen`'s botón "Agregar medicamento" cambia su `onPress` de
`navigation.navigate('ComingSoon', {...})` a `navigation.navigate('CreateMedication')`.

## Manejo de errores

- Validación de formulario: react-hook-form + zod, mismo patrón que `CreatePatientScreen` (errores
  inline bajo cada campo).
- Validación de dominio (backend): `frequencyHours` fuera de `[1,24]`, `startDate` ausente, o
  `endDate` anterior a `startDate` → `IllegalArgumentException` → HTTP 400 → la app muestra
  `Alert.alert('Error', 'No se pudo crear el medicamento.')` (mismo patrón ya usado en otras
  pantallas; no se intenta mostrar el mensaje específico del backend, consistente con el resto de la
  app).

## Testing

**Backend:**
- Test unitario para `MedicationSchedule.fromDailyInterval`: calcula `times` correctamente para casos
  típicos (cada 8h, cada 6h, cada 1h), valida rango de `frequencyHours`, valida `endDate >= startDate`.
- Caso nuevo en `MedicationIntegrationTest`: crear un medicamento vía `POST` enviando
  `startTime`/`frequencyHours` (sin `times` ni `frequency` explícitos) y verificar que la respuesta
  trae `times` calculado correctamente y que `GET` posterior devuelve los mismos `startTime`/
  `frequencyHours` guardados.
- Los tests existentes (`MedicationServiceTest`, casos previos de `MedicationIntegrationTest` que
  envían `times`/`frequency` explícitos) no deben requerir cambios.

**Mobile:**
- `CreateMedicationScreen.test.tsx`: validación de campos requeridos, el stepper de frecuencia
  respeta el rango 1–24, el toggle "Indefinido" deshabilita/limpia el campo de fecha de término,
  guardar exitoso llama `medicationRepo.createMedication` con el body correcto y navega hacia atrás,
  error de red muestra la alerta.
