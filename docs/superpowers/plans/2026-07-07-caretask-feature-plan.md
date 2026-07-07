# CareTask Module ("Programar tarea" + "Tareas" screens) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new backend hexagon (`com.cuidalink.caretask`) plus two mobile screens
("Programar tarea" and "Tareas") so caregivers can schedule daily care tasks and track them
Pendiente → Realizada, exactly mirroring the existing `medication` module's architecture.

**Architecture:** New backend hexagon `caretask` (domain/port/adapter, mirrors `medication` 1:1),
two new DB tables, two new `@Scheduled` jobs (daily log generation + due-time reminder push), and
two new React Native screens (`TasksScreen`, `CreateTaskScreen`) wired into the existing
`PatientStackParams` navigator.

**Tech Stack:** Java 17, Spring Boot 3.2, Spring Data JPA, JUnit 5 + Mockito + AssertJ,
Testcontainers (PostgreSQL 15) — React Native 0.74, TypeScript 5, React Hook Form + Zod, TanStack
Query, Jest + React Native Testing Library.

## Global Constraints

- `domain/model` and `domain/service` packages must never import `jakarta.persistence`,
  `org.springframework.data`, or Firebase classes (hexagonal rule, see root `CLAUDE.md`).
- Authorization: create/update/deactivate require `patient.isOwner(requesterId)`; read/complete
  require `patient.hasAccess(requesterId)`. Violations throw `IllegalArgumentException` (mapped to
  400 by the existing `GlobalExceptionHandler` — do not add new exception handling).
- API prefix `/api/v1` is applied globally by `server.servlet.context-path` — controllers below use
  paths without that prefix, same as `MedicationController`.
- `presentation/` (mobile) imports only from `domain/`, never from `data/` directly; all wiring goes
  through `useInjection.ts`.
- State split: TanStack Query for all remote data (`staleTime` inherited from defaults already
  configured), Zustand only for `selectedPatientId`/auth.
- Follow existing file/package conventions exactly — this plan mirrors `medication` file-for-file;
  do not introduce new abstractions or patterns.
- Full reference source for everything mirrored below was read directly from `medication` during
  planning: `Medication*.java`, `MedicationSchedule.java`, `MedicationService.java`,
  `MedicationController.java`, `MedicationLogController.java`, `JpaMedicationRepositoryAdapter.java`,
  `DailyMedicationLogScheduler.java`, `EscalationScheduler.java`, `MedicationServiceTest.java`,
  `MedicationScheduleTest.java`, `EscalationSchedulerTest.java`, `MedicationIntegrationTest.java`,
  `CreateMedicationScreen.tsx`, `DailyMedsScreen.tsx`, `MedicationCard.tsx`,
  `MedicationActionModal.tsx`, `PatientDetailScreen.tsx`, `AppNavigator.tsx`, `patientDisplay.ts`.

---

## Task 1: Domain value objects — enums + `CareTaskSchedule`

**Files:**
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskId.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskLogId.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskPriority.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskScheduleType.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskLogStatus.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskSchedule.java`
- Test: `backend/src/test/java/com/cuidalink/caretask/domain/model/CareTaskScheduleTest.java`

**Interfaces:**
- Produces: `CareTaskId.generate()`, `CareTaskLogId.generate()`, enums
  `CareTaskPriority{LOW,MEDIUM,HIGH}`, `CareTaskScheduleType{DAYS_OF_WEEK,DATE_RANGE}`,
  `CareTaskLogStatus{PENDING,DONE}`, and
  `CareTaskSchedule(LocalTime time, CareTaskScheduleType scheduleType, List<DayOfWeek> daysOfWeek, LocalDate startDate, LocalDate endDate)`
  with instance method `boolean shouldRunOn(LocalDate date)`. Every task below depends on these.

- [ ] **Step 1: Write the failing test**

```java
// backend/src/test/java/com/cuidalink/caretask/domain/model/CareTaskScheduleTest.java
package com.cuidalink.caretask.domain.model;

import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CareTaskScheduleTest {

    @Test
    void rejectsNullTime() {
        assertThatThrownBy(() -> new CareTaskSchedule(
            null, CareTaskScheduleType.DAYS_OF_WEEK, List.of(DayOfWeek.MONDAY), LocalDate.now(), null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void daysOfWeek_rejectsEmptyDays() {
        assertThatThrownBy(() -> new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK, List.of(), LocalDate.now(), null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void dateRange_rejectsMissingEndDate() {
        assertThatThrownBy(() -> new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DATE_RANGE, List.of(), LocalDate.now(), null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void dateRange_rejectsEndBeforeStart() {
        assertThatThrownBy(() -> new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DATE_RANGE, List.of(),
            LocalDate.of(2026, 7, 10), LocalDate.of(2026, 7, 1)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldRunOn_daysOfWeek_matchesSelectedDayOnOrAfterStart() {
        var schedule = new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(DayOfWeek.MONDAY, DayOfWeek.FRIDAY), LocalDate.of(2026, 7, 6), null);

        assertThat(schedule.shouldRunOn(LocalDate.of(2026, 7, 6))).isTrue();   // Monday
        assertThat(schedule.shouldRunOn(LocalDate.of(2026, 7, 10))).isTrue();  // Friday
        assertThat(schedule.shouldRunOn(LocalDate.of(2026, 7, 7))).isFalse();  // Tuesday
    }

    @Test
    void shouldRunOn_daysOfWeek_falseBeforeStartDate() {
        var schedule = new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(DayOfWeek.MONDAY), LocalDate.of(2026, 7, 13), null);

        assertThat(schedule.shouldRunOn(LocalDate.of(2026, 7, 6))).isFalse();  // Monday, but before start
    }

    @Test
    void shouldRunOn_dateRange_trueOnlyWithinBounds() {
        var schedule = new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DATE_RANGE, List.of(),
            LocalDate.of(2026, 7, 5), LocalDate.of(2026, 7, 10));

        assertThat(schedule.shouldRunOn(LocalDate.of(2026, 7, 4))).isFalse();
        assertThat(schedule.shouldRunOn(LocalDate.of(2026, 7, 5))).isTrue();
        assertThat(schedule.shouldRunOn(LocalDate.of(2026, 7, 10))).isTrue();
        assertThat(schedule.shouldRunOn(LocalDate.of(2026, 7, 11))).isFalse();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn test -q -Dtest=CareTaskScheduleTest`
Expected: FAIL to compile — `CareTaskSchedule`/`CareTaskScheduleType` do not exist yet.

- [ ] **Step 3: Write the enums and value object**

```java
// backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskId.java
package com.cuidalink.caretask.domain.model;

import java.util.UUID;

public record CareTaskId(UUID value) {
    public static CareTaskId generate() { return new CareTaskId(UUID.randomUUID()); }
}
```

```java
// backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskLogId.java
package com.cuidalink.caretask.domain.model;

import java.util.UUID;

public record CareTaskLogId(UUID value) {
    public static CareTaskLogId generate() { return new CareTaskLogId(UUID.randomUUID()); }
}
```

```java
// backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskPriority.java
package com.cuidalink.caretask.domain.model;

public enum CareTaskPriority { LOW, MEDIUM, HIGH }
```

```java
// backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskScheduleType.java
package com.cuidalink.caretask.domain.model;

public enum CareTaskScheduleType { DAYS_OF_WEEK, DATE_RANGE }
```

```java
// backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskLogStatus.java
package com.cuidalink.caretask.domain.model;

public enum CareTaskLogStatus { PENDING, DONE }
```

```java
// backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskSchedule.java
package com.cuidalink.caretask.domain.model;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record CareTaskSchedule(
    LocalTime time,
    CareTaskScheduleType scheduleType,
    List<DayOfWeek> daysOfWeek,
    LocalDate startDate,
    LocalDate endDate
) {
    public CareTaskSchedule {
        if (time == null)
            throw new IllegalArgumentException("La hora es obligatoria");
        if (scheduleType == null)
            throw new IllegalArgumentException("El tipo de programación es obligatorio");
        daysOfWeek = daysOfWeek != null ? List.copyOf(daysOfWeek) : List.of();
        if (scheduleType == CareTaskScheduleType.DAYS_OF_WEEK && daysOfWeek.isEmpty())
            throw new IllegalArgumentException("Selecciona al menos un día de la semana");
        if (scheduleType == CareTaskScheduleType.DATE_RANGE) {
            if (startDate == null || endDate == null)
                throw new IllegalArgumentException("El rango de fechas requiere fecha de inicio y término");
            if (endDate.isBefore(startDate))
                throw new IllegalArgumentException("La fecha de término no puede ser anterior a la fecha de inicio");
        }
        if (startDate == null)
            throw new IllegalArgumentException("La fecha de inicio es obligatoria");
    }

    public boolean shouldRunOn(LocalDate date) {
        return switch (scheduleType) {
            case DAYS_OF_WEEK -> daysOfWeek.contains(date.getDayOfWeek()) && !date.isBefore(startDate);
            case DATE_RANGE -> !date.isBefore(startDate) && !date.isAfter(endDate);
        };
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && mvn test -q -Dtest=CareTaskScheduleTest`
Expected: PASS (7 tests green).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskId.java \
        backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskLogId.java \
        backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskPriority.java \
        backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskScheduleType.java \
        backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskLogStatus.java \
        backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskSchedule.java \
        backend/src/test/java/com/cuidalink/caretask/domain/model/CareTaskScheduleTest.java
git commit -m "feat(backend): add CareTaskSchedule value object with validation"
```

---

## Task 2: `CareTask` and `CareTaskLog` domain entities

**Files:**
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/model/CareTask.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskLog.java`

**Interfaces:**
- Consumes: `CareTaskId`, `CareTaskLogId`, `CareTaskPriority`, `CareTaskScheduleType`,
  `CareTaskLogStatus`, `CareTaskSchedule` (Task 1).
- Produces: `CareTask(id, patientId, name, instructions, schedule, priority, reminderActive, active)`
  with `update(name, instructions, schedule, priority, reminderActive)` and `deactivate()`.
  `CareTaskLog(id, careTaskId, patientId, scheduledAt, status, completedBy, completedAt)` with
  `complete(UserId completedBy)` (throws `IllegalStateException` if not `PENDING`). No dedicated
  test file — same convention as `Medication`/`MedicationLog`, covered indirectly via
  `CareTaskServiceTest` in Task 3.

- [ ] **Step 1: Write `CareTask`**

```java
// backend/src/main/java/com/cuidalink/caretask/domain/model/CareTask.java
package com.cuidalink.caretask.domain.model;

import com.cuidalink.patient.domain.model.PatientId;

public class CareTask {

    private final CareTaskId id;
    private final PatientId patientId;
    private String name;
    private String instructions;
    private CareTaskSchedule schedule;
    private CareTaskPriority priority;
    private boolean reminderActive;
    private boolean active;

    public CareTask(CareTaskId id, PatientId patientId, String name, String instructions,
                    CareTaskSchedule schedule, CareTaskPriority priority,
                    boolean reminderActive, boolean active) {
        this.id = id;
        this.patientId = patientId;
        this.name = name;
        this.instructions = instructions;
        this.schedule = schedule;
        this.priority = priority;
        this.reminderActive = reminderActive;
        this.active = active;
    }

    public void update(String name, String instructions, CareTaskSchedule schedule,
                       CareTaskPriority priority, boolean reminderActive) {
        this.name = name;
        this.instructions = instructions;
        this.schedule = schedule;
        this.priority = priority;
        this.reminderActive = reminderActive;
    }

    public void deactivate() { this.active = false; }

    public CareTaskId getId() { return id; }
    public PatientId getPatientId() { return patientId; }
    public String getName() { return name; }
    public String getInstructions() { return instructions; }
    public CareTaskSchedule getSchedule() { return schedule; }
    public CareTaskPriority getPriority() { return priority; }
    public boolean isReminderActive() { return reminderActive; }
    public boolean isActive() { return active; }
}
```

- [ ] **Step 2: Write `CareTaskLog`**

```java
// backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskLog.java
package com.cuidalink.caretask.domain.model;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDateTime;

public class CareTaskLog {

    private final CareTaskLogId id;
    private final CareTaskId careTaskId;
    private final PatientId patientId;
    private final LocalDateTime scheduledAt;
    private CareTaskLogStatus status;
    private UserId completedBy;
    private LocalDateTime completedAt;

    public CareTaskLog(CareTaskLogId id, CareTaskId careTaskId, PatientId patientId,
                       LocalDateTime scheduledAt, CareTaskLogStatus status,
                       UserId completedBy, LocalDateTime completedAt) {
        this.id = id;
        this.careTaskId = careTaskId;
        this.patientId = patientId;
        this.scheduledAt = scheduledAt;
        this.status = status;
        this.completedBy = completedBy;
        this.completedAt = completedAt;
    }

    public void complete(UserId completedBy) {
        if (status != CareTaskLogStatus.PENDING)
            throw new IllegalStateException("Solo se puede completar una tarea PENDING");
        this.status = CareTaskLogStatus.DONE;
        this.completedBy = completedBy;
        this.completedAt = LocalDateTime.now();
    }

    public CareTaskLogId getId() { return id; }
    public CareTaskId getCareTaskId() { return careTaskId; }
    public PatientId getPatientId() { return patientId; }
    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public CareTaskLogStatus getStatus() { return status; }
    public UserId getCompletedBy() { return completedBy; }
    public LocalDateTime getCompletedAt() { return completedAt; }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && mvn compile -q`
Expected: no output (success).

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/cuidalink/caretask/domain/model/CareTask.java \
        backend/src/main/java/com/cuidalink/caretask/domain/model/CareTaskLog.java
git commit -m "feat(backend): add CareTask and CareTaskLog domain entities"
```

---

## Task 3: Ports + `CareTaskService`

**Files:**
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/port/in/CreateCareTaskUseCase.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/port/in/ListCareTasksUseCase.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/port/in/GetCareTaskUseCase.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/port/in/UpdateCareTaskUseCase.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/port/in/DeactivateCareTaskUseCase.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/port/in/GetDailyCareTaskLogsUseCase.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/port/in/CompleteCareTaskLogUseCase.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/port/out/CareTaskRepository.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/port/out/CareTaskLogRepository.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/domain/service/CareTaskService.java`
- Test: `backend/src/test/java/com/cuidalink/caretask/domain/service/CareTaskServiceTest.java`

**Interfaces:**
- Consumes: `CareTask`, `CareTaskLog`, `CareTaskId`, `CareTaskLogId`, `CareTaskSchedule`,
  `CareTaskPriority` (Tasks 1–2); `Patient.isOwner`/`hasAccess`,
  `PatientRepository.findById(PatientId)` (existing).
- Produces: `CareTaskRepository{save,findById,findByPatientId,findAllActive}`,
  `CareTaskLogRepository{save,findById,findByPatientIdAndDate,existsByCareTaskIdAndScheduledAt,findPendingAt}`,
  and `CareTaskService` implementing all 7 use cases. Tasks 4–9 depend on these exact method
  signatures.

- [ ] **Step 1: Write the failing test**

```java
// backend/src/test/java/com/cuidalink/caretask/domain/service/CareTaskServiceTest.java
package com.cuidalink.caretask.domain.service;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.*;
import com.cuidalink.caretask.domain.port.in.CreateCareTaskUseCase;
import com.cuidalink.caretask.domain.port.out.CareTaskLogRepository;
import com.cuidalink.caretask.domain.port.out.CareTaskRepository;
import com.cuidalink.patient.domain.model.*;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CareTaskServiceTest {

    @Mock CareTaskRepository taskRepository;
    @Mock CareTaskLogRepository logRepository;
    @Mock PatientRepository patientRepository;
    CareTaskService sut;

    UserId ownerId = new UserId(UUID.randomUUID());
    CareTaskSchedule schedule = new CareTaskSchedule(
        LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
        List.of(DayOfWeek.MONDAY), LocalDate.now(), null
    );

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new CareTaskService(taskRepository, logRepository, patientRepository);
    }

    @Test
    void createTask_failsIfRequesterIsNotOwner() {
        var patient = buildPatient(ownerId);
        var stranger = new UserId(UUID.randomUUID());
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.execute(new CreateCareTaskUseCase.CreateCareTaskCommand(
            patient.getId(), "Tomar presión", "Registrar resultado", schedule,
            CareTaskPriority.MEDIUM, true, stranger)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void createTask_ownerCanCreateTask() {
        var patient = buildPatient(ownerId);
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = sut.execute(new CreateCareTaskUseCase.CreateCareTaskCommand(
            patient.getId(), "Tomar presión", "Registrar resultado", schedule,
            CareTaskPriority.MEDIUM, true, ownerId));

        assertThat(result.getName()).isEqualTo("Tomar presión");
        assertThat(result.getPatientId()).isEqualTo(patient.getId());
        assertThat(result.isActive()).isTrue();
        verify(taskRepository).save(any(CareTask.class));
    }

    @Test
    void listTasks_failsIfUserHasNoAccess() {
        var patient = buildPatient(ownerId);
        var stranger = new UserId(UUID.randomUUID());
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.listTasks(patient.getId(), stranger))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void completeLog_collaboratorCanCompletePendingLog() {
        var collaborator = new UserId(UUID.randomUUID());
        var patient = buildPatientWithCollaborator(ownerId, collaborator);
        var taskId = CareTaskId.generate();
        var log = new CareTaskLog(CareTaskLogId.generate(), taskId, patient.getId(),
            LocalDateTime.now(), CareTaskLogStatus.PENDING, null, null);

        when(logRepository.findById(log.getId())).thenReturn(Optional.of(log));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));
        when(logRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = sut.complete(log.getId(), collaborator);

        assertThat(result.getStatus()).isEqualTo(CareTaskLogStatus.DONE);
        assertThat(result.getCompletedBy()).isEqualTo(collaborator);
        assertThat(result.getCompletedAt()).isNotNull();
    }

    @Test
    void completeLog_failsIfUserHasNoAccess() {
        var stranger = new UserId(UUID.randomUUID());
        var patient = buildPatient(ownerId);
        var taskId = CareTaskId.generate();
        var log = new CareTaskLog(CareTaskLogId.generate(), taskId, patient.getId(),
            LocalDateTime.now(), CareTaskLogStatus.PENDING, null, null);

        when(logRepository.findById(log.getId())).thenReturn(Optional.of(log));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.complete(log.getId(), stranger))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("acceso");
    }

    @Test
    void completeLog_failsIfAlreadyDone() {
        var patient = buildPatient(ownerId);
        var taskId = CareTaskId.generate();
        var log = new CareTaskLog(CareTaskLogId.generate(), taskId, patient.getId(),
            LocalDateTime.now(), CareTaskLogStatus.DONE, ownerId, LocalDateTime.now());

        when(logRepository.findById(log.getId())).thenReturn(Optional.of(log));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.complete(log.getId(), ownerId))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void deactivate_failsIfRequesterIsNotOwner() {
        var stranger = new UserId(UUID.randomUUID());
        var patient = buildPatient(ownerId);
        var task = new CareTask(CareTaskId.generate(), patient.getId(),
            "Tomar presión", "", schedule, CareTaskPriority.MEDIUM, true, true);

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.deactivate(task.getId(), stranger))
            .isInstanceOf(IllegalArgumentException.class);
    }

    private Patient buildPatient(UserId owner) {
        return new Patient(PatientId.generate(), "María García", LocalDate.of(1945, 3, 10),
            Gender.FEMALE, "12345678", "Calle Test 123", "Fonasa", "O+",
            "Diabetes", "Penicilina",
            new EmergencyContact("Juan", "+56912345678"), owner);
    }

    private Patient buildPatientWithCollaborator(UserId owner, UserId collaborator) {
        var patient = buildPatient(owner);
        patient.addCollaborator(collaborator);
        return patient;
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn test -q -Dtest=CareTaskServiceTest`
Expected: FAIL to compile — none of the ports/service exist yet.

- [ ] **Step 3: Write the port/in interfaces**

```java
// backend/src/main/java/com/cuidalink/caretask/domain/port/in/CreateCareTaskUseCase.java
package com.cuidalink.caretask.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.CareTask;
import com.cuidalink.caretask.domain.model.CareTaskPriority;
import com.cuidalink.caretask.domain.model.CareTaskSchedule;
import com.cuidalink.patient.domain.model.PatientId;

public interface CreateCareTaskUseCase {

    record CreateCareTaskCommand(
        PatientId patientId,
        String name,
        String instructions,
        CareTaskSchedule schedule,
        CareTaskPriority priority,
        boolean reminderActive,
        UserId requesterId
    ) {}

    CareTask execute(CreateCareTaskCommand command);
}
```

```java
// backend/src/main/java/com/cuidalink/caretask/domain/port/in/ListCareTasksUseCase.java
package com.cuidalink.caretask.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.CareTask;
import com.cuidalink.patient.domain.model.PatientId;

import java.util.List;

public interface ListCareTasksUseCase {
    List<CareTask> listTasks(PatientId patientId, UserId requesterId);
}
```

```java
// backend/src/main/java/com/cuidalink/caretask/domain/port/in/GetCareTaskUseCase.java
package com.cuidalink.caretask.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.CareTask;
import com.cuidalink.caretask.domain.model.CareTaskId;
import com.cuidalink.patient.domain.model.PatientId;

public interface GetCareTaskUseCase {
    CareTask getTask(PatientId patientId, CareTaskId taskId, UserId requesterId);
}
```

```java
// backend/src/main/java/com/cuidalink/caretask/domain/port/in/UpdateCareTaskUseCase.java
package com.cuidalink.caretask.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.CareTask;
import com.cuidalink.caretask.domain.model.CareTaskId;
import com.cuidalink.caretask.domain.model.CareTaskPriority;
import com.cuidalink.caretask.domain.model.CareTaskSchedule;
import com.cuidalink.patient.domain.model.PatientId;

public interface UpdateCareTaskUseCase {

    record UpdateCareTaskCommand(
        PatientId patientId,
        CareTaskId taskId,
        String name,
        String instructions,
        CareTaskSchedule schedule,
        CareTaskPriority priority,
        boolean reminderActive,
        UserId requesterId
    ) {}

    CareTask updateTask(UpdateCareTaskCommand command);
}
```

```java
// backend/src/main/java/com/cuidalink/caretask/domain/port/in/DeactivateCareTaskUseCase.java
package com.cuidalink.caretask.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.CareTaskId;

public interface DeactivateCareTaskUseCase {
    void deactivate(CareTaskId taskId, UserId requesterId);
}
```

```java
// backend/src/main/java/com/cuidalink/caretask/domain/port/in/GetDailyCareTaskLogsUseCase.java
package com.cuidalink.caretask.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.CareTaskLog;
import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDate;
import java.util.List;

public interface GetDailyCareTaskLogsUseCase {
    List<CareTaskLog> getLogs(PatientId patientId, LocalDate date, UserId requesterId);
}
```

```java
// backend/src/main/java/com/cuidalink/caretask/domain/port/in/CompleteCareTaskLogUseCase.java
package com.cuidalink.caretask.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.CareTaskLog;
import com.cuidalink.caretask.domain.model.CareTaskLogId;

public interface CompleteCareTaskLogUseCase {
    CareTaskLog complete(CareTaskLogId logId, UserId requesterId);
}
```

- [ ] **Step 4: Write the port/out interfaces**

```java
// backend/src/main/java/com/cuidalink/caretask/domain/port/out/CareTaskRepository.java
package com.cuidalink.caretask.domain.port.out;

import com.cuidalink.caretask.domain.model.CareTask;
import com.cuidalink.caretask.domain.model.CareTaskId;
import com.cuidalink.patient.domain.model.PatientId;

import java.util.List;
import java.util.Optional;

public interface CareTaskRepository {
    CareTask save(CareTask task);
    Optional<CareTask> findById(CareTaskId id);
    List<CareTask> findByPatientId(PatientId patientId);
    List<CareTask> findAllActive();
}
```

```java
// backend/src/main/java/com/cuidalink/caretask/domain/port/out/CareTaskLogRepository.java
package com.cuidalink.caretask.domain.port.out;

import com.cuidalink.caretask.domain.model.CareTaskId;
import com.cuidalink.caretask.domain.model.CareTaskLog;
import com.cuidalink.caretask.domain.model.CareTaskLogId;
import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CareTaskLogRepository {
    CareTaskLog save(CareTaskLog log);
    Optional<CareTaskLog> findById(CareTaskLogId id);
    List<CareTaskLog> findByPatientIdAndDate(PatientId patientId, LocalDate date);
    boolean existsByCareTaskIdAndScheduledAt(CareTaskId careTaskId, LocalDateTime scheduledAt);
    List<CareTaskLog> findPendingAt(LocalDateTime scheduledAt);
}
```

- [ ] **Step 5: Write `CareTaskService`**

```java
// backend/src/main/java/com/cuidalink/caretask/domain/service/CareTaskService.java
package com.cuidalink.caretask.domain.service;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.*;
import com.cuidalink.caretask.domain.port.in.*;
import com.cuidalink.caretask.domain.port.out.CareTaskLogRepository;
import com.cuidalink.caretask.domain.port.out.CareTaskRepository;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class CareTaskService implements
    CreateCareTaskUseCase,
    ListCareTasksUseCase,
    GetCareTaskUseCase,
    UpdateCareTaskUseCase,
    DeactivateCareTaskUseCase,
    GetDailyCareTaskLogsUseCase,
    CompleteCareTaskLogUseCase {

    private final CareTaskRepository taskRepository;
    private final CareTaskLogRepository logRepository;
    private final PatientRepository patientRepository;

    public CareTaskService(CareTaskRepository taskRepository,
                           CareTaskLogRepository logRepository,
                           PatientRepository patientRepository) {
        this.taskRepository = taskRepository;
        this.logRepository = logRepository;
        this.patientRepository = patientRepository;
    }

    @Override
    public CareTask execute(CreateCareTaskCommand cmd) {
        var patient = patientRepository.findById(cmd.patientId())
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.isOwner(cmd.requesterId()))
            throw new IllegalArgumentException("Solo el cuidador principal puede agregar tareas");
        var task = new CareTask(
            CareTaskId.generate(), cmd.patientId(), cmd.name(), cmd.instructions(),
            cmd.schedule(), cmd.priority(), cmd.reminderActive(), true
        );
        return taskRepository.save(task);
    }

    @Override
    public List<CareTask> listTasks(PatientId patientId, UserId requesterId) {
        var patient = patientRepository.findById(patientId)
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Acceso denegado");
        return taskRepository.findByPatientId(patientId);
    }

    @Override
    public CareTask getTask(PatientId patientId, CareTaskId taskId, UserId requesterId) {
        var task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada"));
        if (!task.getPatientId().equals(patientId))
            throw new IllegalArgumentException("La tarea no pertenece al paciente indicado");
        var patient = patientRepository.findById(task.getPatientId())
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Acceso denegado");
        return task;
    }

    @Override
    public CareTask updateTask(UpdateCareTaskCommand cmd) {
        var task = taskRepository.findById(cmd.taskId())
            .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada"));
        if (!task.getPatientId().equals(cmd.patientId()))
            throw new IllegalArgumentException("La tarea no pertenece al paciente indicado");
        var patient = patientRepository.findById(task.getPatientId())
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.isOwner(cmd.requesterId()))
            throw new IllegalArgumentException("Solo el cuidador principal puede actualizar tareas");
        task.update(cmd.name(), cmd.instructions(), cmd.schedule(), cmd.priority(), cmd.reminderActive());
        return taskRepository.save(task);
    }

    @Override
    public void deactivate(CareTaskId taskId, UserId requesterId) {
        var task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada"));
        var patient = patientRepository.findById(task.getPatientId())
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.isOwner(requesterId))
            throw new IllegalArgumentException("Solo el cuidador principal puede desactivar tareas");
        task.deactivate();
        taskRepository.save(task);
    }

    @Override
    public List<CareTaskLog> getLogs(PatientId patientId, LocalDate date, UserId requesterId) {
        var patient = patientRepository.findById(patientId)
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Acceso denegado");
        return logRepository.findByPatientIdAndDate(patientId, date);
    }

    @Override
    public CareTaskLog complete(CareTaskLogId logId, UserId requesterId) {
        var log = logRepository.findById(logId)
            .orElseThrow(() -> new IllegalArgumentException("Registro no encontrado"));
        var patient = patientRepository.findById(log.getPatientId())
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Acceso denegado");
        log.complete(requesterId);
        return logRepository.save(log);
    }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && mvn test -q -Dtest=CareTaskServiceTest`
Expected: PASS (7 tests green).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/cuidalink/caretask/domain/port \
        backend/src/main/java/com/cuidalink/caretask/domain/service \
        backend/src/test/java/com/cuidalink/caretask/domain/service
git commit -m "feat(backend): add CareTask use case ports and CareTaskService"
```

---

## Task 4: JPA persistence for `CareTask`

**Files:**
- Create: `backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/CareTaskJpaEntity.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/SpringCareTaskRepository.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/JpaCareTaskRepositoryAdapter.java`

**Interfaces:**
- Consumes: `CareTask`, `CareTaskId`, `CareTaskSchedule`, `CareTaskPriority`,
  `CareTaskScheduleType` (Tasks 1–2); `CareTaskRepository` (Task 3).
- Produces: `JpaCareTaskRepositoryAdapter implements CareTaskRepository` — a Spring `@Component`,
  auto-wired wherever `CareTaskRepository` is injected (Task 3's service, Task 8's scheduler). No
  dedicated unit test — same convention as `JpaMedicationRepositoryAdapter` (untested directly,
  covered by the end-to-end `CareTaskIntegrationTest` in Task 10).

- [ ] **Step 1: Write the JPA entity**

```java
// backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/CareTaskJpaEntity.java
package com.cuidalink.caretask.adapter.out.persistence;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "care_tasks")
public class CareTaskJpaEntity {

    @Id
    private String id;
    private String patientId;
    private String name;
    private String instructions;
    private String priority;
    private boolean reminderActive;
    private boolean active;

    private String scheduleTime;         // "HH:mm"
    private String scheduleType;         // DAYS_OF_WEEK | DATE_RANGE
    private String scheduleDaysOfWeek;   // "MONDAY,FRIDAY"
    private LocalDate scheduleStartDate;
    private LocalDate scheduleEndDate;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public boolean isReminderActive() { return reminderActive; }
    public void setReminderActive(boolean reminderActive) { this.reminderActive = reminderActive; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public String getScheduleTime() { return scheduleTime; }
    public void setScheduleTime(String scheduleTime) { this.scheduleTime = scheduleTime; }

    public String getScheduleType() { return scheduleType; }
    public void setScheduleType(String scheduleType) { this.scheduleType = scheduleType; }

    public String getScheduleDaysOfWeek() { return scheduleDaysOfWeek; }
    public void setScheduleDaysOfWeek(String scheduleDaysOfWeek) { this.scheduleDaysOfWeek = scheduleDaysOfWeek; }

    public LocalDate getScheduleStartDate() { return scheduleStartDate; }
    public void setScheduleStartDate(LocalDate scheduleStartDate) { this.scheduleStartDate = scheduleStartDate; }

    public LocalDate getScheduleEndDate() { return scheduleEndDate; }
    public void setScheduleEndDate(LocalDate scheduleEndDate) { this.scheduleEndDate = scheduleEndDate; }
}
```

- [ ] **Step 2: Write the Spring Data repository**

```java
// backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/SpringCareTaskRepository.java
package com.cuidalink.caretask.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringCareTaskRepository extends JpaRepository<CareTaskJpaEntity, String> {
    List<CareTaskJpaEntity> findByPatientId(String patientId);
    List<CareTaskJpaEntity> findByActiveTrue();
}
```

- [ ] **Step 3: Write the repository adapter**

```java
// backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/JpaCareTaskRepositoryAdapter.java
package com.cuidalink.caretask.adapter.out.persistence;

import com.cuidalink.caretask.domain.model.*;
import com.cuidalink.caretask.domain.port.out.CareTaskRepository;
import com.cuidalink.patient.domain.model.PatientId;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class JpaCareTaskRepositoryAdapter implements CareTaskRepository {

    private final SpringCareTaskRepository jpa;

    public JpaCareTaskRepositoryAdapter(SpringCareTaskRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public CareTask save(CareTask task) {
        jpa.save(toJpa(task));
        return task;
    }

    @Override
    public Optional<CareTask> findById(CareTaskId id) {
        return jpa.findById(id.value().toString()).map(this::toDomain);
    }

    @Override
    public List<CareTask> findByPatientId(PatientId patientId) {
        return jpa.findByPatientId(patientId.value().toString())
            .stream().map(this::toDomain).toList();
    }

    @Override
    public List<CareTask> findAllActive() {
        return jpa.findByActiveTrue().stream().map(this::toDomain).toList();
    }

    private CareTaskJpaEntity toJpa(CareTask t) {
        var e = new CareTaskJpaEntity();
        e.setId(t.getId().value().toString());
        e.setPatientId(t.getPatientId().value().toString());
        e.setName(t.getName());
        e.setInstructions(t.getInstructions());
        e.setPriority(t.getPriority().name());
        e.setReminderActive(t.isReminderActive());
        e.setActive(t.isActive());

        CareTaskSchedule s = t.getSchedule();
        e.setScheduleTime(s.time().toString());
        e.setScheduleType(s.scheduleType().name());
        e.setScheduleDaysOfWeek(daysToString(s.daysOfWeek()));
        e.setScheduleStartDate(s.startDate());
        e.setScheduleEndDate(s.endDate());
        return e;
    }

    private CareTask toDomain(CareTaskJpaEntity e) {
        var schedule = new CareTaskSchedule(
            LocalTime.parse(e.getScheduleTime()),
            CareTaskScheduleType.valueOf(e.getScheduleType()),
            daysFromString(e.getScheduleDaysOfWeek()),
            e.getScheduleStartDate(),
            e.getScheduleEndDate()
        );
        return new CareTask(
            new CareTaskId(UUID.fromString(e.getId())),
            new PatientId(UUID.fromString(e.getPatientId())),
            e.getName(),
            e.getInstructions(),
            schedule,
            CareTaskPriority.valueOf(e.getPriority()),
            e.isReminderActive(),
            e.isActive()
        );
    }

    private String daysToString(List<DayOfWeek> days) {
        if (days == null || days.isEmpty()) return "";
        return days.stream().map(DayOfWeek::name).collect(Collectors.joining(","));
    }

    private List<DayOfWeek> daysFromString(String s) {
        if (s == null || s.isBlank()) return List.of();
        return Arrays.stream(s.split(",")).map(DayOfWeek::valueOf).toList();
    }
}
```

- [ ] **Step 4: Verify it compiles**

Run: `cd backend && mvn compile -q`
Expected: no output (success).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/CareTaskJpaEntity.java \
        backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/SpringCareTaskRepository.java \
        backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/JpaCareTaskRepositoryAdapter.java
git commit -m "feat(backend): add JPA persistence adapter for CareTask"
```

---

## Task 5: JPA persistence for `CareTaskLog`

**Files:**
- Create: `backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/CareTaskLogJpaEntity.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/SpringCareTaskLogRepository.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/JpaCareTaskLogRepositoryAdapter.java`

**Interfaces:**
- Consumes: `CareTaskLog`, `CareTaskLogId`, `CareTaskId`, `CareTaskLogStatus` (Tasks 1–2);
  `CareTaskLogRepository` (Task 3).
- Produces: `JpaCareTaskLogRepositoryAdapter implements CareTaskLogRepository` — a Spring
  `@Component`, auto-wired wherever `CareTaskLogRepository` is injected (Task 3's service, Task 8's
  daily-log scheduler, Task 9's reminder scheduler).

- [ ] **Step 1: Write the JPA entity**

```java
// backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/CareTaskLogJpaEntity.java
package com.cuidalink.caretask.adapter.out.persistence;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "care_task_logs")
public class CareTaskLogJpaEntity {

    @Id
    private String id;
    private String careTaskId;
    private String patientId;
    private LocalDateTime scheduledAt;
    private String status;
    private String completedById;
    private LocalDateTime completedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCareTaskId() { return careTaskId; }
    public void setCareTaskId(String careTaskId) { this.careTaskId = careTaskId; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(LocalDateTime scheduledAt) { this.scheduledAt = scheduledAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCompletedById() { return completedById; }
    public void setCompletedById(String completedById) { this.completedById = completedById; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}
```

- [ ] **Step 2: Write the Spring Data repository**

```java
// backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/SpringCareTaskLogRepository.java
package com.cuidalink.caretask.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SpringCareTaskLogRepository extends JpaRepository<CareTaskLogJpaEntity, String> {

    @Query("SELECT l FROM CareTaskLogJpaEntity l WHERE l.patientId = :patientId AND l.scheduledAt >= :startOfDay AND l.scheduledAt < :startOfNextDay")
    List<CareTaskLogJpaEntity> findByPatientIdAndDate(
        @Param("patientId") String patientId,
        @Param("startOfDay") LocalDateTime startOfDay,
        @Param("startOfNextDay") LocalDateTime startOfNextDay
    );

    boolean existsByCareTaskIdAndScheduledAt(String careTaskId, LocalDateTime scheduledAt);

    List<CareTaskLogJpaEntity> findByStatusAndScheduledAt(String status, LocalDateTime scheduledAt);
}
```

- [ ] **Step 3: Write the repository adapter**

```java
// backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/JpaCareTaskLogRepositoryAdapter.java
package com.cuidalink.caretask.adapter.out.persistence;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.CareTaskId;
import com.cuidalink.caretask.domain.model.CareTaskLog;
import com.cuidalink.caretask.domain.model.CareTaskLogId;
import com.cuidalink.caretask.domain.model.CareTaskLogStatus;
import com.cuidalink.caretask.domain.port.out.CareTaskLogRepository;
import com.cuidalink.patient.domain.model.PatientId;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class JpaCareTaskLogRepositoryAdapter implements CareTaskLogRepository {

    private final SpringCareTaskLogRepository jpa;

    public JpaCareTaskLogRepositoryAdapter(SpringCareTaskLogRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public CareTaskLog save(CareTaskLog log) {
        jpa.save(toJpa(log));
        return log;
    }

    @Override
    public Optional<CareTaskLog> findById(CareTaskLogId id) {
        return jpa.findById(id.value().toString()).map(this::toDomain);
    }

    @Override
    public List<CareTaskLog> findByPatientIdAndDate(PatientId patientId, LocalDate date) {
        var startOfDay = date.atStartOfDay();
        var startOfNextDay = date.plusDays(1).atStartOfDay();
        return jpa.findByPatientIdAndDate(patientId.value().toString(), startOfDay, startOfNextDay)
            .stream().map(this::toDomain).toList();
    }

    @Override
    public boolean existsByCareTaskIdAndScheduledAt(CareTaskId careTaskId, LocalDateTime scheduledAt) {
        return jpa.existsByCareTaskIdAndScheduledAt(careTaskId.value().toString(), scheduledAt);
    }

    @Override
    public List<CareTaskLog> findPendingAt(LocalDateTime scheduledAt) {
        return jpa.findByStatusAndScheduledAt(CareTaskLogStatus.PENDING.name(), scheduledAt)
            .stream().map(this::toDomain).toList();
    }

    private CareTaskLogJpaEntity toJpa(CareTaskLog l) {
        var e = new CareTaskLogJpaEntity();
        e.setId(l.getId().value().toString());
        e.setCareTaskId(l.getCareTaskId().value().toString());
        e.setPatientId(l.getPatientId().value().toString());
        e.setScheduledAt(l.getScheduledAt());
        e.setStatus(l.getStatus().name());
        e.setCompletedById(l.getCompletedBy() != null ? l.getCompletedBy().value().toString() : null);
        e.setCompletedAt(l.getCompletedAt());
        return e;
    }

    private CareTaskLog toDomain(CareTaskLogJpaEntity e) {
        UserId completedBy = e.getCompletedById() != null
            ? new UserId(UUID.fromString(e.getCompletedById())) : null;
        return new CareTaskLog(
            new CareTaskLogId(UUID.fromString(e.getId())),
            new CareTaskId(UUID.fromString(e.getCareTaskId())),
            new PatientId(UUID.fromString(e.getPatientId())),
            e.getScheduledAt(),
            CareTaskLogStatus.valueOf(e.getStatus()),
            completedBy,
            e.getCompletedAt()
        );
    }
}
```

- [ ] **Step 4: Verify it compiles**

Run: `cd backend && mvn compile -q`
Expected: no output (success).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/CareTaskLogJpaEntity.java \
        backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/SpringCareTaskLogRepository.java \
        backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/JpaCareTaskLogRepositoryAdapter.java
git commit -m "feat(backend): add JPA persistence adapter for CareTaskLog"
```

---

## Task 6: REST DTOs + `CareTaskController`

**Files:**
- Create: `backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/dto/CareTaskScheduleDto.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/dto/CreateCareTaskRequest.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/dto/UpdateCareTaskRequest.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/dto/CareTaskResponse.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/CareTaskController.java`

**Interfaces:**
- Consumes: `CreateCareTaskUseCase`, `ListCareTasksUseCase`, `GetCareTaskUseCase`,
  `UpdateCareTaskUseCase`, `DeactivateCareTaskUseCase` (Task 3, Spring-injected).
- Produces: `POST/GET /patients/{patientId}/tasks`, `GET/PUT /patients/{patientId}/tasks/{taskId}`,
  `PATCH /patients/{patientId}/tasks/{taskId}/deactivate`. `CareTaskResponse` JSON shape is consumed
  by the mobile `ApiCareTaskRepository` in Task 14 — field names must match exactly:
  `id, patientId, name, instructions, priority, reminderActive, schedule, active`, where `schedule`
  is `{ time, scheduleType, daysOfWeek, startDate, endDate }`.

- [ ] **Step 1: Write the DTOs**

```java
// backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/dto/CareTaskScheduleDto.java
package com.cuidalink.caretask.adapter.in.rest.dto;

import com.cuidalink.caretask.domain.model.CareTaskScheduleType;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record CareTaskScheduleDto(
    LocalTime time,
    CareTaskScheduleType scheduleType,
    List<DayOfWeek> daysOfWeek,
    LocalDate startDate,
    LocalDate endDate
) {}
```

```java
// backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/dto/CreateCareTaskRequest.java
package com.cuidalink.caretask.adapter.in.rest.dto;

import com.cuidalink.caretask.domain.model.CareTaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateCareTaskRequest(
    @NotBlank String name,
    String instructions,
    @NotNull CareTaskScheduleDto schedule,
    @NotNull CareTaskPriority priority,
    boolean reminderActive
) {}
```

```java
// backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/dto/UpdateCareTaskRequest.java
package com.cuidalink.caretask.adapter.in.rest.dto;

import com.cuidalink.caretask.domain.model.CareTaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateCareTaskRequest(
    @NotBlank String name,
    String instructions,
    @NotNull CareTaskScheduleDto schedule,
    @NotNull CareTaskPriority priority,
    boolean reminderActive
) {}
```

```java
// backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/dto/CareTaskResponse.java
package com.cuidalink.caretask.adapter.in.rest.dto;

public record CareTaskResponse(
    String id,
    String patientId,
    String name,
    String instructions,
    String priority,
    boolean reminderActive,
    CareTaskScheduleDto schedule,
    boolean active
) {}
```

- [ ] **Step 2: Write the controller**

```java
// backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/CareTaskController.java
package com.cuidalink.caretask.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.caretask.adapter.in.rest.dto.*;
import com.cuidalink.caretask.domain.model.*;
import com.cuidalink.caretask.domain.port.in.*;
import com.cuidalink.patient.domain.model.PatientId;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/patients/{patientId}/tasks")
public class CareTaskController {

    private final CreateCareTaskUseCase createUseCase;
    private final ListCareTasksUseCase listUseCase;
    private final GetCareTaskUseCase getUseCase;
    private final UpdateCareTaskUseCase updateUseCase;
    private final DeactivateCareTaskUseCase deactivateUseCase;

    public CareTaskController(CreateCareTaskUseCase createUseCase,
                              ListCareTasksUseCase listUseCase,
                              GetCareTaskUseCase getUseCase,
                              UpdateCareTaskUseCase updateUseCase,
                              DeactivateCareTaskUseCase deactivateUseCase) {
        this.createUseCase = createUseCase;
        this.listUseCase = listUseCase;
        this.getUseCase = getUseCase;
        this.updateUseCase = updateUseCase;
        this.deactivateUseCase = deactivateUseCase;
    }

    @PostMapping
    public ResponseEntity<CareTaskResponse> create(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @Validated @RequestBody CreateCareTaskRequest req) {
        var patId = new PatientId(UUID.fromString(patientId));
        var task = createUseCase.execute(new CreateCareTaskUseCase.CreateCareTaskCommand(
            patId, req.name(), req.instructions() != null ? req.instructions() : "",
            toScheduleDomain(req.schedule()), req.priority(), req.reminderActive(), user.getId()
        ));
        return ResponseEntity.status(201).body(toResponse(task));
    }

    @GetMapping
    public ResponseEntity<List<CareTaskResponse>> list(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId) {
        var patId = new PatientId(UUID.fromString(patientId));
        return ResponseEntity.ok(listUseCase.listTasks(patId, user.getId())
            .stream().map(this::toResponse).toList());
    }

    @GetMapping("/{taskId}")
    public ResponseEntity<CareTaskResponse> get(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @PathVariable String taskId) {
        var patId = new PatientId(UUID.fromString(patientId));
        var task = getUseCase.getTask(patId, new CareTaskId(UUID.fromString(taskId)), user.getId());
        return ResponseEntity.ok(toResponse(task));
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<CareTaskResponse> update(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @PathVariable String taskId,
            @Validated @RequestBody UpdateCareTaskRequest req) {
        var patId = new PatientId(UUID.fromString(patientId));
        var task = updateUseCase.updateTask(new UpdateCareTaskUseCase.UpdateCareTaskCommand(
            patId, new CareTaskId(UUID.fromString(taskId)), req.name(),
            req.instructions() != null ? req.instructions() : "",
            toScheduleDomain(req.schedule()), req.priority(), req.reminderActive(), user.getId()
        ));
        return ResponseEntity.ok(toResponse(task));
    }

    @PatchMapping("/{taskId}/deactivate")
    public ResponseEntity<Void> deactivate(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @PathVariable String taskId) {
        deactivateUseCase.deactivate(new CareTaskId(UUID.fromString(taskId)), user.getId());
        return ResponseEntity.noContent().build();
    }

    private CareTaskSchedule toScheduleDomain(CareTaskScheduleDto dto) {
        var startDate = dto.startDate();
        if (dto.scheduleType() == CareTaskScheduleType.DAYS_OF_WEEK && startDate == null) {
            startDate = LocalDate.now();
        }
        return new CareTaskSchedule(
            dto.time(), dto.scheduleType(),
            dto.daysOfWeek() != null ? dto.daysOfWeek() : List.of(),
            startDate, dto.endDate()
        );
    }

    private CareTaskResponse toResponse(CareTask t) {
        var s = t.getSchedule();
        var schedDto = new CareTaskScheduleDto(s.time(), s.scheduleType(), s.daysOfWeek(), s.startDate(), s.endDate());
        return new CareTaskResponse(
            t.getId().value().toString(),
            t.getPatientId().value().toString(),
            t.getName(),
            t.getInstructions(),
            t.getPriority().name(),
            t.isReminderActive(),
            schedDto,
            t.isActive()
        );
    }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && mvn compile -q`
Expected: no output (success).

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/dto \
        backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/CareTaskController.java
git commit -m "feat(backend): add CareTask REST controller and DTOs"
```

---

## Task 7: `CareTaskLogResponse` DTO + `CareTaskLogController`

**Files:**
- Create: `backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/dto/CareTaskLogResponse.java`
- Create: `backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/CareTaskLogController.java`

**Interfaces:**
- Consumes: `GetDailyCareTaskLogsUseCase`, `CompleteCareTaskLogUseCase`, `ListCareTasksUseCase`
  (Task 3, Spring-injected).
- Produces: `GET /patients/{patientId}/task-logs?date=YYYY-MM-DD`,
  `PATCH /task-logs/{logId}/complete` (no request body). `CareTaskLogResponse` JSON shape consumed
  by mobile in Task 14: `id, careTaskId, taskName, instructions, priority, scheduledAt, status`.

- [ ] **Step 1: Write the DTO**

```java
// backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/dto/CareTaskLogResponse.java
package com.cuidalink.caretask.adapter.in.rest.dto;

public record CareTaskLogResponse(
    String id,
    String careTaskId,
    String taskName,
    String instructions,
    String priority,
    String scheduledAt,
    String status
) {}
```

- [ ] **Step 2: Write the controller**

```java
// backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/CareTaskLogController.java
package com.cuidalink.caretask.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.caretask.adapter.in.rest.dto.CareTaskLogResponse;
import com.cuidalink.caretask.domain.model.CareTask;
import com.cuidalink.caretask.domain.model.CareTaskId;
import com.cuidalink.caretask.domain.model.CareTaskLog;
import com.cuidalink.caretask.domain.model.CareTaskLogId;
import com.cuidalink.caretask.domain.port.in.CompleteCareTaskLogUseCase;
import com.cuidalink.caretask.domain.port.in.GetDailyCareTaskLogsUseCase;
import com.cuidalink.caretask.domain.port.in.ListCareTasksUseCase;
import com.cuidalink.patient.domain.model.PatientId;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
public class CareTaskLogController {

    private final GetDailyCareTaskLogsUseCase logsUseCase;
    private final CompleteCareTaskLogUseCase completeUseCase;
    private final ListCareTasksUseCase listTasksUseCase;

    public CareTaskLogController(GetDailyCareTaskLogsUseCase logsUseCase,
                                 CompleteCareTaskLogUseCase completeUseCase,
                                 ListCareTasksUseCase listTasksUseCase) {
        this.logsUseCase = logsUseCase;
        this.completeUseCase = completeUseCase;
        this.listTasksUseCase = listTasksUseCase;
    }

    @GetMapping("/patients/{patientId}/task-logs")
    public ResponseEntity<List<CareTaskLogResponse>> getDailyLogs(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        var patId = new PatientId(UUID.fromString(patientId));
        var logs = logsUseCase.getLogs(patId, date, user.getId());
        var tasksById = listTasksUseCase.listTasks(patId, user.getId())
            .stream().collect(Collectors.toMap(CareTask::getId, Function.identity()));
        return ResponseEntity.ok(logs.stream().map(log -> toResponse(log, tasksById)).toList());
    }

    @PatchMapping("/task-logs/{logId}/complete")
    public ResponseEntity<CareTaskLogResponse> complete(
            @AuthenticationPrincipal User user,
            @PathVariable String logId) {
        var log = completeUseCase.complete(new CareTaskLogId(UUID.fromString(logId)), user.getId());
        var task = listTasksUseCase.listTasks(log.getPatientId(), user.getId())
            .stream().filter(t -> t.getId().equals(log.getCareTaskId())).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada"));
        return ResponseEntity.ok(toResponse(log, Map.of(task.getId(), task)));
    }

    private CareTaskLogResponse toResponse(CareTaskLog log, Map<CareTaskId, CareTask> tasksById) {
        var task = tasksById.get(log.getCareTaskId());
        return new CareTaskLogResponse(
            log.getId().value().toString(),
            log.getCareTaskId().value().toString(),
            task.getName(),
            task.getInstructions(),
            task.getPriority().name(),
            log.getScheduledAt().toString(),
            log.getStatus().name()
        );
    }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && mvn compile -q`
Expected: no output (success).

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/dto/CareTaskLogResponse.java \
        backend/src/main/java/com/cuidalink/caretask/adapter/in/rest/CareTaskLogController.java
git commit -m "feat(backend): add CareTaskLog REST controller"
```

---

## Task 8: `DailyCareTaskLogScheduler`

**Files:**
- Create: `backend/src/main/java/com/cuidalink/notification/scheduler/DailyCareTaskLogScheduler.java`
- Test: `backend/src/test/java/com/cuidalink/notification/scheduler/DailyCareTaskLogSchedulerTest.java`

**Interfaces:**
- Consumes: `CareTaskRepository.findAllActive()`, `CareTaskSchedule.shouldRunOn(LocalDate)`,
  `CareTaskLogRepository.existsByCareTaskIdAndScheduledAt`/`save` (Tasks 1, 3).
- Produces: `DailyCareTaskLogScheduler.generateDailyLogs()` — a Spring `@Component` with
  `@Scheduled(cron = "0 1 0 * * *")`, no other task depends on this directly (it's a leaf).

- [ ] **Step 1: Write the failing test**

```java
// backend/src/test/java/com/cuidalink/notification/scheduler/DailyCareTaskLogSchedulerTest.java
package com.cuidalink.notification.scheduler;

import com.cuidalink.caretask.domain.model.*;
import com.cuidalink.caretask.domain.port.out.CareTaskLogRepository;
import com.cuidalink.caretask.domain.port.out.CareTaskRepository;
import com.cuidalink.patient.domain.model.PatientId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DailyCareTaskLogSchedulerTest {

    @Mock CareTaskRepository taskRepository;
    @Mock CareTaskLogRepository logRepository;
    DailyCareTaskLogScheduler sut;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new DailyCareTaskLogScheduler(taskRepository, logRepository);
    }

    @Test
    void generateDailyLogs_createsLogForTaskScheduledToday() {
        var today = LocalDate.now();
        var schedule = new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(today.getDayOfWeek()), today.minusDays(1), null);
        var task = new CareTask(CareTaskId.generate(), PatientId.generate(),
            "Tomar presión", "", schedule, CareTaskPriority.MEDIUM, true, true);

        when(taskRepository.findAllActive()).thenReturn(List.of(task));
        when(logRepository.existsByCareTaskIdAndScheduledAt(any(), any())).thenReturn(false);

        sut.generateDailyLogs();

        verify(logRepository).save(argThat(log ->
            log.getCareTaskId().equals(task.getId())
            && log.getStatus() == CareTaskLogStatus.PENDING
            && log.getScheduledAt().equals(today.atTime(LocalTime.of(9, 0)))));
    }

    @Test
    void generateDailyLogs_skipsTaskNotScheduledToday() {
        var today = LocalDate.now();
        var otherDay = today.getDayOfWeek() == DayOfWeek.MONDAY ? DayOfWeek.TUESDAY : DayOfWeek.MONDAY;
        var schedule = new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(otherDay), today.minusDays(1), null);
        var task = new CareTask(CareTaskId.generate(), PatientId.generate(),
            "Tomar presión", "", schedule, CareTaskPriority.MEDIUM, true, true);

        when(taskRepository.findAllActive()).thenReturn(List.of(task));

        sut.generateDailyLogs();

        verify(logRepository, never()).save(any());
    }

    @Test
    void generateDailyLogs_doesNotDuplicateExistingLog() {
        var today = LocalDate.now();
        var schedule = new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(today.getDayOfWeek()), today.minusDays(1), null);
        var task = new CareTask(CareTaskId.generate(), PatientId.generate(),
            "Tomar presión", "", schedule, CareTaskPriority.MEDIUM, true, true);

        when(taskRepository.findAllActive()).thenReturn(List.of(task));
        when(logRepository.existsByCareTaskIdAndScheduledAt(any(), any())).thenReturn(true);

        sut.generateDailyLogs();

        verify(logRepository, never()).save(any());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn test -q -Dtest=DailyCareTaskLogSchedulerTest`
Expected: FAIL to compile — `DailyCareTaskLogScheduler` does not exist yet.

- [ ] **Step 3: Write the scheduler**

```java
// backend/src/main/java/com/cuidalink/notification/scheduler/DailyCareTaskLogScheduler.java
package com.cuidalink.notification.scheduler;

import com.cuidalink.caretask.domain.model.CareTaskLog;
import com.cuidalink.caretask.domain.model.CareTaskLogId;
import com.cuidalink.caretask.domain.model.CareTaskLogStatus;
import com.cuidalink.caretask.domain.port.out.CareTaskLogRepository;
import com.cuidalink.caretask.domain.port.out.CareTaskRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class DailyCareTaskLogScheduler {

    private final CareTaskRepository taskRepository;
    private final CareTaskLogRepository logRepository;

    public DailyCareTaskLogScheduler(CareTaskRepository taskRepository,
                                     CareTaskLogRepository logRepository) {
        this.taskRepository = taskRepository;
        this.logRepository = logRepository;
    }

    @Scheduled(cron = "0 1 0 * * *")  // cada día a las 00:01
    public void generateDailyLogs() {
        var today = LocalDate.now();
        var activeTasks = taskRepository.findAllActive();
        for (var task : activeTasks) {
            if (!task.getSchedule().shouldRunOn(today)) continue;
            var scheduledAt = today.atTime(task.getSchedule().time());
            if (logRepository.existsByCareTaskIdAndScheduledAt(task.getId(), scheduledAt)) continue;
            var log = new CareTaskLog(CareTaskLogId.generate(), task.getId(), task.getPatientId(),
                scheduledAt, CareTaskLogStatus.PENDING, null, null);
            logRepository.save(log);
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && mvn test -q -Dtest=DailyCareTaskLogSchedulerTest`
Expected: PASS (3 tests green).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/cuidalink/notification/scheduler/DailyCareTaskLogScheduler.java \
        backend/src/test/java/com/cuidalink/notification/scheduler/DailyCareTaskLogSchedulerTest.java
git commit -m "feat(backend): add cron job to generate daily CareTaskLog entries"
```

---

## Task 9: `CareTaskReminderScheduler`

**Files:**
- Create: `backend/src/main/java/com/cuidalink/notification/scheduler/CareTaskReminderScheduler.java`
- Test: `backend/src/test/java/com/cuidalink/notification/scheduler/CareTaskReminderSchedulerTest.java`

**Interfaces:**
- Consumes: `CareTaskLogRepository.findPendingAt`, `CareTaskRepository.findById`,
  `PatientRepository.findById` (existing), `UserRepository.findById` (existing),
  `NotificationSender.send` (existing).
- Produces: `CareTaskReminderScheduler.sendReminders()` — a Spring `@Component` with
  `@Scheduled(fixedDelay = 60_000)`, leaf task.

- [ ] **Step 1: Write the failing test**

```java
// backend/src/test/java/com/cuidalink/notification/scheduler/CareTaskReminderSchedulerTest.java
package com.cuidalink.notification.scheduler;

import com.cuidalink.auth.domain.model.*;
import com.cuidalink.auth.domain.port.out.UserRepository;
import com.cuidalink.caretask.domain.model.*;
import com.cuidalink.caretask.domain.port.out.CareTaskLogRepository;
import com.cuidalink.caretask.domain.port.out.CareTaskRepository;
import com.cuidalink.notification.domain.port.out.NotificationSender;
import com.cuidalink.patient.domain.model.*;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CareTaskReminderSchedulerTest {

    @Mock CareTaskLogRepository logRepository;
    @Mock CareTaskRepository taskRepository;
    @Mock PatientRepository patientRepository;
    @Mock UserRepository userRepository;
    @Mock NotificationSender notificationSender;
    CareTaskReminderScheduler sut;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new CareTaskReminderScheduler(logRepository, taskRepository, patientRepository, userRepository, notificationSender);
    }

    @Test
    void sendReminders_sendsPushWhenReminderActive() {
        var owner = mockUser("owner-fcm-token");
        var patient = mockPatient(owner.getId());
        var schedule = new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(DayOfWeek.MONDAY), LocalDate.now(), null);
        var task = new CareTask(CareTaskId.generate(), patient.getId(),
            "Tomar presión", "", schedule, CareTaskPriority.MEDIUM, true, true);
        var log = new CareTaskLog(CareTaskLogId.generate(), task.getId(), patient.getId(),
            LocalDateTime.now().withSecond(0).withNano(0), CareTaskLogStatus.PENDING, null, null);

        when(logRepository.findPendingAt(any())).thenReturn(List.of(log));
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));
        when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));

        sut.sendReminders();

        verify(notificationSender).send(eq("owner-fcm-token"), contains("Tarea pendiente"), any());
    }

    @Test
    void sendReminders_doesNotSendWhenReminderInactive() {
        var owner = mockUser("owner-fcm-token");
        var patient = mockPatient(owner.getId());
        var schedule = new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(DayOfWeek.MONDAY), LocalDate.now(), null);
        var task = new CareTask(CareTaskId.generate(), patient.getId(),
            "Tomar presión", "", schedule, CareTaskPriority.MEDIUM, false, true);
        var log = new CareTaskLog(CareTaskLogId.generate(), task.getId(), patient.getId(),
            LocalDateTime.now().withSecond(0).withNano(0), CareTaskLogStatus.PENDING, null, null);

        when(logRepository.findPendingAt(any())).thenReturn(List.of(log));
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        sut.sendReminders();

        verify(notificationSender, never()).send(any(), any(), any());
    }

    private User mockUser(String fcmTokenValue) {
        var userId = UserId.generate();
        var user = new User(userId, "Owner Test", new Email("owner@test.com"), "firebase-uid-" + userId.value());
        user.updateFcmToken(new FcmToken(fcmTokenValue));
        return user;
    }

    private Patient mockPatient(UserId ownerId) {
        return new Patient(PatientId.generate(), "Paciente Test",
            LocalDate.of(1945, 3, 10), Gender.FEMALE, "12345678",
            "Calle Test 123", "Fonasa", "O+",
            "Diabetes", "Ninguna",
            new EmergencyContact("Contacto", "+56912345678"), ownerId);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn test -q -Dtest=CareTaskReminderSchedulerTest`
Expected: FAIL to compile — `CareTaskReminderScheduler` does not exist yet.

- [ ] **Step 3: Write the scheduler**

```java
// backend/src/main/java/com/cuidalink/notification/scheduler/CareTaskReminderScheduler.java
package com.cuidalink.notification.scheduler;

import com.cuidalink.auth.domain.port.out.UserRepository;
import com.cuidalink.caretask.domain.port.out.CareTaskLogRepository;
import com.cuidalink.caretask.domain.port.out.CareTaskRepository;
import com.cuidalink.notification.domain.port.out.NotificationSender;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class CareTaskReminderScheduler {

    private final CareTaskLogRepository logRepository;
    private final CareTaskRepository taskRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final NotificationSender notificationSender;

    public CareTaskReminderScheduler(CareTaskLogRepository logRepository,
                                     CareTaskRepository taskRepository,
                                     PatientRepository patientRepository,
                                     UserRepository userRepository,
                                     NotificationSender notificationSender) {
        this.logRepository = logRepository;
        this.taskRepository = taskRepository;
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
        this.notificationSender = notificationSender;
    }

    @Scheduled(fixedDelay = 60_000)  // cada minuto
    public void sendReminders() {
        var now = LocalDateTime.now().withSecond(0).withNano(0);
        var dueLogs = logRepository.findPendingAt(now);
        for (var log : dueLogs) {
            taskRepository.findById(log.getCareTaskId()).ifPresent(task -> {
                if (!task.isReminderActive()) return;
                patientRepository.findById(log.getPatientId()).ifPresent(patient -> {
                    userRepository.findById(patient.getPrimaryCaregiver()).ifPresent(owner -> {
                        if (owner.getFcmToken() != null) {
                            notificationSender.send(owner.getFcmToken().value(),
                                "Tarea pendiente",
                                task.getName() + " — " + now.toLocalTime().toString());
                        }
                    });
                });
            });
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && mvn test -q -Dtest=CareTaskReminderSchedulerTest`
Expected: PASS (2 tests green).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/cuidalink/notification/scheduler/CareTaskReminderScheduler.java \
        backend/src/test/java/com/cuidalink/notification/scheduler/CareTaskReminderSchedulerTest.java
git commit -m "feat(backend): send FCM reminder push when a care task becomes due"
```

---

## Task 10: `schema.sql` documentation update

**Files:**
- Modify: `backend/src/main/resources/schema.sql`

**Interfaces:**
- None — this file is documentation only. Hibernate `ddl-auto=update` (prod) / `create-drop` (test,
  via Testcontainers) generates the real schema from the JPA entities in Tasks 4–5; nothing reads
  this file at runtime. No test — verify by inspection.

- [ ] **Step 1: Add the two new tables**

Insert after the `vital_records` table definition (before the `-- ÍNDICES` section header):

```sql
-- Tareas de cuidado diario programadas por el owner
CREATE TABLE care_tasks (
    id                      VARCHAR(36)  PRIMARY KEY,
    patient_id              VARCHAR(36)  NOT NULL,
    name                    VARCHAR(255) NOT NULL,
    instructions            TEXT,
    priority                VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',  -- enum: LOW, MEDIUM, HIGH
    reminder_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    active                  BOOLEAN      NOT NULL DEFAULT TRUE,

    -- Schedule (embebido, mismo patrón que medications)
    schedule_time            VARCHAR(5)   NOT NULL,              -- "HH:mm"
    schedule_type            VARCHAR(20)  NOT NULL,              -- enum: DAYS_OF_WEEK, DATE_RANGE
    schedule_days_of_week    VARCHAR(255),                       -- "MONDAY,FRIDAY" (solo DAYS_OF_WEEK)
    schedule_start_date      DATE         NOT NULL,
    schedule_end_date        DATE,                               -- nullable = sin fecha fin (solo DATE_RANGE)

    CONSTRAINT fk_care_tasks_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
);

-- Logs diarios de tareas (generados por cron a las 00:01)
CREATE TABLE care_task_logs (
    id                  VARCHAR(36)  PRIMARY KEY,
    care_task_id        VARCHAR(36)  NOT NULL,
    patient_id          VARCHAR(36)  NOT NULL,                  -- desnormalizado para queries eficientes
    scheduled_at        TIMESTAMP    NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING', -- enum: PENDING, DONE
    completed_by_id     VARCHAR(36),                            -- nullable: quién completó
    completed_at        TIMESTAMP,                              -- nullable: cuándo se completó

    CONSTRAINT fk_task_logs_task    FOREIGN KEY (care_task_id) REFERENCES care_tasks (id),
    CONSTRAINT fk_task_logs_patient FOREIGN KEY (patient_id)   REFERENCES patients (id),
    -- Idempotencia del scheduler: un solo log por tarea+hora
    CONSTRAINT uq_task_logs_task_scheduled UNIQUE (care_task_id, scheduled_at)
);
```

- [ ] **Step 2: Add the matching indexes**

Insert at the end of the `-- ÍNDICES` section (after the `vital_records` indexes, at the end of
the file):

```sql
-- care_tasks: findByPatientId + findByActiveTrue (DailyCareTaskLogScheduler)
CREATE INDEX idx_care_tasks_patient ON care_tasks (patient_id);
CREATE INDEX idx_care_tasks_active  ON care_tasks (active);

-- care_task_logs:
--   findByPatientIdAndDate (logs del día)
--   findPendingAt          (CareTaskReminderScheduler cada minuto)
CREATE INDEX idx_task_log_patient_scheduled ON care_task_logs (patient_id, scheduled_at);
CREATE INDEX idx_task_log_status_scheduled  ON care_task_logs (status, scheduled_at);
CREATE INDEX idx_task_log_task              ON care_task_logs (care_task_id);
```

- [ ] **Step 3: Verify by inspection**

Run: `cat backend/src/main/resources/schema.sql | tail -40`
Expected: the two new tables and their indexes appear, matching the JPA entities from Tasks 4–5
column-for-column (`care_tasks`: id, patient_id, name, instructions, priority, reminder_active,
active, schedule_time, schedule_type, schedule_days_of_week, schedule_start_date,
schedule_end_date; `care_task_logs`: id, care_task_id, patient_id, scheduled_at, status,
completed_by_id, completed_at).

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/schema.sql
git commit -m "docs(backend): document care_tasks and care_task_logs tables in schema.sql"
```

---

## Task 11: `CareTaskIntegrationTest` (Testcontainers, end-to-end)

**Files:**
- Create: `backend/src/test/java/com/cuidalink/CareTaskIntegrationTest.java`

**Interfaces:**
- Consumes: the full stack built in Tasks 1–9, exercised only through HTTP
  (`TestRestTemplate`) and `CareTaskLogRepository` (to seed a log the way the cron would). This is
  the last backend task — verifies everything wired together against real PostgreSQL.

- [ ] **Step 1: Write the test**

```java
// backend/src/test/java/com/cuidalink/CareTaskIntegrationTest.java
package com.cuidalink;

import com.cuidalink.auth.adapter.in.rest.dto.RegisterRequest;
import com.cuidalink.auth.adapter.in.rest.dto.TokenResponse;
import com.cuidalink.caretask.adapter.in.rest.dto.CareTaskLogResponse;
import com.cuidalink.caretask.adapter.in.rest.dto.CareTaskResponse;
import com.cuidalink.caretask.adapter.in.rest.dto.CareTaskScheduleDto;
import com.cuidalink.caretask.adapter.in.rest.dto.CreateCareTaskRequest;
import com.cuidalink.caretask.domain.model.*;
import com.cuidalink.caretask.domain.port.out.CareTaskLogRepository;
import com.cuidalink.notification.domain.port.out.NotificationSender;
import com.cuidalink.patient.adapter.in.rest.dto.CreatePatientRequest;
import com.cuidalink.patient.adapter.in.rest.dto.EmergencyContactDto;
import com.cuidalink.patient.adapter.in.rest.dto.PatientResponse;
import com.cuidalink.patient.domain.model.Gender;
import com.cuidalink.patient.domain.model.PatientId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class CareTaskIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
        .withDatabaseName("cuidalink_test")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
    }

    @Autowired
    TestRestTemplate restTemplate;

    @MockBean
    NotificationSender notificationSender;

    @Autowired
    CareTaskLogRepository careTaskLogRepository;

    private HttpHeaders authHeaders;
    private String patientId;

    @BeforeEach
    void setUp() {
        String email = "task-caregiver-" + UUID.randomUUID() + "@test.com";

        var registerReq = new RegisterRequest("Task Caregiver", email, "password123");
        var registerResp = restTemplate.postForEntity("/api/v1/auth/register", registerReq, TokenResponse.class);
        assertThat(registerResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        String jwt = registerResp.getBody().token();

        authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(jwt);

        var patientReq = new CreatePatientRequest(
            "Patient For Tasks",
            LocalDate.of(1950, 1, 1),
            Gender.MALE,
            "22222222",
            "Calle Test 456",
            "Fonasa",
            "A+",
            null,
            null,
            new EmergencyContactDto("Contact", "+56900000001")
        );
        var patientEntity = new HttpEntity<>(patientReq, authHeaders);
        var patientResp = restTemplate.postForEntity("/api/v1/patients", patientEntity, PatientResponse.class);
        assertThat(patientResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        patientId = patientResp.getBody().id();
    }

    @Test
    void createTask_returnsCreated() {
        var schedule = new CareTaskScheduleDto(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(DayOfWeek.MONDAY, DayOfWeek.FRIDAY), null, null);
        var req = new CreateCareTaskRequest("Tomar presión", "Registrar resultado", schedule, CareTaskPriority.HIGH, true);

        var entity = new HttpEntity<>(req, authHeaders);
        var response = restTemplate.postForEntity(
            "/api/v1/patients/" + patientId + "/tasks", entity, CareTaskResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().name()).isEqualTo("Tomar presión");
        assertThat(response.getBody().priority()).isEqualTo("HIGH");
        assertThat(response.getBody().active()).isTrue();
        assertThat(response.getBody().patientId()).isEqualTo(patientId);
    }

    @Test
    void listTasks_afterCreate_returnsList() {
        var schedule = new CareTaskScheduleDto(
            LocalTime.of(8, 0), CareTaskScheduleType.DATE_RANGE,
            List.of(), LocalDate.now(), LocalDate.now().plusDays(7));
        var req = new CreateCareTaskRequest("Dar desayuno", "Servir dieta indicada", schedule, CareTaskPriority.MEDIUM, false);
        var entity = new HttpEntity<>(req, authHeaders);
        restTemplate.postForEntity("/api/v1/patients/" + patientId + "/tasks", entity, CareTaskResponse.class);

        var listResp = restTemplate.exchange(
            "/api/v1/patients/" + patientId + "/tasks",
            HttpMethod.GET,
            new HttpEntity<>(authHeaders),
            CareTaskResponse[].class
        );

        assertThat(listResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResp.getBody()).hasSizeGreaterThanOrEqualTo(1);
    }

    @Test
    void getDailyLogs_thenComplete_marksLogDone() {
        var schedule = new CareTaskScheduleDto(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(LocalDate.now().getDayOfWeek()), null, null);
        var taskReq = new CreateCareTaskRequest("Ejercicios de movilidad", "Realizar por 15 minutos", schedule, CareTaskPriority.LOW, true);
        var taskEntity = new HttpEntity<>(taskReq, authHeaders);
        var taskResp = restTemplate.postForEntity(
            "/api/v1/patients/" + patientId + "/tasks", taskEntity, CareTaskResponse.class);
        assertThat(taskResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        var taskId = new CareTaskId(UUID.fromString(taskResp.getBody().id()));

        var scheduledAt = LocalDateTime.now().withHour(9).withMinute(0).withSecond(0).withNano(0);
        careTaskLogRepository.save(new CareTaskLog(
            CareTaskLogId.generate(), taskId, new PatientId(UUID.fromString(patientId)),
            scheduledAt, CareTaskLogStatus.PENDING, null, null));

        var logsResp = restTemplate.exchange(
            "/api/v1/patients/" + patientId + "/task-logs?date=" + LocalDate.now(),
            HttpMethod.GET,
            new HttpEntity<>(authHeaders),
            CareTaskLogResponse[].class
        );
        assertThat(logsResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(logsResp.getBody()).hasSize(1);
        var logId = logsResp.getBody()[0].id();
        assertThat(logsResp.getBody()[0].taskName()).isEqualTo("Ejercicios de movilidad");
        assertThat(logsResp.getBody()[0].status()).isEqualTo("PENDING");

        var completeResp = restTemplate.exchange(
            "/api/v1/task-logs/" + logId + "/complete",
            HttpMethod.PATCH,
            new HttpEntity<>(authHeaders),
            CareTaskLogResponse.class
        );

        assertThat(completeResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(completeResp.getBody().status()).isEqualTo("DONE");
    }
}
```

- [ ] **Step 2: Run the test**

Run: `cd backend && mvn test -q -Dtest=CareTaskIntegrationTest`
Expected: PASS (3 tests green). Requires Docker running locally for Testcontainers.

- [ ] **Step 3: Run the full backend test suite**

Run: `cd backend && mvn test -q`
Expected: PASS — all existing tests plus every `CareTask*` test added in Tasks 1–11 are green.

- [ ] **Step 4: Commit**

```bash
git add backend/src/test/java/com/cuidalink/CareTaskIntegrationTest.java
git commit -m "test(backend): add end-to-end CareTask integration test"
```

---

## Task 12: `CareTask`/`CareTaskLog` mobile entities

**Files:**
- Create: `appmovil/src/domain/entities/CareTask.ts`
- Create: `appmovil/src/domain/entities/CareTaskLog.ts`
- Modify: `appmovil/src/domain/entities/index.ts`

**Interfaces:**
- Produces: TypeScript types `CareTaskPriority`, `CareTaskScheduleType`, `CareTaskSchedule`,
  `CareTask`, `CareTaskLogStatus`, `CareTaskLog`, all exported from `@/domain/entities`. Field
  names must match backend JSON exactly (Tasks 6–7): `CareTask{id,patientId,name,instructions,
  priority,reminderActive,schedule,active}`, `CareTaskLog{id,careTaskId,taskName,instructions,
  priority,scheduledAt,status}`. Every later frontend task imports from here.

- [ ] **Step 1: Write `CareTask.ts`**

```ts
// appmovil/src/domain/entities/CareTask.ts
export type CareTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type CareTaskScheduleType = 'DAYS_OF_WEEK' | 'DATE_RANGE';

export interface CareTaskSchedule {
  time: string;
  scheduleType: CareTaskScheduleType;
  daysOfWeek: string[];
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

- [ ] **Step 2: Write `CareTaskLog.ts`**

```ts
// appmovil/src/domain/entities/CareTaskLog.ts
import { CareTaskPriority } from './CareTask';

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

- [ ] **Step 3: Export from the entities barrel**

Read `appmovil/src/domain/entities/index.ts` first (current contents mirror this pattern:
`export * from './Medication'; export * from './MedicationLog'; ...`), then add two lines:

```ts
export * from './CareTask';
export * from './CareTaskLog';
```

- [ ] **Step 4: Verify it compiles**

Run: `cd appmovil && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add appmovil/src/domain/entities/CareTask.ts \
        appmovil/src/domain/entities/CareTaskLog.ts \
        appmovil/src/domain/entities/index.ts
git commit -m "feat(appmovil): add CareTask and CareTaskLog domain entities"
```

---

## Task 13: `pickTaskIcon` keyword-to-icon utility

**Files:**
- Create: `appmovil/src/domain/utils/careTaskDisplay.ts`
- Test: `appmovil/src/domain/utils/__tests__/careTaskDisplay.test.ts`

**Interfaces:**
- Produces: `pickTaskIcon(name: string): { icon: keyof typeof Ionicons.glyphMap; color: string }`.
  Consumed by `TaskCard` (Task 15).

- [ ] **Step 1: Write the failing test**

```ts
// appmovil/src/domain/utils/__tests__/careTaskDisplay.test.ts
import { pickTaskIcon } from '../careTaskDisplay';

describe('pickTaskIcon', () => {
  it('detecta tareas de signos vitales', () => {
    expect(pickTaskIcon('Tomar presión')).toEqual({ icon: 'clipboard', color: '#2f6fed' });
  });

  it('detecta tareas de alimentación', () => {
    expect(pickTaskIcon('Dar desayuno')).toEqual({ icon: 'restaurant', color: '#f5a623' });
  });

  it('detecta tareas de curación', () => {
    expect(pickTaskIcon('Cambiar apósito')).toEqual({ icon: 'bandage', color: '#e74c3c' });
  });

  it('detecta tareas de ejercicio', () => {
    expect(pickTaskIcon('Ejercicios de movilidad')).toEqual({ icon: 'walk', color: '#16a085' });
  });

  it('usa un ícono por defecto para nombres no reconocidos', () => {
    expect(pickTaskIcon('Leer un cuento')).toEqual({ icon: 'checkbox', color: '#7c5cfc' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd appmovil && npx jest --testPathPattern=domain/utils/__tests__/careTaskDisplay`
Expected: FAIL — cannot find module `../careTaskDisplay`.

- [ ] **Step 3: Write the utility**

```ts
// appmovil/src/domain/utils/careTaskDisplay.ts
import { Ionicons } from '@expo/vector-icons';

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
  return { icon: 'checkbox', color: '#7c5cfc' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd appmovil && npx jest --testPathPattern=domain/utils/__tests__/careTaskDisplay`
Expected: PASS (5 tests green).

- [ ] **Step 5: Commit**

```bash
git add appmovil/src/domain/utils/careTaskDisplay.ts \
        appmovil/src/domain/utils/__tests__/careTaskDisplay.test.ts
git commit -m "feat(appmovil): add keyword-based task icon picker"
```

---

## Task 14: `CareTaskRepository` (domain interface + API implementation + DI wiring)

**Files:**
- Create: `appmovil/src/domain/repositories/CareTaskRepository.ts`
- Create: `appmovil/src/data/repositories/ApiCareTaskRepository.ts`
- Modify: `appmovil/src/presentation/hooks/useInjection.ts`

**Interfaces:**
- Consumes: `CareTask`, `CareTaskLog` (Task 12); existing `apiClient` (`@/data/http/apiClient`,
  same Axios instance `ApiMedicationRepository` uses).
- Produces: `CareTaskRepository{listTasks,createTask,getDailyLogs,completeLog}` interface and
  `careTaskRepo` property returned from `useInjection()`. Consumed by `TasksScreen` (Task 17) and
  `CreateTaskScreen` (Task 18).

- [ ] **Step 1: Write the repository interface**

```ts
// appmovil/src/domain/repositories/CareTaskRepository.ts
import { CareTask, CareTaskLog, CareTaskPriority, CareTaskScheduleType } from '@/domain/entities';

export interface CreateCareTaskData {
  name: string;
  instructions: string;
  priority: CareTaskPriority;
  reminderActive: boolean;
  time: string;
  scheduleType: CareTaskScheduleType;
  daysOfWeek: string[];
  startDate: string | null;
  endDate: string | null;
}

export interface CareTaskRepository {
  listTasks(patientId: string): Promise<CareTask[]>;
  createTask(patientId: string, data: CreateCareTaskData): Promise<CareTask>;
  getDailyLogs(patientId: string, date: string): Promise<CareTaskLog[]>;
  completeLog(logId: string): Promise<CareTaskLog>;
}
```

- [ ] **Step 2: Write the API implementation**

```ts
// appmovil/src/data/repositories/ApiCareTaskRepository.ts
import apiClient from '@/data/http/apiClient';
import { CareTaskRepository, CreateCareTaskData } from '@/domain/repositories/CareTaskRepository';
import { CareTask, CareTaskLog } from '@/domain/entities';

export class ApiCareTaskRepository implements CareTaskRepository {
  async listTasks(patientId: string): Promise<CareTask[]> {
    const res = await apiClient.get<CareTask[]>(`/patients/${patientId}/tasks`);
    return res.data;
  }

  async createTask(patientId: string, data: CreateCareTaskData): Promise<CareTask> {
    const res = await apiClient.post<CareTask>(`/patients/${patientId}/tasks`, {
      name: data.name,
      instructions: data.instructions,
      priority: data.priority,
      reminderActive: data.reminderActive,
      schedule: {
        time: data.time,
        scheduleType: data.scheduleType,
        daysOfWeek: data.daysOfWeek,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
    return res.data;
  }

  async getDailyLogs(patientId: string, date: string): Promise<CareTaskLog[]> {
    const res = await apiClient.get<CareTaskLog[]>(`/patients/${patientId}/task-logs?date=${date}`);
    return res.data;
  }

  async completeLog(logId: string): Promise<CareTaskLog> {
    const res = await apiClient.patch<CareTaskLog>(`/task-logs/${logId}/complete`);
    return res.data;
  }
}
```

- [ ] **Step 3: Wire it into `useInjection.ts`**

Read `appmovil/src/presentation/hooks/useInjection.ts` first (current contents build
`authRepo`/`patientRepo`/`medicationRepo`/`vitalRepo`/`reportRepo` the same way). Add the import:

```ts
import { ApiCareTaskRepository } from '@/data/repositories/ApiCareTaskRepository';
```

Inside the `useMemo` callback, add the instantiation next to the other repos:

```ts
const careTaskRepo = new ApiCareTaskRepository();
```

And add `careTaskRepo,` to the returned object (next to `medicationRepo,`).

- [ ] **Step 4: Verify it compiles**

Run: `cd appmovil && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add appmovil/src/domain/repositories/CareTaskRepository.ts \
        appmovil/src/data/repositories/ApiCareTaskRepository.ts \
        appmovil/src/presentation/hooks/useInjection.ts
git commit -m "feat(appmovil): add CareTaskRepository and wire it into DI"
```

---

## Task 15: `TaskCard` component

**Files:**
- Create: `appmovil/src/presentation/components/TaskCard.tsx`
- Test: `appmovil/src/presentation/components/__tests__/TaskCard.test.tsx`

**Interfaces:**
- Consumes: `CareTaskLog` (Task 12), `pickTaskIcon` (Task 13).
- Produces: `TaskCard({ log: CareTaskLog, onPress?: () => void })` — a `TouchableOpacity` card;
  `onPress` only fires when `log.status === 'PENDING'`. Consumed by `TasksScreen` (Task 17).

- [ ] **Step 1: Write the failing test**

```tsx
// appmovil/src/presentation/components/__tests__/TaskCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import TaskCard from '../TaskCard';
import { CareTaskLog } from '@/domain/entities';

function buildLog(overrides: Partial<CareTaskLog> = {}): CareTaskLog {
  return {
    id: 'l1',
    careTaskId: 't1',
    taskName: 'Tomar presión',
    instructions: 'Registrar resultado en la app',
    priority: 'MEDIUM',
    scheduledAt: '2026-07-07T08:00:00-04:00',
    status: 'PENDING',
    ...overrides,
  };
}

describe('TaskCard', () => {
  it('muestra nombre e indicaciones', () => {
    render(<TaskCard log={buildLog()} />);
    expect(screen.getByText('Tomar presión')).toBeTruthy();
    expect(screen.getByText('Registrar resultado en la app')).toBeTruthy();
  });

  it('muestra el badge "Pendiente" y llama a onPress al tocar', () => {
    const onPress = jest.fn();
    render(<TaskCard log={buildLog()} onPress={onPress} />);
    expect(screen.getByText('Pendiente')).toBeTruthy();
    fireEvent.press(screen.getByText('Tomar presión'));
    expect(onPress).toHaveBeenCalled();
  });

  it('muestra el badge "Realizada" y no llama a onPress al tocar', () => {
    const onPress = jest.fn();
    render(<TaskCard log={buildLog({ status: 'DONE' })} onPress={onPress} />);
    expect(screen.getByText('Realizada')).toBeTruthy();
    fireEvent.press(screen.getByText('Tomar presión'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd appmovil && npx jest --testPathPattern=components/__tests__/TaskCard`
Expected: FAIL — cannot find module `../TaskCard`.

- [ ] **Step 3: Write the component**

```tsx
// appmovil/src/presentation/components/TaskCard.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CareTaskLog, CareTaskLogStatus } from '@/domain/entities';
import { pickTaskIcon } from '@/domain/utils/careTaskDisplay';

const STATUS_BADGE: Record<CareTaskLogStatus, { label: string; bg: string; textColor: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PENDING: { label: 'Pendiente', bg: '#e6b800', textColor: '#3d2e00', icon: 'time-outline' },
  DONE: { label: 'Realizada', bg: '#1a9c7d', textColor: '#fff', icon: 'checkmark-circle' },
};

type Props = {
  log: CareTaskLog;
  onPress?: () => void;
};

export default function TaskCard({ log, onPress }: Props) {
  const iconStyle = pickTaskIcon(log.taskName);
  const badge = STATUS_BADGE[log.status];
  const clickable = log.status === 'PENDING' && !!onPress;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!clickable}
      activeOpacity={clickable ? 0.8 : 1}
    >
      <View style={[styles.iconBadge, { backgroundColor: iconStyle.color }]}>
        <Ionicons name={iconStyle.icon} size={24} color="#fff" />
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{log.taskName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={14} color={badge.textColor} />
            <Text style={[styles.statusText, { color: badge.textColor }]}>{badge.label}</Text>
          </View>
        </View>
        <View style={styles.detailsRow}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Hora</Text>
            <Text style={styles.detailValue}>
              {new Date(log.scheduledAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={[styles.detailColumn, { flex: 2 }]}>
            <Text style={styles.detailLabel}>Indicaciones</Text>
            <Text style={styles.detailValue}>{log.instructions || '—'}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#7dd3fc" />
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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd appmovil && npx jest --testPathPattern=components/__tests__/TaskCard`
Expected: PASS (3 tests green).

- [ ] **Step 5: Commit**

```bash
git add appmovil/src/presentation/components/TaskCard.tsx \
        appmovil/src/presentation/components/__tests__/TaskCard.test.tsx
git commit -m "feat(appmovil): add TaskCard component"
```

---

## Task 16: `TaskActionModal` component

**Files:**
- Create: `appmovil/src/presentation/components/TaskActionModal.tsx`
- Test: `appmovil/src/presentation/components/__tests__/TaskActionModal.test.tsx`

**Interfaces:**
- Consumes: `CareTaskLog` (Task 12).
- Produces: `TaskActionModal({ visible, log, onComplete, onClose })`. Consumed by `TasksScreen`
  (Task 17).

- [ ] **Step 1: Write the failing test**

```tsx
// appmovil/src/presentation/components/__tests__/TaskActionModal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import TaskActionModal from '../TaskActionModal';
import { CareTaskLog } from '@/domain/entities';

const log: CareTaskLog = {
  id: 'l1',
  careTaskId: 't1',
  taskName: 'Tomar presión',
  instructions: 'Registrar resultado',
  priority: 'MEDIUM',
  scheduledAt: '2026-07-07T08:00:00-04:00',
  status: 'PENDING',
};

describe('TaskActionModal', () => {
  it('no renderiza contenido cuando log es null', () => {
    const { toJSON } = render(
      <TaskActionModal visible={true} log={null} onComplete={jest.fn()} onClose={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it('muestra el nombre de la tarea', () => {
    render(<TaskActionModal visible={true} log={log} onComplete={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Tomar presión')).toBeTruthy();
  });

  it('llama a onComplete al presionar "Marcar como realizada"', () => {
    const onComplete = jest.fn();
    render(<TaskActionModal visible={true} log={log} onComplete={onComplete} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText('Marcar como realizada'));
    expect(onComplete).toHaveBeenCalled();
  });

  it('llama a onClose al presionar Cancelar', () => {
    const onClose = jest.fn();
    render(<TaskActionModal visible={true} log={log} onComplete={jest.fn()} onClose={onClose} />);
    fireEvent.press(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd appmovil && npx jest --testPathPattern=components/__tests__/TaskActionModal`
Expected: FAIL — cannot find module `../TaskActionModal`.

- [ ] **Step 3: Write the component**

```tsx
// appmovil/src/presentation/components/TaskActionModal.tsx
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CareTaskLog } from '@/domain/entities';

type Props = {
  visible: boolean;
  log: CareTaskLog | null;
  onComplete: () => void;
  onClose: () => void;
};

export default function TaskActionModal({ visible, log, onComplete, onClose }: Props) {
  if (!log) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.name}>{log.taskName}</Text>
          <Text style={styles.details}>
            {new Date(log.scheduledAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.completeBtn} onPress={onComplete}>
              <Text style={styles.completeText}>Marcar como realizada</Text>
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
  completeBtn: { flex: 1, backgroundColor: '#1a9c7d', padding: 12, borderRadius: 10, alignItems: 'center' },
  completeText: { color: '#fff', fontWeight: 'bold' },
  closeBtn: { alignItems: 'center', padding: 8 },
  closeText: { color: '#a5d8f3' },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd appmovil && npx jest --testPathPattern=components/__tests__/TaskActionModal`
Expected: PASS (4 tests green).

- [ ] **Step 5: Commit**

```bash
git add appmovil/src/presentation/components/TaskActionModal.tsx \
        appmovil/src/presentation/components/__tests__/TaskActionModal.test.tsx
git commit -m "feat(appmovil): add TaskActionModal component"
```

---

## Task 17: `TasksScreen` ("Tareas" screen)

**Files:**
- Create: `appmovil/src/presentation/screens/tasks/TasksScreen.tsx`
- Test: `appmovil/src/presentation/screens/tasks/__tests__/TasksScreen.test.tsx`

**Interfaces:**
- Consumes: `careTaskRepo` from `useInjection()` (Task 14), `TaskCard` (Task 15),
  `TaskActionModal` (Task 16), `CareTaskLog` (Task 12), `ScreenBackground`
  (`@/presentation/components/ScreenBackground`, existing), `useAuthStore` (existing,
  `selectedPatientId`). Requires route name `'Tasks'` and `'CreateTask'` to exist on
  `PatientStackParams` — added in Task 19, but this screen only needs the *type* to compile, so it
  is written before Task 19 registers the routes (same ordering the `medication` module used
  historically; `mvn`/`tsc` for this file alone is verified via the test, not full app compile).
- Produces: `TasksScreen` default export. Registered into `AppNavigator` in Task 19.

- [ ] **Step 1: Write the failing test**

```tsx
// appmovil/src/presentation/screens/tasks/__tests__/TasksScreen.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TasksScreen from '../TasksScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { CareTaskLog } from '@/domain/entities';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

function buildLog(overrides: Partial<CareTaskLog> = {}): CareTaskLog {
  return {
    id: 'l1',
    careTaskId: 't1',
    taskName: 'Tomar presión',
    instructions: 'Registrar resultado en la app',
    priority: 'MEDIUM',
    scheduledAt: '2026-07-07T08:00:00-04:00',
    status: 'PENDING',
    ...overrides,
  };
}

function renderScreen(logs: CareTaskLog[], navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const getDailyLogs = jest.fn().mockResolvedValue(logs);
  const completeLog = jest.fn().mockResolvedValue(logs[0] ?? null);
  mockedUseInjection.mockReturnValue({
    careTaskRepo: { getDailyLogs, completeLog },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <TasksScreen navigation={navigation} />
    </QueryClientProvider>
  );

  return { navigation, completeLog };
}

describe('TasksScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ selectedPatientId: 'p1' });
  });

  afterEach(() => {
    useAuthStore.setState({ selectedPatientId: null });
  });

  it('muestra todas las tareas bajo la pestaña "Todas" por defecto', async () => {
    renderScreen([
      buildLog({ id: 'l1', taskName: 'Tomar presión', status: 'PENDING' }),
      buildLog({ id: 'l2', taskName: 'Dar desayuno', status: 'DONE' }),
    ]);
    expect(await screen.findByText('Tomar presión')).toBeTruthy();
    expect(screen.getByText('Dar desayuno')).toBeTruthy();
  });

  it('filtra solo pendientes bajo "Pendientes"', async () => {
    renderScreen([
      buildLog({ id: 'l1', taskName: 'Tomar presión', status: 'PENDING' }),
      buildLog({ id: 'l2', taskName: 'Dar desayuno', status: 'DONE' }),
    ]);
    await screen.findByText('Tomar presión');
    fireEvent.press(screen.getByText('Pendientes'));
    expect(screen.getByText('Tomar presión')).toBeTruthy();
    expect(screen.queryByText('Dar desayuno')).toBeNull();
  });

  it('filtra solo realizadas bajo "Realizadas"', async () => {
    renderScreen([
      buildLog({ id: 'l1', taskName: 'Tomar presión', status: 'PENDING' }),
      buildLog({ id: 'l2', taskName: 'Dar desayuno', status: 'DONE' }),
    ]);
    await screen.findByText('Tomar presión');
    fireEvent.press(screen.getByText('Realizadas'));
    expect(screen.getByText('Dar desayuno')).toBeTruthy();
    expect(screen.queryByText('Tomar presión')).toBeNull();
  });

  it('abre el modal de acción al tocar una tarjeta pendiente y completa', async () => {
    const { completeLog } = renderScreen([buildLog({ id: 'l1', status: 'PENDING' })]);
    fireEvent.press(await screen.findByText('Tomar presión'));
    fireEvent.press(await screen.findByText('Marcar como realizada'));
    await waitFor(() => expect(completeLog).toHaveBeenCalledWith('l1'));
  });

  it('navega a CreateTask al presionar "Agregar tarea"', async () => {
    const { navigation } = renderScreen([]);
    fireEvent.press(await screen.findByText('Agregar tarea'));
    expect(navigation.navigate).toHaveBeenCalledWith('CreateTask');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd appmovil && npx jest --testPathPattern=screens/tasks/__tests__/TasksScreen`
Expected: FAIL — cannot find module `../TasksScreen`.

- [ ] **Step 3: Write the screen**

```tsx
// appmovil/src/presentation/screens/tasks/TasksScreen.tsx
import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { CareTaskLog } from '@/domain/entities';
import TaskCard from '@/presentation/components/TaskCard';
import TaskActionModal from '@/presentation/components/TaskActionModal';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'Tasks'>;
};

type Tab = 'ALL' | 'PENDING' | 'DONE';

function matchesTab(status: CareTaskLog['status'], tab: Tab): boolean {
  if (tab === 'ALL') return true;
  return status === tab;
}

export default function TasksScreen({ navigation }: Props) {
  const { careTaskRepo } = useInjection();
  const selectedPatientId = useAuthStore((s) => s.selectedPatientId);
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [tab, setTab] = useState<Tab>('ALL');
  const [selectedLog, setSelectedLog] = useState<CareTaskLog | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['care-task-logs', selectedPatientId, today],
    queryFn: () =>
      selectedPatientId
        ? careTaskRepo.getDailyLogs(selectedPatientId, today)
        : Promise.resolve([]),
    enabled: !!selectedPatientId,
  });

  const completeMutation = useMutation({
    mutationFn: (logId: string) => careTaskRepo.completeLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-task-logs'] });
      setSelectedLog(null);
    },
    onError: () => Alert.alert('Error', 'No se pudo completar la tarea.'),
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
          <TaskCard
            log={item}
            onPress={item.status === 'PENDING' ? () => setSelectedLog(item) : undefined}
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

            <Text style={styles.title}>Tareas</Text>
            <Text style={styles.subtitle}>Tareas programadas para hoy</Text>

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
                <Text style={[styles.tabText, tab === 'ALL' && styles.tabTextActive]}>Todas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tab === 'PENDING' && styles.tabActive]}
                onPress={() => setTab('PENDING')}
              >
                <Text style={[styles.tabText, tab === 'PENDING' && styles.tabTextActive]}>Pendientes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tab === 'DONE' && styles.tabActive]}
                onPress={() => setTab('DONE')}
              >
                <Text style={[styles.tabText, tab === 'DONE' && styles.tabTextActive]}>Realizadas</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={<Text style={styles.empty}>Sin tareas para mostrar.</Text>}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateTask')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Agregar tarea</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={{ padding: 20, paddingTop: 24 }}
      />

      <TaskActionModal
        visible={!!selectedLog}
        log={selectedLog}
        onComplete={() => selectedLog && completeMutation.mutate(selectedLog.id)}
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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd appmovil && npx jest --testPathPattern=screens/tasks/__tests__/TasksScreen`
Expected: PASS (5 tests green). (`PatientStackParams` doesn't have `'Tasks'`/`'CreateTask'` yet at
this point — Jest/Babel type-strips TS so the test still runs; `npx tsc --noEmit` will only be
fully clean after Task 19 registers the routes.)

- [ ] **Step 5: Commit**

```bash
git add appmovil/src/presentation/screens/tasks/TasksScreen.tsx \
        appmovil/src/presentation/screens/tasks/__tests__/TasksScreen.test.tsx
git commit -m "feat(appmovil): add TasksScreen"
```

---

## Task 18: `CreateTaskScreen` ("Programar tarea" screen)

**Files:**
- Create: `appmovil/src/presentation/screens/tasks/CreateTaskScreen.tsx`
- Test: `appmovil/src/presentation/screens/tasks/__tests__/CreateTaskScreen.test.tsx`

**Interfaces:**
- Consumes: `careTaskRepo`, `patientRepo`, `medicationRepo` from `useInjection()` (Task 14 +
  existing); `needsAttention` from `@/domain/utils/patientDisplay` (existing); `ScreenBackground`
  (existing). Requires route name `'CreateTask'` on `PatientStackParams` — registered in Task 19
  (same non-blocking ordering note as Task 17).
- Produces: `CreateTaskScreen` default export, calling
  `careTaskRepo.createTask(patientId, CreateCareTaskData)` on submit with the exact payload shape
  from Task 14. Registered into `AppNavigator` in Task 19.

- [ ] **Step 1: Write the failing test**

```tsx
// appmovil/src/presentation/screens/tasks/__tests__/CreateTaskScreen.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateTaskScreen from '../CreateTaskScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';

jest.mock('@/presentation/hooks/useInjection');

jest.mock('@react-native-community/datetimepicker', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockDateTimePicker({ onChange, testID }: any) {
    return (
      <TouchableOpacity testID={testID} onPress={() => onChange({}, new Date(2026, 7, 1, 9, 0, 0))}>
        <Text>mock-picker</Text>
      </TouchableOpacity>
    );
  };
});

const mockedUseInjection = useInjection as jest.Mock;

const patient = { id: 'p1', fullName: 'Rosa Martínez', birthDate: '1948-01-15', gender: 'FEMALE', isOwner: true, emergencyContact: { name: 'Juan', phone: '+56911112222' } };

function renderScreen(navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const createTask = jest.fn().mockResolvedValue({});
  const getPatient = jest.fn().mockResolvedValue(patient);
  const getDailyLogs = jest.fn().mockResolvedValue([]);
  mockedUseInjection.mockReturnValue({
    careTaskRepo: { createTask },
    patientRepo: { getPatient },
    medicationRepo: { getDailyLogs },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <CreateTaskScreen navigation={navigation} />
    </QueryClientProvider>
  );

  return { navigation, createTask };
}

describe('CreateTaskScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ selectedPatientId: 'p1' });
  });

  afterEach(() => {
    useAuthStore.setState({ selectedPatientId: null });
  });

  it('muestra la tarjeta del paciente con estado Estable', async () => {
    renderScreen();
    expect(await screen.findByText('Rosa Martínez')).toBeTruthy();
    expect(screen.getByText('Estable')).toBeTruthy();
  });

  it('muestra los 6 campos del formulario', async () => {
    renderScreen();
    await screen.findByText('Rosa Martínez');
    expect(screen.getByText('1. Nombre de la tarea')).toBeTruthy();
    expect(screen.getByText('2. Hora')).toBeTruthy();
    expect(screen.getByText('3. Tipo de programación')).toBeTruthy();
    expect(screen.getByText('4. Instrucciones')).toBeTruthy();
    expect(screen.getByText('5. Prioridad')).toBeTruthy();
    expect(screen.getByText('6. Recordatorio activo')).toBeTruthy();
  });

  it('por defecto muestra días de la semana y no rango de fechas', async () => {
    renderScreen();
    await screen.findByText('Rosa Martínez');
    expect(screen.getByText('Lun')).toBeTruthy();
    expect(screen.queryByText('Fecha de inicio')).toBeNull();
  });

  it('cambiar a "Rango de fechas" oculta los chips de día y muestra fechas', async () => {
    renderScreen();
    await screen.findByText('Rosa Martínez');
    fireEvent.press(screen.getByText('Rango de fechas'));
    expect(screen.queryByText('Lun')).toBeNull();
    expect(screen.getByText('Fecha de inicio')).toBeTruthy();
    expect(screen.getByText('Fecha de término')).toBeTruthy();
  });

  it('muestra error si falta el nombre al guardar', async () => {
    renderScreen();
    await screen.findByText('Rosa Martínez');
    fireEvent.press(screen.getByText('Guardar tarea'));
    expect(await screen.findByText('Nombre requerido')).toBeTruthy();
  });

  it('guarda exitosamente con días de la semana y navega atrás', async () => {
    const { createTask, navigation } = renderScreen();
    await screen.findByText('Rosa Martínez');

    fireEvent.changeText(screen.getByPlaceholderText('Ej: Tomar presión, Dar almuerzo, Cambiar apósito'), 'Tomar presión');
    fireEvent.press(screen.getByTestId('time-trigger'));
    fireEvent.press(screen.getByTestId('time-picker'));
    fireEvent.press(screen.getByText('Lun'));

    fireEvent.press(screen.getByText('Guardar tarea'));

    await waitFor(() => expect(createTask).toHaveBeenCalledWith('p1', {
      name: 'Tomar presión',
      instructions: '',
      priority: 'MEDIUM',
      reminderActive: true,
      time: '09:00',
      scheduleType: 'DAYS_OF_WEEK',
      daysOfWeek: ['MONDAY'],
      startDate: null,
      endDate: null,
    }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('muestra una alerta cuando falla la creación', async () => {
    const createTask = jest.fn().mockRejectedValue(new Error('network'));
    const getPatient = jest.fn().mockResolvedValue(patient);
    const getDailyLogs = jest.fn().mockResolvedValue([]);
    mockedUseInjection.mockReturnValue({
      careTaskRepo: { createTask },
      patientRepo: { getPatient },
      medicationRepo: { getDailyLogs },
    });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    render(
      <QueryClientProvider client={queryClient}>
        <CreateTaskScreen navigation={navigation as any} />
      </QueryClientProvider>
    );

    await screen.findByText('Rosa Martínez');
    fireEvent.changeText(screen.getByPlaceholderText('Ej: Tomar presión, Dar almuerzo, Cambiar apósito'), 'Tomar presión');
    fireEvent.press(screen.getByTestId('time-trigger'));
    fireEvent.press(screen.getByTestId('time-picker'));
    fireEvent.press(screen.getByText('Lun'));
    fireEvent.press(screen.getByText('Guardar tarea'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo guardar la tarea.'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd appmovil && npx jest --testPathPattern=screens/tasks/__tests__/CreateTaskScreen`
Expected: FAIL — cannot find module `../CreateTaskScreen`.

- [ ] **Step 3: Write the screen**

```tsx
// appmovil/src/presentation/screens/tasks/CreateTaskScreen.tsx
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { needsAttention } from '@/domain/utils/patientDisplay';
import ScreenBackground from '@/presentation/components/ScreenBackground';

function toLocalDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const DAY_OPTIONS: { label: string; value: string }[] = [
  { label: 'Lun', value: 'MONDAY' },
  { label: 'Mar', value: 'TUESDAY' },
  { label: 'Mié', value: 'WEDNESDAY' },
  { label: 'Jue', value: 'THURSDAY' },
  { label: 'Vie', value: 'FRIDAY' },
  { label: 'Sáb', value: 'SATURDAY' },
  { label: 'Dom', value: 'SUNDAY' },
];

const PRIORITY_OPTIONS: { value: 'LOW' | 'MEDIUM' | 'HIGH'; label: string; color: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'LOW', label: 'Baja', color: '#1a9c7d', icon: 'arrow-down' },
  { value: 'MEDIUM', label: 'Media', color: '#f5a623', icon: 'remove' },
  { value: 'HIGH', label: 'Alta', color: '#e05555', icon: 'arrow-up' },
];

const schema = z.object({
  name: z.string({ error: 'Nombre requerido' }).min(1, 'Nombre requerido'),
  time: z.string({ error: 'Hora requerida' }).min(1, 'Hora requerida'),
  scheduleType: z.enum(['DAYS_OF_WEEK', 'DATE_RANGE']),
  daysOfWeek: z.array(z.string()),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  instructions: z.string(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  reminderActive: z.boolean(),
}).refine((data) => data.scheduleType !== 'DAYS_OF_WEEK' || data.daysOfWeek.length > 0, {
  message: 'Selecciona al menos un día de la semana',
  path: ['daysOfWeek'],
}).refine((data) => data.scheduleType !== 'DATE_RANGE' || !!data.startDate, {
  message: 'Selecciona la fecha de inicio',
  path: ['startDate'],
}).refine((data) => data.scheduleType !== 'DATE_RANGE' || !!data.endDate, {
  message: 'Selecciona la fecha de término',
  path: ['endDate'],
});
type FormData = z.infer<typeof schema>;

type Props = { navigation: NativeStackNavigationProp<PatientStackParams, 'CreateTask'> };

export default function CreateTaskScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const { careTaskRepo, patientRepo, medicationRepo } = useInjection();
  const selectedPatientId = useAuthStore((s) => s.selectedPatientId);
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: patient } = useQuery({
    queryKey: ['patient', selectedPatientId],
    queryFn: () => patientRepo.getPatient(selectedPatientId!),
    enabled: !!selectedPatientId,
  });
  const { data: logs } = useQuery({
    queryKey: ['medication-logs', selectedPatientId, today],
    queryFn: () => medicationRepo.getDailyLogs(selectedPatientId!, today),
    enabled: !!selectedPatientId,
  });
  const attention = needsAttention(logs);

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      time: '', scheduleType: 'DAYS_OF_WEEK', daysOfWeek: [], startDate: null, endDate: null,
      instructions: '', priority: 'MEDIUM', reminderActive: true,
    },
  });

  const time = watch('time');
  const scheduleType = watch('scheduleType');
  const daysOfWeek = watch('daysOfWeek');
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const priority = watch('priority');
  const reminderActive = watch('reminderActive');

  function toggleDay(day: string) {
    const next = daysOfWeek.includes(day)
      ? daysOfWeek.filter((d) => d !== day)
      : [...daysOfWeek, day];
    setValue('daysOfWeek', next, { shouldValidate: true });
  }

  const onSubmit = async (data: FormData) => {
    if (!selectedPatientId) return;
    setLoading(true);
    try {
      await careTaskRepo.createTask(selectedPatientId, {
        name: data.name,
        instructions: data.instructions,
        priority: data.priority,
        reminderActive: data.reminderActive,
        time: data.time,
        scheduleType: data.scheduleType,
        daysOfWeek: data.scheduleType === 'DAYS_OF_WEEK' ? data.daysOfWeek : [],
        startDate: data.scheduleType === 'DATE_RANGE' ? data.startDate : null,
        endDate: data.scheduleType === 'DATE_RANGE' ? data.endDate : null,
      });
      await queryClient.invalidateQueries({ queryKey: ['care-task-logs', selectedPatientId] });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la tarea.');
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

        <Text style={styles.title}>Programar tarea</Text>
        <Text style={styles.subtitle}>Define cuándo y cómo debe realizarse</Text>

        {patient && (
          <View style={styles.patientCard}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={30} color="rgba(255,255,255,0.85)" />
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patient.fullName}</Text>
              {attention ? (
                <View style={[styles.statusBadge, styles.statusBadgeWarning]}>
                  <Ionicons name="warning" size={14} color="#3d2e00" />
                  <Text style={styles.statusTextWarning}>Requiere atención</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, styles.statusBadgeOk]}>
                  <Ionicons name="shield-checkmark" size={14} color="#fff" />
                  <Text style={styles.statusTextOk}>Estable</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>1. Nombre de la tarea</Text>
          <Controller control={control} name="name" render={({ field: { onChange, value } }) => (
            <TextInput style={styles.input} placeholder="Ej: Tomar presión, Dar almuerzo, Cambiar apósito"
              placeholderTextColor="#7c93ab" value={value} onChangeText={onChange} />
          )} />
          {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

          <Text style={styles.label}>2. Hora</Text>
          <TouchableOpacity style={styles.input} testID="time-trigger" onPress={() => setShowTimePicker(true)}>
            <Ionicons name="time-outline" size={16} color="#5ee7df" />
            <Text style={styles.inputText}>{time || 'Selecciona la hora'}</Text>
          </TouchableOpacity>
          {errors.time && <Text style={styles.error}>{errors.time.message}</Text>}
          {showTimePicker && (
            <DateTimePicker
              testID="time-picker"
              value={time ? new Date(`2000-01-01T${time}:00`) : new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (selected) {
                  const hh = String(selected.getHours()).padStart(2, '0');
                  const mm = String(selected.getMinutes()).padStart(2, '0');
                  setValue('time', `${hh}:${mm}`, { shouldValidate: true });
                }
              }}
            />
          )}

          <Text style={styles.label}>3. Tipo de programación</Text>
          <View style={styles.scheduleTypeRow}>
            <TouchableOpacity
              style={[styles.scheduleTypeButton, scheduleType === 'DAYS_OF_WEEK' && styles.scheduleTypeButtonActive]}
              onPress={() => setValue('scheduleType', 'DAYS_OF_WEEK', { shouldValidate: true })}
            >
              <Ionicons name="calendar" size={16} color={scheduleType === 'DAYS_OF_WEEK' ? '#fff' : '#a5d8f3'} />
              <Text style={[styles.scheduleTypeText, scheduleType === 'DAYS_OF_WEEK' && styles.scheduleTypeTextActive]}>
                Días de la semana
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scheduleTypeButton, scheduleType === 'DATE_RANGE' && styles.scheduleTypeButtonActive]}
              onPress={() => setValue('scheduleType', 'DATE_RANGE', { shouldValidate: true })}
            >
              <Ionicons name="calendar" size={16} color={scheduleType === 'DATE_RANGE' ? '#fff' : '#a5d8f3'} />
              <Text style={[styles.scheduleTypeText, scheduleType === 'DATE_RANGE' && styles.scheduleTypeTextActive]}>
                Rango de fechas
              </Text>
            </TouchableOpacity>
          </View>

          {scheduleType === 'DAYS_OF_WEEK' ? (
            <>
              <View style={styles.daysRow}>
                {DAY_OPTIONS.map((day) => {
                  const selected = daysOfWeek.includes(day.value);
                  return (
                    <TouchableOpacity
                      key={day.value}
                      style={[styles.dayChip, selected && styles.dayChipActive]}
                      onPress={() => toggleDay(day.value)}
                    >
                      <Text style={[styles.dayChipText, selected && styles.dayChipTextActive]}>{day.label}</Text>
                      {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.daysOfWeek && <Text style={styles.error}>{errors.daysOfWeek.message}</Text>}
            </>
          ) : (
            <>
              <View style={styles.row}>
                <View style={styles.rowColumn}>
                  <Text style={styles.label}>Fecha de inicio</Text>
                  <TouchableOpacity style={styles.input} testID="start-date-trigger" onPress={() => setShowStartDatePicker(true)}>
                    <Ionicons name="calendar-outline" size={16} color="#5ee7df" />
                    <Text style={styles.inputText}>{startDate || 'Seleccionar fecha'}</Text>
                  </TouchableOpacity>
                  {errors.startDate && <Text style={styles.error}>{errors.startDate.message}</Text>}
                </View>
                <View style={styles.rowColumn}>
                  <Text style={styles.label}>Fecha de término</Text>
                  <TouchableOpacity style={styles.input} testID="end-date-trigger" onPress={() => setShowEndDatePicker(true)}>
                    <Ionicons name="calendar-outline" size={16} color="#5ee7df" />
                    <Text style={styles.inputText}>{endDate || 'Seleccionar fecha'}</Text>
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
                    if (selected) setValue('startDate', toLocalDateString(selected), { shouldValidate: true });
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
                    if (selected) setValue('endDate', toLocalDateString(selected), { shouldValidate: true });
                  }}
                />
              )}
            </>
          )}

          <Text style={styles.label}>4. Instrucciones</Text>
          <Controller control={control} name="instructions" render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Ej: Realizar con cuidado, registrar resultado, avisar si hay molestias"
              placeholderTextColor="#7c93ab"
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={4}
            />
          )} />

          <View style={styles.row}>
            <View style={styles.rowColumn}>
              <Text style={styles.label}>5. Prioridad</Text>
              <View style={styles.priorityRow}>
                {PRIORITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.priorityButton, priority === opt.value && { backgroundColor: opt.color, borderColor: opt.color }]}
                    onPress={() => setValue('priority', opt.value, { shouldValidate: true })}
                  >
                    <Ionicons name={opt.icon} size={14} color={priority === opt.value ? '#fff' : opt.color} />
                    <Text style={[styles.priorityText, priority === opt.value && styles.priorityTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.rowColumn}>
              <Text style={styles.label}>6. Recordatorio activo</Text>
              <View style={styles.reminderRow}>
                <Ionicons name="notifications-outline" size={16} color="#5ee7df" />
                <Text style={styles.reminderText}>Activar recordatorio</Text>
                <Switch
                  testID="reminder-switch"
                  value={reminderActive}
                  onValueChange={(value) => setValue('reminderActive', value, { shouldValidate: true })}
                  trackColor={{ false: 'rgba(255,255,255,0.18)', true: '#1a9c7d' }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSubmit(onSubmit)} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Guardar tarea</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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

  patientCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    padding: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(148,180,204,0.35)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  statusBadgeOk: { backgroundColor: '#1a9c7d' },
  statusTextOk: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  statusBadgeWarning: { backgroundColor: '#e6b800' },
  statusTextWarning: { color: '#3d2e00', fontWeight: 'bold', fontSize: 13 },

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
  inputText: { color: '#fff', fontSize: 15 },
  textarea: { alignItems: 'flex-start', minHeight: 90, paddingTop: 12 },
  error: { color: '#ff8a8a', fontSize: 12, marginTop: 4 },

  row: { flexDirection: 'row', gap: 12 },
  rowColumn: { flex: 1 },

  scheduleTypeRow: { flexDirection: 'row', gap: 12 },
  scheduleTypeButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingVertical: 12,
  },
  scheduleTypeButtonActive: { backgroundColor: '#1a9c7d', borderColor: '#1a9c7d' },
  scheduleTypeText: { color: '#a5d8f3', fontWeight: '600', fontSize: 13 },
  scheduleTypeTextActive: { color: '#fff' },

  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  dayChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  dayChipActive: { backgroundColor: '#1a9c7d', borderColor: '#1a9c7d' },
  dayChipText: { color: '#a5d8f3', fontWeight: '600', fontSize: 13 },
  dayChipTextActive: { color: '#fff' },

  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingVertical: 12,
  },
  priorityText: { color: '#a5d8f3', fontWeight: '600', fontSize: 12 },
  priorityTextActive: { color: '#fff' },

  reminderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48,
  },
  reminderText: { color: '#fff', fontSize: 13, flex: 1 },

  footerRow: { flexDirection: 'row', gap: 12 },
  saveButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#e05555', borderRadius: 16,
    paddingVertical: 16,
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  cancelButton: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#5ee7df', borderRadius: 16,
    paddingVertical: 14,
  },
  cancelButtonText: { color: '#5ee7df', fontWeight: 'bold', fontSize: 16 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd appmovil && npx jest --testPathPattern=screens/tasks/__tests__/CreateTaskScreen`
Expected: PASS (7 tests green).

- [ ] **Step 5: Commit**

```bash
git add appmovil/src/presentation/screens/tasks/CreateTaskScreen.tsx \
        appmovil/src/presentation/screens/tasks/__tests__/CreateTaskScreen.test.tsx
git commit -m "feat(appmovil): add CreateTaskScreen"
```

---

## Task 19: Navigation wiring — `AppNavigator.tsx` + `PatientDetailScreen.tsx`

**Files:**
- Modify: `appmovil/src/presentation/navigation/AppNavigator.tsx`
- Modify: `appmovil/src/presentation/screens/patients/PatientDetailScreen.tsx`
- Modify: `appmovil/src/presentation/screens/patients/__tests__/PatientDetailScreen.test.tsx`

**Interfaces:**
- Consumes: `TasksScreen` (Task 17), `CreateTaskScreen` (Task 18).
- Produces: `PatientStackParams` gains `Tasks: undefined` and `CreateTask: undefined`; both screens
  registered with `headerShown: false`; the "Tareas" `ActionCard` in `PatientDetailScreen` navigates
  to `Tasks` instead of `ComingSoon`. This is the final task — after this, `npx tsc --noEmit` is
  fully clean across the whole `appmovil` project (Tasks 17–18 reference route names that only
  exist starting here).

- [ ] **Step 1: Register the routes in `AppNavigator.tsx`**

Read `appmovil/src/presentation/navigation/AppNavigator.tsx` first (current contents shown in the
Global Constraints reference list). Add two imports near the top, alongside the other screen
imports:

```ts
import TasksScreen from '@/presentation/screens/tasks/TasksScreen';
import CreateTaskScreen from '@/presentation/screens/tasks/CreateTaskScreen';
```

Add two entries to the `PatientStackParams` type, next to the existing `CreateMedication: undefined;`
line:

```ts
  Tasks: undefined;
  CreateTask: undefined;
```

Add two `<Stack.Screen>` registrations, next to the existing `CreateMedication`/`Today` ones:

```tsx
      <Stack.Screen name="Tasks" component={TasksScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateTask" component={CreateTaskScreen} options={{ headerShown: false }} />
```

- [ ] **Step 2: Wire the "Tareas" card in `PatientDetailScreen.tsx`**

Read `appmovil/src/presentation/screens/patients/PatientDetailScreen.tsx` first (current contents
shown in the Global Constraints reference list). Add a `goToTasks` function next to the existing
`goToMedicamentos`/`goToVitales`:

```ts
  function goToTasks() {
    setSelectedPatientId(patientId);
    navigation.navigate('Tasks');
  }
```

Change the "Tareas" `ActionCard` line from:

```tsx
          <ActionCard icon="list" color="#7c5cfc" title="Tareas" subtitle="Cuidados diarios" onPress={() => goToComingSoon('Tareas', 'Cuidados diarios')} />
```

to:

```tsx
          <ActionCard icon="list" color="#7c5cfc" title="Tareas" subtitle="Cuidados diarios" onPress={goToTasks} />
```

- [ ] **Step 3: Update `PatientDetailScreen.test.tsx`**

Read `appmovil/src/presentation/screens/patients/__tests__/PatientDetailScreen.test.tsx` first
(current contents shown in the Global Constraints reference list). Add a new test next to
`'selecciona el paciente y navega a Medicamentos al presionar esa tarjeta'`:

```tsx
  it('selecciona el paciente y navega a Tasks al presionar "Tareas"', async () => {
    const { navigation } = renderScreen();
    fireEvent.press(await screen.findByText('Tareas'));
    expect(useAuthStore.getState().selectedPatientId).toBe('p1');
    expect(navigation.navigate).toHaveBeenCalledWith('Tasks');
  });
```

- [ ] **Step 4: Run the updated test**

Run: `cd appmovil && npx jest --testPathPattern=patients/__tests__/PatientDetailScreen`
Expected: PASS — all existing `PatientDetailScreen` tests plus the new one.

- [ ] **Step 5: Run the full mobile test suite and type check**

Run: `cd appmovil && npx jest`
Expected: PASS — every existing test plus every `Task*`/`CareTask*` test added in Tasks 12–19.

Run: `cd appmovil && npx tsc --noEmit`
Expected: no errors — this is the first point where the `'Tasks'`/`'CreateTask'` route names used
in Tasks 17–18 are actually declared on `PatientStackParams`, so this is the true compile-clean
checkpoint for the whole feature.

- [ ] **Step 6: Commit**

```bash
git add appmovil/src/presentation/navigation/AppNavigator.tsx \
        appmovil/src/presentation/screens/patients/PatientDetailScreen.tsx \
        appmovil/src/presentation/screens/patients/__tests__/PatientDetailScreen.test.tsx
git commit -m "feat(appmovil): wire Tasks and CreateTask screens into navigation"
```

---

## Final Verification

- [ ] Run `cd backend && mvn test -q` — full backend suite green (Tasks 1–11 plus all pre-existing
  tests).
- [ ] Run `cd appmovil && npx jest` — full mobile suite green (Tasks 12–19 plus all pre-existing
  tests).
- [ ] Run `cd appmovil && npx tsc --noEmit` — no type errors.
- [ ] Manual smoke test (requires PostgreSQL running locally per root `CLAUDE.md`, plus `mvn
  spring-boot:run` and `npx react-native start` + a simulator/device): log in, open a patient, tap
  "Tareas" → lands on the new `TasksScreen` (not `ComingSoon`), tap "Agregar tarea" → fill out
  "Programar tarea" with a `DAYS_OF_WEEK` schedule including today's weekday, save, go back — the
  task won't appear in today's list yet because `DailyCareTaskLogScheduler` only runs at 00:01;
  either wait for the next run or manually insert a `care_task_logs` row for today via `psql` to
  confirm the list renders it with the "Pendiente" badge, and that tapping it and confirming flips
  it to "Realizada".
