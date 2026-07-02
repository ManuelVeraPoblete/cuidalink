package com.cuidalink.vital.adapter.out.persistence;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.vital.domain.model.*;
import com.cuidalink.vital.domain.port.out.VitalRecordRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class JpaVitalRecordRepositoryAdapter implements VitalRecordRepository {

    private final SpringVitalRecordRepository jpa;

    public JpaVitalRecordRepositoryAdapter(SpringVitalRecordRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public VitalRecord save(VitalRecord record) {
        jpa.save(toJpa(record));
        return record;
    }

    @Override
    public Optional<VitalRecord> findById(VitalRecordId id) {
        return jpa.findById(id.value().toString()).map(this::toDomain);
    }

    @Override
    public List<VitalRecord> findByPatientIdBetween(PatientId patientId,
                                                     LocalDateTime from, LocalDateTime to) {
        return jpa.findByPatientIdAndRecordedAtBetween(
            patientId.value().toString(), from, to)
            .stream().map(this::toDomain).toList();
    }

    @Override
    public List<VitalRecord> findByPatientAndDateRange(PatientId patientId,
                                                        LocalDate from, LocalDate to) {
        return jpa.findByPatientIdAndRecordedAtGreaterThanEqualAndRecordedAtLessThan(
            patientId.value().toString(),
            from.atStartOfDay(),
            to.plusDays(1).atStartOfDay()
        ).stream().map(this::toDomain).toList();
    }

    // ---- Mappers ----

    private VitalRecordJpaEntity toJpa(VitalRecord r) {
        var e = new VitalRecordJpaEntity();
        e.setId(r.getId().value().toString());
        e.setPatientId(r.getPatientId().value().toString());
        e.setRecordedById(r.getRecordedBy().value().toString());
        e.setRecordedAt(r.getRecordedAt());
        e.setMeasurements(serializeMeasurements(r.getMeasurements()));
        return e;
    }

    private VitalRecord toDomain(VitalRecordJpaEntity e) {
        return new VitalRecord(
            new VitalRecordId(UUID.fromString(e.getId())),
            new PatientId(UUID.fromString(e.getPatientId())),
            new UserId(UUID.fromString(e.getRecordedById())),
            e.getRecordedAt(),
            deserializeMeasurements(e.getMeasurements())
        );
    }

    private String serializeMeasurements(List<VitalMeasurement> measurements) {
        if (measurements == null || measurements.isEmpty()) return "";
        return measurements.stream()
            .map(m -> m.definitionId().value().toString() + ":" + m.value())
            .collect(Collectors.joining("|"));
    }

    private List<VitalMeasurement> deserializeMeasurements(String s) {
        if (s == null || s.isBlank()) return List.of();
        return Arrays.stream(s.split("\\|"))
            .map(part -> {
                int colonIdx = part.indexOf(':');
                var defId = new VitalSignDefinitionId(UUID.fromString(part.substring(0, colonIdx)));
                var value = part.substring(colonIdx + 1);
                return new VitalMeasurement(defId, value);
            }).toList();
    }
}
