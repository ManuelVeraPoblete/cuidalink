# Pantalla "Nuevo medicamento" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la pantalla "Nuevo medicamento" en la app móvil CuidaLink siguiendo un mockup estricto, agregando al backend los campos reales (`startTime`, `frequencyHours`) que el horario del formulario necesita, y corrigiendo un bug de tipos ya detectado en `Medication.ts`.

**Architecture:** Hexagonal en ambos módulos. Backend: `MedicationSchedule` gana un factory `fromDailyInterval` que calcula las horas del día a partir de hora de inicio + frecuencia, sin tocar el cron existente. Mobile: nueva pantalla con React Hook Form + Zod, reutilizando el lenguaje visual oscuro ya establecido.

**Tech Stack:** Java 17, Spring Boot 3.2, Spring Data JPA, PostgreSQL 15, Testcontainers (backend). React Native 0.74, TypeScript 5 (strict), React Hook Form 7 + Zod, `@react-native-community/datetimepicker`, TanStack Query 5, Jest + `@testing-library/react-native` (mobile).

## Global Constraints

- Backend hexagonal: `domain/model/` y `domain/service/` nunca importan `jakarta.persistence` ni `org.springframework.*`.
- `server.servlet.context-path=/api/v1`.
- `spring.jpa.hibernate.ddl-auto=update` — columnas nuevas no requieren migración manual.
- Mobile hexagonal: `presentation/` solo importa de `domain/`, nunca de `data/` directamente.
- TypeScript strict, alias `@/*` → `src/*`. Mobile forms: React Hook Form + Zod (ya establecido).
- Sin comentarios en el código salvo que documenten un porqué no obvio.
- El campo `type` del medicamento NO aparece en este formulario (no está en el mockup) — se mantiene
  el default `TABLET` del backend.
- Tema visual: `CreateMedicationScreen` usa el tema oscuro ya establecido (`ScreenBackground`, cards
  `rgba(255,255,255,0.06)` con borde `rgba(255,255,255,0.18)`, acentos `#5ee7df`/`#38bdf8`/`#a5d8f3`,
  rojo `#e05555`) — igual que `PatientDetailScreen`/`DailyMedsScreen`/`ContactsScreen`. NO el tema
  claro de `CreatePatientScreen` (pantalla más antigua, no se toca).
- Docker no está disponible en este entorno de desarrollo — los tests `*IntegrationTest`
  (`@Testcontainers`) no se pueden ejecutar aquí, solo compilar. `mvn test -Dtest='!*IntegrationTest' -q`
  es el comando de verificación de tests backend autoritativo en este entorno.
- No existe convención de test para `data/repositories/*.ts` en este repo.

---

### Task 1: `MedicationSchedule.fromDailyInterval` (dominio backend)

**Files:**
- Modify: `backend/src/main/java/com/cuidalink/medication/domain/model/MedicationSchedule.java`
- Test: `backend/src/test/java/com/cuidalink/medication/domain/model/MedicationScheduleTest.java` (nuevo)

**Interfaces:**
- Produces (consumido por Tarea 2):
  - `MedicationSchedule` record extendido con 2 componentes nuevos: `startTime: LocalTime`,
    `frequencyHours: Integer` (8 componentes en total, en ese orden al final).
  - Constructor de conveniencia con la firma actual de 6 parámetros `(times, frequency, daysOfWeek,
    startDate, endDate, intervalDays)`, delega al canónico de 8 pasando `startTime=null,
    frequencyHours=null`.
  - `static MedicationSchedule fromDailyInterval(LocalTime startTime, int frequencyHours, LocalDate startDate, LocalDate endDate)`.
- Consumes: nada nuevo — `Frequency` enum ya existe.

- [ ] **Step 1: Escribir el test que falla**

Crear `backend/src/test/java/com/cuidalink/medication/domain/model/MedicationScheduleTest.java`:

```java
package com.cuidalink.medication.domain.model;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MedicationScheduleTest {

    @Test
    void fromDailyInterval_computesTimesEvery8Hours() {
        var schedule = MedicationSchedule.fromDailyInterval(
            LocalTime.of(8, 0), 8, LocalDate.of(2026, 7, 1), null);

        assertThat(schedule.times()).containsExactly(
            LocalTime.of(8, 0), LocalTime.of(16, 0), LocalTime.of(0, 0));
        assertThat(schedule.frequency()).isEqualTo(Frequency.DAILY);
        assertThat(schedule.startTime()).isEqualTo(LocalTime.of(8, 0));
        assertThat(schedule.frequencyHours()).isEqualTo(8);
    }

    @Test
    void fromDailyInterval_computesTimesEvery6Hours() {
        var schedule = MedicationSchedule.fromDailyInterval(
            LocalTime.of(6, 0), 6, LocalDate.of(2026, 7, 1), null);

        assertThat(schedule.times()).containsExactly(
            LocalTime.of(6, 0), LocalTime.of(12, 0), LocalTime.of(18, 0), LocalTime.of(0, 0));
    }

    @Test
    void fromDailyInterval_computesTimesEveryHour() {
        var schedule = MedicationSchedule.fromDailyInterval(
            LocalTime.of(0, 0), 1, LocalDate.of(2026, 7, 1), null);

        assertThat(schedule.times()).hasSize(24);
    }

    @Test
    void fromDailyInterval_rejectsFrequencyHoursOutOfRange() {
        assertThatThrownBy(() -> MedicationSchedule.fromDailyInterval(
            LocalTime.of(8, 0), 0, LocalDate.of(2026, 7, 1), null))
            .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> MedicationSchedule.fromDailyInterval(
            LocalTime.of(8, 0), 25, LocalDate.of(2026, 7, 1), null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void fromDailyInterval_rejectsNullStartDate() {
        assertThatThrownBy(() -> MedicationSchedule.fromDailyInterval(
            LocalTime.of(8, 0), 8, null, null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void fromDailyInterval_rejectsEndDateBeforeStartDate() {
        assertThatThrownBy(() -> MedicationSchedule.fromDailyInterval(
            LocalTime.of(8, 0), 8, LocalDate.of(2026, 7, 10), LocalDate.of(2026, 7, 1)))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd backend && mvn test -Dtest=MedicationScheduleTest -q`
Expected: FAIL — error de compilación, `fromDailyInterval` no existe todavía en `MedicationSchedule`.

- [ ] **Step 3: Reescribir `MedicationSchedule.java`**

Reemplazar el contenido completo de
`backend/src/main/java/com/cuidalink/medication/domain/model/MedicationSchedule.java`:

```java
package com.cuidalink.medication.domain.model;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public record MedicationSchedule(
    List<LocalTime> times,
    Frequency frequency,
    List<DayOfWeek> daysOfWeek,
    LocalDate startDate,
    LocalDate endDate,
    Integer intervalDays,
    LocalTime startTime,
    Integer frequencyHours
) {

    public MedicationSchedule(List<LocalTime> times, Frequency frequency, List<DayOfWeek> daysOfWeek,
                              LocalDate startDate, LocalDate endDate, Integer intervalDays) {
        this(times, frequency, daysOfWeek, startDate, endDate, intervalDays, null, null);
    }

    public static MedicationSchedule fromDailyInterval(LocalTime startTime, int frequencyHours,
                                                        LocalDate startDate, LocalDate endDate) {
        if (startTime == null)
            throw new IllegalArgumentException("La hora de inicio es obligatoria");
        if (frequencyHours < 1 || frequencyHours > 24)
            throw new IllegalArgumentException("La frecuencia debe estar entre 1 y 24 horas");
        if (startDate == null)
            throw new IllegalArgumentException("La fecha de inicio es obligatoria");
        if (endDate != null && endDate.isBefore(startDate))
            throw new IllegalArgumentException("La fecha de término no puede ser anterior a la fecha de inicio");

        List<LocalTime> times = new ArrayList<>();
        for (int hours = 0; hours < 24; hours += frequencyHours) {
            times.add(startTime.plusHours(hours));
        }

        return new MedicationSchedule(times, Frequency.DAILY, List.of(), startDate, endDate,
            null, startTime, frequencyHours);
    }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd backend && mvn test -Dtest=MedicationScheduleTest -q`
Expected: PASS (6 tests).

- [ ] **Step 5: Correr toda la suite backend (sin integración)**

Run: `cd backend && mvn test -Dtest='!*IntegrationTest' -q`
Expected: PASS completo — esta tarea no toca ningún call-site existente de `MedicationSchedule`
(todos usan el constructor de 6 parámetros, que sigue funcionando).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/cuidalink/medication/domain/model/MedicationSchedule.java backend/src/test/java/com/cuidalink/medication/domain/model/MedicationScheduleTest.java
git commit -m "feat(backend): add MedicationSchedule.fromDailyInterval for hourly-interval schedules"
```

---

### Task 2: Exponer `startTime`/`frequencyHours` en la API

**Files:**
- Modify: `backend/src/main/java/com/cuidalink/medication/adapter/out/persistence/MedicationJpaEntity.java`
- Modify: `backend/src/main/java/com/cuidalink/medication/adapter/out/persistence/JpaMedicationRepositoryAdapter.java`
- Modify: `backend/src/main/java/com/cuidalink/medication/adapter/in/rest/dto/MedicationScheduleDto.java`
- Modify: `backend/src/main/java/com/cuidalink/medication/adapter/in/rest/MedicationController.java`
- Test: `backend/src/test/java/com/cuidalink/MedicationIntegrationTest.java`

**Interfaces:**
- Consumes (de Tarea 1): `MedicationSchedule.fromDailyInterval(...)`, constructor de 8 parámetros,
  `startTime()`/`frequencyHours()` accessors.
- Produces (consumido por Tarea 3, mobile): `POST`/`PUT /api/v1/patients/{id}/medications...` y
  `GET .../medications`/`.../medication-logs` responden con `schedule.startTime` (String `HH:mm:ss`
  o `null`) y `schedule.frequencyHours` (número o `null`) además de los campos ya existentes
  (`times, frequency, daysOfWeek, startDate, endDate, intervalDays`). Si `POST`/`PUT` envían
  `schedule.startTime`+`schedule.frequencyHours` sin `schedule.times`, el backend calcula `times`
  automáticamente.

- [ ] **Step 1: Escribir el test de integración que falla**

En `backend/src/test/java/com/cuidalink/MedicationIntegrationTest.java`, agregar este test nuevo al
final de la clase, antes del cierre `}` (después de `getDailyLogs_includesMedicationDetails`, línea
202 actual):

```java

    @Test
    void createMedication_withDailyInterval_computesTimesAndPersistsFields() {
        var schedule = new MedicationScheduleDto(
            null, null, null, LocalDate.now(), null, null,
            LocalTime.of(8, 0), 8
        );
        var req = new CreateMedicationRequest("Ibuprofeno", "400mg", "Con alimentos", schedule);
        var entity = new HttpEntity<>(req, authHeaders);

        var response = restTemplate.postForEntity(
            "/api/v1/patients/" + patientId + "/medications", entity, MedicationResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().schedule().times()).containsExactly(
            LocalTime.of(8, 0), LocalTime.of(16, 0), LocalTime.of(0, 0));
        assertThat(response.getBody().schedule().startTime()).isEqualTo(LocalTime.of(8, 0));
        assertThat(response.getBody().schedule().frequencyHours()).isEqualTo(8);

        var getResp = restTemplate.exchange(
            "/api/v1/patients/" + patientId + "/medications/" + response.getBody().id(),
            HttpMethod.GET,
            new HttpEntity<>(authHeaders),
            MedicationResponse.class
        );

        assertThat(getResp.getBody().schedule().startTime()).isEqualTo(LocalTime.of(8, 0));
        assertThat(getResp.getBody().schedule().frequencyHours()).isEqualTo(8);
    }
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd backend && mvn test-compile -q`
Expected: FAIL — error de compilación, `MedicationScheduleDto` no tiene un constructor de 8
parámetros ni métodos `startTime()`/`frequencyHours()` todavía.

(No se ejecuta el test en sí porque requiere Docker/Testcontainers, no disponible en este entorno —
`mvn test-compile` es suficiente para confirmar el RED de esta tarea.)

- [ ] **Step 3: Agregar columnas a `MedicationJpaEntity.java`**

En `backend/src/main/java/com/cuidalink/medication/adapter/out/persistence/MedicationJpaEntity.java`,
agregar los campos después de `private Integer scheduleIntervalDays;` (línea 26 actual):

```java
    private String scheduleStartTime;
    private Integer scheduleFrequencyHours;
```

Y agregar los getters/setters al final de la clase, antes del cierre `}`:

```java
    public String getScheduleStartTime() { return scheduleStartTime; }
    public void setScheduleStartTime(String scheduleStartTime) { this.scheduleStartTime = scheduleStartTime; }

    public Integer getScheduleFrequencyHours() { return scheduleFrequencyHours; }
    public void setScheduleFrequencyHours(Integer scheduleFrequencyHours) { this.scheduleFrequencyHours = scheduleFrequencyHours; }
```

- [ ] **Step 4: Mapear los campos en `JpaMedicationRepositoryAdapter.java`**

En el método `toJpa` (líneas 49-69 actuales), agregar dentro del bloque `if (s != null) { ... }`,
después de `e.setScheduleIntervalDays(s.intervalDays());`:

```java
            e.setScheduleStartTime(s.startTime() != null ? s.startTime().toString() : null);
            e.setScheduleFrequencyHours(s.frequencyHours());
```

En el método `toDomain` (líneas 71-91 actuales), reemplazar la construcción de `schedule` por:

```java
        var schedule = new MedicationSchedule(
            timesFromString(e.getScheduleTimes()),
            Frequency.valueOf(e.getFrequency()),
            daysFromString(e.getScheduleDaysOfWeek()),
            e.getScheduleStartDate(),
            e.getScheduleEndDate(),
            e.getScheduleIntervalDays(),
            e.getScheduleStartTime() != null ? LocalTime.parse(e.getScheduleStartTime()) : null,
            e.getScheduleFrequencyHours()
        );
```

(No hace falta agregar import: `LocalTime` ya está importado en la línea 9 del archivo.)

- [ ] **Step 5: Agregar los campos a `MedicationScheduleDto.java`**

Reemplazar el contenido completo de
`backend/src/main/java/com/cuidalink/medication/adapter/in/rest/dto/MedicationScheduleDto.java`:

```java
package com.cuidalink.medication.adapter.in.rest.dto;

import com.cuidalink.medication.domain.model.Frequency;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record MedicationScheduleDto(
    List<LocalTime> times,
    Frequency frequency,
    List<DayOfWeek> daysOfWeek,
    LocalDate startDate,
    LocalDate endDate,
    Integer intervalDays,
    LocalTime startTime,
    Integer frequencyHours
) {

    public MedicationScheduleDto(List<LocalTime> times, Frequency frequency, List<DayOfWeek> daysOfWeek,
                                 LocalDate startDate, LocalDate endDate, Integer intervalDays) {
        this(times, frequency, daysOfWeek, startDate, endDate, intervalDays, null, null);
    }
}
```

- [ ] **Step 6: Actualizar `MedicationController.java`**

Reemplazar los métodos `toScheduleDomain` y `toResponse` (líneas 100-134 actuales aprox.) por:

```java
    private MedicationSchedule toScheduleDomain(MedicationScheduleDto dto) {
        boolean hasExplicitTimes = dto.times() != null && !dto.times().isEmpty();
        if (!hasExplicitTimes && dto.startTime() != null && dto.frequencyHours() != null) {
            return MedicationSchedule.fromDailyInterval(
                dto.startTime(), dto.frequencyHours(), dto.startDate(), dto.endDate());
        }
        return new MedicationSchedule(
            dto.times() != null ? dto.times() : List.of(),
            dto.frequency(),
            dto.daysOfWeek() != null ? dto.daysOfWeek() : List.of(),
            dto.startDate(),
            dto.endDate(),
            dto.intervalDays()
        );
    }

    private MedicationResponse toResponse(Medication m) {
        MedicationScheduleDto schedDto = null;
        if (m.getSchedule() != null) {
            var s = m.getSchedule();
            schedDto = new MedicationScheduleDto(
                s.times(), s.frequency(), s.daysOfWeek(), s.startDate(), s.endDate(), s.intervalDays(),
                s.startTime(), s.frequencyHours()
            );
        }
        return new MedicationResponse(
            m.getId().value().toString(),
            m.getPatientId().value().toString(),
            m.getName(),
            m.getDosage(),
            m.getInstructions(),
            m.getType().name(),
            schedDto,
            m.isActive()
        );
    }
```

- [ ] **Step 7: Verificar que el test de integración compila**

Run: `cd backend && mvn test-compile -q`
Expected: sin errores.

- [ ] **Step 8: Correr el resto de la suite backend (sin integración)**

Run: `cd backend && mvn test -Dtest='!*IntegrationTest' -q`
Expected: PASS completo, incluyendo `MedicationScheduleTest` de la Tarea 1.

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/cuidalink/medication/adapter backend/src/test/java/com/cuidalink/MedicationIntegrationTest.java
git commit -m "feat(backend): expose startTime/frequencyHours through the medication API"
```

---

### Task 3: Mobile — corregir `Medication.ts` y agregar `createMedication`

**Files:**
- Modify: `appmovil/src/domain/entities/Medication.ts`
- Modify: `appmovil/src/domain/repositories/MedicationRepository.ts`
- Modify: `appmovil/src/data/repositories/ApiMedicationRepository.ts`

**Interfaces:**
- Produces (consumido por Tarea 4):
  - `MedicationSchedule` (tipo, exportado desde `@/domain/entities`):
    `{ times: string[]; frequency: 'DAILY'|'EVERY_X_DAYS'|'WEEKLY'; daysOfWeek: string[]; startDate: string; endDate: string | null; intervalDays: number | null; startTime: string | null; frequencyHours: number | null }`.
  - `Medication` gana `instructions: string` y `schedule: MedicationSchedule` (reemplaza los campos
    sueltos `frequency`/`scheduledTimes` que tenía antes).
  - `CreateMedicationData` (tipo, exportado desde `@/domain/repositories/MedicationRepository`):
    `{ name: string; dosage: string; instructions: string; startTime: string; frequencyHours: number; startDate: string; endDate: string | null }`.
  - `MedicationRepository.createMedication(patientId: string, data: CreateMedicationData): Promise<Medication>`.
- Consumes: nada de tareas anteriores (mobile no depende del backend a nivel de compilación; el
  contrato de datos ya quedó fijado en la Tarea 2).

Esta tarea no tiene test dedicado nuevo (no hay convención de test para `data/repositories/*.ts` en
este repo, ni para tipos planos de entidades). Se verifica con `tsc` y la suite completa.

- [ ] **Step 1: Reescribir `Medication.ts`**

Reemplazar el contenido completo de `appmovil/src/domain/entities/Medication.ts`:

```ts
export type MedicationType = 'TABLET' | 'CAPSULE' | 'INJECTION' | 'OTHER';

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

- [ ] **Step 2: Agregar `createMedication` a `MedicationRepository.ts`**

Reemplazar el contenido completo de `appmovil/src/domain/repositories/MedicationRepository.ts`:

```ts
import { Medication, MedicationLog } from '@/domain/entities';

export interface CreateMedicationData {
  name: string;
  dosage: string;
  instructions: string;
  startTime: string;
  frequencyHours: number;
  startDate: string;
  endDate: string | null;
}

export interface MedicationRepository {
  listMedications(patientId: string): Promise<Medication[]>;
  createMedication(patientId: string, data: CreateMedicationData): Promise<Medication>;
  getDailyLogs(patientId: string, date: string): Promise<MedicationLog[]>;
  confirmLog(logId: string): Promise<MedicationLog>;
  missLog(logId: string): Promise<MedicationLog>;
}
```

- [ ] **Step 3: Implementar `createMedication` en `ApiMedicationRepository.ts`**

Reemplazar el contenido completo de `appmovil/src/data/repositories/ApiMedicationRepository.ts`:

```ts
import apiClient from '@/data/http/apiClient';
import { MedicationRepository, CreateMedicationData } from '@/domain/repositories/MedicationRepository';
import { Medication, MedicationLog } from '@/domain/entities';

export class ApiMedicationRepository implements MedicationRepository {
  async listMedications(patientId: string): Promise<Medication[]> {
    const res = await apiClient.get<Medication[]>(`/patients/${patientId}/medications`);
    return res.data;
  }

  async createMedication(patientId: string, data: CreateMedicationData): Promise<Medication> {
    const res = await apiClient.post<Medication>(`/patients/${patientId}/medications`, {
      name: data.name,
      dosage: data.dosage,
      instructions: data.instructions,
      schedule: {
        startTime: data.startTime,
        frequencyHours: data.frequencyHours,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
    return res.data;
  }

  async getDailyLogs(patientId: string, date: string): Promise<MedicationLog[]> {
    const res = await apiClient.get<MedicationLog[]>(
      `/patients/${patientId}/medication-logs?date=${date}`,
    );
    return res.data;
  }

  async confirmLog(logId: string): Promise<MedicationLog> {
    const res = await apiClient.patch<MedicationLog>(`/medication-logs/${logId}`, { status: 'CONFIRMED' });
    return res.data;
  }

  async missLog(logId: string): Promise<MedicationLog> {
    const res = await apiClient.patch<MedicationLog>(`/medication-logs/${logId}`, { status: 'MISSED' });
    return res.data;
  }
}
```

- [ ] **Step 4: Verificar tipos y suite completa**

Run: `cd appmovil && npx tsc --noEmit`
Expected: sin errores.

Run: `cd appmovil && npx jest`
Expected: todos los tests existentes en PASS (nada en el repo lee hoy `medication.frequency` ni
`medication.scheduledTimes` fuera de la propia declaración de tipo — verificado por grep antes de
escribir este plan).

- [ ] **Step 5: Commit**

```bash
git add appmovil/src/domain/entities/Medication.ts appmovil/src/domain/repositories/MedicationRepository.ts appmovil/src/data/repositories/ApiMedicationRepository.ts
git commit -m "fix(appmovil): align Medication type with the backend's nested schedule and add createMedication"
```

---

### Task 4: `CreateMedicationScreen` + navegación

**Files:**
- Create: `appmovil/src/presentation/screens/medications/CreateMedicationScreen.tsx`
- Test: `appmovil/src/presentation/screens/medications/__tests__/CreateMedicationScreen.test.tsx`
- Modify: `appmovil/src/presentation/navigation/AppNavigator.tsx`
- Modify: `appmovil/src/presentation/screens/medications/DailyMedsScreen.tsx:143-156`

**Interfaces:**
- Consumes (de Tarea 3): `MedicationRepository.createMedication(patientId, data): Promise<Medication>`.
- Produces: `CreateMedicationScreen` (default export) con props
  `{ navigation: NativeStackNavigationProp<PatientStackParams, 'CreateMedication'> }`. Ruta
  `'CreateMedication'` registrada en `AppNavigator` con `headerShown: false`.

- [ ] **Step 1: Escribir el test**

Crear `appmovil/src/presentation/screens/medications/__tests__/CreateMedicationScreen.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateMedicationScreen from '../CreateMedicationScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';

jest.mock('@/presentation/hooks/useInjection');

jest.mock('@react-native-community/datetimepicker', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockDateTimePicker({ onChange, testID }: any) {
    return (
      <TouchableOpacity testID={testID} onPress={() => onChange({}, new Date(2026, 7, 1, 8, 0, 0))}>
        <Text>mock-picker</Text>
      </TouchableOpacity>
    );
  };
});

const mockedUseInjection = useInjection as jest.Mock;

function renderScreen(navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const createMedication = jest.fn().mockResolvedValue({});
  mockedUseInjection.mockReturnValue({ medicationRepo: { createMedication } });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <CreateMedicationScreen navigation={navigation} />
    </QueryClientProvider>
  );

  return { navigation, createMedication };
}

describe('CreateMedicationScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ selectedPatientId: 'p1' });
  });

  afterEach(() => {
    useAuthStore.setState({ selectedPatientId: null });
  });

  it('muestra los 8 campos del formulario', () => {
    renderScreen();
    expect(screen.getByText('1. Nombre del medicamento')).toBeTruthy();
    expect(screen.getByText('2. Dosis')).toBeTruthy();
    expect(screen.getByText('3. Hora de inicio')).toBeTruthy();
    expect(screen.getByText('4. Frecuencia (en horas)')).toBeTruthy();
    expect(screen.getByText('5. Fecha de inicio')).toBeTruthy();
    expect(screen.getByText('6. Fecha de término')).toBeTruthy();
    expect(screen.getByText('7. Indefinido')).toBeTruthy();
    expect(screen.getByText('8. Condiciones de administración')).toBeTruthy();
  });

  it('el stepper de frecuencia respeta el rango 1-24', () => {
    renderScreen();
    expect(screen.getByText('8')).toBeTruthy();
    for (let i = 0; i < 10; i++) fireEvent.press(screen.getByText('−'));
    expect(screen.getByText('1')).toBeTruthy();
    for (let i = 0; i < 30; i++) fireEvent.press(screen.getByText('+'));
    expect(screen.getByText('24')).toBeTruthy();
  });

  it('el toggle "Indefinido" deshabilita el campo de fecha de término', () => {
    renderScreen();
    expect(screen.getByTestId('end-date-trigger').props.accessibilityState?.disabled).toBe(true);

    fireEvent(screen.getByTestId('indefinite-switch'), 'valueChange', false);

    expect(screen.getByTestId('end-date-trigger').props.accessibilityState?.disabled).toBeFalsy();
  });

  it('muestra error si falta el nombre al guardar', async () => {
    renderScreen();
    fireEvent.press(screen.getByText('Guardar medicamento'));
    expect(await screen.findByText('Nombre requerido')).toBeTruthy();
  });

  it('guarda exitosamente y navega atrás', async () => {
    const { createMedication, navigation } = renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('Ingresa el nombre del medicamento'), 'Paracetamol');
    fireEvent.changeText(screen.getByPlaceholderText('Ej: 1 tableta / 10 ml'), '1 tableta');

    fireEvent.press(screen.getByTestId('start-time-trigger'));
    fireEvent.press(screen.getByTestId('start-time-picker'));

    fireEvent.press(screen.getByTestId('start-date-trigger'));
    fireEvent.press(screen.getByTestId('start-date-picker'));

    fireEvent.press(screen.getByText('Guardar medicamento'));

    await waitFor(() => expect(createMedication).toHaveBeenCalledWith('p1', {
      name: 'Paracetamol',
      dosage: '1 tableta',
      instructions: '',
      startTime: '08:00',
      frequencyHours: 8,
      startDate: '2026-08-01',
      endDate: null,
    }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('muestra una alerta cuando falla la creación', async () => {
    const createMedication = jest.fn().mockRejectedValue(new Error('network'));
    mockedUseInjection.mockReturnValue({ medicationRepo: { createMedication } });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    render(
      <QueryClientProvider client={queryClient}>
        <CreateMedicationScreen navigation={navigation as any} />
      </QueryClientProvider>
    );

    fireEvent.changeText(screen.getByPlaceholderText('Ingresa el nombre del medicamento'), 'Paracetamol');
    fireEvent.changeText(screen.getByPlaceholderText('Ej: 1 tableta / 10 ml'), '1 tableta');
    fireEvent.press(screen.getByTestId('start-time-trigger'));
    fireEvent.press(screen.getByTestId('start-time-picker'));
    fireEvent.press(screen.getByTestId('start-date-trigger'));
    fireEvent.press(screen.getByTestId('start-date-picker'));
    fireEvent.press(screen.getByText('Guardar medicamento'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo crear el medicamento.'));
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd appmovil && npx jest src/presentation/screens/medications/__tests__/CreateMedicationScreen.test.tsx`
Expected: FAIL — `Cannot find module '../CreateMedicationScreen'`.

- [ ] **Step 3: Crear `CreateMedicationScreen.tsx`**

Crear `appmovil/src/presentation/screens/medications/CreateMedicationScreen.tsx`:

```tsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Switch, Image, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import ScreenBackground from '@/presentation/components/ScreenBackground';

const schema = z.object({
  name: z.string({ error: 'Nombre requerido' }).min(1, 'Nombre requerido'),
  dosage: z.string({ error: 'Dosis requerida' }).min(1, 'Dosis requerida'),
  startTime: z.string({ error: 'Hora de inicio requerida' }).min(1, 'Hora de inicio requerida'),
  frequencyHours: z.number().min(1).max(24),
  startDate: z.string({ error: 'Fecha de inicio requerida' }).min(1, 'Fecha de inicio requerida'),
  endDate: z.string().nullable(),
  indefinite: z.boolean(),
  instructions: z.string(),
}).refine((data) => data.indefinite || !!data.endDate, {
  message: 'Selecciona la fecha de término o activa Indefinido',
  path: ['endDate'],
});
type FormData = z.infer<typeof schema>;

type Props = { navigation: NativeStackNavigationProp<PatientStackParams, 'CreateMedication'> };

export default function CreateMedicationScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const { medicationRepo } = useInjection();
  const selectedPatientId = useAuthStore((s) => s.selectedPatientId);
  const queryClient = useQueryClient();

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      startTime: '', frequencyHours: 8, startDate: '', endDate: null,
      indefinite: true, instructions: '',
    },
  });

  const startTime = watch('startTime');
  const frequencyHours = watch('frequencyHours');
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const indefinite = watch('indefinite');

  const onSubmit = async (data: FormData) => {
    if (!selectedPatientId) return;
    setLoading(true);
    try {
      await medicationRepo.createMedication(selectedPatientId, {
        name: data.name,
        dosage: data.dosage,
        instructions: data.instructions,
        startTime: data.startTime,
        frequencyHours: data.frequencyHours,
        startDate: data.startDate,
        endDate: data.indefinite ? null : data.endDate,
      });
      await queryClient.invalidateQueries({ queryKey: ['medications', selectedPatientId] });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo crear el medicamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 20, paddingTop: 24, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
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

        <Text style={styles.title}>Nuevo medicamento</Text>
        <Text style={styles.subtitle}>Configura dosis, horario y duración del tratamiento</Text>

        <View style={styles.card}>
          <Text style={styles.label}>1. Nombre del medicamento</Text>
          <Controller control={control} name="name" render={({ field: { onChange, value } }) => (
            <TextInput style={styles.input} placeholder="Ingresa el nombre del medicamento"
              placeholderTextColor="#7c93ab" value={value} onChangeText={onChange} />
          )} />
          {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

          <Text style={styles.label}>2. Dosis</Text>
          <Controller control={control} name="dosage" render={({ field: { onChange, value } }) => (
            <TextInput style={styles.input} placeholder="Ej: 1 tableta / 10 ml"
              placeholderTextColor="#7c93ab" value={value} onChangeText={onChange} />
          )} />
          {errors.dosage && <Text style={styles.error}>{errors.dosage.message}</Text>}

          <View style={styles.row}>
            <View style={styles.rowColumn}>
              <Text style={styles.label}>3. Hora de inicio</Text>
              <TouchableOpacity style={styles.input} testID="start-time-trigger" onPress={() => setShowTimePicker(true)}>
                <Ionicons name="time-outline" size={16} color="#5ee7df" />
                <Text style={styles.inputText}>{startTime || 'Selecciona la hora'}</Text>
              </TouchableOpacity>
              {errors.startTime && <Text style={styles.error}>{errors.startTime.message}</Text>}
            </View>
            <View style={styles.rowColumn}>
              <Text style={styles.label}>4. Frecuencia (en horas)</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setValue('frequencyHours', Math.max(1, frequencyHours - 1), { shouldValidate: true })}
                >
                  <Text style={styles.stepperButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{frequencyHours}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setValue('frequencyHours', Math.min(24, frequencyHours + 1), { shouldValidate: true })}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          {showTimePicker && (
            <DateTimePicker
              testID="start-time-picker"
              value={startTime ? new Date(`2000-01-01T${startTime}:00`) : new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (selected) {
                  const hh = String(selected.getHours()).padStart(2, '0');
                  const mm = String(selected.getMinutes()).padStart(2, '0');
                  setValue('startTime', `${hh}:${mm}`, { shouldValidate: true });
                }
              }}
            />
          )}

          <View style={styles.row}>
            <View style={styles.rowColumn}>
              <Text style={styles.label}>5. Fecha de inicio</Text>
              <TouchableOpacity style={styles.input} testID="start-date-trigger" onPress={() => setShowStartDatePicker(true)}>
                <Ionicons name="calendar-outline" size={16} color="#5ee7df" />
                <Text style={styles.inputText}>{startDate || 'Selecciona la fecha'}</Text>
              </TouchableOpacity>
              {errors.startDate && <Text style={styles.error}>{errors.startDate.message}</Text>}
            </View>
            <View style={styles.rowColumn}>
              <Text style={styles.label}>6. Fecha de término</Text>
              <TouchableOpacity
                style={[styles.input, indefinite && styles.inputDisabled]}
                testID="end-date-trigger"
                disabled={indefinite}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={16} color={indefinite ? '#5b7186' : '#5ee7df'} />
                <Text style={[styles.inputText, indefinite && styles.inputTextDisabled]}>
                  {endDate || 'Selecciona la fecha'}
                </Text>
              </TouchableOpacity>
              {errors.endDate && <Text style={styles.error}>{errors.endDate.message}</Text>}
            </View>
          </View>
          {showStartDatePicker && (
            <DateTimePicker
              testID="start-date-picker"
              value={startDate ? new Date(startDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                setShowStartDatePicker(Platform.OS === 'ios');
                if (selected) {
                  setValue('startDate', selected.toISOString().split('T')[0], { shouldValidate: true });
                }
              }}
            />
          )}
          {showEndDatePicker && (
            <DateTimePicker
              testID="end-date-picker"
              value={endDate ? new Date(endDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                setShowEndDatePicker(Platform.OS === 'ios');
                if (selected) {
                  setValue('endDate', selected.toISOString().split('T')[0], { shouldValidate: true });
                }
              }}
            />
          )}

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>7. Indefinido</Text>
              <Text style={styles.helpText}>La fecha de inicio es obligatoria.</Text>
            </View>
            <Switch
              testID="indefinite-switch"
              value={indefinite}
              onValueChange={(value) => {
                setValue('indefinite', value, { shouldValidate: true });
                if (value) setValue('endDate', null, { shouldValidate: true });
              }}
              trackColor={{ false: 'rgba(255,255,255,0.18)', true: '#e05555' }}
              thumbColor="#fff"
            />
          </View>

          <Text style={styles.label}>8. Condiciones de administración</Text>
          <Controller control={control} name="instructions" render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Ej: Después de comer, En ayunas, Con abundante agua, etc."
              placeholderTextColor="#7c93ab"
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={4}
            />
          )} />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSubmit(onSubmit)} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Guardar medicamento</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },

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

  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#a5d8f3', marginTop: 4, marginBottom: 20 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 20,
    marginBottom: 24,
  },
  label: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 8, marginTop: 16 },
  input: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    minHeight: 48,
  },
  inputDisabled: { opacity: 0.5 },
  inputText: { color: '#fff', fontSize: 15 },
  inputTextDisabled: { color: '#7c93ab' },
  textarea: { alignItems: 'flex-start', minHeight: 90, paddingTop: 12 },
  error: { color: '#ff8a8a', fontSize: 12, marginTop: 4 },

  row: { flexDirection: 'row', gap: 12 },
  rowColumn: { flex: 1 },

  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingHorizontal: 8, minHeight: 48,
  },
  stepperButton: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepperButtonText: { color: '#5ee7df', fontSize: 20, fontWeight: 'bold' },
  stepperValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, marginBottom: 4,
  },
  helpText: { color: '#a5d8f3', fontSize: 12, marginTop: 2 },

  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#e05555', borderRadius: 16,
    paddingVertical: 16, marginBottom: 12,
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  cancelButton: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#5ee7df', borderRadius: 16,
    paddingVertical: 14,
  },
  cancelButtonText: { color: '#5ee7df', fontWeight: 'bold', fontSize: 16 },
});
```

- [ ] **Step 4: Registrar la ruta en `AppNavigator.tsx`**

Agregar el import junto a los otros imports de pantallas:

```ts
import CreateMedicationScreen from '@/presentation/screens/medications/CreateMedicationScreen';
```

Extender `PatientStackParams` (agregar `CreateMedication: undefined;` junto a las demás claves):

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
  Contacts: { patientId: string };
  CreateMedication: undefined;
};
```

Agregar el `Stack.Screen`:

```tsx
<Stack.Screen name="CreateMedication" component={CreateMedicationScreen} options={{ headerShown: false }} />
```

- [ ] **Step 5: Actualizar el botón "Agregar medicamento" en `DailyMedsScreen.tsx`**

En `appmovil/src/presentation/screens/medications/DailyMedsScreen.tsx`, reemplazar (líneas 143-156
actuales):

```tsx
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() =>
              navigation.navigate('ComingSoon', {
                title: 'Agregar medicamento',
                subtitle: 'Registrar un nuevo medicamento',
              })
            }
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Agregar medicamento</Text>
          </TouchableOpacity>
        }
```

por:

```tsx
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateMedication')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Agregar medicamento</Text>
          </TouchableOpacity>
        }
```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `cd appmovil && npx jest src/presentation/screens/medications/__tests__/CreateMedicationScreen.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 7: Actualizar el test existente de `DailyMedsScreen` que quedó desactualizado**

El cambio del Step 5 rompe un test existente: `DailyMedsScreen.test.tsx` tiene un caso que espera que
"Agregar medicamento" navegue a `ComingSoon`. En
`appmovil/src/presentation/screens/medications/__tests__/DailyMedsScreen.test.tsx`, reemplazar:

```tsx
  it('navega a ComingSoon al presionar "Agregar medicamento"', async () => {
    const { navigation } = renderScreen([]);
    fireEvent.press(await screen.findByText('Agregar medicamento'));
    expect(navigation.navigate).toHaveBeenCalledWith('ComingSoon', {
      title: 'Agregar medicamento',
      subtitle: 'Registrar un nuevo medicamento',
    });
  });
```

por:

```tsx
  it('navega a CreateMedication al presionar "Agregar medicamento"', async () => {
    const { navigation } = renderScreen([]);
    fireEvent.press(await screen.findByText('Agregar medicamento'));
    expect(navigation.navigate).toHaveBeenCalledWith('CreateMedication');
  });
```

- [ ] **Step 8: Correr toda la suite y verificar tipos**

Run: `cd appmovil && npx jest`
Expected: todos los tests en PASS (existentes + nuevos).

Run: `cd appmovil && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 9: Verificación manual visual**

Con el backend corriendo localmente (`cd backend && mvn spring-boot:run`, PostgreSQL local activo,
Docker disponible) y `cd appmovil && npx expo start`: navegar Inicio → Mis pacientes → un paciente →
Medicamentos → Agregar medicamento. Confirmar contra el mockup: los 8 campos numerados, el stepper de
frecuencia, el toggle "Indefinido" deshabilitando la fecha de término, guardar exitosamente y volver
a la lista.

- [ ] **Step 10: Commit**

```bash
git add appmovil/src/presentation/screens/medications/CreateMedicationScreen.tsx appmovil/src/presentation/screens/medications/__tests__/CreateMedicationScreen.test.tsx appmovil/src/presentation/navigation/AppNavigator.tsx appmovil/src/presentation/screens/medications/DailyMedsScreen.tsx
git commit -m "feat(appmovil): add CreateMedicationScreen and wire it from DailyMedsScreen"
```
