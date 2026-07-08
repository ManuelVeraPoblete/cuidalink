package com.cuidalink.vital.adapter.out.persistence;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.vital.domain.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

class JpaVitalRecordRepositoryAdapterTest {

    @Mock SpringVitalRecordRepository jpa;
    JpaVitalRecordRepositoryAdapter sut;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new JpaVitalRecordRepositoryAdapter(jpa);
    }

    @Test
    void save_thenFindById_roundTripsAllMeasurementsIncludingSlashesAndFreeText() {
        var recordId = VitalRecordId.generate();
        var patientId = PatientId.generate();
        var recordedBy = new UserId(UUID.randomUUID());
        var recordedAt = LocalDateTime.of(2026, 5, 24, 9, 15);
        var tempDefId = new VitalSignDefinitionId(UUID.randomUUID());
        var bpDefId = new VitalSignDefinitionId(UUID.randomUUID());
        var obsDefId = new VitalSignDefinitionId(UUID.randomUUID());

        var measurements = List.of(
            new VitalMeasurement(tempDefId, "37.2"),
            new VitalMeasurement(bpDefId, "120/80"),
            new VitalMeasurement(obsDefId, "Paciente tranquilo, comió bien")
        );
        var record = new VitalRecord(recordId, patientId, recordedBy, recordedAt, measurements);

        sut.save(record);

        var captor = ArgumentCaptor.forClass(VitalRecordJpaEntity.class);
        org.mockito.Mockito.verify(jpa).save(captor.capture());
        var savedEntity = captor.getValue();

        when(jpa.findById(recordId.value().toString())).thenReturn(Optional.of(savedEntity));
        var found = sut.findById(recordId);

        assertThat(found).isPresent();
        var roundTripped = found.get();
        assertThat(roundTripped.getId()).isEqualTo(recordId);
        assertThat(roundTripped.getPatientId()).isEqualTo(patientId);
        assertThat(roundTripped.getRecordedBy()).isEqualTo(recordedBy);
        assertThat(roundTripped.getRecordedAt()).isEqualTo(recordedAt);
        assertThat(roundTripped.getMeasurements()).containsExactly(
            new VitalMeasurement(tempDefId, "37.2"),
            new VitalMeasurement(bpDefId, "120/80"),
            new VitalMeasurement(obsDefId, "Paciente tranquilo, comió bien")
        );
    }

    @Test
    void findByPatientIdBetween_mapsAllEntitiesBackToDomain() {
        var patientId = PatientId.generate();
        var recordId = VitalRecordId.generate();
        var recordedBy = new UserId(UUID.randomUUID());
        var recordedAt = LocalDateTime.of(2026, 5, 24, 6, 45);
        var defId = new VitalSignDefinitionId(UUID.randomUUID());
        var record = new VitalRecord(recordId, patientId, recordedBy, recordedAt,
            List.of(new VitalMeasurement(defId, "36.8")));

        sut.save(record);
        var captor = ArgumentCaptor.forClass(VitalRecordJpaEntity.class);
        org.mockito.Mockito.verify(jpa).save(captor.capture());

        var from = recordedAt.minusDays(1);
        var to = recordedAt.plusDays(1);
        when(jpa.findByPatientIdAndRecordedAtBetween(patientId.value().toString(), from, to))
            .thenReturn(List.of(captor.getValue()));

        var result = sut.findByPatientIdBetween(patientId, from, to);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMeasurements()).containsExactly(new VitalMeasurement(defId, "36.8"));
    }
}
