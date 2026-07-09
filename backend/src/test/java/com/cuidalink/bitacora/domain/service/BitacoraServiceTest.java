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
