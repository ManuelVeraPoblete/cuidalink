# Bitácora (registro diario del cuidador) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la tarjeta "Bitácora" del detalle de paciente (actualmente apunta a
`ComingSoonScreen`) por una pantalla real que muestra un registro diario de notas del cuidador,
respaldada por un nuevo módulo de dominio `bitacora` en el backend, y sembrar datos de ejemplo para
la paciente demo existente.

**Architecture:** Nuevo módulo hexagonal `com.cuidalink.bitacora` en el backend, calcado del módulo
`vital` existente (registro inmutable + listado por rango de fechas + autorización `hasAccess`). En
el móvil: entidad + repositorio + pantalla de listado calcada de `ContactsScreen.tsx` + pantalla de
formulario calcada de `ContactFormScreen.tsx`.

**Tech Stack:** Java 17 + Spring Boot 3.2 + Spring Data JPA (backend); React Native + TypeScript +
React Hook Form + Zod + TanStack Query (móvil). Ver `CLAUDE.md` para comandos de build/test.

**Nota de entorno:** Docker no está disponible en este entorno, por lo que el nuevo test de
integración backend (`@Testcontainers`) no se puede ejecutar aquí. Se verifica por compilación +
revisión de código; correrlo localmente donde haya Docker (o en CI) antes de mergear.

## Global Constraints

- Backend hexagonal estricto: `domain/model` y `domain/service` nunca importan `jakarta.persistence`
  ni `org.springframework.data`. Entidades JPA solo en `adapter/out/persistence`.
- Autorización en la capa de servicio (no en el controller), usando **siempre** `patient.hasAccess(requesterId)`
  — nunca `isOwner` — porque tanto el owner como los colaboradores pueden crear y listar entradas.
  `IllegalArgumentException` si se deniega (el `GlobalExceptionHandler` ya existente lo mapea a 400).
- El **tipo de entrada se asigna automáticamente en el servicio**, nunca lo envía el cliente:
  `patient.isOwner(authorId) ? ENTRY : OBSERVATION`. El DTO de creación solo lleva `note`.
- El `recordedAt` se fija en el servidor con `LocalDateTime.now()`, igual que `VitalRecord` — nunca
  lo envía el cliente. La entrada es inmutable una vez creada (no hay update/delete).
- Enums se persisten como `VARCHAR` plano vía `.name()` / `.valueOf(...)` — **sin** `@Enumerated`
  (mismo patrón que `CareTaskLogStatus`/`CareTaskLogJpaEntity`).
- API prefix `/api/v1` ya configurado globalmente — las rutas de este plan se escriben sin ese
  prefijo (como en el resto del código), Spring lo antepone solo.
- Mobile: `presentation/` solo importa de `domain/`, nunca de `data/` directamente — todo el cableado
  pasa por `useInjection.ts`.
- Las pantallas nuevas (`Bitacora`, `AddBitacoraEntry`) se registran con `headerShown: false` y
  construyen su propio header en pantalla (mismo patrón que `Contacts`/`ContactForm`/`Tasks`).
- Paleta de colores: no se introducen colores nuevos. `ENTRY` reutiliza el verde `#1a9c7d` (ya usado
  como "éxito/hecho"); `OBSERVATION` reutiliza el morado `#7c5cfc` (ya usado en la tarjeta "Tareas").

---

## Backend

### Task 1: Dominio `BitacoraEntry`

**Files:**
- Create: `backend/src/main/java/com/cuidalink/bitacora/domain/model/BitacoraEntryId.java`
- Create: `backend/src/main/java/com/cuidalink/bitacora/domain/model/BitacoraEntryType.java`
- Create: `backend/src/main/java/com/cuidalink/bitacora/domain/model/BitacoraEntry.java`

**Interfaces produced:** `BitacoraEntryId(UUID value)` con `generate()` estático; enum
`BitacoraEntryType { ENTRY, OBSERVATION }`; clase inmutable `BitacoraEntry` con getters.

No hay lógica de negocio no trivial en estos modelos (mismo caso que `VitalRecord`, que tampoco
tiene test unitario propio) — su comportamiento se verifica a través del test de `BitacoraService`
(Task 3).

- [ ] **Step 1: Crear `BitacoraEntryId`**

```java
package com.cuidalink.bitacora.domain.model;

import java.util.UUID;

public record BitacoraEntryId(UUID value) {
    public static BitacoraEntryId generate() { return new BitacoraEntryId(UUID.randomUUID()); }
}
```

- [ ] **Step 2: Crear `BitacoraEntryType`**

```java
package com.cuidalink.bitacora.domain.model;

public enum BitacoraEntryType { ENTRY, OBSERVATION }
```

- [ ] **Step 3: Crear `BitacoraEntry`**

```java
package com.cuidalink.bitacora.domain.model;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDateTime;

public class BitacoraEntry {

    private final BitacoraEntryId id;
    private final PatientId patientId;
    private final UserId authorId;
    private final BitacoraEntryType type;
    private final String note;
    private final LocalDateTime recordedAt;

    public BitacoraEntry(BitacoraEntryId id, PatientId patientId, UserId authorId,
                         BitacoraEntryType type, String note, LocalDateTime recordedAt) {
        this.id = id;
        this.patientId = patientId;
        this.authorId = authorId;
        this.type = type;
        this.note = note;
        this.recordedAt = recordedAt;
    }

    public BitacoraEntryId getId() { return id; }
    public PatientId getPatientId() { return patientId; }
    public UserId getAuthorId() { return authorId; }
    public BitacoraEntryType getType() { return type; }
    public String getNote() { return note; }
    public LocalDateTime getRecordedAt() { return recordedAt; }
}
```

---

### Task 2: Puertos (in/out) de `BitacoraEntry`

**Files:**
- Create: `backend/src/main/java/com/cuidalink/bitacora/domain/port/in/CreateBitacoraEntryUseCase.java`
- Create: `backend/src/main/java/com/cuidalink/bitacora/domain/port/in/ListBitacoraEntriesUseCase.java`
- Create: `backend/src/main/java/com/cuidalink/bitacora/domain/port/out/BitacoraEntryRepository.java`

**Depends on:** Task 1 (`BitacoraEntry`, `BitacoraEntryId`, `BitacoraEntryType`).

- [ ] **Step 1: `CreateBitacoraEntryUseCase`**

```java
package com.cuidalink.bitacora.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.bitacora.domain.model.BitacoraEntry;
import com.cuidalink.patient.domain.model.PatientId;

public interface CreateBitacoraEntryUseCase {

    record CreateBitacoraEntryCommand(PatientId patientId, UserId authorId, String note) {}

    BitacoraEntry create(CreateBitacoraEntryCommand command);
}
```

- [ ] **Step 2: `ListBitacoraEntriesUseCase`**

`type` es nullable — `null` significa "sin filtro de tipo" (se filtra en el servicio, no en el
repositorio).

```java
package com.cuidalink.bitacora.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.bitacora.domain.model.BitacoraEntry;
import com.cuidalink.bitacora.domain.model.BitacoraEntryType;
import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDate;
import java.util.List;

public interface ListBitacoraEntriesUseCase {
    List<BitacoraEntry> list(PatientId patientId, LocalDate from, LocalDate to,
                              BitacoraEntryType type, UserId requesterId);
}
```

- [ ] **Step 3: `BitacoraEntryRepository` (puerto de salida)**

```java
package com.cuidalink.bitacora.domain.port.out;

import com.cuidalink.bitacora.domain.model.BitacoraEntry;
import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDateTime;
import java.util.List;

public interface BitacoraEntryRepository {
    BitacoraEntry save(BitacoraEntry entry);
    List<BitacoraEntry> findByPatientIdAndRecordedAtBetween(PatientId patientId, LocalDateTime from, LocalDateTime to);
}
```

---

### Task 3: `BitacoraService` (con test TDD)

**Files:**
- Create: `backend/src/main/java/com/cuidalink/bitacora/domain/service/BitacoraService.java`
- Create: `backend/src/test/java/com/cuidalink/bitacora/domain/service/BitacoraServiceTest.java`

**Depends on:** Tasks 1–2. Sigue el patrón exacto de `VitalService`/`VitalServiceTest`
(`backend/src/main/java/com/cuidalink/vital/domain/service/VitalService.java`).

Escribe el test primero (TDD): un mock de `BitacoraEntryRepository` y de `PatientRepository`, un
`Patient` de prueba construido con el constructor completo de `Patient` (ver `mockPatient` en
`VitalServiceTest`), y casos:
1. `create` como owner → la entrada guardada tiene `type == ENTRY`.
2. `create` como colaborador (con `patient.addCollaborator(collaboratorId)`) → `type == OBSERVATION`.
3. `create` por un usuario sin acceso → lanza `IllegalArgumentException`.
4. `list` devuelve lo que retorna el repositorio para el rango `from`/`to` convertido correctamente
   (verificar con `ArgumentCaptor` o `verify(...)` que se llama con `from.atStartOfDay()` y
   `to.plusDays(1).atStartOfDay()`).
5. `list` con `type` no nulo filtra en memoria — el repo devuelve entradas de ambos tipos, el
   resultado del servicio solo contiene las del tipo pedido.
6. `list` por un usuario sin acceso → lanza `IllegalArgumentException`.

- [ ] **Step 1: Test — casos de `create`**

```java
package com.cuidalink.bitacora.domain.service;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.bitacora.domain.model.BitacoraEntry;
import com.cuidalink.bitacora.domain.model.BitacoraEntryType;
import com.cuidalink.bitacora.domain.port.in.CreateBitacoraEntryUseCase.CreateBitacoraEntryCommand;
import com.cuidalink.bitacora.domain.port.out.BitacoraEntryRepository;
import com.cuidalink.patient.domain.model.*;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class BitacoraServiceTest {

    @Mock BitacoraEntryRepository repository;
    @Mock PatientRepository patientRepository;
    BitacoraService sut;

    UserId ownerId = new UserId(UUID.randomUUID());
    UserId collaboratorId = new UserId(UUID.randomUUID());
    PatientId patientId = PatientId.generate();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new BitacoraService(repository, patientRepository);
    }

    @Test
    void create_byOwner_setsTypeEntry() {
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(mockPatient()));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = sut.create(new CreateBitacoraEntryCommand(patientId, ownerId, "Durmió bien"));

        assertThat(result.getType()).isEqualTo(BitacoraEntryType.ENTRY);
        assertThat(result.getNote()).isEqualTo("Durmió bien");
        assertThat(result.getAuthorId()).isEqualTo(ownerId);
    }

    @Test
    void create_byCollaborator_setsTypeObservation() {
        var patient = mockPatient();
        patient.addCollaborator(collaboratorId);
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(patient));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = sut.create(new CreateBitacoraEntryCommand(patientId, collaboratorId, "Comió bien"));

        assertThat(result.getType()).isEqualTo(BitacoraEntryType.OBSERVATION);
    }

    @Test
    void create_byUserWithoutAccess_throws() {
        var stranger = new UserId(UUID.randomUUID());
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(mockPatient()));

        assertThatThrownBy(() -> sut.create(new CreateBitacoraEntryCommand(patientId, stranger, "Nota")))
            .isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void list_filtersByTypeWhenProvided() {
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(mockPatient()));
        var entryEntry = new BitacoraEntry(com.cuidalink.bitacora.domain.model.BitacoraEntryId.generate(),
            patientId, ownerId, BitacoraEntryType.ENTRY, "A", java.time.LocalDateTime.now());
        var obsEntry = new BitacoraEntry(com.cuidalink.bitacora.domain.model.BitacoraEntryId.generate(),
            patientId, collaboratorId, BitacoraEntryType.OBSERVATION, "B", java.time.LocalDateTime.now());
        when(repository.findByPatientIdAndRecordedAtBetween(any(), any(), any()))
            .thenReturn(List.of(entryEntry, obsEntry));

        var from = LocalDate.now().minusDays(1);
        var to = LocalDate.now();
        var result = sut.list(patientId, from, to, BitacoraEntryType.OBSERVATION, ownerId);

        assertThat(result).containsExactly(obsEntry);
    }

    @Test
    void list_withoutTypeFilter_returnsAll() {
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(mockPatient()));
        var entryEntry = new BitacoraEntry(com.cuidalink.bitacora.domain.model.BitacoraEntryId.generate(),
            patientId, ownerId, BitacoraEntryType.ENTRY, "A", java.time.LocalDateTime.now());
        var obsEntry = new BitacoraEntry(com.cuidalink.bitacora.domain.model.BitacoraEntryId.generate(),
            patientId, collaboratorId, BitacoraEntryType.OBSERVATION, "B", java.time.LocalDateTime.now());
        when(repository.findByPatientIdAndRecordedAtBetween(any(), any(), any()))
            .thenReturn(List.of(entryEntry, obsEntry));

        var result = sut.list(patientId, LocalDate.now(), LocalDate.now(), null, ownerId);

        assertThat(result).containsExactly(entryEntry, obsEntry);
    }

    @Test
    void list_byUserWithoutAccess_throws() {
        var stranger = new UserId(UUID.randomUUID());
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(mockPatient()));

        assertThatThrownBy(() -> sut.list(patientId, LocalDate.now(), LocalDate.now(), null, stranger))
            .isInstanceOf(IllegalArgumentException.class);
    }

    private Patient mockPatient() {
        return new Patient(patientId, "Test Patient", LocalDate.of(1950, 1, 1),
            Gender.FEMALE, "12345678", "Calle Test 123", "Fonasa", "O+",
            "Diabetes", "Ninguna",
            new EmergencyContact("Familiar", "+56912345678"), ownerId);
    }
}
```

Run: `mvn test -Dtest=BitacoraServiceTest -q` — all 6 tests must fail (class doesn't exist yet) before Step 2, then pass after.

- [ ] **Step 2: Implementar `BitacoraService`**

```java
package com.cuidalink.bitacora.domain.service;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.bitacora.domain.model.BitacoraEntry;
import com.cuidalink.bitacora.domain.model.BitacoraEntryId;
import com.cuidalink.bitacora.domain.model.BitacoraEntryType;
import com.cuidalink.bitacora.domain.port.in.CreateBitacoraEntryUseCase;
import com.cuidalink.bitacora.domain.port.in.ListBitacoraEntriesUseCase;
import com.cuidalink.bitacora.domain.port.out.BitacoraEntryRepository;
import com.cuidalink.patient.domain.model.Patient;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class BitacoraService implements CreateBitacoraEntryUseCase, ListBitacoraEntriesUseCase {

    private final BitacoraEntryRepository repository;
    private final PatientRepository patientRepository;

    public BitacoraService(BitacoraEntryRepository repository, PatientRepository patientRepository) {
        this.repository = repository;
        this.patientRepository = patientRepository;
    }

    @Override
    public BitacoraEntry create(CreateBitacoraEntryCommand command) {
        var patient = getPatientOrThrow(command.patientId());
        if (!patient.hasAccess(command.authorId()))
            throw new IllegalArgumentException("Sin acceso al paciente");
        var type = patient.isOwner(command.authorId()) ? BitacoraEntryType.ENTRY : BitacoraEntryType.OBSERVATION;
        var entry = new BitacoraEntry(BitacoraEntryId.generate(), command.patientId(),
            command.authorId(), type, command.note(), LocalDateTime.now());
        return repository.save(entry);
    }

    @Override
    public List<BitacoraEntry> list(PatientId patientId, LocalDate from, LocalDate to,
                                     BitacoraEntryType type, UserId requesterId) {
        var patient = getPatientOrThrow(patientId);
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Sin acceso al paciente");
        var entries = repository.findByPatientIdAndRecordedAtBetween(
            patientId, from.atStartOfDay(), to.plusDays(1).atStartOfDay());
        if (type == null) return entries;
        return entries.stream().filter(e -> e.getType() == type).toList();
    }

    private Patient getPatientOrThrow(PatientId patientId) {
        return patientRepository.findById(patientId)
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
    }
}
```

Run: `mvn test -Dtest=BitacoraServiceTest -q` — all 6 tests pass.

---

### Task 4: Persistencia JPA + `schema.sql`

**Files:**
- Create: `backend/src/main/java/com/cuidalink/bitacora/adapter/out/persistence/BitacoraEntryJpaEntity.java`
- Create: `backend/src/main/java/com/cuidalink/bitacora/adapter/out/persistence/SpringBitacoraEntryRepository.java`
- Create: `backend/src/main/java/com/cuidalink/bitacora/adapter/out/persistence/JpaBitacoraEntryRepositoryAdapter.java`
- Create: `backend/src/test/java/com/cuidalink/bitacora/adapter/out/persistence/JpaBitacoraEntryRepositoryAdapterTest.java`
- Modify: `backend/src/main/resources/schema.sql`

**Depends on:** Tasks 1–2. Sigue `VitalRecordJpaEntity`/`JpaVitalRecordRepositoryAdapter`
(`backend/src/main/java/com/cuidalink/vital/adapter/out/persistence/`) y el patrón de persistencia de
enum de `CareTaskLogJpaEntity`/`JpaCareTaskLogRepositoryAdapter` (`.name()` / `.valueOf(...)`, sin
`@Enumerated`).

- [ ] **Step 1: `BitacoraEntryJpaEntity`**

```java
package com.cuidalink.bitacora.adapter.out.persistence;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "bitacora_entries")
public class BitacoraEntryJpaEntity {

    @Id
    private String id;
    private String patientId;
    private String authorId;
    private String entryType;

    @Column(columnDefinition = "TEXT")
    private String note;

    private LocalDateTime recordedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getAuthorId() { return authorId; }
    public void setAuthorId(String authorId) { this.authorId = authorId; }

    public String getEntryType() { return entryType; }
    public void setEntryType(String entryType) { this.entryType = entryType; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public LocalDateTime getRecordedAt() { return recordedAt; }
    public void setRecordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; }
}
```

- [ ] **Step 2: `SpringBitacoraEntryRepository`**

```java
package com.cuidalink.bitacora.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface SpringBitacoraEntryRepository extends JpaRepository<BitacoraEntryJpaEntity, String> {
    List<BitacoraEntryJpaEntity> findByPatientIdAndRecordedAtBetween(
        String patientId, LocalDateTime from, LocalDateTime to);
}
```

- [ ] **Step 3: `JpaBitacoraEntryRepositoryAdapter` (con test)**

```java
package com.cuidalink.bitacora.adapter.out.persistence;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.bitacora.domain.model.BitacoraEntry;
import com.cuidalink.bitacora.domain.model.BitacoraEntryId;
import com.cuidalink.bitacora.domain.model.BitacoraEntryType;
import com.cuidalink.bitacora.domain.port.out.BitacoraEntryRepository;
import com.cuidalink.patient.domain.model.PatientId;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Component
public class JpaBitacoraEntryRepositoryAdapter implements BitacoraEntryRepository {

    private final SpringBitacoraEntryRepository jpa;

    public JpaBitacoraEntryRepositoryAdapter(SpringBitacoraEntryRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public BitacoraEntry save(BitacoraEntry entry) {
        jpa.save(toJpa(entry));
        return entry;
    }

    @Override
    public List<BitacoraEntry> findByPatientIdAndRecordedAtBetween(PatientId patientId, LocalDateTime from, LocalDateTime to) {
        return jpa.findByPatientIdAndRecordedAtBetween(patientId.value().toString(), from, to)
            .stream().map(this::toDomain).toList();
    }

    private BitacoraEntryJpaEntity toJpa(BitacoraEntry e) {
        var jpa = new BitacoraEntryJpaEntity();
        jpa.setId(e.getId().value().toString());
        jpa.setPatientId(e.getPatientId().value().toString());
        jpa.setAuthorId(e.getAuthorId().value().toString());
        jpa.setEntryType(e.getType().name());
        jpa.setNote(e.getNote());
        jpa.setRecordedAt(e.getRecordedAt());
        return jpa;
    }

    private BitacoraEntry toDomain(BitacoraEntryJpaEntity jpa) {
        return new BitacoraEntry(
            new BitacoraEntryId(UUID.fromString(jpa.getId())),
            new PatientId(UUID.fromString(jpa.getPatientId())),
            new UserId(UUID.fromString(jpa.getAuthorId())),
            BitacoraEntryType.valueOf(jpa.getEntryType()),
            jpa.getNote(),
            jpa.getRecordedAt()
        );
    }
}
```

Test (Mockito unit test on the Spring repo mock — mirrors `JpaVitalRecordRepositoryAdapterTest`):

```java
package com.cuidalink.bitacora.adapter.out.persistence;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.bitacora.domain.model.*;
import com.cuidalink.patient.domain.model.PatientId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JpaBitacoraEntryRepositoryAdapterTest {

    @Mock SpringBitacoraEntryRepository jpa;
    JpaBitacoraEntryRepositoryAdapter sut;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new JpaBitacoraEntryRepositoryAdapter(jpa);
    }

    @Test
    void save_mapsEntryTypeAndFieldsToJpaEntity() {
        var patientId = PatientId.generate();
        var authorId = new UserId(UUID.randomUUID());
        var entry = new BitacoraEntry(BitacoraEntryId.generate(), patientId, authorId,
            BitacoraEntryType.OBSERVATION, "Comió bien", LocalDateTime.of(2026, 5, 24, 12, 40));

        sut.save(entry);

        var captor = ArgumentCaptor.forClass(BitacoraEntryJpaEntity.class);
        verify(jpa).save(captor.capture());
        var saved = captor.getValue();
        assertThat(saved.getPatientId()).isEqualTo(patientId.value().toString());
        assertThat(saved.getAuthorId()).isEqualTo(authorId.value().toString());
        assertThat(saved.getEntryType()).isEqualTo("OBSERVATION");
        assertThat(saved.getNote()).isEqualTo("Comió bien");
    }

    @Test
    void findByPatientIdAndRecordedAtBetween_mapsBackToDomainIncludingEnum() {
        var patientId = PatientId.generate();
        var authorId = new UserId(UUID.randomUUID());
        var jpaEntity = new BitacoraEntryJpaEntity();
        jpaEntity.setId(UUID.randomUUID().toString());
        jpaEntity.setPatientId(patientId.value().toString());
        jpaEntity.setAuthorId(authorId.value().toString());
        jpaEntity.setEntryType("ENTRY");
        jpaEntity.setNote("Se administró medicamento nocturno");
        jpaEntity.setRecordedAt(LocalDateTime.of(2026, 5, 23, 21, 10));

        var from = LocalDateTime.of(2026, 5, 23, 0, 0);
        var to = LocalDateTime.of(2026, 5, 25, 0, 0);
        when(jpa.findByPatientIdAndRecordedAtBetween(patientId.value().toString(), from, to))
            .thenReturn(List.of(jpaEntity));

        var result = sut.findByPatientIdAndRecordedAtBetween(patientId, from, to);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getType()).isEqualTo(BitacoraEntryType.ENTRY);
        assertThat(result.get(0).getNote()).isEqualTo("Se administró medicamento nocturno");
    }
}
```

- [ ] **Step 4: Añadir la tabla a `schema.sql`**

Añade este bloque al final de `backend/src/main/resources/schema.sql` (después de la tabla
`patient_contacts`), sin tocar las tablas existentes:

```sql
-- Bitácora: registro diario de notas/observaciones del cuidador
CREATE TABLE bitacora_entries (
    id          VARCHAR(36)  PRIMARY KEY,
    patient_id  VARCHAR(36)  NOT NULL,
    author_id   VARCHAR(36)  NOT NULL,
    entry_type  VARCHAR(20)  NOT NULL,   -- enum: ENTRY, OBSERVATION
    note        TEXT         NOT NULL,
    recorded_at TIMESTAMP    NOT NULL,

    CONSTRAINT fk_bitacora_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
);
```

Run: `mvn test -Dtest=JpaBitacoraEntryRepositoryAdapterTest -q` — both tests pass.

---

### Task 5: REST — DTOs, controller y test de integración

**Files:**
- Create: `backend/src/main/java/com/cuidalink/bitacora/adapter/in/rest/dto/CreateBitacoraEntryRequest.java`
- Create: `backend/src/main/java/com/cuidalink/bitacora/adapter/in/rest/dto/BitacoraEntryResponse.java`
- Create: `backend/src/main/java/com/cuidalink/bitacora/adapter/in/rest/BitacoraEntryController.java`
- Create: `backend/src/test/java/com/cuidalink/BitacoraIntegrationTest.java`

**Depends on:** Tasks 1–4. Sigue `VitalRecordController`/`VitalIntegrationTest`.

- [ ] **Step 1: DTOs**

```java
package com.cuidalink.bitacora.adapter.in.rest.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateBitacoraEntryRequest(@NotBlank String note) {}
```

```java
package com.cuidalink.bitacora.adapter.in.rest.dto;

public record BitacoraEntryResponse(
    String id,
    String patientId,
    String authorId,
    String type,
    String note,
    String recordedAt
) {}
```

- [ ] **Step 2: `BitacoraEntryController`**

`GET` acepta `from`/`to` (requeridos, `LocalDate` ISO) y `type` opcional (`String`, se parsea a
`BitacoraEntryType` en mayúsculas si viene presente).

```java
package com.cuidalink.bitacora.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.bitacora.adapter.in.rest.dto.BitacoraEntryResponse;
import com.cuidalink.bitacora.adapter.in.rest.dto.CreateBitacoraEntryRequest;
import com.cuidalink.bitacora.domain.model.BitacoraEntry;
import com.cuidalink.bitacora.domain.model.BitacoraEntryType;
import com.cuidalink.bitacora.domain.port.in.CreateBitacoraEntryUseCase;
import com.cuidalink.bitacora.domain.port.in.ListBitacoraEntriesUseCase;
import com.cuidalink.patient.domain.model.PatientId;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/patients/{patientId}/bitacora-entries")
public class BitacoraEntryController {

    private final CreateBitacoraEntryUseCase createUseCase;
    private final ListBitacoraEntriesUseCase listUseCase;

    public BitacoraEntryController(CreateBitacoraEntryUseCase createUseCase,
                                    ListBitacoraEntriesUseCase listUseCase) {
        this.createUseCase = createUseCase;
        this.listUseCase = listUseCase;
    }

    @PostMapping
    public ResponseEntity<BitacoraEntryResponse> create(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @Validated @RequestBody CreateBitacoraEntryRequest req) {
        var patId = new PatientId(UUID.fromString(patientId));
        var entry = createUseCase.create(new CreateBitacoraEntryUseCase.CreateBitacoraEntryCommand(
            patId, user.getId(), req.note()));
        return ResponseEntity.status(201).body(toResponse(entry));
    }

    @GetMapping
    public ResponseEntity<List<BitacoraEntryResponse>> list(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String type) {
        var patId = new PatientId(UUID.fromString(patientId));
        var entryType = type == null ? null : BitacoraEntryType.valueOf(type.toUpperCase());
        return ResponseEntity.ok(listUseCase.list(patId, from, to, entryType, user.getId())
            .stream().map(this::toResponse).toList());
    }

    private BitacoraEntryResponse toResponse(BitacoraEntry e) {
        return new BitacoraEntryResponse(
            e.getId().value().toString(),
            e.getPatientId().value().toString(),
            e.getAuthorId().value().toString(),
            e.getType().name(),
            e.getNote(),
            e.getRecordedAt().toString()
        );
    }
}
```

- [ ] **Step 3: Test de integración (Testcontainers)**

No se puede ejecutar en este entorno (sin Docker) — verificar por compilación (`mvn compile -q` /
`mvn test-compile -q`) y revisión de código; correrlo localmente/CI antes de mergear.

```java
package com.cuidalink;

import com.cuidalink.auth.adapter.in.rest.dto.RegisterRequest;
import com.cuidalink.auth.adapter.in.rest.dto.TokenResponse;
import com.cuidalink.bitacora.adapter.in.rest.dto.BitacoraEntryResponse;
import com.cuidalink.bitacora.adapter.in.rest.dto.CreateBitacoraEntryRequest;
import com.cuidalink.notification.domain.port.out.NotificationSender;
import com.cuidalink.patient.adapter.in.rest.dto.CreatePatientRequest;
import com.cuidalink.patient.adapter.in.rest.dto.EmergencyContactDto;
import com.cuidalink.patient.adapter.in.rest.dto.PatientResponse;
import com.cuidalink.patient.domain.model.Gender;
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

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class BitacoraIntegrationTest {

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

    private HttpHeaders authHeaders;
    private String patientId;

    @BeforeEach
    void setUp() {
        String email = "bitacora-caregiver-" + UUID.randomUUID() + "@test.com";

        var registerReq = new RegisterRequest("Bitacora Caregiver", email, "password123");
        var registerResp = restTemplate.postForEntity("/api/v1/auth/register", registerReq, TokenResponse.class);
        assertThat(registerResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        String jwt = registerResp.getBody().token();

        authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(jwt);

        var patientReq = new CreatePatientRequest(
            "Bitacora Patient",
            LocalDate.of(1950, 3, 10),
            Gender.FEMALE,
            "33333333",
            "Calle Bitácora 200",
            "Fonasa",
            "O+",
            null,
            null,
            new EmergencyContactDto("Emergency Contact", "+56922222222")
        );
        var patientEntity = new HttpEntity<>(patientReq, authHeaders);
        var patientResp = restTemplate.postForEntity("/api/v1/patients", patientEntity, PatientResponse.class);
        assertThat(patientResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        patientId = patientResp.getBody().id();
    }

    @Test
    void createEntry_asOwner_persistsWithTypeEntry() {
        var req = new CreateBitacoraEntryRequest("Paciente durmió bien durante la noche");
        var entity = new HttpEntity<>(req, authHeaders);

        var response = restTemplate.postForEntity(
            "/api/v1/patients/" + patientId + "/bitacora-entries", entity, BitacoraEntryResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().type()).isEqualTo("ENTRY");
        assertThat(response.getBody().note()).isEqualTo("Paciente durmió bien durante la noche");
        assertThat(response.getBody().patientId()).isEqualTo(patientId);
    }

    @Test
    void listEntries_filtersByDateRange() {
        var req = new CreateBitacoraEntryRequest("Control de rutina");
        restTemplate.postForEntity("/api/v1/patients/" + patientId + "/bitacora-entries",
            new HttpEntity<>(req, authHeaders), BitacoraEntryResponse.class);

        var today = LocalDate.now();

        var withinRange = restTemplate.exchange(
            "/api/v1/patients/" + patientId + "/bitacora-entries?from=" + today + "&to=" + today,
            HttpMethod.GET, new HttpEntity<>(authHeaders), BitacoraEntryResponse[].class);
        assertThat(withinRange.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(withinRange.getBody()).hasSizeGreaterThanOrEqualTo(1);

        var pastOnly = today.minusDays(30);
        var beforeRange = today.minusDays(10);
        var outsideRange = restTemplate.exchange(
            "/api/v1/patients/" + patientId + "/bitacora-entries?from=" + pastOnly + "&to=" + beforeRange,
            HttpMethod.GET, new HttpEntity<>(authHeaders), BitacoraEntryResponse[].class);
        assertThat(outsideRange.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(outsideRange.getBody()).isEmpty();
    }
}
```

Run: `mvn test-compile -q` (compilación válida). Anotar en el reporte que el test en sí requiere
Docker y no se ejecutó en este entorno.

---

## Mobile

### Task 6: Entidad, repositorio y DI

**Files:**
- Create: `appmovil/src/domain/entities/BitacoraEntry.ts`
- Modify: `appmovil/src/domain/entities/index.ts`
- Create: `appmovil/src/domain/repositories/BitacoraEntryRepository.ts`
- Create: `appmovil/src/data/repositories/ApiBitacoraEntryRepository.ts`
- Modify: `appmovil/src/presentation/hooks/useInjection.ts`

**Depends on:** Backend Task 5 (contrato REST) — pero puede implementarse en paralelo usando el
contrato ya fijado en este plan (`GET/POST /patients/{patientId}/bitacora-entries`).

- [ ] **Step 1: Entidad `BitacoraEntry`**

```ts
export type BitacoraEntryType = 'ENTRY' | 'OBSERVATION';

export interface BitacoraEntry {
  id: string;
  patientId: string;
  authorId: string;
  type: BitacoraEntryType;
  note: string;
  recordedAt: string;
}
```

- [ ] **Step 2: Exportar desde el barrel**

Añadir esta línea a `appmovil/src/domain/entities/index.ts` (al final, junto a las demás):

```ts
export * from './BitacoraEntry';
```

- [ ] **Step 3: Interfaz `BitacoraEntryRepository`**

```ts
import { BitacoraEntry, BitacoraEntryType } from '@/domain/entities';

export interface BitacoraEntryRepository {
  listEntries(patientId: string, from: string, to: string, type?: BitacoraEntryType): Promise<BitacoraEntry[]>;
  createEntry(patientId: string, note: string): Promise<BitacoraEntry>;
}
```

- [ ] **Step 4: `ApiBitacoraEntryRepository`**

```ts
import apiClient from '@/data/http/apiClient';
import { BitacoraEntryRepository } from '@/domain/repositories/BitacoraEntryRepository';
import { BitacoraEntry, BitacoraEntryType } from '@/domain/entities';

export class ApiBitacoraEntryRepository implements BitacoraEntryRepository {
  async listEntries(patientId: string, from: string, to: string, type?: BitacoraEntryType): Promise<BitacoraEntry[]> {
    const res = await apiClient.get<BitacoraEntry[]>(`/patients/${patientId}/bitacora-entries`, {
      params: { from, to, type },
    });
    return res.data;
  }

  async createEntry(patientId: string, note: string): Promise<BitacoraEntry> {
    const res = await apiClient.post<BitacoraEntry>(`/patients/${patientId}/bitacora-entries`, { note });
    return res.data;
  }
}
```

- [ ] **Step 5: Wiring en `useInjection.ts`**

Añadir el import junto a los demás `Api*Repository`:
```ts
import { ApiBitacoraEntryRepository } from '@/data/repositories/ApiBitacoraEntryRepository';
```
Dentro de `useMemo`, junto a las demás instancias:
```ts
const bitacoraEntryRepo = new ApiBitacoraEntryRepository();
```
Y añadir `bitacoraEntryRepo` al objeto que retorna el hook (mismo nivel que `vitalRepo`, `careTaskRepo`, `patientContactRepo`).

No hay test unitario propio para esta task (mismo caso que `ApiVitalRepository`, que tampoco lo
tiene) — se verifica junto con las pantallas en Tasks 9–10.

---

### Task 7: Util `bitacoraDisplay.ts` (TDD)

**Files:**
- Create: `appmovil/src/domain/utils/bitacoraDisplay.ts`
- Create: `appmovil/src/domain/utils/__tests__/bitacoraDisplay.test.ts`

**Depends on:** Task 6 (`BitacoraEntryType`). Sigue el patrón de `contactDisplay.ts`/`contactDisplay.test.ts`.

- [ ] **Step 1: Test**

```ts
import { pickBitacoraEntryStyle } from '../bitacoraDisplay';

describe('pickBitacoraEntryStyle', () => {
  it('estilo para ENTRY', () => {
    expect(pickBitacoraEntryStyle('ENTRY')).toEqual({ icon: 'create-outline', color: '#1a9c7d', label: 'Entrada' });
  });

  it('estilo para OBSERVATION', () => {
    expect(pickBitacoraEntryStyle('OBSERVATION')).toEqual({ icon: 'eye-outline', color: '#7c5cfc', label: 'Observación' });
  });
});
```

Run: `npx jest --testPathPattern=bitacoraDisplay -q` — falla (módulo no existe) antes de Step 2.

- [ ] **Step 2: Implementación**

```ts
import type { Ionicons } from '@expo/vector-icons';
import { BitacoraEntryType } from '@/domain/entities';

export function pickBitacoraEntryStyle(type: BitacoraEntryType):
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string } {
  switch (type) {
    case 'ENTRY':
      return { icon: 'create-outline', color: '#1a9c7d', label: 'Entrada' };
    case 'OBSERVATION':
      return { icon: 'eye-outline', color: '#7c5cfc', label: 'Observación' };
  }
}
```

Run: `npx jest --testPathPattern=bitacoraDisplay -q` — pasa.

---

### Task 8: `BitacoraEntryCard.tsx`

**Files:**
- Create: `appmovil/src/presentation/components/BitacoraEntryCard.tsx`

**Depends on:** Tasks 6–7. Combina el `headerRow` de fecha/hora de `VitalCard.tsx` con el patrón de
badge de `TaskCard.tsx`, y una nota debajo de un divisor (fiel al mockup: fecha en negrita, hora con
ícono de reloj debajo, badge de tipo arriba a la derecha, línea divisoria, texto de la nota).

No lleva test propio dedicado — se verifica junto con `BitacoraScreen.test.tsx` (Task 9), mismo
criterio que `VitalCard`/`TaskCard` (no tienen test propio, se cubren vía las pantallas que los usan).

- [ ] **Step 1: Implementación**

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { BitacoraEntry } from '@/domain/entities';
import { pickBitacoraEntryStyle } from '@/domain/utils/bitacoraDisplay';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  entry: BitacoraEntry;
};

export default function BitacoraEntryCard({ entry }: Props) {
  const recordedAt = new Date(entry.recordedAt);
  const dateLabel = recordedAt.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeLabel = recordedAt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const badge = pickBitacoraEntryStyle(entry.type);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.dateText}>{dateLabel}</Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color="#5ee7df" />
            <Text style={styles.timeText}>{timeLabel}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: badge.color }]}>
          <Text style={styles.badgeText}>{badge.label}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <Text style={styles.note}>{entry.note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 16,
    marginBottom: 16,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dateText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { color: '#a5d8f3', fontSize: 13, fontWeight: '600' },
  badge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 12 },
  note: { color: '#e2e8f0', fontSize: 14, lineHeight: 20 },
});
```

---

### Task 9: `BitacoraScreen.tsx` (TDD)

**Files:**
- Create: `appmovil/src/presentation/screens/bitacora/BitacoraScreen.tsx`
- Create: `appmovil/src/presentation/screens/bitacora/__tests__/BitacoraScreen.test.tsx`

**Depends on:** Tasks 6–8. Estructura calcada de `ContactsScreen.tsx`
(`appmovil/src/presentation/screens/patients/ContactsScreen.tsx`): recibe `route.params.patientId`
(no usa el store global `selectedPatientId`), `FlatList` con `ListHeaderComponent`/`ListFooterComponent`.
El selector de rango de fechas y el filtro de tipo son dos `Modal` de acción calcados de
`TaskActionModal.tsx` (`appmovil/src/presentation/components/TaskActionModal.tsx`), con `testID`
en cada opción para poder testearlos.

Presets de rango (calculados en el cliente; el backend siempre recibe `from`/`to` no nulos):
`Hoy` → hoy/hoy; `Últimos 7 días` (default) → hoy-6/hoy; `Últimos 30 días` → hoy-29/hoy;
`Todo` → `2020-01-01`/hoy.

Escribe el test primero (TDD), mockeando `useInjection` (`bitacoraEntryRepo`, `patientRepo`) igual
que `ContactsScreen.test.tsx`, con casos:
1. Muestra el nombre del paciente (`Paciente: <nombre>`).
2. Muestra las entradas con su nota, badge y hora.
3. Muestra el estado vacío cuando no hay entradas.
4. Al presionar el chip de rango y elegir "Todo" (`testID="range-option-ALL"`), vuelve a pedir con
   `from` distinto (verificar el mock `listEntries` recibió un `from` anterior al del rango por defecto).
5. Al presionar "Filtrar" y elegir "Entrada" (`testID="type-option-ENTRY"`), `listEntries` se llama
   con `type: 'ENTRY'`.
6. Al presionar "Agregar entrada", navega a `AddBitacoraEntry` con `{ patientId }`.

- [ ] **Step 1: Test**

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BitacoraScreen from '../BitacoraScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { BitacoraEntry, Patient } from '@/domain/entities';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

const patient: Patient = {
  id: 'p1',
  fullName: 'Rosa Elena Martínez Silva',
  birthDate: '1948-01-15',
  gender: 'FEMALE',
  identificationNumber: '11111111-1',
  address: 'Calle Falsa 123',
  healthInsurance: 'Fonasa',
  bloodType: 'O+',
  emergencyContact: { name: 'Juan Martínez', phone: '+56911112222' },
  isOwner: true,
  active: true,
};

function buildEntry(overrides: Partial<BitacoraEntry> = {}): BitacoraEntry {
  return {
    id: 'e1',
    patientId: 'p1',
    authorId: 'u1',
    type: 'ENTRY',
    note: 'Paciente despertó tranquila y durmió bien durante la noche.',
    recordedAt: '2026-07-08T08:15:00',
    ...overrides,
  };
}

function renderScreen(entries: BitacoraEntry[], navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const listEntries = jest.fn().mockResolvedValue(entries);
  const getPatient = jest.fn().mockResolvedValue(patient);
  mockedUseInjection.mockReturnValue({
    bitacoraEntryRepo: { listEntries },
    patientRepo: { getPatient },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const route = { params: { patientId: 'p1' } } as any;

  render(
    <QueryClientProvider client={queryClient}>
      <BitacoraScreen navigation={navigation} route={route} />
    </QueryClientProvider>
  );

  return { navigation, listEntries };
}

describe('BitacoraScreen', () => {
  it('muestra el nombre del paciente', async () => {
    renderScreen([buildEntry()]);
    expect(await screen.findByText('Paciente: Rosa Elena Martínez Silva')).toBeTruthy();
  });

  it('muestra las entradas con nota y badge', async () => {
    renderScreen([buildEntry(), buildEntry({ id: 'e2', type: 'OBSERVATION', note: 'Comió bien el almuerzo.' })]);
    expect(await screen.findByText('Paciente despertó tranquila y durmió bien durante la noche.')).toBeTruthy();
    expect(screen.getByText('Comió bien el almuerzo.')).toBeTruthy();
    expect(screen.getByText('Entrada')).toBeTruthy();
    expect(screen.getByText('Observación')).toBeTruthy();
  });

  it('muestra un estado vacío cuando no hay entradas', async () => {
    renderScreen([]);
    expect(await screen.findByText('Sin entradas para este período.')).toBeTruthy();
  });

  it('cambia el rango de fechas al elegir "Todo" y vuelve a consultar', async () => {
    const { listEntries } = renderScreen([buildEntry()]);
    await screen.findByText(/despertó/);
    const firstCallFrom = listEntries.mock.calls[0][1];

    fireEvent.press(screen.getByText('Últimos 7 días'));
    fireEvent.press(await screen.findByTestId('range-option-ALL'));

    await waitFor(() => {
      const lastCall = listEntries.mock.calls[listEntries.mock.calls.length - 1];
      expect(lastCall[1]).toBe('2020-01-01');
    });
    expect(listEntries.mock.calls[listEntries.mock.calls.length - 1][1]).not.toBe(firstCallFrom);
  });

  it('filtra por tipo al elegir "Entrada" en Filtrar', async () => {
    const { listEntries } = renderScreen([buildEntry()]);
    await screen.findByText(/despertó/);

    fireEvent.press(screen.getByText('Filtrar'));
    fireEvent.press(await screen.findByTestId('type-option-ENTRY'));

    await waitFor(() => {
      const lastCall = listEntries.mock.calls[listEntries.mock.calls.length - 1];
      expect(lastCall[3]).toBe('ENTRY');
    });
  });

  it('navega a AddBitacoraEntry al presionar "Agregar entrada"', async () => {
    const { navigation } = renderScreen([]);
    fireEvent.press(await screen.findByText('Agregar entrada'));
    expect(navigation.navigate).toHaveBeenCalledWith('AddBitacoraEntry', { patientId: 'p1' });
  });
});
```

Run: `npx jest --testPathPattern=BitacoraScreen -q` — falla (componente no existe) antes de Step 2.

- [ ] **Step 2: Implementación**

```tsx
import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Modal } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { BitacoraEntry, BitacoraEntryType } from '@/domain/entities';
import BitacoraEntryCard from '@/presentation/components/BitacoraEntryCard';
import PatientChip from '@/presentation/components/PatientChip';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'Bitacora'>;
  route: RouteProp<PatientStackParams, 'Bitacora'>;
};

type RangeKey = 'TODAY' | 'LAST_7' | 'LAST_30' | 'ALL';
type TypeKey = BitacoraEntryType | 'ALL';

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'TODAY', label: 'Hoy' },
  { key: 'LAST_7', label: 'Últimos 7 días' },
  { key: 'LAST_30', label: 'Últimos 30 días' },
  { key: 'ALL', label: 'Todo' },
];

const TYPE_OPTIONS: { key: TypeKey; label: string }[] = [
  { key: 'ALL', label: 'Todas' },
  { key: 'ENTRY', label: 'Entrada' },
  { key: 'OBSERVATION', label: 'Observación' },
];

function toLocalDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function rangeToDates(range: RangeKey): { from: string; to: string } {
  const today = new Date();
  const to = toLocalDateString(today);
  if (range === 'TODAY') return { from: to, to };
  if (range === 'LAST_7') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: toLocalDateString(from), to };
  }
  if (range === 'LAST_30') {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: toLocalDateString(from), to };
  }
  return { from: '2020-01-01', to };
}

export default function BitacoraScreen({ navigation, route }: Props) {
  const { patientId } = route.params;
  const { bitacoraEntryRepo, patientRepo } = useInjection();
  const [range, setRange] = useState<RangeKey>('LAST_7');
  const [typeFilter, setTypeFilter] = useState<TypeKey>('ALL');
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  const { from, to } = rangeToDates(range);

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientRepo.getPatient(patientId),
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ['bitacora-entries', patientId, from, to, typeFilter],
    queryFn: () => bitacoraEntryRepo.listEntries(patientId, from, to, typeFilter === 'ALL' ? undefined : typeFilter),
  });

  const rangeLabel = RANGE_OPTIONS.find((o) => o.key === range)!.label;

  if (isLoading) return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#5ee7df" /></ScreenBackground>;

  return (
    <ScreenBackground>
      <FlatList
        data={entries ?? []}
        keyExtractor={(item: BitacoraEntry) => item.id}
        renderItem={({ item }) => <BitacoraEntryCard entry={item} />}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerLogoRow}>
                <Image source={require('../../../../assets/cuidalink-icon.png')} style={styles.headerLogoIcon} resizeMode="contain" />
                <Text style={styles.headerTitle}>
                  <Text style={styles.headerCuida}>Cuida</Text>
                  <Text style={styles.headerLink}>Link</Text>
                </Text>
              </View>
              <View style={styles.backButtonSpacer} />
            </View>

            <Text style={styles.title}>Bitácora</Text>
            <Text style={styles.subtitle}>Registro diario de observaciones</Text>

            {patient && <PatientChip name={patient.fullName} />}

            <View style={styles.filtersRow}>
              <TouchableOpacity style={styles.filterChip} onPress={() => setShowRangeModal(true)}>
                <Ionicons name="calendar-outline" size={16} color="#5ee7df" />
                <Text style={styles.filterChipText}>{rangeLabel}</Text>
                <Ionicons name="chevron-down" size={16} color="#a5d8f3" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip} onPress={() => setShowTypeModal(true)}>
                <Ionicons name="filter" size={16} color="#5ee7df" />
                <Text style={styles.filterChipText}>Filtrar</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={<Text style={styles.empty}>Sin entradas para este período.</Text>}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddBitacoraEntry', { patientId })}
          >
            <Ionicons name="document-text" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Agregar entrada</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={{ padding: 20, paddingTop: 24 }}
      />

      <Modal visible={showRangeModal} transparent animationType="fade" onRequestClose={() => setShowRangeModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            {RANGE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                testID={`range-option-${opt.key}`}
                style={styles.optionRow}
                onPress={() => { setRange(opt.key); setShowRangeModal(false); }}
              >
                <Text style={[styles.optionText, range === opt.key && styles.optionTextActive]}>{opt.label}</Text>
                {range === opt.key && <Ionicons name="checkmark" size={18} color="#5ee7df" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={showTypeModal} transparent animationType="fade" onRequestClose={() => setShowTypeModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            {TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                testID={`type-option-${opt.key}`}
                style={styles.optionRow}
                onPress={() => { setTypeFilter(opt.key); setShowTypeModal(false); }}
              >
                <Text style={[styles.optionText, typeFilter === opt.key && styles.optionTextActive]}>{opt.label}</Text>
                {typeFilter === opt.key && <Ionicons name="checkmark" size={18} color="#5ee7df" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
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

  filtersRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
  },
  filterChipText: { color: '#a5d8f3', fontSize: 13, fontWeight: '600' },

  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#e05555', borderRadius: 16,
    paddingVertical: 16, marginTop: 8,
  },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dialog: {
    backgroundColor: '#12283f', borderRadius: 16, padding: 12, width: '85%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 12,
  },
  optionText: { color: '#e2e8f0', fontSize: 15 },
  optionTextActive: { color: '#5ee7df', fontWeight: 'bold' },
});
```

Run: `npx jest --testPathPattern=BitacoraScreen -q` — pasa.

---

### Task 10: `AddBitacoraEntryScreen.tsx` (TDD)

**Files:**
- Create: `appmovil/src/presentation/screens/bitacora/AddBitacoraEntryScreen.tsx`
- Create: `appmovil/src/presentation/screens/bitacora/__tests__/AddBitacoraEntryScreen.test.tsx`

**Depends on:** Task 6. Estructura calcada de `ContactFormScreen.tsx` pero con un solo campo (`note`).

- [ ] **Step 1: Test**

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddBitacoraEntryScreen from '../AddBitacoraEntryScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { BitacoraEntry } from '@/domain/entities';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

const createdEntry: BitacoraEntry = {
  id: 'e1', patientId: 'p1', authorId: 'u1', type: 'ENTRY',
  note: 'Paciente estable', recordedAt: '2026-07-09T10:00:00',
};

function renderScreen(navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const createEntry = jest.fn().mockResolvedValue(createdEntry);
  mockedUseInjection.mockReturnValue({
    bitacoraEntryRepo: { createEntry },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const route = { params: { patientId: 'p1' } } as any;

  render(
    <QueryClientProvider client={queryClient}>
      <AddBitacoraEntryScreen navigation={navigation} route={route} />
    </QueryClientProvider>
  );

  return { navigation, createEntry };
}

describe('AddBitacoraEntryScreen', () => {
  it('valida que la nota sea requerida', async () => {
    renderScreen();
    await screen.findByText('Nueva entrada');
    fireEvent.press(screen.getByText('Guardar'));
    expect(await screen.findByText('La nota es obligatoria')).toBeTruthy();
  });

  it('crea la entrada y vuelve atrás', async () => {
    const { navigation, createEntry } = renderScreen();
    await screen.findByText('Nueva entrada');
    fireEvent.changeText(screen.getByTestId('bitacora-note-input'), 'Paciente estable');
    fireEvent.press(screen.getByText('Guardar'));

    await waitFor(() => expect(createEntry).toHaveBeenCalledWith('p1', 'Paciente estable'));
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
  });

  it('cancelar vuelve atrás sin guardar', async () => {
    const { navigation, createEntry } = renderScreen();
    await screen.findByText('Nueva entrada');
    fireEvent.press(screen.getByText('Cancelar'));
    expect(navigation.goBack).toHaveBeenCalled();
    expect(createEntry).not.toHaveBeenCalled();
  });
});
```

Run: `npx jest --testPathPattern=AddBitacoraEntryScreen -q` — falla (componente no existe) antes de Step 2.

- [ ] **Step 2: Implementación**

```tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'AddBitacoraEntry'>;
  route: RouteProp<PatientStackParams, 'AddBitacoraEntry'>;
};

const schema = z.object({
  note: z.string({ error: 'La nota es obligatoria' }).min(1, 'La nota es obligatoria'),
});
type FormData = z.infer<typeof schema>;

export default function AddBitacoraEntryScreen({ navigation, route }: Props) {
  const { patientId } = route.params;
  const [loading, setLoading] = useState(false);
  const { bitacoraEntryRepo } = useInjection();
  const queryClient = useQueryClient();

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { note: '' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await bitacoraEntryRepo.createEntry(patientId, data.note);
      await queryClient.invalidateQueries({ queryKey: ['bitacora-entries', patientId] });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la entrada.');
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
            <Image source={require('../../../../assets/cuidalink-icon.png')} style={styles.headerLogoIcon} resizeMode="contain" />
            <Text style={styles.headerTitle}>
              <Text style={styles.headerCuida}>Cuida</Text>
              <Text style={styles.headerLink}>Link</Text>
            </Text>
          </View>
          <View style={styles.backButtonSpacer} />
        </View>

        <Text style={styles.title}>Nueva entrada</Text>
        <Text style={styles.subtitle}>Agrega una nota a la bitácora del paciente</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Nota</Text>
          <Controller control={control} name="note" render={({ field: { onChange, value } }) => (
            <TextInput
              testID="bitacora-note-input"
              style={[styles.input, styles.textarea]}
              placeholder="Ej: Paciente durmió bien durante la noche"
              placeholderTextColor="#7c93ab"
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={5}
            />
          )} />
          {errors.note && <Text style={styles.error}>{errors.note.message}</Text>}
        </View>

        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSubmit(onSubmit)} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Guardar</Text>}
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

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 20,
    marginBottom: 24,
  },
  label: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    minHeight: 48, color: '#fff', fontSize: 15,
  },
  textarea: { minHeight: 120, textAlignVertical: 'top', paddingTop: 12 },
  error: { color: '#ff8a8a', fontSize: 12, marginTop: 4 },

  footerRow: { flexDirection: 'row', gap: 12 },
  saveButton: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#e05555', borderRadius: 16, paddingVertical: 16,
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelButton: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#5ee7df', borderRadius: 16, paddingVertical: 14,
  },
  cancelButtonText: { color: '#5ee7df', fontWeight: 'bold', fontSize: 16 },
});
```

Run: `npx jest --testPathPattern=AddBitacoraEntryScreen -q` — pasa.

---

### Task 11: Registrar rutas y wiring en `PatientDetailScreen`

**Files:**
- Modify: `appmovil/src/presentation/navigation/AppNavigator.tsx`
- Modify: `appmovil/src/presentation/screens/patients/PatientDetailScreen.tsx`
- Modify: `appmovil/src/presentation/screens/patients/__tests__/PatientDetailScreen.test.tsx`

**Depends on:** Tasks 9–10.

- [ ] **Step 1: `AppNavigator.tsx` — imports**

Añadir junto a los demás imports de pantallas (después de `CreateTaskScreen`):
```ts
import BitacoraScreen from '@/presentation/screens/bitacora/BitacoraScreen';
import AddBitacoraEntryScreen from '@/presentation/screens/bitacora/AddBitacoraEntryScreen';
```

- [ ] **Step 2: `AppNavigator.tsx` — `PatientStackParams`**

Añadir estas dos líneas dentro del type `PatientStackParams` (junto a `Contacts: { patientId: string };`):
```ts
Bitacora: { patientId: string };
AddBitacoraEntry: { patientId: string };
```

- [ ] **Step 3: `AppNavigator.tsx` — registrar las rutas**

Añadir junto a `<Stack.Screen name="Contacts" .../>`:
```tsx
<Stack.Screen name="Bitacora" component={BitacoraScreen} options={{ headerShown: false }} />
<Stack.Screen name="AddBitacoraEntry" component={AddBitacoraEntryScreen} options={{ headerShown: false }} />
```

- [ ] **Step 4: `PatientDetailScreen.tsx` — función de navegación**

Añadir junto a `goToContacts` (después de su definición, antes de `goToComingSoon`):
```tsx
function goToBitacora() {
  navigation.navigate('Bitacora', { patientId });
}
```

- [ ] **Step 5: `PatientDetailScreen.tsx` — wiring de la tarjeta**

Reemplazar la línea de la `ActionCard` de Bitácora:
```tsx
<ActionCard icon="clipboard" color="#f5a623" title="Bitácora" subtitle="Notas del cuidador" onPress={() => goToComingSoon('Bitácora', 'Notas del cuidador')} />
```
por:
```tsx
<ActionCard icon="clipboard" color="#f5a623" title="Bitácora" subtitle="Notas del cuidador" onPress={goToBitacora} />
```
(`ComingSoonScreen` sigue usándose para "Historial" — no tocar esa línea.)

- [ ] **Step 6: Test — nueva aserción de navegación**

Añadir en `PatientDetailScreen.test.tsx`, junto al test `'navega a Contacts al presionar esa tarjeta'`:
```tsx
it('navega a Bitacora al presionar esa tarjeta', async () => {
  const { navigation } = renderScreen();
  fireEvent.press(await screen.findByText('Bitácora'));
  expect(navigation.navigate).toHaveBeenCalledWith('Bitacora', { patientId: 'p1' });
});
```

Run: `npx jest --testPathPattern=PatientDetailScreen -q` — pasa (incluyendo el nuevo test).

---

### Task 12: Suite completa y typecheck

**Files:** ninguno (solo verificación).

**Depends on:** Tasks 6–11.

- [ ] **Step 1: Typecheck**

```bash
cd appmovil && npx tsc --noEmit
```
Sin errores.

- [ ] **Step 2: Suite completa**

```bash
cd appmovil && npx jest
```
Todos los tests pasan (incluyendo los ya existentes — sin regresiones).

- [ ] **Step 3: Backend — compilación + suite (sin integración)**

```bash
cd backend && mvn compile -q && mvn test -Dtest='!BitacoraIntegrationTest,!*IntegrationTest' -q
```
(Ajustar el patrón de exclusión al que ya use el resto del proyecto para saltar los tests de
Testcontainers en este entorno sin Docker — revisar cómo se hizo en tasks anteriores del ledger,
p.ej. la nota de `daily-meds-screen`. Si el proyecto no tiene ese patrón establecido, correr
`mvn test -q` completo y reportar qué tests de integración fallan por falta de Docker vs. cuáles
fallan por un bug real.)

---

### Task 13: Sembrar datos de Bitácora para Rosa Elena Martínez Silva

**Files:** ninguno (solo datos, vía `psql`).

**Depends on:** Task 4 (la tabla `bitacora_entries` debe existir — se crea sola al levantar el
backend una vez con `ddl-auto=update`, o ejecutando el bloque SQL de la Task 4 directamente).

Paciente demo: **Rosa Elena Martínez Silva** (`id = e76adb91-17ae-4813-be90-c98d54c691a6`), su owner
es `id = fdd31f00-fd4c-431b-8e67-4719fdbd8e5a`. Confirmar que ambos IDs siguen existiendo en la base
local (`psql -h localhost -U postgres -d cuidalink -c "SELECT id, full_name FROM patients WHERE id='e76adb91-17ae-4813-be90-c98d54c691a6';"`)
antes de insertar; si no existen (base reseteada), usar el primer paciente que devuelva
`SELECT id, full_name FROM patients LIMIT 1;` y su `primary_caregiver_id`.

- [ ] **Step 1: Levantar el backend una vez para crear la tabla (si no existe aún)**

```bash
cd backend && timeout 30 mvn spring-boot:run -q || true
```
(o simplemente confirmar con `\d bitacora_entries` en psql si ya corrió en una task anterior).

- [ ] **Step 2: Insertar las entradas de ejemplo**

Usa `NOW() - INTERVAL` en vez de fechas fijas de 2025, para que las entradas siempre caigan dentro
de "Últimos 7 días" / "Últimos 30 días" sin importar cuándo se ejecute este script. La última fila
es intencionalmente >7 días atrás para poder demostrar los presets "Últimos 30 días"/"Todo".

```sql
INSERT INTO bitacora_entries (id, patient_id, author_id, entry_type, note, recorded_at) VALUES
  (gen_random_uuid()::text, 'e76adb91-17ae-4813-be90-c98d54c691a6', 'fdd31f00-fd4c-431b-8e67-4719fdbd8e5a',
   'ENTRY', 'Paciente despertó tranquila y durmió bien durante la noche.', NOW() - INTERVAL '1 day' + TIME '08:15'),
  (gen_random_uuid()::text, 'e76adb91-17ae-4813-be90-c98d54c691a6', 'fdd31f00-fd4c-431b-8e67-4719fdbd8e5a',
   'OBSERVATION', 'Comió bien el almuerzo, sin molestias ni náuseas.', NOW() - INTERVAL '1 day' + TIME '12:40'),
  (gen_random_uuid()::text, 'e76adb91-17ae-4813-be90-c98d54c691a6', 'fdd31f00-fd4c-431b-8e67-4719fdbd8e5a',
   'OBSERVATION', 'Se realizó caminata corta dentro de la casa. Se observó buen ánimo.', NOW() - INTERVAL '1 day' + TIME '17:20'),
  (gen_random_uuid()::text, 'e76adb91-17ae-4813-be90-c98d54c691a6', 'fdd31f00-fd4c-431b-8e67-4719fdbd8e5a',
   'ENTRY', 'Se administró medicamento nocturno y quedó descansando.', NOW() - INTERVAL '2 days' + TIME '21:10'),
  (gen_random_uuid()::text, 'e76adb91-17ae-4813-be90-c98d54c691a6', 'fdd31f00-fd4c-431b-8e67-4719fdbd8e5a',
   'ENTRY', 'Control de rutina, signos vitales estables.', NOW() - INTERVAL '10 days');
```

Ejecutar con:
```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d cuidalink -c "<SQL de arriba>"
```

- [ ] **Step 3: Verificar**

```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d cuidalink -c "SELECT entry_type, note, recorded_at FROM bitacora_entries WHERE patient_id = 'e76adb91-17ae-4813-be90-c98d54c691a6' ORDER BY recorded_at DESC;"
```
Debe devolver las 5 filas insertadas.

---

## Verification (final, tras completar todas las tasks)

1. `cd backend && mvn test-compile -q` — compila limpio. `mvn test -q` para los módulos que no
   requieren Testcontainers.
2. `cd appmovil && npx tsc --noEmit && npx jest` — typecheck y suite completa sin regresiones.
3. Confirmar los datos sembrados con el `SELECT` de la Task 13.
4. Lanzar la app (Metro + Android/iOS o web), navegar Patient Detail → Bitácora para "Rosa Elena
   Martínez Silva": chip de paciente, "Últimos 7 días" por defecto muestra las 4 entradas recientes
   con badges Entrada/Observación correctos, cambiar a "Todo" revela la 5ª entrada (10 días atrás),
   "Filtrar" acota por tipo, "Agregar entrada" crea una entrada nueva (como owner) etiquetada
   "Entrada" y aparece en la lista de inmediato.
