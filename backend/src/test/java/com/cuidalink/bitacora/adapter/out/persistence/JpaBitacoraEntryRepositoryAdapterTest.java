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
