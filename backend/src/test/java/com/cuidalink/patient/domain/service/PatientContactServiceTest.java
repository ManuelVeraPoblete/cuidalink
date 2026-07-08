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
