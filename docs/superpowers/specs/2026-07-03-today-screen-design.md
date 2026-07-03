# Pantalla "Hoy" (TodayScreen) — medicamentos pendientes del día

**Fecha:** 2026-07-03
**Módulo:** `appmovil` — `presentation/screens/medications`

## Contexto

En `PatientDetailScreen`, la tarjeta "Hoy" (subtítulo "Pendientes") navega hoy a un placeholder
genérico (`ComingSoonScreen`). El usuario pidió que muestre los medicamentos que faltan por dar hoy
para el paciente — y que, si ya se administraron/omitieron todos, no aparezca ninguno.

En el mockup original de `PatientDetailScreen` (ya implementado), "Hoy" y "Medicamentos" son dos
tarjetas separadas con propósitos distintos: "Hoy" = qué falta hacer ahora mismo (foco, acción
rápida); "Medicamentos" (subtítulo "Dosis y horarios") = gestión completa (ya implementada como
`DailyMedsScreen`, con tabs Todos/Pendientes/Administrados y botón "Agregar medicamento"). Se decidió
con el usuario mantener esa separación: "Hoy" es una pantalla propia, más simple, no una reutilización
de `DailyMedsScreen` con una pestaña distinta.

## Alcance

**Incluye:**
- Pantalla nueva `TodayScreen.tsx`: lista solo los `medication-logs` de hoy con estado `PENDING`/
  `ESCALATED` para el paciente activo. Estado vacío cuando no hay pendientes.
- Reutiliza `MedicationCard` y `MedicationActionModal` tal cual existen (sin modificarlos).
- Ruta nueva `Today` en `AppNavigator`, y la tarjeta "Hoy" de `PatientDetailScreen` pasa de navegar a
  `ComingSoon` a navegar a `Today`.

**No incluye (fuera de alcance):**
- Tabs, botón "Agregar medicamento", ni ninguna otra función de gestión (eso sigue viviendo en
  `DailyMedsScreen`/`Medicamentos`).
- Cambios a `DailyMedsScreen`, `MedicationCard` o `MedicationActionModal`.

## Diseño

### 1. `TodayScreen.tsx` (nueva)

Mismo tema oscuro y patrón de header que `DailyMedsScreen` (back button + logo CuidaLink). Título
"Hoy", subtítulo "Medicamentos pendientes de hoy". Sin chip de fecha, sin tabs, sin botón de agregar
— es una vista de acción rápida, no de gestión.

Usa `selectedPatientId` del `authStore` (mismo patrón que `Medicamentos`/`Vitales`, sin route
params). Hace el mismo `useQuery(['medication-logs', selectedPatientId, today])` que ya usa
`DailyMedsScreen` (mismo query key, así que si el usuario viene de esa pantalla los datos ya están en
caché de TanStack Query). Filtra el resultado a `status === 'PENDING' || status === 'ESCALATED'` —
misma función pura `matchesTab`/lógica de filtro ya usada en `DailyMedsScreen`, reimplementada aquí
como un filtro simple sin necesidad de un componente de tabs.

Cada tarjeta pendiente usa `MedicationCard` con `onPress` que abre `MedicationActionModal` (mismo
patrón exacto que `DailyMedsScreen`: `useState<MedicationLog | null>` para el log seleccionado, dos
`useMutation` para confirmar/omitir que invalidan `['medication-logs']` al éxito). Al confirmar u
omitir, el log deja de cumplir el filtro `PENDING`/`ESCALATED` y desaparece de la lista automáticamente
(la invalidación de query dispara un refetch) — así se cumple "si ya se dieron todos, no aparece
ninguno" de forma natural, sin lógica especial.

Estado vacío (ningún log pendiente, ya sea porque no hay medicamentos hoy o porque todos fueron
atendidos): ícono `checkmark-circle-outline` + texto "¡Todo al día!" + subtexto "No hay medicamentos
pendientes por ahora."

### 2. Navegación

`AppNavigator.PatientStackParams` gana `Today: undefined`, registrada con `headerShown: false`.
`PatientDetailScreen`'s tarjeta "Hoy" cambia de
`onPress={() => goToComingSoon('Hoy', 'Pendientes de hoy')}` a
`onPress={() => navigation.navigate('Today')}` (se elimina esa única llamada a `goToComingSoon`, la
función se mantiene para las otras tarjetas que siguen usándola).

## Manejo de errores

- `isLoading` → `ActivityIndicator` (mismo patrón ya usado).
- Si `selectedPatientId` es `null` → mensaje "Selecciona un paciente..." (mismo patrón ya usado).
- Error al confirmar/omitir → `Alert.alert` (mismo patrón ya usado en `DailyMedsScreen`).

## Testing

`TodayScreen.test.tsx`: solo se muestran logs `PENDING`/`ESCALATED` (no `CONFIRMED`/`MISSED`), estado
vacío cuando no hay pendientes, tocar una tarjeta abre el modal, confirmar invoca
`medicationRepo.confirmLog` con el id correcto.
