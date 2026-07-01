package com.cuidalink.patient.domain.service;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.*;
import com.cuidalink.patient.domain.port.in.CreatePatientUseCase;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PatientServiceTest {

    @Mock PatientRepository patientRepository;
    PatientService sut;
    UserId ownerId = new UserId(UUID.randomUUID());

    @BeforeEach void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new PatientService(patientRepository);
    }

    @Test
    void createPatient_setsOwnerAndReturnsPatient() {
        when(patientRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        var cmd = new CreatePatientUseCase.CreatePatientCommand(
            "María García", LocalDate.of(1945, 3, 10), Gender.FEMALE,
            "12345678", "Av. Providencia 123", "Fonasa", "O+",
            "Diabetes tipo 2", "Penicilina",
            new EmergencyContact("Juan García", "+56912345678"), ownerId);

        Patient result = sut.execute(cmd);

        assertThat(result.getPrimaryCaregiver()).isEqualTo(ownerId);
        assertThat(result.getFullName()).isEqualTo("María García");
        verify(patientRepository).save(any(Patient.class));
    }

    @Test
    void generateInvitation_failsIfRequesterIsNotOwner() {
        var patient = buildPatient(ownerId);
        var strangerUserId = new UserId(UUID.randomUUID());
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.generate(patient.getId(), strangerUserId))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("solo el cuidador principal");
    }

    @Test
    void joinWithCode_addsCollaboratorToPatient() {
        var patient = buildPatient(ownerId);
        var code = patient.generateInvitationCode();
        var newCollab = new UserId(UUID.randomUUID());
        when(patientRepository.findByInvitationCode(code.code())).thenReturn(Optional.of(patient));
        when(patientRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Patient result = sut.join(code.code(), newCollab);

        assertThat(result.getCollaborators()).anyMatch(c -> c.userId().equals(newCollab));
    }

    @Test
    void joinWithCode_throwsWhenCodeAlreadyUsed() {
        var patient = buildPatient(ownerId);
        var code = patient.generateInvitationCode();
        patient.markCodeUsed(code.code());
        var newCollab = new UserId(UUID.randomUUID());
        when(patientRepository.findByInvitationCode(code.code())).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> sut.join(code.code(), newCollab))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("inválido");
    }

    private Patient buildPatient(UserId owner) {
        return new Patient(PatientId.generate(), "María García", LocalDate.of(1945,3,10),
            Gender.FEMALE, "12345678", "Calle Test 123", "Fonasa", "O+",
            "Diabetes", "Penicilina",
            new EmergencyContact("Juan", "+56912345678"), owner);
    }
}
