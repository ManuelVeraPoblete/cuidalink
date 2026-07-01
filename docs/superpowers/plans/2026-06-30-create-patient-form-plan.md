# Formulario Nuevo Paciente (Extendido) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extender el formulario de creación de pacientes para capturar todos los campos clínicos y de contacto requeridos, tanto en backend como en la app móvil.

**Architecture:** El backend extiende el modelo de dominio `Patient` con tres campos nuevos (`address`, `healthInsurance`, `bloodType`), los propaga por todas las capas hexagonales, y Hibernate agrega las columnas automáticamente vía `ddl-auto=update`. El mobile reemplaza la pantalla `CreatePatientScreen` con un formulario completo usando date picker nativo y selectores modales.

**Tech Stack:** Java 17 + Spring Boot 3.2, React Native + Expo SDK 56, React Hook Form + Zod, `@react-native-community/datetimepicker`

## Global Constraints

- Arquitectura hexagonal estricta: domain/model nunca importa JPA ni Spring Data
- Todos los campos del formulario son obligatorios
- `healthCondition` y `allergies` nunca aparecen en logs ni mensajes de error
- API prefix: `/api/v1`
- Backend se reconstruye desde IntelliJ con **Build → Rebuild Project**
- Mobile usa `npx expo start --clear` para limpiar caché tras cambios

---

### Task 1: Backend — Extender modelo de dominio Patient

**Files:**
- Modify: `backend/src/main/java/com/cuidalink/patient/domain/model/Patient.java`
- Modify: `backend/src/main/java/com/cuidalink/patient/domain/port/in/CreatePatientUseCase.java`
- Modify: `backend/src/main/java/com/cuidalink/patient/domain/port/in/UpdatePatientUseCase.java`

**Interfaces:**
- Produces: `Patient` con campos `address`, `healthInsurance`, `bloodType`; `CreatePatientCommand` y `UpdatePatientCommand` con los tres campos nuevos

- [ ] **Step 1: Agregar campos a `Patient.java`**

Reemplazar la clase completa:

```java
package com.cuidalink.patient.domain.model;

import com.cuidalink.auth.domain.model.UserId;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class Patient {
    private final PatientId id;
    private String fullName;
    private LocalDate birthDate;
    private Gender gender;
    private String identificationNumber;
    private String address;
    private String healthInsurance;
    private String bloodType;
    private String healthCondition;
    private String allergies;
    private EmergencyContact emergencyContact;
    private final UserId primaryCaregiver;
    private final List<Collaborator> collaborators = new ArrayList<>();
    private final List<InvitationCode> invitationCodes = new ArrayList<>();
    private boolean active = true;

    public Patient(PatientId id, String fullName, LocalDate birthDate, Gender gender,
                   String identificationNumber, String address, String healthInsurance,
                   String bloodType, String healthCondition, String allergies,
                   EmergencyContact emergencyContact, UserId primaryCaregiver) {
        this.id = id;
        this.fullName = fullName;
        this.birthDate = birthDate;
        this.gender = gender;
        this.identificationNumber = identificationNumber;
        this.address = address;
        this.healthInsurance = healthInsurance;
        this.bloodType = bloodType;
        this.healthCondition = healthCondition;
        this.allergies = allergies;
        this.emergencyContact = emergencyContact;
        this.primaryCaregiver = primaryCaregiver;
    }

    /** Reconstruction constructor — for use by persistence adapters only. */
    public Patient(PatientId id, String fullName, LocalDate birthDate, Gender gender,
                   String identificationNumber, String address, String healthInsurance,
                   String bloodType, String healthCondition, String allergies,
                   EmergencyContact emergencyContact, UserId primaryCaregiver,
                   List<Collaborator> existingCollaborators,
                   List<InvitationCode> existingInvitationCodes,
                   boolean active) {
        this(id, fullName, birthDate, gender, identificationNumber, address, healthInsurance,
             bloodType, healthCondition, allergies, emergencyContact, primaryCaregiver);
        this.collaborators.addAll(existingCollaborators);
        this.invitationCodes.addAll(existingInvitationCodes);
        this.active = active;
    }

    public boolean isOwner(UserId userId) { return primaryCaregiver.equals(userId); }
    public boolean isCollaborator(UserId userId) {
        return collaborators.stream().anyMatch(c -> c.userId().equals(userId));
    }
    public boolean hasAccess(UserId userId) { return isOwner(userId) || isCollaborator(userId); }

    public InvitationCode generateInvitationCode() {
        var code = InvitationCode.generate();
        invitationCodes.add(code);
        return code;
    }

    public void addCollaborator(UserId userId) {
        if (isOwner(userId)) throw new IllegalArgumentException("El owner no puede ser colaborador");
        if (isCollaborator(userId)) throw new IllegalStateException("Ya es colaborador");
        collaborators.add(new Collaborator(userId, LocalDateTime.now()));
    }

    public void removeCollaborator(UserId userId) {
        collaborators.removeIf(c -> c.userId().equals(userId));
    }

    public void markCodeUsed(String code) {
        invitationCodes.stream()
            .filter(c -> c.code().equals(code))
            .findFirst()
            .ifPresent(c -> {
                invitationCodes.remove(c);
                invitationCodes.add(new InvitationCode(c.code(), c.expiresAt(), true));
            });
    }

    public void archive() { this.active = false; }

    public PatientId getId() { return id; }
    public String getFullName() { return fullName; }
    public LocalDate getBirthDate() { return birthDate; }
    public Gender getGender() { return gender; }
    public String getIdentificationNumber() { return identificationNumber; }
    public String getAddress() { return address; }
    public String getHealthInsurance() { return healthInsurance; }
    public String getBloodType() { return bloodType; }
    public String getHealthCondition() { return healthCondition; }
    public String getAllergies() { return allergies; }
    public EmergencyContact getEmergencyContact() { return emergencyContact; }
    public UserId getPrimaryCaregiver() { return primaryCaregiver; }
    public List<Collaborator> getCollaborators() { return List.copyOf(collaborators); }
    public List<InvitationCode> getInvitationCodes() { return List.copyOf(invitationCodes); }
    public boolean isActive() { return active; }

    public void setFullName(String fullName) { this.fullName = fullName; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }
    public void setGender(Gender gender) { this.gender = gender; }
    public void setIdentificationNumber(String v) { this.identificationNumber = v; }
    public void setAddress(String address) { this.address = address; }
    public void setHealthInsurance(String healthInsurance) { this.healthInsurance = healthInsurance; }
    public void setBloodType(String bloodType) { this.bloodType = bloodType; }
    public void setHealthCondition(String healthCondition) { this.healthCondition = healthCondition; }
    public void setAllergies(String allergies) { this.allergies = allergies; }
    public void setEmergencyContact(EmergencyContact emergencyContact) { this.emergencyContact = emergencyContact; }
}
```

- [ ] **Step 2: Actualizar `CreatePatientUseCase.java`**

```java
package com.cuidalink.patient.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.EmergencyContact;
import com.cuidalink.patient.domain.model.Gender;
import com.cuidalink.patient.domain.model.Patient;
import java.time.LocalDate;

public interface CreatePatientUseCase {
    record CreatePatientCommand(
        String fullName,
        LocalDate birthDate,
        Gender gender,
        String identificationNumber,
        String address,
        String healthInsurance,
        String bloodType,
        String healthCondition,
        String allergies,
        EmergencyContact emergencyContact,
        UserId primaryCaregiver
    ) {}

    Patient execute(CreatePatientCommand command);
}
```

- [ ] **Step 3: Actualizar `UpdatePatientUseCase.java`**

```java
package com.cuidalink.patient.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.EmergencyContact;
import com.cuidalink.patient.domain.model.Gender;
import com.cuidalink.patient.domain.model.Patient;
import com.cuidalink.patient.domain.model.PatientId;
import java.time.LocalDate;

public interface UpdatePatientUseCase {
    record UpdatePatientCommand(
        PatientId patientId,
        String fullName,
        LocalDate birthDate,
        Gender gender,
        String identificationNumber,
        String address,
        String healthInsurance,
        String bloodType,
        String healthCondition,
        String allergies,
        EmergencyContact emergencyContact,
        UserId requesterId
    ) {}

    Patient updatePatient(UpdatePatientCommand command);
}
```

- [ ] **Step 4: Compilar para verificar que no hay errores**

En IntelliJ: **Build → Build Project**. Esperado: errores de compilación en `PatientService`, `PatientJpaEntity`, `PatientController` y DTOs (se corrigen en tareas siguientes).

---

### Task 2: Backend — Extender persistencia

**Files:**
- Modify: `backend/src/main/java/com/cuidalink/patient/adapter/out/persistence/PatientJpaEntity.java`
- Modify: `backend/src/main/java/com/cuidalink/patient/adapter/out/persistence/JpaPatientRepositoryAdapter.java`

**Interfaces:**
- Consumes: `Patient` con `getAddress()`, `getHealthInsurance()`, `getBloodType()` (Task 1)
- Produces: columnas `address`, `health_insurance`, `blood_type` en tabla `patients`

- [ ] **Step 1: Agregar campos a `PatientJpaEntity.java`**

Agregar después del campo `allergies` (línea 22 actual):

```java
    private String address;
    private String healthInsurance;
    private String bloodType;
```

Y sus getters/setters al final de la clase, antes del último `}`:

```java
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getHealthInsurance() { return healthInsurance; }
    public void setHealthInsurance(String healthInsurance) { this.healthInsurance = healthInsurance; }
    public String getBloodType() { return bloodType; }
    public void setBloodType(String bloodType) { this.bloodType = bloodType; }
```

- [ ] **Step 2: Actualizar `toJpa()` en `JpaPatientRepositoryAdapter.java`**

Agregar las tres líneas nuevas después de `e.setAllergies(...)`:

```java
        e.setAddress(p.getAddress());
        e.setHealthInsurance(p.getHealthInsurance());
        e.setBloodType(p.getBloodType());
```

- [ ] **Step 3: Actualizar `toDomain()` en `JpaPatientRepositoryAdapter.java`**

Reemplazar el `return new Patient(...)` con el constructor extendido:

```java
        return new Patient(
            new PatientId(UUID.fromString(e.getId())),
            e.getFullName(),
            e.getBirthDate(),
            Gender.valueOf(e.getGender()),
            e.getIdentificationNumber(),
            e.getAddress(),
            e.getHealthInsurance(),
            e.getBloodType(),
            e.getHealthCondition(),
            e.getAllergies(),
            new EmergencyContact(e.getEmergencyContactName(), e.getEmergencyContactPhone()),
            new UserId(UUID.fromString(e.getPrimaryCaregiverId())),
            collaborators,
            invitationCodes,
            e.isActive()
        );
```

- [ ] **Step 4: Agregar columnas a la BD**

Ejecutar en DBeaver (PostgreSQL):

```sql
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS health_insurance VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_type VARCHAR(10);
```

> Nota: `ddl-auto=update` también agregaría las columnas al reiniciar, pero este SQL es explícito y permite verificar.

- [ ] **Step 5: Compilar**

En IntelliJ: **Build → Build Project**. Errores restantes serán en `PatientService`, DTOs y controller (Task 3).

---

### Task 3: Backend — Extender DTOs, servicio y controller

**Files:**
- Modify: `backend/src/main/java/com/cuidalink/patient/adapter/in/rest/dto/CreatePatientRequest.java`
- Modify: `backend/src/main/java/com/cuidalink/patient/adapter/in/rest/dto/UpdatePatientRequest.java`
- Modify: `backend/src/main/java/com/cuidalink/patient/adapter/in/rest/dto/PatientResponse.java`
- Modify: `backend/src/main/java/com/cuidalink/patient/domain/service/PatientService.java`
- Modify: `backend/src/main/java/com/cuidalink/patient/adapter/in/rest/PatientController.java`

**Interfaces:**
- Consumes: `CreatePatientCommand` y `UpdatePatientCommand` con nuevos campos (Task 1)
- Produces: `POST /api/v1/patients` acepta y responde `address`, `healthInsurance`, `bloodType`

- [ ] **Step 1: Actualizar `CreatePatientRequest.java`**

```java
package com.cuidalink.patient.adapter.in.rest.dto;

import com.cuidalink.patient.domain.model.Gender;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record CreatePatientRequest(
    @NotBlank String fullName,
    @NotNull LocalDate birthDate,
    @NotNull Gender gender,
    @NotBlank String identificationNumber,
    @NotBlank String address,
    @NotBlank String healthInsurance,
    @NotBlank String bloodType,
    String healthCondition,
    String allergies,
    @NotNull @Valid EmergencyContactDto emergencyContact
) {}
```

- [ ] **Step 2: Actualizar `UpdatePatientRequest.java`**

```java
package com.cuidalink.patient.adapter.in.rest.dto;

import com.cuidalink.patient.domain.model.Gender;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record UpdatePatientRequest(
    @NotBlank String fullName,
    @NotNull LocalDate birthDate,
    @NotNull Gender gender,
    @NotBlank String identificationNumber,
    @NotBlank String address,
    @NotBlank String healthInsurance,
    @NotBlank String bloodType,
    String healthCondition,
    String allergies,
    @NotNull @Valid EmergencyContactDto emergencyContact
) {}
```

- [ ] **Step 3: Actualizar `PatientResponse.java`**

```java
package com.cuidalink.patient.adapter.in.rest.dto;

public record PatientResponse(
    String id,
    String fullName,
    String birthDate,
    String gender,
    String identificationNumber,
    String address,
    String healthInsurance,
    String bloodType,
    EmergencyContactDto emergencyContact,
    boolean isOwner,
    boolean active
) {}
```

- [ ] **Step 4: Actualizar `PatientService.java` — método `execute`**

Reemplazar el bloque `execute`:

```java
    @Override
    public Patient execute(CreatePatientCommand cmd) {
        var patient = new Patient(
            PatientId.generate(),
            cmd.fullName(),
            cmd.birthDate(),
            cmd.gender(),
            cmd.identificationNumber(),
            cmd.address(),
            cmd.healthInsurance(),
            cmd.bloodType(),
            cmd.healthCondition(),
            cmd.allergies(),
            cmd.emergencyContact(),
            cmd.primaryCaregiver()
        );
        return patientRepository.save(patient);
    }
```

- [ ] **Step 5: Actualizar `PatientService.java` — método `updatePatient`**

Reemplazar el bloque `updatePatient`:

```java
    @Override
    public Patient updatePatient(UpdatePatientCommand cmd) {
        var patient = findOrThrow(cmd.patientId());
        if (!patient.isOwner(cmd.requesterId()))
            throw new IllegalArgumentException("Esta acción es solo el cuidador principal quien puede realizarla");
        patient.setFullName(cmd.fullName());
        patient.setBirthDate(cmd.birthDate());
        patient.setGender(cmd.gender());
        patient.setIdentificationNumber(cmd.identificationNumber());
        patient.setAddress(cmd.address());
        patient.setHealthInsurance(cmd.healthInsurance());
        patient.setBloodType(cmd.bloodType());
        patient.setHealthCondition(cmd.healthCondition());
        patient.setAllergies(cmd.allergies());
        patient.setEmergencyContact(cmd.emergencyContact());
        return patientRepository.save(patient);
    }
```

- [ ] **Step 6: Actualizar `PatientController.java` — método `create`**

Reemplazar el bloque del comando dentro de `create`:

```java
        var patient = createUseCase.execute(new CreatePatientUseCase.CreatePatientCommand(
            req.fullName(),
            req.birthDate(),
            req.gender(),
            req.identificationNumber(),
            req.address(),
            req.healthInsurance(),
            req.bloodType(),
            req.healthCondition(),
            req.allergies(),
            new EmergencyContact(req.emergencyContact().name(), req.emergencyContact().phone()),
            user.getId()
        ));
```

- [ ] **Step 7: Actualizar `PatientController.java` — método `update`**

Reemplazar el bloque del comando dentro de `update`:

```java
        var patient = updateUseCase.updatePatient(new UpdatePatientUseCase.UpdatePatientCommand(
            new PatientId(UUID.fromString(id)),
            req.fullName(),
            req.birthDate(),
            req.gender(),
            req.identificationNumber(),
            req.address(),
            req.healthInsurance(),
            req.bloodType(),
            req.healthCondition(),
            req.allergies(),
            new EmergencyContact(req.emergencyContact().name(), req.emergencyContact().phone()),
            user.getId()
        ));
```

- [ ] **Step 8: Actualizar `toResponse()` en `PatientController.java`**

```java
    private PatientResponse toResponse(Patient p, boolean isOwner) {
        return new PatientResponse(
            p.getId().value().toString(),
            p.getFullName(),
            p.getBirthDate().toString(),
            p.getGender().name(),
            p.getIdentificationNumber(),
            p.getAddress(),
            p.getHealthInsurance(),
            p.getBloodType(),
            new EmergencyContactDto(p.getEmergencyContact().name(), p.getEmergencyContact().phone()),
            isOwner,
            p.isActive()
        );
    }
```

- [ ] **Step 9: Rebuild y verificar con curl**

En IntelliJ: **Build → Rebuild Project**, luego reiniciar backend.

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manuel.vera.poblete@gmail.com","password":"q1w2e3r4"}' | grep token
```

Guardar el token, luego:

```bash
TOKEN="<token_del_paso_anterior>"
curl -s -w "\nHTTP:%{http_code}" -X POST http://localhost:8080/api/v1/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fullName":"Test Paciente",
    "birthDate":"1990-05-15",
    "gender":"MALE",
    "identificationNumber":"12345678-9",
    "address":"Av. Providencia 123, Santiago",
    "healthInsurance":"Fonasa",
    "bloodType":"O+",
    "healthCondition":"",
    "allergies":"",
    "emergencyContact":{"name":"Contacto Test","phone":"+56912345678"}
  }'
```

Esperado: HTTP 201 con JSON del paciente incluyendo `address`, `healthInsurance`, `bloodType`.

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/java/com/cuidalink/patient/
git commit -m "feat(patient): agregar campos address, healthInsurance, bloodType"
```

---

### Task 4: Mobile — Extender capa de dominio y repositorio

**Files:**
- Modify: `appmovil/src/domain/entities/Patient.ts`
- Modify: `appmovil/src/domain/repositories/PatientRepository.ts`
- Modify: `appmovil/src/data/repositories/ApiPatientRepository.ts`

**Interfaces:**
- Produces: tipo `CreatePatientData` con todos los campos; `ApiPatientRepository.createPatient` envía JSON completo al backend

- [ ] **Step 1: Actualizar `Patient.ts`**

```typescript
export interface Patient {
  id: string;
  fullName: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  identificationNumber: string;
  address: string;
  healthInsurance: string;
  bloodType: string;
  emergencyContact: { name: string; phone: string };
  isOwner: boolean;
  active: boolean;
}
```

- [ ] **Step 2: Definir `CreatePatientData` y actualizar `PatientRepository.ts`**

```typescript
import { Patient, Collaborator } from '@/domain/entities';

export interface CreatePatientData {
  fullName: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  identificationNumber: string;
  address: string;
  healthInsurance: string;
  bloodType: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export interface PatientRepository {
  listPatients(): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient>;
  createPatient(data: CreatePatientData): Promise<Patient>;
  updatePatient(id: string, data: CreatePatientData): Promise<Patient>;
  deletePatient(id: string): Promise<void>;
  getCollaborators(patientId: string): Promise<Collaborator[]>;
  getInvitationCode(patientId: string): Promise<string>;
  joinPatient(code: string): Promise<void>;
}
```

- [ ] **Step 3: Actualizar `ApiPatientRepository.ts`**

```typescript
import apiClient from '@/data/http/apiClient';
import { PatientRepository, CreatePatientData } from '@/domain/repositories/PatientRepository';
import { Patient, Collaborator } from '@/domain/entities';

export class ApiPatientRepository implements PatientRepository {
  async listPatients(): Promise<Patient[]> {
    const res = await apiClient.get<Patient[]>('/patients');
    return res.data;
  }

  async getPatient(id: string): Promise<Patient> {
    const res = await apiClient.get<Patient>(`/patients/${id}`);
    return res.data;
  }

  async createPatient(data: CreatePatientData): Promise<Patient> {
    const res = await apiClient.post<Patient>('/patients', {
      fullName: data.fullName,
      birthDate: data.birthDate,
      gender: data.gender,
      identificationNumber: data.identificationNumber,
      address: data.address,
      healthInsurance: data.healthInsurance,
      bloodType: data.bloodType,
      healthCondition: '',
      allergies: '',
      emergencyContact: {
        name: data.emergencyContactName,
        phone: data.emergencyContactPhone,
      },
    });
    return res.data;
  }

  async updatePatient(id: string, data: CreatePatientData): Promise<Patient> {
    const res = await apiClient.put<Patient>(`/patients/${id}`, {
      fullName: data.fullName,
      birthDate: data.birthDate,
      gender: data.gender,
      identificationNumber: data.identificationNumber,
      address: data.address,
      healthInsurance: data.healthInsurance,
      bloodType: data.bloodType,
      healthCondition: '',
      allergies: '',
      emergencyContact: {
        name: data.emergencyContactName,
        phone: data.emergencyContactPhone,
      },
    });
    return res.data;
  }

  async deletePatient(id: string): Promise<void> {
    await apiClient.delete(`/patients/${id}`);
  }

  async getCollaborators(patientId: string): Promise<Collaborator[]> {
    const res = await apiClient.get<Collaborator[]>(`/patients/${patientId}/collaborators`);
    return res.data;
  }

  async getInvitationCode(patientId: string): Promise<string> {
    const res = await apiClient.post<{ code: string }>(`/patients/${patientId}/invitation`);
    return res.data.code;
  }

  async joinPatient(code: string): Promise<void> {
    await apiClient.post('/patients/join', { code });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add appmovil/src/domain/entities/Patient.ts \
        appmovil/src/domain/repositories/PatientRepository.ts \
        appmovil/src/data/repositories/ApiPatientRepository.ts
git commit -m "feat(appmovil): extender tipos Patient y repositorio con nuevos campos"
```

---

### Task 5: Mobile — Instalar date picker y reescribir CreatePatientScreen

**Files:**
- Modify: `appmovil/package.json` (dependencia nueva)
- Modify: `appmovil/src/presentation/screens/patients/CreatePatientScreen.tsx`

**Interfaces:**
- Consumes: `CreatePatientData` de `PatientRepository` (Task 4); `patientRepo.createPatient(data)` (useInjection)

- [ ] **Step 1: Instalar `@react-native-community/datetimepicker`**

```bash
cd /home/manuel/Desarrollo/finales/cuidalink/appmovil
npx expo install @react-native-community/datetimepicker
```

Esperado: paquete agregado a `package.json` sin errores.

- [ ] **Step 2: Reescribir `CreatePatientScreen.tsx`**

```tsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Modal, FlatList, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';

const GENDER_OPTIONS = [
  { label: 'Masculino', value: 'MALE' },
  { label: 'Femenino', value: 'FEMALE' },
  { label: 'Otro', value: 'OTHER' },
] as const;

const BLOOD_TYPE_OPTIONS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−', 'No sé'];

const schema = z.object({
  fullName:              z.string().min(2, 'Nombre requerido'),
  identificationNumber:  z.string().min(1, 'RUT requerido'),
  birthDate:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha requerida'),
  gender:                z.enum(['MALE', 'FEMALE', 'OTHER'], { required_error: 'Sexo requerido' }),
  address:               z.string().min(1, 'Dirección requerida'),
  emergencyContactName:  z.string().min(1, 'Nombre contacto requerido'),
  emergencyContactPhone: z.string().min(1, 'Teléfono requerido'),
  healthInsurance:       z.string().min(1, 'Previsión requerida'),
  bloodType:             z.string().min(1, 'Grupo sanguíneo requerido'),
});
type FormData = z.infer<typeof schema>;

type Props = { navigation: NativeStackNavigationProp<PatientStackParams, 'CreatePatient'> };

function calcAge(dateStr: string): string {
  if (!dateStr) return '';
  const birth = new Date(dateStr);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear() -
    (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
  return isNaN(age) || age < 0 ? '' : `${age} años`;
}

export default function CreatePatientScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showBloodModal, setShowBloodModal] = useState(false);
  const { patientRepo } = useInjection();
  const queryClient = useQueryClient();

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { birthDate: '', gender: undefined, bloodType: '' },
  });

  const birthDate = watch('birthDate');
  const gender = watch('gender');
  const bloodType = watch('bloodType');

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await patientRepo.createPatient(data);
      await queryClient.invalidateQueries({ queryKey: ['patients'] });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo crear el paciente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Datos personales</Text>

      {/* Nombre completo */}
      <Text style={styles.label}>Nombre completo *</Text>
      <Controller control={control} name="fullName" render={({ field: { onChange, value } }) => (
        <TextInput style={[styles.input, errors.fullName && styles.inputError]}
          placeholder="Ej: María González López" value={value} onChangeText={onChange} />
      )} />
      {errors.fullName && <Text style={styles.error}>{errors.fullName.message}</Text>}

      {/* RUT */}
      <Text style={styles.label}>RUT / Documento de identidad *</Text>
      <Controller control={control} name="identificationNumber" render={({ field: { onChange, value } }) => (
        <TextInput style={[styles.input, errors.identificationNumber && styles.inputError]}
          placeholder="Ej: 12.345.678-9" value={value} onChangeText={onChange} />
      )} />
      {errors.identificationNumber && <Text style={styles.error}>{errors.identificationNumber.message}</Text>}

      {/* Fecha de nacimiento */}
      <Text style={styles.label}>Fecha de nacimiento *</Text>
      <TouchableOpacity style={[styles.input, errors.birthDate && styles.inputError]}
        onPress={() => setShowDatePicker(true)}>
        <Text style={{ color: birthDate ? '#000' : '#aaa', fontSize: 16 }}>
          {birthDate || 'Seleccionar fecha'}
        </Text>
      </TouchableOpacity>
      {errors.birthDate && <Text style={styles.error}>{errors.birthDate.message}</Text>}
      {showDatePicker && (
        <DateTimePicker
          value={birthDate ? new Date(birthDate) : new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(_, selected) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selected) {
              const iso = selected.toISOString().split('T')[0];
              setValue('birthDate', iso, { shouldValidate: true });
            }
          }}
        />
      )}

      {/* Edad */}
      {birthDate ? (
        <View style={styles.ageRow}>
          <Text style={styles.ageLabel}>Edad calculada:</Text>
          <Text style={styles.ageValue}>{calcAge(birthDate)}</Text>
        </View>
      ) : null}

      {/* Sexo */}
      <Text style={styles.label}>Sexo *</Text>
      <TouchableOpacity style={[styles.input, errors.gender && styles.inputError]}
        onPress={() => setShowGenderModal(true)}>
        <Text style={{ color: gender ? '#000' : '#aaa', fontSize: 16 }}>
          {GENDER_OPTIONS.find(o => o.value === gender)?.label || 'Seleccionar sexo'}
        </Text>
      </TouchableOpacity>
      {errors.gender && <Text style={styles.error}>{errors.gender.message}</Text>}

      {/* Dirección */}
      <Text style={styles.label}>Dirección *</Text>
      <Controller control={control} name="address" render={({ field: { onChange, value } }) => (
        <TextInput style={[styles.input, errors.address && styles.inputError]}
          placeholder="Ej: Av. Providencia 123, Santiago" value={value} onChangeText={onChange} />
      )} />
      {errors.address && <Text style={styles.error}>{errors.address.message}</Text>}

      <Text style={styles.sectionTitle}>Contacto de emergencia</Text>

      {/* Nombre contacto */}
      <Text style={styles.label}>Nombre *</Text>
      <Controller control={control} name="emergencyContactName" render={({ field: { onChange, value } }) => (
        <TextInput style={[styles.input, errors.emergencyContactName && styles.inputError]}
          placeholder="Ej: Juan González" value={value} onChangeText={onChange} />
      )} />
      {errors.emergencyContactName && <Text style={styles.error}>{errors.emergencyContactName.message}</Text>}

      {/* Teléfono contacto */}
      <Text style={styles.label}>Teléfono *</Text>
      <Controller control={control} name="emergencyContactPhone" render={({ field: { onChange, value } }) => (
        <TextInput style={[styles.input, errors.emergencyContactPhone && styles.inputError]}
          placeholder="+56912345678" keyboardType="phone-pad" value={value} onChangeText={onChange} />
      )} />
      {errors.emergencyContactPhone && <Text style={styles.error}>{errors.emergencyContactPhone.message}</Text>}

      <Text style={styles.sectionTitle}>Información médica</Text>

      {/* Previsión */}
      <Text style={styles.label}>Previsión de salud *</Text>
      <Controller control={control} name="healthInsurance" render={({ field: { onChange, value } }) => (
        <TextInput style={[styles.input, errors.healthInsurance && styles.inputError]}
          placeholder="Ej: Fonasa, Isapre Cruz Blanca" value={value} onChangeText={onChange} />
      )} />
      {errors.healthInsurance && <Text style={styles.error}>{errors.healthInsurance.message}</Text>}

      {/* Grupo sanguíneo */}
      <Text style={styles.label}>Grupo sanguíneo *</Text>
      <TouchableOpacity style={[styles.input, errors.bloodType && styles.inputError]}
        onPress={() => setShowBloodModal(true)}>
        <Text style={{ color: bloodType ? '#000' : '#aaa', fontSize: 16 }}>
          {bloodType || 'Seleccionar grupo'}
        </Text>
      </TouchableOpacity>
      {errors.bloodType && <Text style={styles.error}>{errors.bloodType.message}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Crear Paciente</Text>}
      </TouchableOpacity>

      {/* Modal Sexo */}
      <Modal visible={showGenderModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Seleccionar sexo</Text>
            {GENDER_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.value} style={styles.modalItem}
                onPress={() => { setValue('gender', opt.value, { shouldValidate: true }); setShowGenderModal(false); }}>
                <Text style={styles.modalItemText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowGenderModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Grupo sanguíneo */}
      <Modal visible={showBloodModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Grupo sanguíneo</Text>
            <FlatList
              data={BLOOD_TYPE_OPTIONS}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem}
                  onPress={() => { setValue('bloodType', item, { shouldValidate: true }); setShowBloodModal(false); }}>
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setShowBloodModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2D7DD2', marginTop: 24, marginBottom: 8 },
  label: { fontSize: 14, color: '#444', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, justifyContent: 'center', minHeight: 48 },
  inputError: { borderColor: '#e53e3e' },
  error: { color: '#e53e3e', fontSize: 12, marginTop: 2 },
  ageRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  ageLabel: { fontSize: 14, color: '#666', marginRight: 8 },
  ageValue: { fontSize: 14, fontWeight: '600', color: '#2D7DD2' },
  button: { backgroundColor: '#2D7DD2', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 32 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16, color: '#333' },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalItemText: { fontSize: 16, color: '#333' },
  modalCancel: { textAlign: 'center', color: '#e53e3e', fontSize: 16, marginTop: 16 },
});
```

- [ ] **Step 3: Reiniciar Metro con caché limpio**

```bash
cd /home/manuel/Desarrollo/finales/cuidalink/appmovil
npx expo start --clear
```

- [ ] **Step 4: Probar en el dispositivo**

Navegar a "Nuevo Paciente" y verificar:
- El date picker se abre al tocar "Fecha de nacimiento"
- La edad se calcula automáticamente
- Los selectores de sexo y grupo sanguíneo muestran modal
- Al enviar sin campos, se muestran errores inline bajo cada campo
- Al enviar completo, navega de vuelta a la lista

- [ ] **Step 5: Commit**

```bash
git add appmovil/src/presentation/screens/patients/CreatePatientScreen.tsx \
        appmovil/package.json appmovil/package-lock.json
git commit -m "feat(appmovil): formulario nuevo paciente con date picker y todos los campos"
```
