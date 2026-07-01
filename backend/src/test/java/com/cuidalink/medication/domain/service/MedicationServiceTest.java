package com.cuidalink.medication.domain.service;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.medication.domain.model.*;
import com.cuidalink.medication.domain.port.in.CreateMedicationUseCase;
import com.cuidalink.medication.domain.port.out.MedicationLogRepository;
import com.cuidalink.medication.domain.port.out.MedicationRepository;
import com.cuidalink.patient.domain.model.*;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MedicationServiceTest {

    @Mock MedicationRepository medicationRepository;
    @Mock MedicationLogRepository logRepository;
    @Mock PatientRepository patientRepository;
    MedicationService sut;

    UserId ownerId = new UserId(UUID.randomUUID());
    MedicationSchedule schedule = new MedicationSchedule(
        List.of(LocalTime.of(8, 0)),
        Frequency.DAILY,
        List.of(),
        LocalDate.now(),
        LocalDate.now().plusMonths(1),
        null
    );

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new MedicationService(medicationRepository, logRepository, patientRepository);
    }

    @Test
    void createMedication_failsIfRequesterIsNotOwner() {
        var patient = buildPatient(ownerId);
        var stranger = new UserId(UUID.randomUUID());
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.execute(new CreateMedicationUseCase.CreateMedicationCommand(
            patient.getId(), "Metformina", "500mg", "", schedule, stranger)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void createMedication_ownerCanCreateMedication() {
        var patient = buildPatient(ownerId);
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));
        when(medicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = sut.execute(new CreateMedicationUseCase.CreateMedicationCommand(
            patient.getId(), "Metformina", "500mg", "Con comida", schedule, ownerId));

        assertThat(result.getName()).isEqualTo("Metformina");
        assertThat(result.getPatientId()).isEqualTo(patient.getId());
        assertThat(result.isActive()).isTrue();
        verify(medicationRepository).save(any(Medication.class));
    }

    @Test
    void confirmLog_collaboratorCanConfirmPendingLog() {
        var collaborator = new UserId(UUID.randomUUID());
        var medicationId = MedicationId.generate();
        var patient = buildPatientWithCollaborator(ownerId, collaborator);
        var medication = new Medication(medicationId, patient.getId(),
            "Metformina", "500mg", "", schedule, true);
        var log = new MedicationLog(MedicationLogId.generate(), medicationId,
            LocalDateTime.now(), LogStatus.PENDING, null, null);

        when(logRepository.findById(log.getId())).thenReturn(Optional.of(log));
        when(medicationRepository.findById(medicationId)).thenReturn(Optional.of(medication));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));
        when(logRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = sut.confirm(log.getId(), collaborator, LogStatus.CONFIRMED);

        assertThat(result.getStatus()).isEqualTo(LogStatus.CONFIRMED);
        assertThat(result.getAdministeredBy()).isEqualTo(collaborator);
        assertThat(result.getConfirmedAt()).isNotNull();
    }

    @Test
    void confirmLog_failsIfUserHasNoAccess() {
        var stranger = new UserId(UUID.randomUUID());
        var medicationId = MedicationId.generate();
        var patient = buildPatient(ownerId);
        var medication = new Medication(medicationId, patient.getId(),
            "Metformina", "500mg", "", schedule, true);
        var log = new MedicationLog(MedicationLogId.generate(), medicationId,
            LocalDateTime.now(), LogStatus.PENDING, null, null);

        when(logRepository.findById(log.getId())).thenReturn(Optional.of(log));
        when(medicationRepository.findById(medicationId)).thenReturn(Optional.of(medication));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.confirm(log.getId(), stranger, LogStatus.CONFIRMED))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("acceso");
    }

    @Test
    void confirmLog_failsIfLogAlreadyConfirmed() {
        var medicationId = MedicationId.generate();
        var patient = buildPatient(ownerId);
        var medication = new Medication(medicationId, patient.getId(),
            "Metformina", "500mg", "", schedule, true);
        var log = new MedicationLog(MedicationLogId.generate(), medicationId,
            LocalDateTime.now(), LogStatus.CONFIRMED, ownerId, LocalDateTime.now());

        when(logRepository.findById(log.getId())).thenReturn(Optional.of(log));
        when(medicationRepository.findById(medicationId)).thenReturn(Optional.of(medication));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.confirm(log.getId(), ownerId, LogStatus.CONFIRMED))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void deactivate_failsIfRequesterIsNotOwner() {
        var stranger = new UserId(UUID.randomUUID());
        var medicationId = MedicationId.generate();
        var patient = buildPatient(ownerId);
        var medication = new Medication(medicationId, patient.getId(),
            "Metformina", "500mg", "", schedule, true);

        when(medicationRepository.findById(medicationId)).thenReturn(Optional.of(medication));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.deactivate(medicationId, stranger))
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
