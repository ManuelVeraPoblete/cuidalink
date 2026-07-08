# Contactos del paciente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la pantalla `ContactsScreen` por la lista categorizada de contactos del mockup
(Familia/Médico/Emergencia), respaldada por un nuevo concepto de dominio `PatientContact` en el
backend, y reubicar la gestión de colaboradores y el acceso a "Editar paciente" que la pantalla
anterior hospedaba.

**Architecture:** Nuevo submódulo dentro del hexágono `patient` existente (backend), siguiendo
exactamente el patrón ya usado por `vital` (definiciones configurables por owner + lectura por
owner/colaborador). En el móvil: entidad + repositorio + pantalla nueva de formulario reutilizable
para crear/editar, mismo patrón que `CreateTaskScreen`/`RecordVitalsScreen`.

**Tech Stack:** Java 17 + Spring Boot 3.2 + Spring Data JPA (backend); React Native + TypeScript +
React Hook Form + Zod + TanStack Query (móvil). Ver `CLAUDE.md` para comandos de build/test.

## Global Constraints

- Backend hexagonal estricto: `domain/model` y `domain/service` nunca importan `jakarta.persistence`
  ni `org.springframework.data`. Entidades JPA solo en `adapter/out/persistence`.
- Autorización en la capa de servicio (no en el controller): `patient.isOwner(requesterId)` para
  crear/editar contactos; `patient.hasAccess(requesterId)` para listar. `IllegalArgumentException` si
  se deniega (el `GlobalExceptionHandler` ya existente lo mapea a 400).
- API prefix `/api/v1` ya configurado globalmente — las rutas de este plan se escriben sin ese
  prefijo (como en el resto del código), Spring lo antepone solo.
- Mobile: `presentation/` solo importa de `domain/`, nunca de `data/` directamente — todo el cableado
  pasa por `useInjection.ts`.
- No se implementa "Ver detalle" ni "eliminar contacto" (decidido explícitamente, ver spec).
- Solo el owner puede crear/editar contactos y ver el botón "Agregar contacto".

---

## Backend

### Task 1: Dominio `PatientContact`

**Files:**
- Create: `backend/src/main/java/com/cuidalink/patient/domain/model/PatientContactCategory.java`
- Create: `backend/src/main/java/com/cuidalink/patient/domain/model/PatientContactId.java`
- Create: `backend/src/main/java/com/cuidalink/patient/domain/model/PatientContact.java`

**Interfaces:**
- Produces: `PatientContactCategory { FAMILY, DOCTOR, EMERGENCY }`, `PatientContactId(UUID value)`
  con `generate()` estático, `PatientContact` con getters `getId()`, `getPatientId()`, `getName()`,
  `getCategory()`, `getRelationship()`, `getPhone()`, `getEmail()`, `getNote()`, `isPriority()`, y
  `update(name, category, relationship, phone, email, note, priority)`.

No hay lógica de negocio no trivial en este modelo (mismo caso que `VitalSignDefinition`, que
tampoco tiene test propio) — no se escribe test unitario para esta clase; su comportamiento se
verifica a través del test de `PatientContactService` (Task 3).

- [ ] **Step 1: Crear el enum de categoría**

```java
package com.cuidalink.patient.domain.model;

public enum PatientContactCategory { FAMILY, DOCTOR, EMERGENCY }
```

- [ ] **Step 2: Crear el value object de id**

```java
package com.cuidalink.patient.domain.model;

import java.util.UUID;

public record PatientContactId(UUID value) {
    public static PatientContactId generate() { return new PatientContactId(UUID.randomUUID()); }
}
```

- [ ] **Step 3: Crear la clase de dominio `PatientContact`**

```java
package com.cuidalink.patient.domain.model;

public class PatientContact {

    private final PatientContactId id;
    private final PatientId patientId;
    private String name;
    private PatientContactCategory category;
    private String relationship;
    private String phone;
    private String email;
    private String note;
    private boolean priority;

    public PatientContact(PatientContactId id, PatientId patientId, String name,
                          PatientContactCategory category, String relationship, String phone,
                          String email, String note, boolean priority) {
        this.id = id;
        this.patientId = patientId;
        this.name = name;
        this.category = category;
        this.relationship = relationship;
        this.phone = phone;
        this.email = email;
        this.note = note;
        this.priority = priority;
    }

    public void update(String name, PatientContactCategory category, String relationship,
                       String phone, String email, String note, boolean priority) {
        this.name = name;
        this.category = category;
        this.relationship = relationship;
        this.phone = phone;
        this.email = email;
        this.note = note;
        this.priority = priority;
    }

    public PatientContactId getId() { return id; }
    public PatientId getPatientId() { return patientId; }
    public String getName() { return name; }
    public PatientContactCategory getCategory() { return category; }
    public String getRelationship() { return relationship; }
    public String getPhone() { return phone; }
    public String getEmail() { return email; }
    public String getNote() { return note; }
    public boolean isPriority() { return priority; }
}
```

- [ ] **Step 4: Verificar que compila**

Run: `cd backend && mvn compile -q`
Expected: sin salida (compilación exitosa).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/cuidalink/patient/domain/model/PatientContact.java \
        backend/src/main/java/com/cuidalink/patient/domain/model/PatientContactId.java \
        backend/src/main/java/com/cuidalink/patient/domain/model/PatientContactCategory.java
git commit -m "feat(backend): add PatientContact domain model"
```

---

### Task 2: Puertos (in/out) de `PatientContact`

**Files:**
- Create: `backend/src/main/java/com/cuidalink/patient/domain/port/out/PatientContactRepository.java`
- Create: `backend/src/main/java/com/cuidalink/patient/domain/port/in/CreatePatientContactUseCase.java`
- Create: `backend/src/main/java/com/cuidalink/patient/domain/port/in/UpdatePatientContactUseCase.java`
- Create: `backend/src/main/java/com/cuidalink/patient/domain/port/in/ListPatientContactsUseCase.java`

**Interfaces:**
- Consumes: `PatientContact`, `PatientContactId`, `PatientContactCategory` (Task 1), `PatientId`
  (`com.cuidalink.patient.domain.model.PatientId`, ya existente), `UserId`
  (`com.cuidalink.auth.domain.model.UserId`, ya existente).
- Produces: `CreatePatientContactUseCase.CreatePatientContactCommand`,
  `UpdatePatientContactUseCase.UpdatePatientContactCommand` — usados por Task 3 (servicio) y Task 5
  (controller).

Son solo interfaces (sin lógica) — no requieren test propio, mismo criterio que los puertos
equivalentes de `vital`.

- [ ] **Step 1: Puerto de salida (repositorio)**

```java
package com.cuidalink.patient.domain.port.out;

import com.cuidalink.patient.domain.model.PatientContact;
import com.cuidalink.patient.domain.model.PatientContactId;
import com.cuidalink.patient.domain.model.PatientId;

import java.util.List;
import java.util.Optional;

public interface PatientContactRepository {
    PatientContact save(PatientContact contact);
    Optional<PatientContact> findById(PatientContactId id);
    List<PatientContact> findByPatientId(PatientId patientId);
}
```

- [ ] **Step 2: Caso de uso de creación**

```java
package com.cuidalink.patient.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientContact;
import com.cuidalink.patient.domain.model.PatientContactCategory;
import com.cuidalink.patient.domain.model.PatientId;

public interface CreatePatientContactUseCase {

    record CreatePatientContactCommand(
        PatientId patientId,
        String name,
        PatientContactCategory category,
        String relationship,
        String phone,
        String email,
        String note,
        boolean priority,
        UserId requesterId
    ) {}

    PatientContact execute(CreatePatientContactCommand command);
}
```

- [ ] **Step 3: Caso de uso de actualización**

```java
package com.cuidalink.patient.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientContact;
import com.cuidalink.patient.domain.model.PatientContactCategory;
import com.cuidalink.patient.domain.model.PatientContactId;
import com.cuidalink.patient.domain.model.PatientId;

public interface UpdatePatientContactUseCase {

    record UpdatePatientContactCommand(
        PatientId patientId,
        PatientContactId contactId,
        String name,
        PatientContactCategory category,
        String relationship,
        String phone,
        String email,
        String note,
        boolean priority,
        UserId requesterId
    ) {}

    PatientContact execute(UpdatePatientContactCommand command);
}
```

- [ ] **Step 4: Caso de uso de listado**

```java
package com.cuidalink.patient.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientContact;
import com.cuidalink.patient.domain.model.PatientId;

import java.util.List;

public interface ListPatientContactsUseCase {
    List<PatientContact> list(PatientId patientId, UserId requesterId);
}
```

- [ ] **Step 5: Verificar que compila**

Run: `cd backend && mvn compile -q`
Expected: sin salida.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/cuidalink/patient/domain/port/
git commit -m "feat(backend): add PatientContact ports"
```

---

### Task 3: `PatientContactService` (con test TDD)

**Files:**
- Create: `backend/src/test/java/com/cuidalink/patient/domain/service/PatientContactServiceTest.java`
- Create: `backend/src/main/java/com/cuidalink/patient/domain/service/PatientContactService.java`

**Interfaces:**
- Consumes: `PatientContactRepository`, `CreatePatientContactUseCase`, `UpdatePatientContactUseCase`,
  `ListPatientContactsUseCase` (Task 2); `PatientRepository`, `Patient` (ya existentes —
  `patient.isOwner(UserId)`, `patient.hasAccess(UserId)`).
- Produces: `PatientContactService` — bean `@Service` inyectado por el controller (Task 5).

- [ ] **Step 1: Escribir el test que falla**

```java
package com.cuidalink.patient.domain.service;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.*;
import com.cuidalink.patient.domain.port.in.CreatePatientContactUseCase;
import com.cuidalink.patient.domain.port.in.UpdatePatientContactUseCase;
import com.cuidalink.patient.domain.port.out.PatientContactRepository;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class PatientContactServiceTest {

    @Mock PatientContactRepository contactRepository;
    @Mock PatientRepository patientRepository;
    PatientContactService sut;

    UserId ownerId = new UserId(UUID.randomUUID());
    PatientId patientId = PatientId.generate();
    PatientContactId contactId = PatientContactId.generate();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new PatientContactService(contactRepository, patientRepository);
    }

    @Test
    void createContact_onlyOwnerCanCreate() {
        var stranger = new UserId(UUID.randomUUID());
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(mockPatient(ownerId)));

        assertThatThrownBy(() -> sut.execute(new CreatePatientContactUseCase.CreatePatientContactCommand(
            patientId, "Ana Martínez", PatientContactCategory.FAMILY, "Hija", "+56912345678",
            "ana@email.com", null, false, stranger)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void createContact_ownerCanCreate() {
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(mockPatient(ownerId)));
        when(contactRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = sut.execute(new CreatePatientContactUseCase.CreatePatientContactCommand(
            patientId, "Ana Martínez", PatientContactCategory.FAMILY, "Hija", "+56912345678",
            "ana@email.com", null, false, ownerId));

        assertThat(result.getName()).isEqualTo("Ana Martínez");
        assertThat(result.getCategory()).isEqualTo(PatientContactCategory.FAMILY);
        assertThat(result.getPatientId()).isEqualTo(patientId);
    }

    @Test
    void updateContact_onlyOwnerCanUpdate() {
        var stranger = new UserId(UUID.randomUUID());
        var contact = new PatientContact(contactId, patientId, "Ana Martínez",
            PatientContactCategory.FAMILY, "Hija", "+56912345678", "ana@email.com", null, false);
        when(contactRepository.findById(contactId)).thenReturn(Optional.of(contact));
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(mockPatient(ownerId)));

        assertThatThrownBy(() -> sut.execute(new UpdatePatientContactUseCase.UpdatePatientContactCommand(
            patientId, contactId, "Ana M.", PatientContactCategory.FAMILY, "Hija", "+56912345678",
            "ana@email.com", null, false, stranger)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void updateContact_ownerCanUpdate() {
        var contact = new PatientContact(contactId, patientId, "Ana Martínez",
            PatientContactCategory.FAMILY, "Hija", "+56912345678", "ana@email.com", null, false);
        when(contactRepository.findById(contactId)).thenReturn(Optional.of(contact));
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(mockPatient(ownerId)));
        when(contactRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = sut.execute(new UpdatePatientContactUseCase.UpdatePatientContactCommand(
            patientId, contactId, "Ana M.", PatientContactCategory.FAMILY, "Hija", "+56912345678",
            "ana@email.com", null, true, ownerId));

        assertThat(result.getName()).isEqualTo("Ana M.");
        assertThat(result.isPriority()).isTrue();
    }

    @Test
    void listContacts_collaboratorCanList() {
        var collab = new UserId(UUID.randomUUID());
        var patient = mockPatient(ownerId);
        patient.addCollaborator(collab);
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(patient));
        when(contactRepository.findByPatientId(patientId)).thenReturn(java.util.List.of());

        var result = sut.list(patientId, collab);

        assertThat(result).isEmpty();
    }

    @Test
    void listContacts_strangerCannotList() {
        var stranger = new UserId(UUID.randomUUID());
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(mockPatient(ownerId)));

        assertThatThrownBy(() -> sut.list(patientId, stranger))
            .isInstanceOf(IllegalArgumentException.class);
    }

    private Patient mockPatient(UserId owner) {
        return new Patient(patientId, "Test Patient", java.time.LocalDate.of(1950, 1, 1),
            Gender.FEMALE, "12345678", "Calle Test 123", "Fonasa", "O+",
            "Diabetes", "Ninguna",
            new EmergencyContact("Familiar", "+56912345678"), owner);
    }
}
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `cd backend && mvn test -Dtest=PatientContactServiceTest -q`
Expected: FAIL (error de compilación — `PatientContactService` no existe).

- [ ] **Step 3: Implementar `PatientContactService`**

```java
package com.cuidalink.patient.domain.service;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.Patient;
import com.cuidalink.patient.domain.model.PatientContact;
import com.cuidalink.patient.domain.model.PatientContactId;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.patient.domain.port.in.CreatePatientContactUseCase;
import com.cuidalink.patient.domain.port.in.ListPatientContactsUseCase;
import com.cuidalink.patient.domain.port.in.UpdatePatientContactUseCase;
import com.cuidalink.patient.domain.port.out.PatientContactRepository;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PatientContactService implements
    CreatePatientContactUseCase,
    UpdatePatientContactUseCase,
    ListPatientContactsUseCase {

    private final PatientContactRepository contactRepository;
    private final PatientRepository patientRepository;

    public PatientContactService(PatientContactRepository contactRepository,
                                PatientRepository patientRepository) {
        this.contactRepository = contactRepository;
        this.patientRepository = patientRepository;
    }

    @Override
    public PatientContact execute(CreatePatientContactCommand cmd) {
        var patient = getPatientOrThrow(cmd.patientId());
        if (!patient.isOwner(cmd.requesterId()))
            throw new IllegalArgumentException("Solo el cuidador principal puede crear contactos");
        var contact = new PatientContact(PatientContactId.generate(), cmd.patientId(), cmd.name(),
            cmd.category(), cmd.relationship(), cmd.phone(), cmd.email(), cmd.note(), cmd.priority());
        return contactRepository.save(contact);
    }

    @Override
    public PatientContact execute(UpdatePatientContactCommand cmd) {
        var contact = contactRepository.findById(cmd.contactId())
            .orElseThrow(() -> new IllegalArgumentException("Contacto no encontrado"));
        if (!contact.getPatientId().equals(cmd.patientId()))
            throw new IllegalArgumentException("Contacto no pertenece al paciente indicado");
        var patient = getPatientOrThrow(cmd.patientId());
        if (!patient.isOwner(cmd.requesterId()))
            throw new IllegalArgumentException("Solo el cuidador principal puede editar contactos");
        contact.update(cmd.name(), cmd.category(), cmd.relationship(), cmd.phone(), cmd.email(),
            cmd.note(), cmd.priority());
        return contactRepository.save(contact);
    }

    @Override
    public List<PatientContact> list(PatientId patientId, UserId requesterId) {
        var patient = getPatientOrThrow(patientId);
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Acceso denegado");
        return contactRepository.findByPatientId(patientId);
    }

    private Patient getPatientOrThrow(PatientId patientId) {
        return patientRepository.findById(patientId)
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
    }
}
```

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Run: `cd backend && mvn test -Dtest=PatientContactServiceTest -q`
Expected: `Tests run: 6, Failures: 0, Errors: 0`

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/cuidalink/patient/domain/service/PatientContactService.java \
        backend/src/test/java/com/cuidalink/patient/domain/service/PatientContactServiceTest.java
git commit -m "feat(backend): add PatientContactService with authorization tests"
```

---

### Task 4: Persistencia JPA

**Files:**
- Create: `backend/src/main/java/com/cuidalink/patient/adapter/out/persistence/PatientContactJpaEntity.java`
- Create: `backend/src/main/java/com/cuidalink/patient/adapter/out/persistence/SpringPatientContactRepository.java`
- Create: `backend/src/main/java/com/cuidalink/patient/adapter/out/persistence/JpaPatientContactRepositoryAdapter.java`
- Modify: `backend/src/main/resources/schema.sql`

**Interfaces:**
- Consumes: `PatientContact`, `PatientContactId`, `PatientContactCategory`, `PatientId` (Task 1),
  `PatientContactRepository` (Task 2).
- Produces: `JpaPatientContactRepositoryAdapter` — bean `@Component` que Spring inyecta
  automáticamente donde se pida `PatientContactRepository` (usado por `PatientContactService`,
  Task 3, vía autowiring de Spring — no requiere cambio en esa clase).

Mapeo campo a campo (sin serialización especial, a diferencia de `vital_records`) — no requiere test
propio, mismo criterio que `JpaVitalDefinitionRepositoryAdapter` (sin test dedicado). La cobertura
real viene del test de integración del controller (Task 5).

- [ ] **Step 1: Entidad JPA**

```java
package com.cuidalink.patient.adapter.out.persistence;

import jakarta.persistence.*;

@Entity
@Table(name = "patient_contacts")
public class PatientContactJpaEntity {

    @Id
    private String id;
    private String patientId;
    private String name;
    private String category;
    private String relationship;
    private String phone;
    private String email;
    @Column(columnDefinition = "TEXT")
    private String note;
    private boolean priority;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getRelationship() { return relationship; }
    public void setRelationship(String relationship) { this.relationship = relationship; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public boolean isPriority() { return priority; }
    public void setPriority(boolean priority) { this.priority = priority; }
}
```

- [ ] **Step 2: Repositorio Spring Data**

```java
package com.cuidalink.patient.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringPatientContactRepository extends JpaRepository<PatientContactJpaEntity, String> {
    List<PatientContactJpaEntity> findByPatientId(String patientId);
}
```

- [ ] **Step 3: Adaptador (mapeo dominio ↔ JPA)**

```java
package com.cuidalink.patient.adapter.out.persistence;

import com.cuidalink.patient.domain.model.*;
import com.cuidalink.patient.domain.port.out.PatientContactRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class JpaPatientContactRepositoryAdapter implements PatientContactRepository {

    private final SpringPatientContactRepository jpa;

    public JpaPatientContactRepositoryAdapter(SpringPatientContactRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public PatientContact save(PatientContact contact) {
        jpa.save(toJpa(contact));
        return contact;
    }

    @Override
    public Optional<PatientContact> findById(PatientContactId id) {
        return jpa.findById(id.value().toString()).map(this::toDomain);
    }

    @Override
    public List<PatientContact> findByPatientId(PatientId patientId) {
        return jpa.findByPatientId(patientId.value().toString())
            .stream().map(this::toDomain).toList();
    }

    private PatientContactJpaEntity toJpa(PatientContact c) {
        var e = new PatientContactJpaEntity();
        e.setId(c.getId().value().toString());
        e.setPatientId(c.getPatientId().value().toString());
        e.setName(c.getName());
        e.setCategory(c.getCategory().name());
        e.setRelationship(c.getRelationship());
        e.setPhone(c.getPhone());
        e.setEmail(c.getEmail());
        e.setNote(c.getNote());
        e.setPriority(c.isPriority());
        return e;
    }

    private PatientContact toDomain(PatientContactJpaEntity e) {
        return new PatientContact(
            new PatientContactId(UUID.fromString(e.getId())),
            new PatientId(UUID.fromString(e.getPatientId())),
            e.getName(),
            PatientContactCategory.valueOf(e.getCategory()),
            e.getRelationship(),
            e.getPhone(),
            e.getEmail(),
            e.getNote(),
            e.isPriority()
        );
    }
}
```

- [ ] **Step 4: Agregar la tabla a `schema.sql`**

Agregar al final del archivo (antes de la sección de índices), siguiendo el mismo bloque de
comentario que usan las demás tablas:

```sql
-- Contactos de referencia del paciente (familia/médico/emergencia, configurados por el owner)
CREATE TABLE patient_contacts (
    id            VARCHAR(36)  PRIMARY KEY,
    patient_id    VARCHAR(36)  NOT NULL,
    name          VARCHAR(255) NOT NULL,
    category      VARCHAR(20)  NOT NULL,
    relationship  VARCHAR(255),
    phone         VARCHAR(50)  NOT NULL,
    email         VARCHAR(255),
    note          TEXT,
    priority      BOOLEAN      NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_patient_contacts_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
);
```

Y junto a los demás índices:

```sql
-- patient_contacts: findByPatientId
CREATE INDEX idx_patient_contacts_patient ON patient_contacts (patient_id);
```

- [ ] **Step 5: Verificar que compila**

Run: `cd backend && mvn compile -q`
Expected: sin salida.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/cuidalink/patient/adapter/out/persistence/PatientContactJpaEntity.java \
        backend/src/main/java/com/cuidalink/patient/adapter/out/persistence/SpringPatientContactRepository.java \
        backend/src/main/java/com/cuidalink/patient/adapter/out/persistence/JpaPatientContactRepositoryAdapter.java \
        backend/src/main/resources/schema.sql
git commit -m "feat(backend): add JPA persistence for PatientContact"
```

---

### Task 5: REST — DTOs, controller y test de integración

**Files:**
- Create: `backend/src/main/java/com/cuidalink/patient/adapter/in/rest/dto/CreatePatientContactRequest.java`
- Create: `backend/src/main/java/com/cuidalink/patient/adapter/in/rest/dto/UpdatePatientContactRequest.java`
- Create: `backend/src/main/java/com/cuidalink/patient/adapter/in/rest/dto/PatientContactResponse.java`
- Create: `backend/src/main/java/com/cuidalink/patient/adapter/in/rest/PatientContactController.java`
- Create: `backend/src/test/java/com/cuidalink/PatientContactIntegrationTest.java`

**Interfaces:**
- Consumes: `CreatePatientContactUseCase`, `UpdatePatientContactUseCase`,
  `ListPatientContactsUseCase` (Task 2/3), `PatientContact`, `PatientContactCategory`,
  `PatientContactId`, `PatientId` (Task 1).
- Produces: endpoints `POST/GET /patients/{patientId}/contacts`,
  `PUT /patients/{patientId}/contacts/{contactId}` — consumidos por el móvil (`ApiPatientContactRepository`, Task 7).

Nota de entorno: este test usa Testcontainers (mismo patrón que `VitalIntegrationTest`) y requiere
Docker disponible. Si Docker no está disponible en el entorno actual, el test fallará con
`IllegalStateException: Could not find a valid Docker environment` — esto es un problema de entorno,
no del código (mismo síntoma ya visto en los demás `*IntegrationTest` existentes); el test debe
correr igual en cualquier entorno con Docker (CI, máquina del usuario si lo tiene).

- [ ] **Step 1: DTOs de request**

```java
package com.cuidalink.patient.adapter.in.rest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreatePatientContactRequest(
    @NotBlank String name,
    @NotNull String category,
    String relationship,
    @NotBlank String phone,
    String email,
    String note,
    boolean priority
) {}
```

```java
package com.cuidalink.patient.adapter.in.rest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdatePatientContactRequest(
    @NotBlank String name,
    @NotNull String category,
    String relationship,
    @NotBlank String phone,
    String email,
    String note,
    boolean priority
) {}
```

```java
package com.cuidalink.patient.adapter.in.rest.dto;

public record PatientContactResponse(
    String id,
    String patientId,
    String name,
    String category,
    String relationship,
    String phone,
    String email,
    String note,
    boolean priority
) {}
```

- [ ] **Step 2: Controller**

```java
package com.cuidalink.patient.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.patient.adapter.in.rest.dto.*;
import com.cuidalink.patient.domain.model.PatientContact;
import com.cuidalink.patient.domain.model.PatientContactCategory;
import com.cuidalink.patient.domain.model.PatientContactId;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.patient.domain.port.in.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/patients/{patientId}/contacts")
public class PatientContactController {

    private final CreatePatientContactUseCase createUseCase;
    private final UpdatePatientContactUseCase updateUseCase;
    private final ListPatientContactsUseCase listUseCase;

    public PatientContactController(CreatePatientContactUseCase createUseCase,
                                    UpdatePatientContactUseCase updateUseCase,
                                    ListPatientContactsUseCase listUseCase) {
        this.createUseCase = createUseCase;
        this.updateUseCase = updateUseCase;
        this.listUseCase = listUseCase;
    }

    @PostMapping
    public ResponseEntity<PatientContactResponse> create(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @Validated @RequestBody CreatePatientContactRequest req) {
        var patId = new PatientId(UUID.fromString(patientId));
        var contact = createUseCase.execute(new CreatePatientContactUseCase.CreatePatientContactCommand(
            patId, req.name(), PatientContactCategory.valueOf(req.category()), req.relationship(),
            req.phone(), req.email(), req.note(), req.priority(), user.getId()));
        return ResponseEntity.status(201).body(toResponse(contact));
    }

    @GetMapping
    public ResponseEntity<List<PatientContactResponse>> list(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId) {
        var patId = new PatientId(UUID.fromString(patientId));
        return ResponseEntity.ok(listUseCase.list(patId, user.getId())
            .stream().map(this::toResponse).toList());
    }

    @PutMapping("/{contactId}")
    public ResponseEntity<PatientContactResponse> update(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @PathVariable String contactId,
            @Validated @RequestBody UpdatePatientContactRequest req) {
        var patId = new PatientId(UUID.fromString(patientId));
        var contact = updateUseCase.execute(new UpdatePatientContactUseCase.UpdatePatientContactCommand(
            patId, new PatientContactId(UUID.fromString(contactId)), req.name(),
            PatientContactCategory.valueOf(req.category()), req.relationship(), req.phone(),
            req.email(), req.note(), req.priority(), user.getId()));
        return ResponseEntity.ok(toResponse(contact));
    }

    private PatientContactResponse toResponse(PatientContact c) {
        return new PatientContactResponse(
            c.getId().value().toString(),
            c.getPatientId().value().toString(),
            c.getName(),
            c.getCategory().name(),
            c.getRelationship(),
            c.getPhone(),
            c.getEmail(),
            c.getNote(),
            c.isPriority()
        );
    }
}
```

- [ ] **Step 3: Escribir el test de integración (falla — no compila, faltan clases anteriores; ya
  están todas, así que en este punto debería compilar y ejecutarse)**

```java
package com.cuidalink;

import com.cuidalink.auth.adapter.in.rest.dto.RegisterRequest;
import com.cuidalink.auth.adapter.in.rest.dto.TokenResponse;
import com.cuidalink.notification.domain.port.out.NotificationSender;
import com.cuidalink.patient.adapter.in.rest.dto.CreatePatientRequest;
import com.cuidalink.patient.adapter.in.rest.dto.EmergencyContactDto;
import com.cuidalink.patient.adapter.in.rest.dto.PatientResponse;
import com.cuidalink.patient.adapter.in.rest.dto.CreatePatientContactRequest;
import com.cuidalink.patient.adapter.in.rest.dto.PatientContactResponse;
import com.cuidalink.patient.adapter.in.rest.dto.UpdatePatientContactRequest;
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
class PatientContactIntegrationTest {

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
        String email = "contact-caregiver-" + UUID.randomUUID() + "@test.com";

        var registerReq = new RegisterRequest("Contact Caregiver", email, "password123");
        var registerResp = restTemplate.postForEntity("/api/v1/auth/register", registerReq, TokenResponse.class);
        assertThat(registerResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        String jwt = registerResp.getBody().token();

        authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(jwt);

        var patientReq = new CreatePatientRequest(
            "Contact Patient", LocalDate.of(1955, 5, 20), Gender.FEMALE, "22222222",
            "Calle Contact 100", "Fonasa", "AB+", null, null,
            new EmergencyContactDto("Emergency Contact", "+56911111111")
        );
        var patientEntity = new HttpEntity<>(patientReq, authHeaders);
        var patientResp = restTemplate.postForEntity("/api/v1/patients", patientEntity, PatientResponse.class);
        assertThat(patientResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        patientId = patientResp.getBody().id();
    }

    @Test
    void createContact_persistsAndReturnsCreated() {
        var req = new CreatePatientContactRequest(
            "Ana Martínez", "FAMILY", "Hija", "+56912345678", "ana@email.com", null, false);

        var entity = new HttpEntity<>(req, authHeaders);
        var response = restTemplate.postForEntity(
            "/api/v1/patients/" + patientId + "/contacts", entity, PatientContactResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().name()).isEqualTo("Ana Martínez");
        assertThat(response.getBody().category()).isEqualTo("FAMILY");
        assertThat(response.getBody().patientId()).isEqualTo(patientId);
    }

    @Test
    void listContacts_afterCreate_returnsList() {
        var req = new CreatePatientContactRequest(
            "Dr. Pablo Rojas", "DOCTOR", "Médico tratante", "+56987654321",
            "pablo.rojas@clinica.cl", null, false);
        var entity = new HttpEntity<>(req, authHeaders);
        restTemplate.postForEntity("/api/v1/patients/" + patientId + "/contacts", entity, PatientContactResponse.class);

        var listResp = restTemplate.exchange(
            "/api/v1/patients/" + patientId + "/contacts",
            HttpMethod.GET, new HttpEntity<>(authHeaders), PatientContactResponse[].class);

        assertThat(listResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResp.getBody()).hasSizeGreaterThanOrEqualTo(1);
    }

    @Test
    void updateContact_changesFields() {
        var createReq = new CreatePatientContactRequest(
            "Luis Martínez", "EMERGENCY", "Hermano", "+56955551111", null,
            "Llamar primero en caso de urgencia", true);
        var createEntity = new HttpEntity<>(createReq, authHeaders);
        var created = restTemplate.postForEntity(
            "/api/v1/patients/" + patientId + "/contacts", createEntity, PatientContactResponse.class);
        String contactId = created.getBody().id();

        var updateReq = new UpdatePatientContactRequest(
            "Luis A. Martínez", "EMERGENCY", "Hermano", "+56955551111", null,
            "Llamar primero en caso de urgencia", true);
        var updateEntity = new HttpEntity<>(updateReq, authHeaders);
        var updateResp = restTemplate.exchange(
            "/api/v1/patients/" + patientId + "/contacts/" + contactId,
            HttpMethod.PUT, updateEntity, PatientContactResponse.class);

        assertThat(updateResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updateResp.getBody().name()).isEqualTo("Luis A. Martínez");
    }
}
```

- [ ] **Step 4: Ejecutar el test (requiere Docker)**

Run: `cd backend && mvn test -Dtest=PatientContactIntegrationTest -q`
Expected: `Tests run: 3, Failures: 0, Errors: 0` (si Docker no está disponible en el entorno,
fallará con `IllegalStateException: Could not find a valid Docker environment` — problema de
entorno, no de código; correrlo donde haya Docker disponible).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/cuidalink/patient/adapter/in/rest/PatientContactController.java \
        backend/src/main/java/com/cuidalink/patient/adapter/in/rest/dto/CreatePatientContactRequest.java \
        backend/src/main/java/com/cuidalink/patient/adapter/in/rest/dto/UpdatePatientContactRequest.java \
        backend/src/main/java/com/cuidalink/patient/adapter/in/rest/dto/PatientContactResponse.java \
        backend/src/test/java/com/cuidalink/PatientContactIntegrationTest.java
git commit -m "feat(backend): add PatientContact REST endpoints with integration test"
```

---

## Mobile

### Task 6: Entidad, repositorio y DI

**Files:**
- Create: `appmovil/src/domain/entities/PatientContact.ts`
- Modify: `appmovil/src/domain/entities/index.ts`
- Create: `appmovil/src/domain/repositories/PatientContactRepository.ts`
- Create: `appmovil/src/data/repositories/ApiPatientContactRepository.ts`
- Modify: `appmovil/src/presentation/hooks/useInjection.ts`

**Interfaces:**
- Produces: `PatientContact`, `PatientContactCategory`, `CreatePatientContactData`,
  `PatientContactRepository` — usados por Task 7 (util), Task 8 (card), Task 9 (screen), Task 10
  (form).

No requiere test (tipos y wrapper HTTP simple, mismo criterio que `VitalSignDefinition`/
`ApiVitalRepository` — no hay tests de `Api*Repository` en el proyecto).

- [ ] **Step 1: Entidad**

```ts
export type PatientContactCategory = 'FAMILY' | 'DOCTOR' | 'EMERGENCY';

export interface PatientContact {
  id: string;
  patientId: string;
  name: string;
  category: PatientContactCategory;
  relationship: string;
  phone: string;
  email: string | null;
  note: string | null;
  priority: boolean;
}
```
Archivo: `appmovil/src/domain/entities/PatientContact.ts`

- [ ] **Step 2: Exportar desde el índice**

Modificar `appmovil/src/domain/entities/index.ts` agregando la línea:
```ts
export * from './PatientContact';
```
(al final del archivo, junto a las demás exportaciones).

- [ ] **Step 3: Interfaz del repositorio**

```ts
import { PatientContact, PatientContactCategory } from '@/domain/entities';

export interface CreatePatientContactData {
  name: string;
  category: PatientContactCategory;
  relationship: string;
  phone: string;
  email: string | null;
  note: string | null;
  priority: boolean;
}

export interface PatientContactRepository {
  listContacts(patientId: string): Promise<PatientContact[]>;
  createContact(patientId: string, data: CreatePatientContactData): Promise<PatientContact>;
  updateContact(patientId: string, contactId: string, data: CreatePatientContactData): Promise<PatientContact>;
}
```
Archivo: `appmovil/src/domain/repositories/PatientContactRepository.ts`

- [ ] **Step 4: Implementación HTTP**

```ts
import apiClient from '@/data/http/apiClient';
import { CreatePatientContactData, PatientContactRepository } from '@/domain/repositories/PatientContactRepository';
import { PatientContact } from '@/domain/entities';

export class ApiPatientContactRepository implements PatientContactRepository {
  async listContacts(patientId: string): Promise<PatientContact[]> {
    const res = await apiClient.get<PatientContact[]>(`/patients/${patientId}/contacts`);
    return res.data;
  }

  async createContact(patientId: string, data: CreatePatientContactData): Promise<PatientContact> {
    const res = await apiClient.post<PatientContact>(`/patients/${patientId}/contacts`, data);
    return res.data;
  }

  async updateContact(patientId: string, contactId: string, data: CreatePatientContactData): Promise<PatientContact> {
    const res = await apiClient.put<PatientContact>(`/patients/${patientId}/contacts/${contactId}`, data);
    return res.data;
  }
}
```
Archivo: `appmovil/src/data/repositories/ApiPatientContactRepository.ts`

- [ ] **Step 5: Wirear en `useInjection.ts`**

```ts
import { ApiPatientContactRepository } from '@/data/repositories/ApiPatientContactRepository';
```
(agregar el import junto a los demás `Api*Repository`)

```ts
const patientContactRepo = new ApiPatientContactRepository();
```
(agregar junto a las demás instancias, dentro del `useMemo`)

```ts
return {
  authRepo,
  patientRepo,
  medicationRepo,
  vitalRepo,
  reportRepo,
  careTaskRepo,
  patientContactRepo,
  loginUseCase: new LoginUseCaseImpl(authRepo),
  registerUseCase: new RegisterUseCaseImpl(authRepo),
  confirmMedLogUseCase: new ConfirmMedicationLogUseCaseImpl(medicationRepo),
  downloadReportUseCase: new DownloadReportUseCaseImpl(reportRepo),
};
```

- [ ] **Step 6: Verificar que compila**

Run: `cd appmovil && npx tsc --noEmit`
Expected: sin salida (código de salida 0).

- [ ] **Step 7: Commit**

```bash
git add appmovil/src/domain/entities/PatientContact.ts \
        appmovil/src/domain/entities/index.ts \
        appmovil/src/domain/repositories/PatientContactRepository.ts \
        appmovil/src/data/repositories/ApiPatientContactRepository.ts \
        appmovil/src/presentation/hooks/useInjection.ts
git commit -m "feat(appmovil): add PatientContact entity, repository and DI wiring"
```

---

### Task 7: Util `contactDisplay.ts` (TDD)

**Files:**
- Create: `appmovil/src/domain/utils/__tests__/contactDisplay.test.ts`
- Create: `appmovil/src/domain/utils/contactDisplay.ts`

**Interfaces:**
- Consumes: `PatientContactCategory` (Task 6).
- Produces: `pickContactCategoryStyle(category)` — usado por Task 8 (`PatientContactCard`) y Task 9
  (tabs de `ContactsScreen`).

- [ ] **Step 1: Escribir el test que falla**

```ts
import { pickContactCategoryStyle } from '../contactDisplay';

describe('pickContactCategoryStyle', () => {
  it('devuelve el estilo de Familia', () => {
    expect(pickContactCategoryStyle('FAMILY')).toEqual({ icon: 'people', color: '#1a9c7d', label: 'Familia' });
  });

  it('devuelve el estilo de Médico', () => {
    expect(pickContactCategoryStyle('DOCTOR')).toEqual({ icon: 'medkit', color: '#2f6fed', label: 'Médico' });
  });

  it('devuelve el estilo de Emergencia', () => {
    expect(pickContactCategoryStyle('EMERGENCY')).toEqual({ icon: 'alarm', color: '#e05555', label: 'Emergencia' });
  });
});
```
Archivo: `appmovil/src/domain/utils/__tests__/contactDisplay.test.ts`

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `cd appmovil && npx jest --testPathPatterns=contactDisplay`
Expected: FAIL — `Cannot find module '../contactDisplay'`.

- [ ] **Step 3: Implementar el util**

```ts
import type { Ionicons } from '@expo/vector-icons';
import { PatientContactCategory } from '@/domain/entities';

export function pickContactCategoryStyle(category: PatientContactCategory):
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string } {
  switch (category) {
    case 'FAMILY':
      return { icon: 'people', color: '#1a9c7d', label: 'Familia' };
    case 'DOCTOR':
      return { icon: 'medkit', color: '#2f6fed', label: 'Médico' };
    case 'EMERGENCY':
      return { icon: 'alarm', color: '#e05555', label: 'Emergencia' };
  }
}
```
Archivo: `appmovil/src/domain/utils/contactDisplay.ts`

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Run: `cd appmovil && npx jest --testPathPatterns=contactDisplay`
Expected: `Tests: 3 passed, 3 total`

- [ ] **Step 5: Commit**

```bash
git add appmovil/src/domain/utils/contactDisplay.ts \
        appmovil/src/domain/utils/__tests__/contactDisplay.test.ts
git commit -m "feat(appmovil): add pickContactCategoryStyle util with tests"
```

---

### Task 8: `PatientContactCard.tsx`

**Files:**
- Create: `appmovil/src/presentation/components/PatientContactCard.tsx`

**Interfaces:**
- Consumes: `PatientContact` (Task 6), `pickContactCategoryStyle` (Task 7).
- Produces: `<PatientContactCard contact={PatientContact} onCall={() => void} onEdit={() => void} />`
  — usado por Task 9 (`ContactsScreen`).

Componente presentacional, cubierto indirectamente por el test de `ContactsScreen` (Task 9) — mismo
criterio que `TaskCard`/`VitalCard`, que no tienen test propio.

- [ ] **Step 1: Implementar el componente**

```tsx
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PatientContact } from '@/domain/entities';
import { pickContactCategoryStyle } from '@/domain/utils/contactDisplay';

type Props = {
  contact: PatientContact;
  onEdit: () => void;
};

export default function PatientContactCard({ contact, onEdit }: Props) {
  const style = pickContactCategoryStyle(contact.category);

  function handleCall() {
    Linking.openURL(`tel:${contact.phone}`);
  }

  return (
    <View style={[styles.card, contact.priority && styles.cardPriority]}>
      {contact.priority && (
        <View style={styles.priorityBadge}>
          <Ionicons name="star" size={12} color="#fff" />
          <Text style={styles.priorityText}>Prioritario</Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <View style={[styles.avatar, { backgroundColor: style.color }]}>
          <Ionicons name={style.icon} size={26} color="#fff" />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{contact.name}</Text>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryBadge, { backgroundColor: style.color }]}>
              <Ionicons name={style.icon} size={12} color="#fff" />
              <Text style={styles.categoryText}>{style.label}</Text>
            </View>
            {!!contact.relationship && <Text style={styles.relationship}>{contact.relationship}</Text>}
          </View>
        </View>
      </View>

      <View style={styles.detailsColumn}>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={14} color="#5ee7df" />
          <Text style={styles.detailText}>{contact.phone}</Text>
        </View>
        {contact.email ? (
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={14} color="#5ee7df" />
            <Text style={styles.detailText}>{contact.email}</Text>
          </View>
        ) : contact.note ? (
          <View style={styles.detailRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color="#5ee7df" />
            <Text style={styles.detailText}>{contact.note}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
          <Ionicons name="call" size={18} color="#5ee7df" />
          <Text style={styles.actionText}>Llamar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
          <Ionicons name="create-outline" size={18} color="#5ee7df" />
          <Text style={styles.actionText}>Editar</Text>
        </TouchableOpacity>
      </View>
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
  cardPriority: { borderColor: '#e05555', borderWidth: 1.5 },
  priorityBadge: {
    position: 'absolute', top: -10, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#e05555', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  priorityText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  categoryText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  relationship: { color: '#a5d8f3', fontSize: 13 },

  detailsColumn: { gap: 6, marginBottom: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { color: '#e2e8f0', fontSize: 13 },

  actionsRow: {
    flexDirection: 'row', gap: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 12,
  },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingVertical: 10,
  },
  actionText: { color: '#5ee7df', fontWeight: '600', fontSize: 13 },
});
```
Archivo: `appmovil/src/presentation/components/PatientContactCard.tsx`

- [ ] **Step 2: Verificar que compila**

Run: `cd appmovil && npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 3: Commit**

```bash
git add appmovil/src/presentation/components/PatientContactCard.tsx
git commit -m "feat(appmovil): add PatientContactCard component"
```

---

### Task 9: `ContactsScreen.tsx` (reemplazo completo, TDD)

**Files:**
- Modify (reemplazar contenido del test): `appmovil/src/presentation/screens/patients/__tests__/ContactsScreen.test.tsx`
- Modify (reemplazar contenido de la pantalla): `appmovil/src/presentation/screens/patients/ContactsScreen.tsx`

**Interfaces:**
- Consumes: `PatientContact` (Task 6), `PatientContactCard` (Task 8), `PatientChip` (ya existente,
  `presentation/components/PatientChip.tsx`), `useInjection().patientContactRepo`/`patientRepo`.
- Produces: pantalla registrada como `Contacts` en `AppNavigator` (ya registrada, no cambia la ruta).

- [ ] **Step 1: Reemplazar completamente el test existente**

El archivo actual prueba el contenido viejo (contacto de emergencia único, botón "Editar paciente",
`CollaboratorsSection`) — se reemplaza por completo, no se agrega encima:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Linking } from 'react-native';
import ContactsScreen from '../ContactsScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { Patient, PatientContact } from '@/domain/entities';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

const ownerPatient: Patient = {
  id: 'p1',
  fullName: 'Rosa Martínez',
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

function buildContact(overrides: Partial<PatientContact> = {}): PatientContact {
  return {
    id: 'c1',
    patientId: 'p1',
    name: 'Ana Martínez',
    category: 'FAMILY',
    relationship: 'Hija',
    phone: '+56912345678',
    email: 'ana@email.com',
    note: null,
    priority: false,
    ...overrides,
  };
}

function renderScreen(contacts: PatientContact[], patient: Patient = ownerPatient, navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const listContacts = jest.fn().mockResolvedValue(contacts);
  const getPatient = jest.fn().mockResolvedValue(patient);
  mockedUseInjection.mockReturnValue({
    patientContactRepo: { listContacts },
    patientRepo: { getPatient },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const route = { params: { patientId: 'p1' } } as any;

  render(
    <QueryClientProvider client={queryClient}>
      <ContactsScreen navigation={navigation} route={route} />
    </QueryClientProvider>
  );

  return { navigation };
}

describe('ContactsScreen', () => {
  it('muestra el nombre del paciente', async () => {
    renderScreen([buildContact()]);
    expect(await screen.findByText('Paciente: Rosa Martínez')).toBeTruthy();
  });

  it('muestra los contactos con su categoría y relación', async () => {
    renderScreen([buildContact()]);
    expect(await screen.findByText('Ana Martínez')).toBeTruthy();
    expect(screen.getByText('Familia')).toBeTruthy();
    expect(screen.getByText('Hija')).toBeTruthy();
    expect(screen.getByText('ana@email.com')).toBeTruthy();
  });

  it('muestra la nota en vez del email cuando no hay email', async () => {
    renderScreen([buildContact({ email: null, note: 'Llamar primero en caso de urgencia', category: 'EMERGENCY', priority: true })]);
    expect(await screen.findByText('Llamar primero en caso de urgencia')).toBeTruthy();
    expect(screen.getByText('Prioritario')).toBeTruthy();
  });

  it('filtra por categoría al presionar una pestaña', async () => {
    renderScreen([
      buildContact({ id: 'c1', name: 'Ana Martínez', category: 'FAMILY' }),
      buildContact({ id: 'c2', name: 'Dr. Pablo Rojas', category: 'DOCTOR', email: 'pablo@clinica.cl' }),
    ]);
    await screen.findByText('Ana Martínez');
    fireEvent.press(screen.getByText('Médico'));
    expect(screen.getByText('Dr. Pablo Rojas')).toBeTruthy();
    expect(screen.queryByText('Ana Martínez')).toBeNull();
  });

  it('llama al teléfono al presionar "Llamar"', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderScreen([buildContact()]);
    await screen.findByText('Ana Martínez');
    fireEvent.press(screen.getByText('Llamar'));
    expect(openURLSpy).toHaveBeenCalledWith('tel:+56912345678');
  });

  it('navega a ContactForm con el contactId al presionar "Editar"', async () => {
    const { navigation } = renderScreen([buildContact()]);
    await screen.findByText('Ana Martínez');
    fireEvent.press(screen.getByText('Editar'));
    expect(navigation.navigate).toHaveBeenCalledWith('ContactForm', { patientId: 'p1', contactId: 'c1' });
  });

  it('muestra el botón "Agregar contacto" cuando el usuario es owner', async () => {
    renderScreen([]);
    expect(await screen.findByText('Agregar contacto')).toBeTruthy();
  });

  it('oculta el botón "Agregar contacto" cuando el usuario no es owner', async () => {
    renderScreen([], { ...ownerPatient, isOwner: false });
    await screen.findByText('Contactos vinculados al paciente');
    expect(screen.queryByText('Agregar contacto')).toBeNull();
  });

  it('navega a ContactForm sin contactId al presionar "Agregar contacto"', async () => {
    const { navigation } = renderScreen([]);
    fireEvent.press(await screen.findByText('Agregar contacto'));
    expect(navigation.navigate).toHaveBeenCalledWith('ContactForm', { patientId: 'p1', contactId: undefined });
  });

  it('muestra un estado vacío cuando no hay contactos', async () => {
    renderScreen([]);
    expect(await screen.findByText('Sin contactos para mostrar.')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `cd appmovil && npx jest --testPathPatterns=ContactsScreen`
Expected: FAIL (la pantalla actual no tiene tabs, tarjetas categorizadas, ni navega a
`ContactForm` — múltiples `findByText` no encuentran nada).

- [ ] **Step 3: Reemplazar completamente `ContactsScreen.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { PatientContact, PatientContactCategory } from '@/domain/entities';
import PatientContactCard from '@/presentation/components/PatientContactCard';
import PatientChip from '@/presentation/components/PatientChip';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'Contacts'>;
  route: RouteProp<PatientStackParams, 'Contacts'>;
};

type Tab = 'ALL' | PatientContactCategory;

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'ALL', label: 'Todos', icon: 'people-circle' },
  { key: 'FAMILY', label: 'Familia', icon: 'people' },
  { key: 'DOCTOR', label: 'Médico', icon: 'medkit' },
  { key: 'EMERGENCY', label: 'Emergencia', icon: 'alarm' },
];

export default function ContactsScreen({ navigation, route }: Props) {
  const { patientId } = route.params;
  const { patientContactRepo, patientRepo } = useInjection();
  const [tab, setTab] = useState<Tab>('ALL');

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientRepo.getPatient(patientId),
  });

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['patient-contacts', patientId],
    queryFn: () => patientContactRepo.listContacts(patientId),
  });

  const filtered = useMemo(
    () => (contacts ?? []).filter((c: PatientContact) => tab === 'ALL' || c.category === tab),
    [contacts, tab],
  );

  if (isLoading) return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#5ee7df" /></ScreenBackground>;

  return (
    <ScreenBackground>
      <FlatList
        data={filtered}
        keyExtractor={(item: PatientContact) => item.id}
        renderItem={({ item }) => (
          <PatientContactCard
            contact={item}
            onEdit={() => navigation.navigate('ContactForm', { patientId, contactId: item.id })}
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

            <Text style={styles.title}>Contactos</Text>
            <Text style={styles.subtitle}>Contactos vinculados al paciente</Text>

            {patient && <PatientChip name={patient.fullName} />}

            <View style={styles.tabsRow}>
              {TABS.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tab, tab === t.key && styles.tabActive]}
                  onPress={() => setTab(t.key)}
                >
                  <Ionicons name={t.icon} size={14} color={tab === t.key ? '#5ee7df' : '#a5d8f3'} />
                  <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={<Text style={styles.empty}>Sin contactos para mostrar.</Text>}
        ListFooterComponent={
          patient?.isOwner ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('ContactForm', { patientId, contactId: undefined })}
            >
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Agregar contacto</Text>
            </TouchableOpacity>
          ) : null
        }
        contentContainerStyle={{ padding: 20, paddingTop: 24 }}
      />
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

  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12,
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

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Run: `cd appmovil && npx jest --testPathPatterns=ContactsScreen`
Expected: `Tests: 10 passed, 10 total`

- [ ] **Step 5: Commit**

```bash
git add appmovil/src/presentation/screens/patients/ContactsScreen.tsx \
        appmovil/src/presentation/screens/patients/__tests__/ContactsScreen.test.tsx
git commit -m "feat(appmovil): replace ContactsScreen with categorized contacts list"
```

---

### Task 10: `ContactFormScreen.tsx` (crear y editar, TDD)

**Files:**
- Create: `appmovil/src/presentation/screens/patients/__tests__/ContactFormScreen.test.tsx`
- Create: `appmovil/src/presentation/screens/patients/ContactFormScreen.tsx`

**Interfaces:**
- Consumes: `PatientContact`, `CreatePatientContactData` (Task 6), `pickContactCategoryStyle`
  (Task 7), `isValidChileSubscriberNumber`/`toChilePhone`/`stripChilePrefix`
  (`domain/utils/chilePhone.ts`, ya existente).
- Produces: pantalla `ContactForm` — registrada en `AppNavigator` en Task 11.

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import ContactFormScreen from '../ContactFormScreen';
import { useInjection } from '@/presentation/hooks/useInjection';
import { PatientContact } from '@/domain/entities';

jest.mock('@/presentation/hooks/useInjection');

const mockedUseInjection = useInjection as jest.Mock;

const existingContact: PatientContact = {
  id: 'c1',
  patientId: 'p1',
  name: 'Ana Martínez',
  category: 'FAMILY',
  relationship: 'Hija',
  phone: '+56912345678',
  email: 'ana@email.com',
  note: null,
  priority: false,
};

function renderScreen(contactId: string | undefined, navigation: any = { navigate: jest.fn(), goBack: jest.fn() }) {
  const listContacts = jest.fn().mockResolvedValue([existingContact]);
  const createContact = jest.fn().mockResolvedValue(existingContact);
  const updateContact = jest.fn().mockResolvedValue(existingContact);
  mockedUseInjection.mockReturnValue({
    patientContactRepo: { listContacts, createContact, updateContact },
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const route = { params: { patientId: 'p1', contactId } } as any;

  render(
    <QueryClientProvider client={queryClient}>
      <ContactFormScreen navigation={navigation} route={route} />
    </QueryClientProvider>
  );

  return { navigation, createContact, updateContact };
}

describe('ContactFormScreen', () => {
  it('en modo creación, el nombre está vacío', async () => {
    renderScreen(undefined);
    expect(await screen.findByText('Nuevo contacto')).toBeTruthy();
    expect(screen.getByTestId('contact-name-input').props.value).toBe('');
  });

  it('en modo edición, precarga los datos del contacto', async () => {
    renderScreen('c1');
    expect(await screen.findByText('Editar contacto')).toBeTruthy();
    expect(screen.getByTestId('contact-name-input').props.value).toBe('Ana Martínez');
    expect(screen.getByTestId('contact-phone-input').props.value).toBe('912345678');
  });

  it('valida que el nombre y el teléfono sean requeridos', async () => {
    renderScreen(undefined);
    await screen.findByText('Nuevo contacto');
    fireEvent.press(screen.getByText('Guardar'));
    expect(await screen.findByText('Nombre requerido')).toBeTruthy();
    expect(screen.getByText('Ingresa los 9 dígitos del celular, sin el +56')).toBeTruthy();
  });

  it('crea un contacto nuevo y vuelve atrás', async () => {
    const { navigation, createContact } = renderScreen(undefined);
    await screen.findByText('Nuevo contacto');
    fireEvent.changeText(screen.getByTestId('contact-name-input'), 'Luis Martínez');
    fireEvent.press(screen.getByText('Emergencia'));
    fireEvent.changeText(screen.getByTestId('contact-relationship-input'), 'Hermano');
    fireEvent.changeText(screen.getByTestId('contact-phone-input'), '955551111');
    fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(createContact).toHaveBeenCalledWith('p1', {
      name: 'Luis Martínez',
      category: 'EMERGENCY',
      relationship: 'Hermano',
      phone: '+56955551111',
      email: null,
      note: null,
      priority: false,
    }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('actualiza un contacto existente', async () => {
    const { navigation, updateContact } = renderScreen('c1');
    await screen.findByText('Editar contacto');
    fireEvent.changeText(screen.getByTestId('contact-name-input'), 'Ana M. Martínez');
    fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(updateContact).toHaveBeenCalledWith('p1', 'c1', {
      name: 'Ana M. Martínez',
      category: 'FAMILY',
      relationship: 'Hija',
      phone: '+56912345678',
      email: 'ana@email.com',
      note: null,
      priority: false,
    }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('muestra una alerta si falla el guardado', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const listContacts = jest.fn().mockResolvedValue([]);
    const createContact = jest.fn().mockRejectedValue(new Error('fail'));
    mockedUseInjection.mockReturnValue({
      patientContactRepo: { listContacts, createContact, updateContact: jest.fn() },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    const route = { params: { patientId: 'p1', contactId: undefined } } as any;
    render(
      <QueryClientProvider client={queryClient}>
        <ContactFormScreen navigation={navigation as any} route={route} />
      </QueryClientProvider>
    );
    await screen.findByText('Nuevo contacto');
    fireEvent.changeText(screen.getByTestId('contact-name-input'), 'Luis Martínez');
    fireEvent.changeText(screen.getByTestId('contact-phone-input'), '955551111');
    fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo guardar el contacto.'));
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});
```
Archivo: `appmovil/src/presentation/screens/patients/__tests__/ContactFormScreen.test.tsx`

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `cd appmovil && npx jest --testPathPatterns=ContactFormScreen`
Expected: FAIL — `Cannot find module '../ContactFormScreen'`.

- [ ] **Step 3: Implementar `ContactFormScreen.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Switch, Image } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { pickContactCategoryStyle } from '@/domain/utils/contactDisplay';
import { isValidChileSubscriberNumber, stripChilePrefix, toChilePhone } from '@/domain/utils/chilePhone';
import { PatientContactCategory } from '@/domain/entities';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'ContactForm'>;
  route: RouteProp<PatientStackParams, 'ContactForm'>;
};

const CATEGORY_OPTIONS: PatientContactCategory[] = ['FAMILY', 'DOCTOR', 'EMERGENCY'];

const schema = z.object({
  name: z.string({ error: 'Nombre requerido' }).min(1, 'Nombre requerido'),
  category: z.enum(['FAMILY', 'DOCTOR', 'EMERGENCY'], { error: 'Selecciona una categoría' }),
  relationship: z.string(),
  phone: z.string({ error: 'Teléfono requerido' }).refine(isValidChileSubscriberNumber, 'Ingresa los 9 dígitos del celular, sin el +56'),
  email: z.string().refine((v) => v === '' || z.string().email().safeParse(v).success, 'Email inválido'),
  note: z.string(),
  priority: z.boolean(),
});
type FormData = z.infer<typeof schema>;

export default function ContactFormScreen({ navigation, route }: Props) {
  const { patientId, contactId } = route.params;
  const isEditing = !!contactId;
  const [loading, setLoading] = useState(false);
  const { patientContactRepo } = useInjection();
  const queryClient = useQueryClient();

  const { data: contacts } = useQuery({
    queryKey: ['patient-contacts', patientId],
    queryFn: () => patientContactRepo.listContacts(patientId),
    enabled: isEditing,
  });
  const existing = contacts?.find((c) => c.id === contactId);

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    values: isEditing && existing ? {
      name: existing.name,
      category: existing.category,
      relationship: existing.relationship,
      phone: stripChilePrefix(existing.phone),
      email: existing.email ?? '',
      note: existing.note ?? '',
      priority: existing.priority,
    } : {
      name: '', category: 'FAMILY', relationship: '', phone: '', email: '', note: '', priority: false,
    },
  });

  const category = watch('category');
  const priority = watch('priority');

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        name: data.name,
        category: data.category,
        relationship: data.relationship,
        phone: toChilePhone(data.phone),
        email: data.email || null,
        note: data.note || null,
        priority: data.priority,
      };
      if (isEditing) {
        await patientContactRepo.updateContact(patientId, contactId!, payload);
      } else {
        await patientContactRepo.createContact(patientId, payload);
      }
      await queryClient.invalidateQueries({ queryKey: ['patient-contacts', patientId] });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo guardar el contacto.');
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

        <Text style={styles.title}>{isEditing ? 'Editar contacto' : 'Nuevo contacto'}</Text>
        <Text style={styles.subtitle}>Datos del contacto vinculado al paciente</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Nombre</Text>
          <Controller control={control} name="name" render={({ field: { onChange, value } }) => (
            <TextInput testID="contact-name-input" style={styles.input} placeholder="Ej: Ana Martínez"
              placeholderTextColor="#7c93ab" value={value} onChangeText={onChange} />
          )} />
          {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

          <Text style={styles.label}>Categoría</Text>
          <View style={styles.categoryRow}>
            {CATEGORY_OPTIONS.map((opt) => {
              const style = pickContactCategoryStyle(opt);
              const selected = category === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.categoryButton, selected && { backgroundColor: style.color, borderColor: style.color }]}
                  onPress={() => setValue('category', opt, { shouldValidate: true })}
                >
                  <Ionicons name={style.icon} size={14} color={selected ? '#fff' : style.color} />
                  <Text style={[styles.categoryButtonText, selected && styles.categoryButtonTextActive]}>{style.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Relación</Text>
          <Controller control={control} name="relationship" render={({ field: { onChange, value } }) => (
            <TextInput testID="contact-relationship-input" style={styles.input} placeholder="Ej: Hija, Médico tratante, Hermano"
              placeholderTextColor="#7c93ab" value={value} onChangeText={onChange} />
          )} />

          <Text style={styles.label}>Teléfono</Text>
          <View style={[styles.input, styles.phoneRow]}>
            <Text style={styles.phonePrefix}>🇨🇱 +56</Text>
            <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
              <TextInput testID="contact-phone-input" style={styles.phoneInput} placeholder="912345678"
                keyboardType="number-pad" maxLength={9} placeholderTextColor="#7c93ab"
                value={value} onChangeText={(text) => onChange(text.replace(/\D/g, ''))} />
            )} />
          </View>
          {errors.phone && <Text style={styles.error}>{errors.phone.message}</Text>}

          <Text style={styles.label}>Email</Text>
          <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
            <TextInput testID="contact-email-input" style={styles.input} placeholder="Ej: ana@email.com"
              keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#7c93ab"
              value={value} onChangeText={onChange} />
          )} />
          {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

          <Text style={styles.label}>Nota</Text>
          <Controller control={control} name="note" render={({ field: { onChange, value } }) => (
            <TextInput testID="contact-note-input" style={[styles.input, styles.textarea]}
              placeholder="Ej: Llamar primero en caso de urgencia" placeholderTextColor="#7c93ab"
              value={value} onChangeText={onChange} multiline numberOfLines={3} />
          )} />

          <View style={styles.priorityRow}>
            <Ionicons name="star-outline" size={16} color="#5ee7df" />
            <Text style={styles.priorityLabel}>Marcar como prioritario</Text>
            <Switch
              testID="contact-priority-switch"
              value={priority}
              onValueChange={(value) => setValue('priority', value, { shouldValidate: true })}
              trackColor={{ false: 'rgba(255,255,255,0.18)', true: '#e05555' }}
              thumbColor="#fff"
            />
          </View>
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
  label: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    minHeight: 48, color: '#fff', fontSize: 15,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  error: { color: '#ff8a8a', fontSize: 12, marginTop: 4 },

  phoneRow: { flexDirection: 'row', alignItems: 'center' },
  phonePrefix: { color: '#fff', fontSize: 15, marginRight: 8 },
  phoneInput: { flex: 1, color: '#fff', fontSize: 15 },

  categoryRow: { flexDirection: 'row', gap: 8 },
  categoryButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingVertical: 12,
  },
  categoryButtonText: { color: '#a5d8f3', fontWeight: '600', fontSize: 12 },
  categoryButtonTextActive: { color: '#fff' },

  priorityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, marginTop: 16,
  },
  priorityLabel: { color: '#fff', fontSize: 13, flex: 1 },

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
Archivo: `appmovil/src/presentation/screens/patients/ContactFormScreen.tsx`

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Run: `cd appmovil && npx jest --testPathPatterns=ContactFormScreen`
Expected: `Tests: 6 passed, 6 total`

- [ ] **Step 5: Commit**

```bash
git add appmovil/src/presentation/screens/patients/ContactFormScreen.tsx \
        appmovil/src/presentation/screens/patients/__tests__/ContactFormScreen.test.tsx
git commit -m "feat(appmovil): add ContactFormScreen for creating and editing contacts"
```

---

### Task 11: Registrar la ruta `ContactForm`

**Files:**
- Modify: `appmovil/src/presentation/navigation/AppNavigator.tsx`

**Interfaces:**
- Consumes: `ContactFormScreen` (Task 10).
- Produces: ruta `ContactForm` navegable desde `ContactsScreen` (Task 9).

- [ ] **Step 1: Agregar el import**

```ts
import ContactFormScreen from '@/presentation/screens/patients/ContactFormScreen';
```
(junto a los demás imports de pantallas de `patients`)

- [ ] **Step 2: Agregar el tipo de parámetros**

En `PatientStackParams`, agregar:
```ts
ContactForm: { patientId: string; contactId?: string };
```

- [ ] **Step 3: Registrar la pantalla**

```tsx
<Stack.Screen name="ContactForm" component={ContactFormScreen} options={{ headerShown: false }} />
```
(junto a los demás `<Stack.Screen>`, por ejemplo después de `Contacts`)

- [ ] **Step 4: Verificar que compila**

Run: `cd appmovil && npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 5: Commit**

```bash
git add appmovil/src/presentation/navigation/AppNavigator.tsx
git commit -m "feat(appmovil): register ContactForm route"
```

---

### Task 12: Ícono de editar paciente en `PatientDetailScreen`

**Files:**
- Modify: `appmovil/src/presentation/screens/patients/PatientDetailScreen.tsx`
- Modify: `appmovil/src/presentation/screens/patients/__tests__/PatientDetailScreen.test.tsx`

**Interfaces:**
- Consumes: ruta `EditPatient` (ya registrada en `AppNavigator`).
- Produces: ninguno nuevo (solo agrega un botón visible condicionalmente).

- [ ] **Step 1: Agregar los tests que fallan**

Agregar al final del `describe('PatientDetailScreen', ...)` en
`appmovil/src/presentation/screens/patients/__tests__/PatientDetailScreen.test.tsx`:

```tsx
  it('navega a EditPatient al presionar el ícono de editar cuando es owner', async () => {
    const { navigation } = renderScreen();
    fireEvent.press(await screen.findByTestId('edit-patient-button'));
    expect(navigation.navigate).toHaveBeenCalledWith('EditPatient', { patientId: 'p1' });
  });

  it('oculta el ícono de editar cuando no es owner', async () => {
    renderScreen({ patient: { ...basePatient, isOwner: false } });
    await screen.findByText('Medicamentos');
    expect(screen.queryByTestId('edit-patient-button')).toBeNull();
  });
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `cd appmovil && npx jest --testPathPatterns=PatientDetailScreen`
Expected: los dos tests nuevos FAIL (`edit-patient-button` no existe todavía); los demás siguen en
verde.

- [ ] **Step 3: Reemplazar el `backButtonSpacer` por el botón condicional**

En `PatientDetailScreen.tsx`, reemplazar:
```tsx
          <View style={styles.backButtonSpacer} />
```
por:
```tsx
          {patient.isOwner ? (
            <TouchableOpacity
              testID="edit-patient-button"
              style={styles.backButton}
              onPress={() => navigation.navigate('EditPatient', { patientId })}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButtonSpacer} />
          )}
```
(este bloque va después del `if (!patient) return null;`, así que `patient` ya está garantizado no
nulo en este punto — no requiere `patient?.`)

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `cd appmovil && npx jest --testPathPatterns=PatientDetailScreen`
Expected: `Tests: 13 passed, 13 total` (11 existentes + 2 nuevos)

- [ ] **Step 5: Commit**

```bash
git add appmovil/src/presentation/screens/patients/PatientDetailScreen.tsx \
        appmovil/src/presentation/screens/patients/__tests__/PatientDetailScreen.test.tsx
git commit -m "feat(appmovil): add edit-patient shortcut icon to PatientDetailScreen header"
```

---

### Task 13: Mover `CollaboratorsSection` a `EditPatientScreen`

**Files:**
- Modify: `appmovil/src/presentation/screens/patients/EditPatientScreen.tsx`
- Create: `appmovil/src/presentation/screens/patients/__tests__/EditPatientScreen.test.tsx`

**Interfaces:**
- Consumes: `CollaboratorsSection` (ya existente, `presentation/components/CollaboratorsSection.tsx`,
  props `{ patientId: string; isOwner: boolean }`).
- Produces: ninguno nuevo.

No existe hoy un archivo de test para `EditPatientScreen` — se crea uno mínimo enfocado solo en
verificar que `CollaboratorsSection` se renderiza (el resto del formulario, ya existente y sin
cambios de comportamiento, no se re-testea aquí — sería duplicar cobertura sin valor).

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditPatientScreen from '../EditPatientScreen';
import { useInjection } from '@/presentation/hooks/useInjection';

jest.mock('@/presentation/hooks/useInjection');
jest.mock('@/presentation/components/CollaboratorsSection', () => {
  const { Text } = require('react-native');
  return function MockCollaboratorsSection() {
    return <Text>collaborators-section</Text>;
  };
});

const mockedUseInjection = useInjection as jest.Mock;

const basePatient = {
  id: 'p1',
  fullName: 'Rosa Martínez',
  identificationNumber: '11.111.111-1',
  birthDate: '1948-01-15',
  gender: 'FEMALE',
  address: 'Calle Falsa 123',
  emergencyContact: { name: 'Juan Martínez', phone: '+56911112222' },
  healthInsurance: 'Fonasa',
  bloodType: 'O+',
  isOwner: true,
};

describe('EditPatientScreen', () => {
  it('renderiza CollaboratorsSection', async () => {
    const getPatient = jest.fn().mockResolvedValue(basePatient);
    mockedUseInjection.mockReturnValue({ patientRepo: { getPatient, updatePatient: jest.fn() } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const route = { params: { patientId: 'p1' } } as any;
    const navigation = { navigate: jest.fn(), goBack: jest.fn() } as any;

    render(
      <QueryClientProvider client={queryClient}>
        <EditPatientScreen navigation={navigation} route={route} />
      </QueryClientProvider>
    );

    expect(await screen.findByText('collaborators-section')).toBeTruthy();
  });
});
```
Archivo: `appmovil/src/presentation/screens/patients/__tests__/EditPatientScreen.test.tsx`

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `cd appmovil && npx jest --testPathPatterns=EditPatientScreen`
Expected: FAIL — no encuentra el texto `collaborators-section` (el componente no está montado
todavía en la pantalla).

- [ ] **Step 3: Agregar `CollaboratorsSection` a `EditPatientScreen.tsx`**

Agregar el import junto a los demás:
```ts
import CollaboratorsSection from '@/presentation/components/CollaboratorsSection';
```

Agregar el componente después del botón "Guardar Cambios" y antes del cierre de `</View>` del
`sheet` (o inmediatamente después, dentro del `ScrollView`, fuera del `sheet` — cualquiera de las
dos ubicaciones es válida; se elige después del `sheet` para no forzarlo dentro de la tarjeta
clara existente):

```tsx
      </View>

      <CollaboratorsSection patientId={patientId} isOwner={patient.isOwner} />

      <Modal visible={showBloodModal} transparent animationType="slide">
```
(reemplaza el `</View>` que cierra `sheet` seguido directamente del `<Modal ...>` — se inserta
`CollaboratorsSection` entre ambos).

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Run: `cd appmovil && npx jest --testPathPatterns=EditPatientScreen`
Expected: `Tests: 1 passed, 1 total`

- [ ] **Step 5: Commit**

```bash
git add appmovil/src/presentation/screens/patients/EditPatientScreen.tsx \
        appmovil/src/presentation/screens/patients/__tests__/EditPatientScreen.test.tsx
git commit -m "feat(appmovil): move CollaboratorsSection into EditPatientScreen"
```

---

### Task 14: Suite completa y typecheck

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Correr todo el suite de frontend**

Run: `cd appmovil && npx jest`
Expected: todos los tests en verde (incluye los de este plan + los ya existentes).

- [ ] **Step 2: Typecheck de frontend**

Run: `cd appmovil && npx tsc --noEmit`
Expected: código de salida 0.

- [ ] **Step 3: Correr los tests unitarios de backend (no requieren Docker)**

Run: `cd backend && mvn test -Dtest='!*IntegrationTest' -q`
Expected: sin fallos (excluye los `*IntegrationTest` que requieren Testcontainers/Docker).

- [ ] **Step 4: Si hay Docker disponible, correr también el test de integración nuevo**

Run: `cd backend && mvn test -Dtest=PatientContactIntegrationTest -q`
Expected: `Tests run: 3, Failures: 0, Errors: 0` (omitir este paso si no hay Docker en el entorno).

---

## Datos de prueba en BD local

### Task 15: Sembrar los 3 contactos de María González López

**Files:** ninguno (solo llamadas HTTP contra el backend local ya corriendo).

Reutiliza el flujo ya usado para sembrar signos vitales: login contra `/api/v1/auth/login` con las
credenciales del cuidador, y `POST /api/v1/patients/{patientId}/contacts` por cada contacto contra
el paciente `María González López` (id `27915e09-9045-44e0-99d4-70789ab78e6d` en la BD local ya
usada en este proyecto — confirmar que sigue siendo el id vigente con
`GET /api/v1/patients` antes de sembrar, por si cambió).

- [ ] **Step 1: Confirmar el id del paciente y obtener un token**

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<email del cuidador>","password":"<password>"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -s "http://localhost:8080/api/v1/patients" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; [print(p['id'], p['fullName']) for p in json.load(sys.stdin)]"
```
Expected: aparece una línea con `27915e09-9045-44e0-99d4-70789ab78e6d María González López` (o el
id actualizado, si cambió).

- [ ] **Step 2: Crear los 3 contactos del mockup**

```bash
PID="27915e09-9045-44e0-99d4-70789ab78e6d"

curl -s -X POST "http://localhost:8080/api/v1/patients/$PID/contacts" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Ana Martínez","category":"FAMILY","relationship":"Hija","phone":"+56912345678","email":"ana@email.com","note":null,"priority":false}'

curl -s -X POST "http://localhost:8080/api/v1/patients/$PID/contacts" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Dr. Pablo Rojas","category":"DOCTOR","relationship":"Médico tratante","phone":"+56987654321","email":"pablo.rojas@clinica.cl","note":null,"priority":false}'

curl -s -X POST "http://localhost:8080/api/v1/patients/$PID/contacts" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Luis Martínez","category":"EMERGENCY","relationship":"Hermano","phone":"+56955551111","email":null,"note":"Llamar primero en caso de urgencia","priority":true}'
```
Expected: cada `curl` devuelve `201` con el contacto creado (verificar con `-w "\n%{http_code}\n"`
si se quiere confirmar explícitamente).

- [ ] **Step 3: Verificar el listado completo**

```bash
curl -s "http://localhost:8080/api/v1/patients/$PID/contacts" -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```
Expected: los 3 contactos, con los campos exactos del mockup.

---

## Self-Review

**Cobertura del spec:** cada sección de
`docs/superpowers/specs/2026-07-08-patient-contacts-design.md` tiene tarea: dominio (Task 1),
puertos/servicio (Task 2-3), persistencia (Task 4), REST (Task 5), entidad/repo/DI móvil (Task 6),
util de íconos (Task 7), card (Task 8), `ContactsScreen` (Task 9), `ContactFormScreen` (Task 10),
navegación (Task 11), ícono editar paciente (Task 12), reubicación de colaboradores (Task 13), datos
de prueba (Task 15). "No incluye" del spec (ver detalle, eliminar contacto, tocar
`emergencyContact`) — ninguna tarea los implementa, correcto.

**Placeholders:** ninguno — cada paso tiene código completo y comandos exactos.

**Consistencia de tipos:** `PatientContactCategory` = `'FAMILY' | 'DOCTOR' | 'EMERGENCY'` usado
igual en Task 6 (entidad), Task 7 (util), Task 9 (tabs), Task 10 (formulario) y en el backend
(Task 1, 2, 3, 5) como `FAMILY, DOCTOR, EMERGENCY`. `CreatePatientContactData` (Task 6) tiene los
mismos 7 campos que `CreatePatientContactRequest`/`UpdatePatientContactRequest` (Task 5) y que el
payload armado en `ContactFormScreen.onSubmit` (Task 10). El nombre del método
`patientContactRepo.listContacts/createContact/updateContact` es consistente entre Task 6, 9 y 10.
