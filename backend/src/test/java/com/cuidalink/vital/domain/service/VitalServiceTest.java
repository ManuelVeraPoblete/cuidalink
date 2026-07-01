package com.cuidalink.vital.domain.service;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.*;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import com.cuidalink.vital.domain.model.*;
import com.cuidalink.vital.domain.port.in.*;
import com.cuidalink.vital.domain.port.out.VitalDefinitionRepository;
import com.cuidalink.vital.domain.port.out.VitalRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class VitalServiceTest {

    @Mock VitalDefinitionRepository definitionRepository;
    @Mock VitalRecordRepository vitalRecordRepository;
    @Mock PatientRepository patientRepository;
    VitalService sut;

    UserId ownerId = new UserId(UUID.randomUUID());
    PatientId patientId = PatientId.generate();
    VitalSignDefinitionId definitionId = VitalSignDefinitionId.generate();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new VitalService(definitionRepository, vitalRecordRepository, patientRepository);
    }

    // ---- CreateVitalDefinition ----

    @Test
    void createDefinition_onlyOwnerCanCreate() {
        var stranger = new UserId(UUID.randomUUID());
        when(patientRepository.findById(any())).thenReturn(Optional.of(mockPatient(ownerId)));

        assertThatThrownBy(() -> sut.execute(new CreateVitalDefinitionUseCase.CreateVitalDefinitionCommand(
            patientId, "Presión", "mmHg", 90.0, 140.0, stranger)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void createDefinition_ownerCanCreate() {
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(mockPatient(ownerId)));
        when(definitionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = sut.execute(new CreateVitalDefinitionUseCase.CreateVitalDefinitionCommand(
            patientId, "Presión Arterial", "mmHg", 90.0, 140.0, ownerId));

        assertThat(result.getName()).isEqualTo("Presión Arterial");
        assertThat(result.getUnit()).isEqualTo("mmHg");
        assertThat(result.getPatientId()).isEqualTo(patientId);
        verify(definitionRepository).save(any(VitalSignDefinition.class));
    }

    // ---- RecordVitals ----

    @Test
    void recordVitals_collaboratorCanRecord() {
        var collab = new UserId(UUID.randomUUID());
        var patient = mockPatientWithCollaborator(collab);
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(patient));
        when(vitalRecordRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var cmd = new RecordVitalsUseCase.RecordVitalsCommand(patientId, collab,
            List.of(new RecordVitalsUseCase.VitalMeasurementDto(definitionId, "120/80")));
        var result = sut.record(cmd);

        assertThat(result.getMeasurements()).hasSize(1);
        assertThat(result.getRecordedBy()).isEqualTo(collab);
    }

    @Test
    void recordVitals_ownerCanRecord() {
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(mockPatient(ownerId)));
        when(vitalRecordRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var cmd = new RecordVitalsUseCase.RecordVitalsCommand(patientId, ownerId,
            List.of(new RecordVitalsUseCase.VitalMeasurementDto(definitionId, "72")));
        var result = sut.record(cmd);

        assertThat(result.getMeasurements()).hasSize(1);
        assertThat(result.getMeasurements().get(0).value()).isEqualTo("72");
    }

    @Test
    void recordVitals_strangerCannotRecord() {
        var stranger = new UserId(UUID.randomUUID());
        when(patientRepository.findById(any())).thenReturn(Optional.of(mockPatient(ownerId)));

        assertThatThrownBy(() -> sut.record(new RecordVitalsUseCase.RecordVitalsCommand(
            patientId, stranger,
            List.of(new RecordVitalsUseCase.VitalMeasurementDto(definitionId, "120/80")))))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("acceso");
    }

    // ---- ListVitalRecords ----

    @Test
    void listVitalRecords_ownerCanList() {
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(mockPatient(ownerId)));
        when(vitalRecordRepository.findByPatientIdBetween(any(), any(), any())).thenReturn(List.of());

        var result = sut.list(patientId, LocalDate.now().minusDays(7), LocalDate.now(), ownerId);

        assertThat(result).isEmpty();
    }

    @Test
    void listVitalRecords_strangerCannotList() {
        var stranger = new UserId(UUID.randomUUID());
        when(patientRepository.findById(any())).thenReturn(Optional.of(mockPatient(ownerId)));

        assertThatThrownBy(() -> sut.list(
            patientId, LocalDate.now().minusDays(7), LocalDate.now(), stranger))
            .isInstanceOf(IllegalArgumentException.class);
    }

    // ---- UpdateVitalDefinition ----

    @Test
    void updateDefinition_onlyOwnerCanUpdate() {
        var stranger = new UserId(UUID.randomUUID());
        var def = new VitalSignDefinition(definitionId, patientId, "Presión", "mmHg", 90.0, 140.0);
        when(definitionRepository.findById(definitionId)).thenReturn(Optional.of(def));
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(mockPatient(ownerId)));

        assertThatThrownBy(() -> sut.execute(new UpdateVitalDefinitionUseCase.UpdateVitalDefinitionCommand(
            patientId, definitionId, "Presión", "mmHg", 85.0, 145.0, stranger)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    // ---- DeleteVitalDefinition ----

    @Test
    void deleteDefinition_ownerCanDelete() {
        var def = new VitalSignDefinition(definitionId, patientId, "Presión", "mmHg", 90.0, 140.0);
        when(definitionRepository.findById(definitionId)).thenReturn(Optional.of(def));
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(mockPatient(ownerId)));

        sut.delete(definitionId, patientId, ownerId);

        verify(definitionRepository).deleteById(definitionId);
    }

    // ---- Helpers ----

    private Patient mockPatient(UserId owner) {
        return new Patient(patientId, "Test Patient", LocalDate.of(1950, 1, 1),
            Gender.FEMALE, "12345678", "Calle Test 123", "Fonasa", "O+",
            "Diabetes", "Ninguna",
            new EmergencyContact("Familiar", "+56912345678"), owner);
    }

    private Patient mockPatientWithCollaborator(UserId collaborator) {
        var patient = mockPatient(ownerId);
        patient.addCollaborator(collaborator);
        return patient;
    }
}
