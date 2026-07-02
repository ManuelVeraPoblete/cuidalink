# Pantalla "Medicamentos de hoy" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar "Medicamentos de hoy" (`DailyMedsScreen`) en la app móvil siguiendo un mockup estricto, arreglando en el camino dos bugs reales pre-existentes (el endpoint de logs diarios no trae nombre/dosis/indicaciones del medicamento, y confirmar/omitir devuelve 404), y agregando un campo `type` al dominio `Medication` para elegir el ícono de cada tarjeta.

**Architecture:** Hexagonal en ambos módulos. Backend: se agrega `MedicationType` al dominio `Medication` con default `TABLET`, y `MedicationLogController` enriquece cada log con los datos de su `Medication` antes de responder. Mobile: se corrige `ApiMedicationRepository` para llamar la ruta real de confirmar/omitir, y se reescriben `DailyMedsScreen`/`MedicationCard` más un `MedicationActionModal` nuevo.

**Tech Stack:** Java 17, Spring Boot 3.2, Spring Data JPA, PostgreSQL 15, Testcontainers (backend). React Native 0.74, TypeScript 5 (strict), TanStack Query 5, Zustand 5, `@expo/vector-icons` (Ionicons), Jest + `@testing-library/react-native` (mobile).

## Global Constraints

- Backend hexagonal: `domain/model/` y `domain/service/` nunca importan `jakarta.persistence` ni `org.springframework.*`. Los adaptadores JPA viven solo en `adapter/out/persistence/`.
- `server.servlet.context-path=/api/v1` — todas las rutas HTTP reales llevan ese prefijo (los tests de integración ya lo usan explícitamente).
- `spring.jpa.hibernate.ddl-auto=update` — agregar una columna nueva a una entidad JPA no requiere migración manual, Hibernate la crea sola.
- Mobile hexagonal: `presentation/` solo importa de `domain/`, nunca de `data/` directamente. Inyección de dependencias vía `useInjection.ts`.
- TypeScript strict (`tsconfig.json`), alias `@/*` → `src/*`.
- Único paquete de íconos usado en todo el repo: `Ionicons` de `@expo/vector-icons`. Verificado que no existen glyphs de píldora/cápsula/jeringa reales — se usan los más cercanos disponibles (ver Tarea 5).
- Sin comentarios en el código salvo que documenten un porqué no obvio.
- Paleta/estilo visual ya establecida: cards `rgba(255,255,255,0.06)` con borde `rgba(255,255,255,0.18)`, `borderRadius: 20`, acentos `#5ee7df` / `#38bdf8` / `#a5d8f3`, verde `#1a9c7d`, ámbar `#e6b800`, rojo `#e05555`.
- Backend JSON ↔️ tipos TypeScript: `apiClient.get<MedicationLog[]>(...)` en `ApiMedicationRepository.ts` deserializa la respuesta del backend directamente como el tipo `MedicationLog` sin capa de mapeo — los nombres de campo del `record` Java y de la `interface` TypeScript deben coincidir exactamente.
- Jest usa `jest-expo` (transpila, no type-checka) — `npx tsc --noEmit` es el chequeo de tipos autoritativo en mobile. `mvn test -q` es autoritativo en backend (incluye Testcontainers).

---

### Task 1: `MedicationType` + campo `type` en el dominio `Medication`

**Files:**
- Create: `backend/src/main/java/com/cuidalink/medication/domain/model/MedicationType.java`
- Modify: `backend/src/main/java/com/cuidalink/medication/domain/model/Medication.java`
- Test: `backend/src/test/java/com/cuidalink/medication/domain/service/MedicationServiceTest.java`

**Interfaces:**
- Produces (consumido por Tarea 2): `MedicationType` enum con valores `TABLET, CAPSULE, INJECTION, OTHER`. `Medication.getType(): MedicationType`. Constructor de 8 parámetros `Medication(MedicationId, PatientId, String name, String dosage, String instructions, MedicationSchedule, boolean active, MedicationType type)`, y un *convenience constructor* de 7 parámetros (igual al actual) que delega al de 8 pasando `MedicationType.TABLET`.
- Consumes: nada nuevo — `MedicationService.execute()` y los 4 call sites de `new Medication(...)` en `MedicationServiceTest.java` siguen usando el constructor de 7 parámetros sin cambios.

- [ ] **Step 1: Escribir el test que falla**

En `backend/src/test/java/com/cuidalink/medication/domain/service/MedicationServiceTest.java`, agregar este método nuevo justo después de `createMedication_ownerCanCreateMedication` (línea 73 actual, antes de `confirmLog_collaboratorCanConfirmPendingLog`):

```java
    @Test
    void createMedication_defaultsTypeToTablet() {
        var patient = buildPatient(ownerId);
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));
        when(medicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = sut.execute(new CreateMedicationUseCase.CreateMedicationCommand(
            patient.getId(), "Metformina", "500mg", "Con comida", schedule, ownerId));

        assertThat(result.getType()).isEqualTo(MedicationType.TABLET);
    }
```

No hace falta agregar ningún import: el archivo ya tiene `import com.cuidalink.medication.domain.model.*;` en la línea 4, que cubre `MedicationType` una vez que exista.

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd backend && mvn test -Dtest=MedicationServiceTest -q`
Expected: FAIL — error de compilación, `cannot find symbol: method getType()` (y `MedicationType` tampoco existe todavía).

- [ ] **Step 3: Crear `MedicationType.java`**

Crear `backend/src/main/java/com/cuidalink/medication/domain/model/MedicationType.java`:

```java
package com.cuidalink.medication.domain.model;

public enum MedicationType {
    TABLET,
    CAPSULE,
    INJECTION,
    OTHER
}
```

- [ ] **Step 4: Modificar `Medication.java`**

Reemplazar el contenido completo de `backend/src/main/java/com/cuidalink/medication/domain/model/Medication.java`:

```java
package com.cuidalink.medication.domain.model;

import com.cuidalink.patient.domain.model.PatientId;

public class Medication {

    private final MedicationId id;
    private final PatientId patientId;
    private String name;
    private String dosage;
    private String instructions;
    private MedicationSchedule schedule;
    private boolean active;
    private final MedicationType type;

    public Medication(MedicationId id, PatientId patientId, String name, String dosage,
                      String instructions, MedicationSchedule schedule, boolean active,
                      MedicationType type) {
        this.id = id;
        this.patientId = patientId;
        this.name = name;
        this.dosage = dosage;
        this.instructions = instructions;
        this.schedule = schedule;
        this.active = active;
        this.type = type;
    }

    /** Convenience constructor for callers that don't set a type yet — defaults to TABLET. */
    public Medication(MedicationId id, PatientId patientId, String name, String dosage,
                      String instructions, MedicationSchedule schedule, boolean active) {
        this(id, patientId, name, dosage, instructions, schedule, active, MedicationType.TABLET);
    }

    public void update(String name, String dosage, String instructions, MedicationSchedule schedule) {
        this.name = name;
        this.dosage = dosage;
        this.instructions = instructions;
        this.schedule = schedule;
    }

    public void deactivate() { this.active = false; }

    public MedicationId getId() { return id; }
    public PatientId getPatientId() { return patientId; }
    public String getName() { return name; }
    public String getDosage() { return dosage; }
    public String getInstructions() { return instructions; }
    public MedicationSchedule getSchedule() { return schedule; }
    public boolean isActive() { return active; }
    public MedicationType getType() { return type; }
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd backend && mvn test -Dtest=MedicationServiceTest -q`
Expected: PASS (todos los tests del archivo, incluyendo el nuevo).

- [ ] **Step 6: Correr toda la suite backend**

Run: `cd backend && mvn test -q`
Expected: PASS completo (esta tarea no debería afectar otros módulos).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/cuidalink/medication/domain/model/MedicationType.java backend/src/main/java/com/cuidalink/medication/domain/model/Medication.java backend/src/test/java/com/cuidalink/medication/domain/service/MedicationServiceTest.java
git commit -m "feat(backend): add MedicationType with TABLET default to Medication domain"
```

---

### Task 2: Exponer `type` en la API y enriquecer los logs diarios con datos del medicamento

**Files:**
- Modify: `backend/src/main/java/com/cuidalink/medication/adapter/out/persistence/MedicationJpaEntity.java`
- Modify: `backend/src/main/java/com/cuidalink/medication/adapter/out/persistence/JpaMedicationRepositoryAdapter.java`
- Modify: `backend/src/main/java/com/cuidalink/medication/adapter/in/rest/dto/MedicationResponse.java`
- Modify: `backend/src/main/java/com/cuidalink/medication/adapter/in/rest/MedicationController.java`
- Modify: `backend/src/main/java/com/cuidalink/medication/adapter/in/rest/dto/MedicationLogResponse.java`
- Modify: `backend/src/main/java/com/cuidalink/medication/adapter/in/rest/MedicationLogController.java`
- Test: `backend/src/test/java/com/cuidalink/MedicationIntegrationTest.java`

**Interfaces:**
- Consumes (de Tarea 1): `MedicationType` enum, `Medication.getType()`, constructor de 8 parámetros.
- Produces (consumido por Tarea 3, mobile): `GET /api/v1/patients/{id}/medication-logs` responde JSON con campos `id, medicationId, medicationName, dosage, instructions, type, scheduledAt, status, administeredById, confirmedAt` por cada log — `type` es el nombre del enum como String (`"TABLET"`, etc). `GET`/`POST`/`PUT /api/v1/patients/{id}/medications...` ahora también incluye `type` en `MedicationResponse`.

- [ ] **Step 1: Escribir el test de integración que falla**

En `backend/src/test/java/com/cuidalink/MedicationIntegrationTest.java`, agregar estos imports junto a los existentes (después de la línea 13, antes de los imports de JUnit/Spring):

```java
import com.cuidalink.medication.adapter.in.rest.dto.MedicationLogResponse;
import com.cuidalink.medication.domain.model.LogStatus;
import com.cuidalink.medication.domain.model.MedicationId;
import com.cuidalink.medication.domain.model.MedicationLog;
import com.cuidalink.medication.domain.model.MedicationLogId;
import com.cuidalink.medication.domain.port.out.MedicationLogRepository;
import com.cuidalink.patient.domain.model.PatientId;
```

y agregar `java.time.LocalDateTime` junto al `import java.time.LocalDate;` / `import java.time.LocalTime;` ya existentes (línea 28-29).

Agregar el campo autowired junto a `restTemplate`/`notificationSender` (después de la línea 58):

```java
    @Autowired
    MedicationLogRepository medicationLogRepository;
```

Agregar este test nuevo al final de la clase, antes del cierre `}` (después de `listMedications_afterCreate_returnsList`, línea 152):

```java

    @Test
    void getDailyLogs_includesMedicationDetails() {
        var schedule = new MedicationScheduleDto(
            List.of(LocalTime.of(8, 0)),
            Frequency.DAILY,
            List.of(),
            LocalDate.now(),
            null,
            null
        );
        var medReq = new CreateMedicationRequest("Paracetamol", "1 tableta", "Después del desayuno", schedule);
        var medEntity = new HttpEntity<>(medReq, authHeaders);
        var medResp = restTemplate.postForEntity(
            "/api/v1/patients/" + patientId + "/medications", medEntity, MedicationResponse.class);
        assertThat(medResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(medResp.getBody().type()).isEqualTo("TABLET");
        var medicationId = new MedicationId(UUID.fromString(medResp.getBody().id()));

        var scheduledAt = LocalDateTime.now().withHour(8).withMinute(0).withSecond(0).withNano(0);
        medicationLogRepository.save(new MedicationLog(
            MedicationLogId.generate(), medicationId, new PatientId(UUID.fromString(patientId)),
            scheduledAt, LogStatus.PENDING, null, null));

        var logsResp = restTemplate.exchange(
            "/api/v1/patients/" + patientId + "/medication-logs?date=" + LocalDate.now(),
            HttpMethod.GET,
            new HttpEntity<>(authHeaders),
            MedicationLogResponse[].class
        );

        assertThat(logsResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(logsResp.getBody()).hasSize(1);
        var log = logsResp.getBody()[0];
        assertThat(log.medicationName()).isEqualTo("Paracetamol");
        assertThat(log.dosage()).isEqualTo("1 tableta");
        assertThat(log.instructions()).isEqualTo("Después del desayuno");
        assertThat(log.type()).isEqualTo("TABLET");
    }
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd backend && mvn test -Dtest=MedicationIntegrationTest -q`
Expected: FAIL — error de compilación (`MedicationResponse.type()`/`MedicationLogResponse.medicationName()` etc. no existen todavía).

- [ ] **Step 3: Agregar columna `type` a `MedicationJpaEntity.java`**

En `backend/src/main/java/com/cuidalink/medication/adapter/out/persistence/MedicationJpaEntity.java`, agregar el campo junto a `active` (después de la línea 16 `private boolean active;`):

```java
    private String type;
```

Y agregar el getter/setter junto a los de `active` (después de `public void setActive(boolean active) { this.active = active; }`):

```java
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
```

- [ ] **Step 4: Mapear `type` en `JpaMedicationRepositoryAdapter.java`**

En el método `toJpa` (línea 41-59 actual), agregar después de `e.setActive(m.isActive());`:

```java
        e.setType(m.getType().name());
```

En el método `toDomain` (línea 61-76 actual), reemplazarlo completo por:

```java
    private Medication toDomain(MedicationJpaEntity e) {
        var schedule = new MedicationSchedule(
            timesFromString(e.getScheduleTimes()),
            Frequency.valueOf(e.getFrequency()),
            daysFromString(e.getScheduleDaysOfWeek()),
            e.getScheduleStartDate(),
            e.getScheduleEndDate(),
            e.getScheduleIntervalDays()
        );
        var type = e.getType() != null ? MedicationType.valueOf(e.getType()) : MedicationType.TABLET;
        return new Medication(
            new MedicationId(UUID.fromString(e.getId())),
            new PatientId(UUID.fromString(e.getPatientId())),
            e.getName(),
            e.getDosage(),
            e.getInstructions(),
            schedule,
            e.isActive(),
            type
        );
    }
```

(No hace falta agregar import de `MedicationType`: el archivo ya tiene `import com.cuidalink.medication.domain.model.*;` en la línea 2.)

- [ ] **Step 5: Agregar `type` a `MedicationResponse.java`**

Reemplazar el contenido completo de `backend/src/main/java/com/cuidalink/medication/adapter/in/rest/dto/MedicationResponse.java`:

```java
package com.cuidalink.medication.adapter.in.rest.dto;

public record MedicationResponse(
    String id,
    String patientId,
    String name,
    String dosage,
    String instructions,
    String type,
    MedicationScheduleDto schedule,
    boolean active
) {}
```

- [ ] **Step 6: Incluir `type` en `MedicationController.toResponse`**

En `backend/src/main/java/com/cuidalink/medication/adapter/in/rest/MedicationController.java`, reemplazar el método `toResponse` (línea 119-129 actual) por:

```java
    private MedicationResponse toResponse(Medication m) {
        MedicationScheduleDto schedDto = null;
        if (m.getSchedule() != null) {
            var s = m.getSchedule();
            schedDto = new MedicationScheduleDto(
                s.times(), s.frequency(), s.daysOfWeek(), s.startDate(), s.endDate(), s.intervalDays()
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

- [ ] **Step 7: Enriquecer `MedicationLogResponse.java`**

Reemplazar el contenido completo de `backend/src/main/java/com/cuidalink/medication/adapter/in/rest/dto/MedicationLogResponse.java`:

```java
package com.cuidalink.medication.adapter.in.rest.dto;

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

- [ ] **Step 8: Reescribir `MedicationLogController.java`**

Reemplazar el contenido completo de `backend/src/main/java/com/cuidalink/medication/adapter/in/rest/MedicationLogController.java`:

```java
package com.cuidalink.medication.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.medication.adapter.in.rest.dto.ConfirmLogRequest;
import com.cuidalink.medication.adapter.in.rest.dto.MedicationLogResponse;
import com.cuidalink.medication.domain.model.LogStatus;
import com.cuidalink.medication.domain.model.Medication;
import com.cuidalink.medication.domain.model.MedicationId;
import com.cuidalink.medication.domain.model.MedicationLog;
import com.cuidalink.medication.domain.model.MedicationLogId;
import com.cuidalink.medication.domain.port.in.ConfirmMedicationLogUseCase;
import com.cuidalink.medication.domain.port.in.GetDailyMedicationLogsUseCase;
import com.cuidalink.medication.domain.port.in.GetMedicationUseCase;
import com.cuidalink.medication.domain.port.in.ListMedicationsUseCase;
import com.cuidalink.patient.domain.model.PatientId;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
public class MedicationLogController {

    private final GetDailyMedicationLogsUseCase logsUseCase;
    private final ConfirmMedicationLogUseCase confirmUseCase;
    private final ListMedicationsUseCase listMedicationsUseCase;
    private final GetMedicationUseCase getMedicationUseCase;

    public MedicationLogController(GetDailyMedicationLogsUseCase logsUseCase,
                                   ConfirmMedicationLogUseCase confirmUseCase,
                                   ListMedicationsUseCase listMedicationsUseCase,
                                   GetMedicationUseCase getMedicationUseCase) {
        this.logsUseCase = logsUseCase;
        this.confirmUseCase = confirmUseCase;
        this.listMedicationsUseCase = listMedicationsUseCase;
        this.getMedicationUseCase = getMedicationUseCase;
    }

    @GetMapping("/patients/{patientId}/medication-logs")
    public ResponseEntity<List<MedicationLogResponse>> getDailyLogs(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        var patId = new PatientId(UUID.fromString(patientId));
        var logs = logsUseCase.getLogs(patId, date, user.getId());
        var medicationsById = listMedicationsUseCase.listMedications(patId, user.getId())
            .stream().collect(Collectors.toMap(Medication::getId, Function.identity()));
        return ResponseEntity.ok(logs.stream().map(log -> toResponse(log, medicationsById)).toList());
    }

    @PatchMapping("/medication-logs/{logId}")
    public ResponseEntity<MedicationLogResponse> confirm(
            @AuthenticationPrincipal User user,
            @PathVariable String logId,
            @Validated @RequestBody ConfirmLogRequest req) {
        var log = confirmUseCase.confirm(
            new MedicationLogId(UUID.fromString(logId)),
            user.getId(),
            req.status()
        );
        var medication = getMedicationUseCase.getMedication(log.getPatientId(), log.getMedicationId(), user.getId());
        return ResponseEntity.ok(toResponse(log, Map.of(medication.getId(), medication)));
    }

    private MedicationLogResponse toResponse(MedicationLog log, Map<MedicationId, Medication> medicationsById) {
        var medication = medicationsById.get(log.getMedicationId());
        return new MedicationLogResponse(
            log.getId().value().toString(),
            log.getMedicationId().value().toString(),
            medication.getName(),
            medication.getDosage(),
            medication.getInstructions(),
            medication.getType().name(),
            log.getScheduledAt().toString(),
            log.getStatus().name(),
            log.getAdministeredBy() != null ? log.getAdministeredBy().value().toString() : null,
            log.getConfirmedAt() != null ? log.getConfirmedAt().toString() : null
        );
    }
}
```

- [ ] **Step 9: Correr el test de integración y verificar que pasa**

Run: `cd backend && mvn test -Dtest=MedicationIntegrationTest -q`
Expected: PASS (todos los tests del archivo, incluyendo el nuevo `getDailyLogs_includesMedicationDetails`).

- [ ] **Step 10: Correr toda la suite backend**

Run: `cd backend && mvn test -q`
Expected: PASS completo.

- [ ] **Step 11: Commit**

```bash
git add backend/src/main/java/com/cuidalink/medication/adapter backend/src/test/java/com/cuidalink/MedicationIntegrationTest.java
git commit -m "feat(backend): expose medication type and enrich daily logs with medication data"
```

---

### Task 3: Mobile — entidades `type`/`instructions` y corregir confirmar/omitir

**Files:**
- Modify: `appmovil/src/domain/entities/Medication.ts`
- Modify: `appmovil/src/domain/entities/MedicationLog.ts`
- Modify: `appmovil/src/data/repositories/ApiMedicationRepository.ts`

**Interfaces:**
- Produces (consumido por Tareas 4, 5, 6): `MedicationType = 'TABLET' | 'CAPSULE' | 'INJECTION' | 'OTHER'` exportado desde `@/domain/entities`. `MedicationLog` gana `instructions: string` y `type: MedicationType`. `MedicationRepository.confirmLog(logId)`/`missLog(logId)` ahora hacen `PATCH /medication-logs/{logId}` con `{ status: 'CONFIRMED' | 'MISSED' }` (la interfaz `MedicationRepository` y sus firmas no cambian, solo la implementación HTTP).
- Consumes: nada de tareas anteriores (mobile es independiente del código backend a nivel de compilación; el contrato de datos ya quedó fijado en la Tarea 2).

Esta tarea no tiene test dedicado nuevo: no existe convención de test para el paquete `data/repositories/` en este repo (verificado — ningún archivo `*.test.ts` cubre ninguno de los `ApiXxxRepository.ts` existentes), y estas son entidades planas sin lógica. Se verifica con `tsc` y la suite completa.

- [ ] **Step 1: Actualizar `Medication.ts`**

Reemplazar el contenido completo de `appmovil/src/domain/entities/Medication.ts`:

```ts
export type MedicationType = 'TABLET' | 'CAPSULE' | 'INJECTION' | 'OTHER';

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  scheduledTimes: string[];
  type: MedicationType;
  active: boolean;
}
```

- [ ] **Step 2: Actualizar `MedicationLog.ts`**

Reemplazar el contenido completo de `appmovil/src/domain/entities/MedicationLog.ts`:

```ts
import { MedicationType } from './Medication';

export type MedicationLogStatus = 'PENDING' | 'CONFIRMED' | 'MISSED' | 'ESCALATED';

export interface MedicationLog {
  id: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  instructions: string;
  type: MedicationType;
  scheduledAt: string;
  status: MedicationLogStatus;
}
```

- [ ] **Step 3: Corregir `confirmLog`/`missLog` en `ApiMedicationRepository.ts`**

En `appmovil/src/data/repositories/ApiMedicationRepository.ts`, reemplazar los métodos `confirmLog` y `missLog` (líneas 18-26 actuales) por:

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

- [ ] **Step 4: Verificar tipos y suite completa**

Run: `cd appmovil && npx tsc --noEmit`
Expected: sin errores.

Run: `cd appmovil && npx jest`
Expected: todos los tests existentes en PASS (esta tarea no debería romper nada — ningún test actual referencia `medication.type` ni las rutas viejas de confirm/miss).

- [ ] **Step 5: Commit**

```bash
git add appmovil/src/domain/entities/Medication.ts appmovil/src/domain/entities/MedicationLog.ts appmovil/src/data/repositories/ApiMedicationRepository.ts
git commit -m "fix(appmovil): add medication type/instructions fields and fix confirm/miss routes"
```

---

### Task 4: `MedicationActionModal` (nuevo)

**Files:**
- Create: `appmovil/src/presentation/components/MedicationActionModal.tsx`
- Test: `appmovil/src/presentation/components/__tests__/MedicationActionModal.test.tsx`

**Interfaces:**
- Consumes (de Tarea 3): `MedicationLog` de `@/domain/entities` (con `medicationName`, `dosage`, `scheduledAt`).
- Produces (consumido por Tarea 6): `MedicationActionModal` (default export) con props `{ visible: boolean; log: MedicationLog | null; onConfirm: () => void; onMiss: () => void; onClose: () => void }`.

- [ ] **Step 1: Escribir el test**

Crear `appmovil/src/presentation/components/__tests__/MedicationActionModal.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import MedicationActionModal from '../MedicationActionModal';
import { MedicationLog } from '@/domain/entities';

const log: MedicationLog = {
  id: 'l1',
  medicationId: 'm1',
  medicationName: 'Paracetamol',
  dosage: '1 tableta',
  instructions: 'Después del desayuno',
  type: 'TABLET',
  scheduledAt: '2026-07-02T08:00:00-04:00',
  status: 'PENDING',
};

describe('MedicationActionModal', () => {
  it('no renderiza contenido cuando log es null', () => {
    const { toJSON } = render(
      <MedicationActionModal visible={true} log={null} onConfirm={jest.fn()} onMiss={jest.fn()} onClose={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it('muestra el nombre y la dosis del medicamento', () => {
    render(<MedicationActionModal visible={true} log={log} onConfirm={jest.fn()} onMiss={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Paracetamol')).toBeTruthy();
    expect(screen.getByText(/1 tableta/)).toBeTruthy();
  });

  it('llama a onConfirm al presionar Confirmar', () => {
    const onConfirm = jest.fn();
    render(<MedicationActionModal visible={true} log={log} onConfirm={onConfirm} onMiss={jest.fn()} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText('Confirmar'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('llama a onMiss al presionar Omitir', () => {
    const onMiss = jest.fn();
    render(<MedicationActionModal visible={true} log={log} onConfirm={jest.fn()} onMiss={onMiss} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText('Omitir'));
    expect(onMiss).toHaveBeenCalled();
  });

  it('llama a onClose al presionar Cancelar', () => {
    const onClose = jest.fn();
    render(<MedicationActionModal visible={true} log={log} onConfirm={jest.fn()} onMiss={jest.fn()} onClose={onClose} />);
    fireEvent.press(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd appmovil && npx jest src/presentation/components/__tests__/MedicationActionModal.test.tsx`
Expected: FAIL — `Cannot find module '../MedicationActionModal'`.

- [ ] **Step 3: Crear `MedicationActionModal.tsx`**

Crear `appmovil/src/presentation/components/MedicationActionModal.tsx`:

```tsx
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MedicationLog } from '@/domain/entities';

type Props = {
  visible: boolean;
  log: MedicationLog | null;
  onConfirm: () => void;
  onMiss: () => void;
  onClose: () => void;
};

export default function MedicationActionModal({ visible, log, onConfirm, onMiss, onClose }: Props) {
  if (!log) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.name}>{log.medicationName}</Text>
          <Text style={styles.details}>
            {log.dosage} · {new Date(log.scheduledAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.missBtn} onPress={onMiss}>
              <Text style={styles.missText}>Omitir</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dialog: {
    backgroundColor: '#12283f', borderRadius: 16, padding: 24, width: '85%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  name: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4, textAlign: 'center' },
  details: { fontSize: 14, color: '#a5d8f3', marginBottom: 20, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  confirmBtn: { flex: 1, backgroundColor: '#1a9c7d', padding: 12, borderRadius: 10, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: 'bold' },
  missBtn: { flex: 1, backgroundColor: '#e05555', padding: 12, borderRadius: 10, alignItems: 'center' },
  missText: { color: '#fff', fontWeight: 'bold' },
  closeBtn: { alignItems: 'center', padding: 8 },
  closeText: { color: '#a5d8f3' },
});
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd appmovil && npx jest src/presentation/components/__tests__/MedicationActionModal.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Verificar tipos**

Run: `cd appmovil && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add appmovil/src/presentation/components/MedicationActionModal.tsx appmovil/src/presentation/components/__tests__/MedicationActionModal.test.tsx
git commit -m "feat(appmovil): add MedicationActionModal for confirm/miss actions"
```

---

### Task 5: Rediseñar `MedicationCard`

**Files:**
- Modify: `appmovil/src/presentation/components/MedicationCard.tsx` (reescritura completa)
- Test: `appmovil/src/presentation/components/__tests__/MedicationCard.test.tsx`

**Interfaces:**
- Consumes (de Tarea 3): `MedicationLog`, `MedicationType` de `@/domain/entities`.
- Produces (consumido por Tarea 6): `MedicationCard` (default export) con props `{ log: MedicationLog; onPress?: () => void }` — ya **no** recibe `onConfirm`/`onMiss` (eso lo maneja `MedicationActionModal`, montado por el padre). `onPress` solo se dispara si el log está `PENDING`/`ESCALATED` (independientemente de si se pasó la prop, la tarjeta se deshabilita para logs `CONFIRMED`/`MISSED`).

- [ ] **Step 1: Escribir el test**

Crear `appmovil/src/presentation/components/__tests__/MedicationCard.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import MedicationCard from '../MedicationCard';
import { MedicationLog } from '@/domain/entities';

function buildLog(overrides: Partial<MedicationLog> = {}): MedicationLog {
  return {
    id: 'l1',
    medicationId: 'm1',
    medicationName: 'Paracetamol',
    dosage: '1 tableta',
    instructions: 'Después del desayuno',
    type: 'TABLET',
    scheduledAt: '2026-07-02T08:00:00-04:00',
    status: 'PENDING',
    ...overrides,
  };
}

describe('MedicationCard', () => {
  it('muestra nombre, dosis e indicaciones', () => {
    render(<MedicationCard log={buildLog()} />);
    expect(screen.getByText('Paracetamol')).toBeTruthy();
    expect(screen.getByText('1 tableta')).toBeTruthy();
    expect(screen.getByText('Después del desayuno')).toBeTruthy();
  });

  it('muestra el badge "Pendiente" para PENDING y ESCALATED', () => {
    render(<MedicationCard log={buildLog({ status: 'PENDING' })} />);
    expect(screen.getByText('Pendiente')).toBeTruthy();
  });

  it('muestra el badge "Administrado" para CONFIRMED', () => {
    render(<MedicationCard log={buildLog({ status: 'CONFIRMED' })} />);
    expect(screen.getByText('Administrado')).toBeTruthy();
  });

  it('muestra el badge "Omitido" para MISSED', () => {
    render(<MedicationCard log={buildLog({ status: 'MISSED' })} />);
    expect(screen.getByText('Omitido')).toBeTruthy();
  });

  it('llama a onPress al tocar una tarjeta pendiente', () => {
    const onPress = jest.fn();
    render(<MedicationCard log={buildLog({ status: 'PENDING' })} onPress={onPress} />);
    fireEvent.press(screen.getByText('Paracetamol'));
    expect(onPress).toHaveBeenCalled();
  });

  it('no llama a onPress en una tarjeta ya administrada', () => {
    const onPress = jest.fn();
    render(<MedicationCard log={buildLog({ status: 'CONFIRMED' })} onPress={onPress} />);
    fireEvent.press(screen.getByText('Paracetamol'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd appmovil && npx jest src/presentation/components/__tests__/MedicationCard.test.tsx`
Expected: FAIL — el componente actual no tiene los badges "Pendiente"/"Administrado"/"Omitido" ni el campo de indicaciones.

- [ ] **Step 3: Reescribir `MedicationCard.tsx`**

Reemplazar el contenido completo de `appmovil/src/presentation/components/MedicationCard.tsx`:

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MedicationLog, MedicationLogStatus, MedicationType } from '@/domain/entities';

const TYPE_STYLE: Record<MedicationType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  TABLET: { icon: 'ellipse-outline', color: '#2f6fed' },
  CAPSULE: { icon: 'ellipse-outline', color: '#2f6fed' },
  INJECTION: { icon: 'medical-outline', color: '#e74c3c' },
  OTHER: { icon: 'help-circle-outline', color: '#7c5cfc' },
};

const STATUS_BADGE: Record<MedicationLogStatus, { label: string; bg: string; textColor: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PENDING: { label: 'Pendiente', bg: '#e6b800', textColor: '#3d2e00', icon: 'time-outline' },
  ESCALATED: { label: 'Pendiente', bg: '#e6b800', textColor: '#3d2e00', icon: 'time-outline' },
  CONFIRMED: { label: 'Administrado', bg: '#1a9c7d', textColor: '#fff', icon: 'checkmark-circle' },
  MISSED: { label: 'Omitido', bg: '#e05555', textColor: '#fff', icon: 'close-circle' },
};

function isPending(status: MedicationLogStatus): boolean {
  return status === 'PENDING' || status === 'ESCALATED';
}

type Props = {
  log: MedicationLog;
  onPress?: () => void;
};

export default function MedicationCard({ log, onPress }: Props) {
  const typeStyle = TYPE_STYLE[log.type];
  const badge = STATUS_BADGE[log.status];
  const clickable = isPending(log.status) && !!onPress;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!clickable}
      activeOpacity={clickable ? 0.8 : 1}
    >
      <View style={[styles.iconBadge, { backgroundColor: typeStyle.color }]}>
        <Ionicons name={typeStyle.icon} size={24} color="#fff" />
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{log.medicationName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={14} color={badge.textColor} />
            <Text style={[styles.statusText, { color: badge.textColor }]}>{badge.label}</Text>
          </View>
        </View>
        <View style={styles.detailsRow}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Dosis</Text>
            <Text style={styles.detailValue}>{log.dosage}</Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Hora</Text>
            <Text style={styles.detailValue}>
              {new Date(log.scheduledAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Indicaciones</Text>
            <Text style={styles.detailValue}>{log.instructions || '—'}</Text>
          </View>
        </View>
      </View>
      {clickable && <Ionicons name="chevron-forward" size={18} color="#7dd3fc" />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  iconBadge: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  name: { fontSize: 17, fontWeight: 'bold', color: '#fff', flex: 1, marginRight: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  detailsRow: { flexDirection: 'row', gap: 16 },
  detailColumn: { flex: 1 },
  detailLabel: { fontSize: 11, color: '#5ee7df', fontWeight: '600', marginBottom: 2 },
  detailValue: { fontSize: 13, color: '#e2e8f0' },
});
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd appmovil && npx jest src/presentation/components/__tests__/MedicationCard.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Verificar tipos**

Run: `cd appmovil && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add appmovil/src/presentation/components/MedicationCard.tsx appmovil/src/presentation/components/__tests__/MedicationCard.test.tsx
git commit -m "feat(appmovil): redesign MedicationCard to match the daily meds mockup"
```

---

### Task 6: Rediseñar `DailyMedsScreen`

**Files:**
- Modify: `appmovil/src/presentation/screens/medications/DailyMedsScreen.tsx` (reescritura completa)
- Modify: `appmovil/src/presentation/navigation/AppNavigator.tsx:41` (quitar `title: 'Medicamentos de hoy'`, poner `headerShown: false` — la pantalla dibuja su propio header)
- Test: `appmovil/src/presentation/screens/medications/__tests__/DailyMedsScreen.test.tsx`

**Interfaces:**
- Consumes: `MedicationCard` (Tarea 5), `MedicationActionModal` (Tarea 4), `MedicationLog`/`MedicationRepository` (Tarea 3), `useAuthStore().selectedPatientId` (ya existente), ruta `'ComingSoon'` con params `{ title, subtitle }` (ya existente en `AppNavigator.tsx`, del plan de `PatientDetailScreen`).
- Produces: `DailyMedsScreen` (default export) con props `{ navigation: NativeStackNavigationProp<PatientStackParams, 'Medicamentos'> }` (mismo patrón de props que `PatientDetailScreen`/`ContactsScreen`, no usa el hook `useNavigation`).

- [ ] **Step 1: Escribir el test**

Crear `appmovil/src/presentation/screens/medications/__tests__/DailyMedsScreen.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DailyMedsScreen from '../DailyMedsScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { MedicationLog } from '@/domain/entities';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

function buildLog(overrides: Partial<MedicationLog> = {}): MedicationLog {
  return {
    id: 'l1',
    medicationId: 'm1',
    medicationName: 'Paracetamol',
    dosage: '1 tableta',
    instructions: 'Después del desayuno',
    type: 'TABLET',
    scheduledAt: '2026-07-02T08:00:00-04:00',
    status: 'PENDING',
    ...overrides,
  };
}

function renderScreen(logs: MedicationLog[], navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const getDailyLogs = jest.fn().mockResolvedValue(logs);
  const confirmLog = jest.fn().mockResolvedValue(logs[0] ?? null);
  const missLog = jest.fn().mockResolvedValue(logs[0] ?? null);
  mockedUseInjection.mockReturnValue({
    medicationRepo: { getDailyLogs, confirmLog, missLog },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <DailyMedsScreen navigation={navigation} />
    </QueryClientProvider>
  );

  return { navigation, confirmLog, missLog };
}

describe('DailyMedsScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ selectedPatientId: 'p1' });
  });

  afterEach(() => {
    useAuthStore.setState({ selectedPatientId: null });
  });

  it('muestra todos los logs bajo la pestaña "Todos" por defecto', async () => {
    renderScreen([
      buildLog({ id: 'l1', medicationName: 'Paracetamol', status: 'PENDING' }),
      buildLog({ id: 'l2', medicationName: 'Insulina', status: 'CONFIRMED' }),
    ]);
    expect(await screen.findByText('Paracetamol')).toBeTruthy();
    expect(screen.getByText('Insulina')).toBeTruthy();
  });

  it('filtra solo pendientes bajo "Pendientes"', async () => {
    renderScreen([
      buildLog({ id: 'l1', medicationName: 'Paracetamol', status: 'PENDING' }),
      buildLog({ id: 'l2', medicationName: 'Insulina', status: 'CONFIRMED' }),
    ]);
    await screen.findByText('Paracetamol');
    fireEvent.press(screen.getByText('Pendientes'));
    expect(screen.getByText('Paracetamol')).toBeTruthy();
    expect(screen.queryByText('Insulina')).toBeNull();
  });

  it('filtra solo administrados bajo "Administrados"', async () => {
    renderScreen([
      buildLog({ id: 'l1', medicationName: 'Paracetamol', status: 'PENDING' }),
      buildLog({ id: 'l2', medicationName: 'Insulina', status: 'CONFIRMED' }),
    ]);
    await screen.findByText('Paracetamol');
    fireEvent.press(screen.getByText('Administrados'));
    expect(screen.getByText('Insulina')).toBeTruthy();
    expect(screen.queryByText('Paracetamol')).toBeNull();
  });

  it('abre el modal de acción al tocar una tarjeta pendiente y confirma', async () => {
    const { confirmLog } = renderScreen([buildLog({ id: 'l1', status: 'PENDING' })]);
    fireEvent.press(await screen.findByText('Paracetamol'));
    fireEvent.press(await screen.findByText('Confirmar'));
    await waitFor(() => expect(confirmLog).toHaveBeenCalledWith('l1'));
  });

  it('navega a ComingSoon al presionar "Agregar medicamento"', async () => {
    const { navigation } = renderScreen([]);
    fireEvent.press(await screen.findByText('Agregar medicamento'));
    expect(navigation.navigate).toHaveBeenCalledWith('ComingSoon', {
      title: 'Agregar medicamento',
      subtitle: 'Registrar un nuevo medicamento',
    });
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd appmovil && npx jest src/presentation/screens/medications/__tests__/DailyMedsScreen.test.tsx`
Expected: FAIL — la pantalla actual no tiene tabs, chip de fecha, ni el flujo de modal descrito.

- [ ] **Step 3: Reescribir `DailyMedsScreen.tsx`**

Reemplazar el contenido completo de `appmovil/src/presentation/screens/medications/DailyMedsScreen.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { MedicationLog } from '@/domain/entities';
import MedicationCard from '@/presentation/components/MedicationCard';
import MedicationActionModal from '@/presentation/components/MedicationActionModal';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'Medicamentos'>;
};

type Tab = 'ALL' | 'PENDING' | 'ADMINISTERED';

function matchesTab(status: MedicationLog['status'], tab: Tab): boolean {
  if (tab === 'ALL') return true;
  if (tab === 'PENDING') return status === 'PENDING' || status === 'ESCALATED';
  return status === 'CONFIRMED';
}

export default function DailyMedsScreen({ navigation }: Props) {
  const { medicationRepo } = useInjection();
  const selectedPatientId = useAuthStore((s) => s.selectedPatientId);
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [tab, setTab] = useState<Tab>('ALL');
  const [selectedLog, setSelectedLog] = useState<MedicationLog | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['medication-logs', selectedPatientId, today],
    queryFn: () =>
      selectedPatientId
        ? medicationRepo.getDailyLogs(selectedPatientId, today)
        : Promise.resolve([]),
    enabled: !!selectedPatientId,
  });

  const confirmMutation = useMutation({
    mutationFn: (logId: string) => medicationRepo.confirmLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-logs'] });
      setSelectedLog(null);
    },
    onError: () => Alert.alert('Error', 'No se pudo confirmar la dosis.'),
  });

  const missMutation = useMutation({
    mutationFn: (logId: string) => medicationRepo.missLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-logs'] });
      setSelectedLog(null);
    },
    onError: () => Alert.alert('Error', 'No se pudo omitir la dosis.'),
  });

  if (!selectedPatientId) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <Text style={styles.hint}>Selecciona un paciente desde Inicio → Mis pacientes.</Text>
        </View>
      </ScreenBackground>
    );
  }

  if (isLoading) return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#2D7DD2" /></ScreenBackground>;

  const filtered = (data ?? []).filter((log) => matchesTab(log.status, tab));
  const todayLabel = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <ScreenBackground>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MedicationCard
            log={item}
            onPress={
              item.status === 'PENDING' || item.status === 'ESCALATED'
                ? () => setSelectedLog(item)
                : undefined
            }
          />
        )}
        ListHeaderComponent={
          <>
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

            <Text style={styles.title}>Medicamentos</Text>
            <Text style={styles.subtitle}>Medicamentos programados para hoy</Text>

            <View style={styles.dateChip}>
              <Ionicons name="calendar-outline" size={16} color="#5ee7df" />
              <Text style={styles.dateChipToday}>Hoy</Text>
              <Text style={styles.dateChipDate}>{todayLabel}</Text>
            </View>

            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.tab, tab === 'ALL' && styles.tabActive]}
                onPress={() => setTab('ALL')}
              >
                <Text style={[styles.tabText, tab === 'ALL' && styles.tabTextActive]}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tab === 'PENDING' && styles.tabActive]}
                onPress={() => setTab('PENDING')}
              >
                <Text style={[styles.tabText, tab === 'PENDING' && styles.tabTextActive]}>Pendientes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tab === 'ADMINISTERED' && styles.tabActive]}
                onPress={() => setTab('ADMINISTERED')}
              >
                <Text style={[styles.tabText, tab === 'ADMINISTERED' && styles.tabTextActive]}>Administrados</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={<Text style={styles.empty}>Sin medicamentos para mostrar.</Text>}
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
        contentContainerStyle={{ padding: 20, paddingTop: 24 }}
      />

      <MedicationActionModal
        visible={!!selectedLog}
        log={selectedLog}
        onConfirm={() => selectedLog && confirmMutation.mutate(selectedLog.id)}
        onMiss={() => selectedLog && missMutation.mutate(selectedLog.id)}
        onClose={() => setSelectedLog(null)}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  hint: { color: '#e2e8f0', textAlign: 'center' },
  empty: { textAlign: 'center', color: '#e2e8f0', marginTop: 40 },

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
  subtitle: { fontSize: 14, color: '#a5d8f3', marginTop: 4, marginBottom: 16 },

  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 16,
  },
  dateChipToday: { color: '#5ee7df', fontWeight: 'bold', fontSize: 13 },
  dateChipDate: { color: '#a5d8f3', fontSize: 13 },

  tabsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tab: {
    flex: 1, alignItems: 'center',
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  tabActive: { borderColor: '#5ee7df', backgroundColor: 'rgba(94,231,223,0.12)' },
  tabText: { color: '#a5d8f3', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#5ee7df' },

  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#e05555', borderRadius: 16,
    paddingVertical: 16, marginTop: 8,
  },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
```

- [ ] **Step 4: Actualizar `AppNavigator.tsx` para que `Medicamentos` use su propio header**

En `appmovil/src/presentation/navigation/AppNavigator.tsx`, cambiar:

```tsx
<Stack.Screen name="Medicamentos" component={DailyMedsScreen} options={{ title: 'Medicamentos de hoy' }} />
```

por:

```tsx
<Stack.Screen name="Medicamentos" component={DailyMedsScreen} options={{ headerShown: false }} />
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd appmovil && npx jest src/presentation/screens/medications/__tests__/DailyMedsScreen.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 6: Correr toda la suite y verificar tipos**

Run: `cd appmovil && npx jest`
Expected: todos los tests en PASS (existentes + nuevos).

Run: `cd appmovil && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Verificación manual visual**

Con el backend corriendo localmente (`cd backend && mvn spring-boot:run`, PostgreSQL local activo) y `cd appmovil && npx expo start`: navegar Inicio → Mis pacientes → un paciente → tarjeta "Medicamentos". Confirmar contra el mockup: header, chip "Hoy + fecha", tabs, tarjetas con ícono/nombre/badge/dosis/hora/indicaciones, tocar una tarjeta pendiente abre el modal, Confirmar/Omitir cambian el estado sin error 404 y la tarjeta se actualiza, "Agregar medicamento" navega a la pantalla "Próximamente".

- [ ] **Step 8: Commit**

```bash
git add appmovil/src/presentation/screens/medications/DailyMedsScreen.tsx appmovil/src/presentation/screens/medications/__tests__/DailyMedsScreen.test.tsx appmovil/src/presentation/navigation/AppNavigator.tsx
git commit -m "feat(appmovil): redesign DailyMedsScreen to match the daily medications mockup"
```
