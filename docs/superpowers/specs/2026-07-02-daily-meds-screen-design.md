# Pantalla "Medicamentos de hoy" — rediseño

**Fecha:** 2026-07-02
**Módulos:** `backend` (medication) + `appmovil` — `presentation/screens/medications`

## Contexto

Desde `PatientDetailScreen`, la tarjeta "Medicamentos" navega a `DailyMedsScreen`, que hoy es una
lista mínima sin seguir ningún diseño visual. El usuario proporcionó un mockup específico que se
debe seguir de forma estricta:

- Header con botón volver, logo CuidaLink, título "Medicamentos" + subtítulo "Medicamentos
  programados para hoy".
- Chip "Hoy | \<fecha completa en español\>".
- Tabs de filtro: Todos / Pendientes / Administrados.
- Lista de tarjetas de medicamento: ícono según tipo, nombre, badge de estado (Pendiente ámbar /
  Administrado verde), fila Dosis | Hora | Indicaciones, chevron.
- Botón inferior "Agregar medicamento".

Al investigar la implementación aparecieron dos bugs reales pre-existentes que bloquean lo que el
mockup necesita:

1. **El endpoint de logs diarios no trae los datos del medicamento.**
   `GET /patients/{id}/medication-logs` (`MedicationLogController.java:34`) devuelve
   `MedicationLogResponse(id, medicationId, scheduledAt, status, administeredById, confirmedAt)` —
   nunca nombre, dosis ni indicaciones, aunque `instructions` ya existe en el dominio `Medication`
   del backend (`Medication.java:11`). El tipo `MedicationLog` de la app (`MedicationLog.ts`) ya
   declara `medicationName`/`dosage` como si vinieran del backend, pero en producción llegan
   indefinidos.
2. **Confirmar/Omitir devuelve 404.** `ApiMedicationRepository.ts:19,24` llama
   `POST /medication-logs/{id}/confirm` y `POST /medication-logs/{id}/miss`, rutas que no existen.
   El backend solo expone `PATCH /medication-logs/{id}` con body `{status: CONFIRMED|MISSED}`
   (`MedicationLogController.java:44`).

Decisiones tomadas con el usuario para resolver ambos, y para el resto del alcance de esta pantalla,
se detallan abajo.

## Alcance

**Incluye:**
- Backend: enriquecer `GET /patients/{id}/medication-logs` con `medicationName`, `dosage`,
  `instructions`, `type`. Agregar campo `type` (`MedicationType`) al dominio `Medication`, con
  default `TABLET` asignado en el backend al crear (no hay pantalla de creación en la app todavía
  que permita elegirlo). Corregir la ruta real usada por `confirm`/`miss` — en el cliente, no en el
  backend (el backend ya está bien).
- Mobile: rediseño completo de `DailyMedsScreen` y `MedicationCard` según el mockup. Nuevo
  `MedicationActionModal` para confirmar/omitir (reemplaza los botones inline actuales).

**No incluye (fuera de alcance, trabajo futuro):**
- Pantalla de crear/editar medicamento (ni selección de `type` por el usuario).
- Navegación entre días (el chip de fecha es solo visual, siempre "hoy").
- El valor `SKIPPED` de `LogStatus` — no lo produce ningún flujo real hoy, se deja intacto.

## Diseño

### 1. Backend — `MedicationType` (nuevo)

`backend/src/main/java/com/cuidalink/medication/domain/model/MedicationType.java`:

```java
package com.cuidalink.medication.domain.model;

public enum MedicationType {
    TABLET,
    CAPSULE,
    INJECTION,
    OTHER
}
```

### 2. Backend — `Medication.java`

Se agrega el campo `type` con getter. Se añade una constructora de 8 parámetros que lo recibe
explícitamente, y se conserva la constructora actual de 7 parámetros como *convenience constructor*
que delega a la nueva pasando `MedicationType.TABLET` — mismo patrón que ya usa
`MedicationLog.java:31` para su propio convenience constructor. Con esto, ni
`MedicationService.execute()` ni los 4 call sites de `MedicationServiceTest.java` necesitan cambios;
todo medicamento nuevo queda con `type = TABLET` automáticamente.

### 3. Backend — persistencia

`MedicationJpaEntity.java`: se agrega columna `type` (String, se guarda `enum.name()`).
`ddl-auto=update` crea la columna sola.

`JpaMedicationRepositoryAdapter.java`: `toJpa` escribe `m.getType().name()`; `toDomain` lee con
`e.getType() != null ? MedicationType.valueOf(e.getType()) : MedicationType.TABLET` — las filas
creadas antes de este cambio no tienen esta columna poblada.

### 4. Backend — `MedicationResponse` y `MedicationController`

`MedicationResponse` gana el campo `type` (String). `MedicationController.toResponse` lo incluye
como `m.getType().name()`.

### 5. Backend — enriquecer `MedicationLogResponse`

```java
public record MedicationLogResponse(
    String id,
    String medicationId,
    String medicationName,
    String dosage,
    String instructions,
    String type,
    String scheduledAt,
    String status,
    String administeredById,
    String confirmedAt
) {}
```

`MedicationLogController` inyecta `ListMedicationsUseCase` además de los use cases que ya tiene. En
`getDailyLogs`, antes de mapear los logs a response, hace **una sola** llamada a
`listUseCase.listMedications(patientId, user.getId())` y construye un
`Map<MedicationId, Medication>`. `toResponse(log)` pasa a recibir también ese mapa y lo usa para
completar `medicationName`/`dosage`/`instructions`/`type`. `listMedications` ya devuelve todos los
medicamentos del paciente (activos e inactivos — no filtra por `active`), así que un log histórico
de un medicamento desactivado sigue resolviendo correctamente.

### 6. Mobile — entidades

`Medication.ts` gana `type: 'TABLET' | 'CAPSULE' | 'INJECTION' | 'OTHER'`.

`MedicationLog.ts` gana `instructions: string` y `type: 'TABLET' | 'CAPSULE' | 'INJECTION' |
'OTHER'` (los campos `medicationName`/`dosage` ya existían en el tipo, ahora el backend realmente
los llena).

### 7. Mobile — corregir confirm/miss

`ApiMedicationRepository.ts`:

```ts
async confirmLog(logId: string): Promise<MedicationLog> {
  const res = await apiClient.patch<MedicationLog>(`/medication-logs/${logId}`, { status: 'CONFIRMED' });
  return res.data;
}

async missLog(logId: string): Promise<MedicationLog> {
  const res = await apiClient.patch<MedicationLog>(`/medication-logs/${logId}`, { status: 'MISSED' });
  return res.data;
}
```

### 8. Mobile — mapeo de estado y colores

| `MedicationLogStatus` | Badge mostrado | Color | Aparece en tab |
|---|---|---|---|
| `PENDING`, `ESCALATED` | "Pendiente" | ámbar (`#e6b800`, mismo tono ya usado en `PatientsListScreen`/`PatientDetailScreen`) | Todos, Pendientes |
| `CONFIRMED` | "Administrado" | verde (`#1a9c7d`, mismo tono ya usado) | Todos, Administrados |
| `MISSED` | "Omitido" | rojo (`#e05555`, mismo tono del botón Emergencia) | Todos (no aparece en Pendientes ni Administrados) |

### 9. Mobile — ícono por `type`

Verificado que Ionicons (única familia de íconos usada en el repo) no tiene glyphs de píldora ni
jeringa (`node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json`).
Se usan los más cercanos disponibles:

| `type` | Ícono Ionicons |
|---|---|
| `TABLET`, `CAPSULE` | `ellipse-outline` |
| `INJECTION` | `medical-outline` |
| `OTHER` | `help-circle-outline` |

### 10. Mobile — `DailyMedsScreen.tsx` (rediseño)

Estructura, envuelta en `ScreenBackground` + layout scrollable:

1. Header: back button + logo "CuidaLink" — mismo patrón exacto que `PatientDetailScreen.tsx`
   (`headerRow`/`backButton`/`headerLogoRow`).
2. Título "Medicamentos" + subtítulo "Medicamentos programados para hoy".
3. Chip de fecha: ícono `calendar-outline`, texto "Hoy", y la fecha de hoy formateada en español
   (`new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })`).
   Puramente visual, sin `onPress`.
4. Tabs (`useState<'ALL' | 'PENDING' | 'ADMINISTERED'>`): "Todos" (default) / "Pendientes" /
   "Administrados". Filtran la lista ya cargada — no dispara nuevas queries.
5. Lista de `MedicationCard` (ver abajo) para los logs del día del paciente activo
   (`useAuthStore().selectedPatientId`, mismo patrón que la pantalla actual).
6. Botón "Agregar medicamento" (rojo, ícono `add-circle-outline`) →
   `navigation.navigate('ComingSoon', { title: 'Agregar medicamento', subtitle: 'Registrar un nuevo medicamento' })`.

Tocar una `MedicationCard` en estado Pendiente/Escalado abre `MedicationActionModal` con ese log.
Tocar una tarjeta Administrada/Omitida no hace nada.

### 11. Mobile — `MedicationCard.tsx` (rediseño)

Recibe `{ log: MedicationLog; onPress?: () => void }` (ya no recibe `onConfirm`/`onMiss` — eso lo
maneja el modal). Layout: ícono en caja redondeada a la izquierda (color según `type`, ver tabla),
nombre + badge de estado a la derecha arriba, fila inferior con tres columnas "Dosis" / "Hora" /
"Indicaciones", chevron al final si `onPress` está definido. Reutiliza el lenguaje visual de tarjeta
ya establecido (`rgba(255,255,255,0.06)`, borde `rgba(255,255,255,0.18)`, `borderRadius: 20`).

### 12. Mobile — `MedicationActionModal.tsx` (nuevo)

`src/presentation/components/MedicationActionModal.tsx`. Recibe
`{ visible: boolean; log: MedicationLog | null; onConfirm: () => void; onMiss: () => void; onClose: () => void }`.
Modal simple (`react-native` `Modal` con `transparent`) centrado, muestra nombre + dosis + hora del
log, y dos botones "Confirmar" (verde) / "Omitir" (rojo), más un cierre. `DailyMedsScreen` es quien
posee el estado de qué log está seleccionado y llama las mutaciones ya existentes
(`medicationRepo.confirmLog`/`missLog`) vía `useMutation`, invalidando `['medication-logs']` al
éxito — mismo patrón que ya usa la pantalla actual.

## Manejo de errores

- `isLoading` de la query de logs → `ActivityIndicator` (patrón ya usado).
- Si `selectedPatientId` es `null` → mensaje "Selecciona un paciente..." (ya existe, se mantiene).
- Error de red al confirmar/omitir → `Alert.alert('Error', ...)` (patrón ya usado en la pantalla
  actual).

## Testing

**Backend:**
- `MedicationLogController` no tiene test dedicado hoy — se agrega verificación en
  `MedicationIntegrationTest.java` (Testcontainers) de que `GET /patients/{id}/medication-logs`
  devuelve `medicationName`, `dosage`, `instructions`, `type` correctos para un medicamento y log
  creados en el test.
- `Medication.java`: si `MedicationServiceTest` no cubre ya el default de `type`, se agrega un caso
  puntual verificando que un medicamento creado vía el convenience constructor tiene
  `type == MedicationType.TABLET`.

**Mobile:**
- `MedicationCard.test.tsx`: ícono correcto por cada `type`, badge/color correcto por cada
  `status`, `onPress` se dispara solo cuando corresponde (Pendiente/Escalado) y no en
  Administrado/Omitido.
- `MedicationActionModal.test.tsx`: renderiza datos del log, `onConfirm`/`onMiss`/`onClose` se
  disparan correctamente.
- `DailyMedsScreen.test.tsx`: tabs filtran la lista correctamente (Todos/Pendientes/Administrados),
  tocar una tarjeta pendiente abre el modal y confirmar/omitir invoca
  `medicationRepo.confirmLog`/`missLog` con el `PATCH` correcto, "Agregar medicamento" navega a
  `ComingSoon` con los params correctos.
- `ApiMedicationRepository` no tiene test dedicado hoy (no existe archivo de test para
  repositorios `data/`, patrón no establecido en el repo) — se verifica indirectamente a través de
  los tests de `DailyMedsScreen` que mockean `useInjection`.
