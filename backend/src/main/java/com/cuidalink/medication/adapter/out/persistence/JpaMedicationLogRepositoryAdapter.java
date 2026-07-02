package com.cuidalink.medication.adapter.out.persistence;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.medication.domain.model.LogStatus;
import com.cuidalink.medication.domain.model.MedicationId;
import com.cuidalink.medication.domain.model.MedicationLog;
import com.cuidalink.medication.domain.model.MedicationLogId;
import com.cuidalink.medication.domain.port.out.MedicationLogRepository;
import com.cuidalink.patient.domain.model.PatientId;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class JpaMedicationLogRepositoryAdapter implements MedicationLogRepository {

    private final SpringMedicationLogRepository jpa;

    public JpaMedicationLogRepositoryAdapter(SpringMedicationLogRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public MedicationLog save(MedicationLog log) {
        jpa.save(toJpa(log));
        return log;
    }

    @Override
    public Optional<MedicationLog> findById(MedicationLogId id) {
        return jpa.findById(id.value().toString()).map(this::toDomain);
    }

    @Override
    public List<MedicationLog> findByPatientIdAndDate(PatientId patientId, LocalDate date) {
        var startOfDay = date.atStartOfDay();
        var startOfNextDay = date.plusDays(1).atStartOfDay();
        return jpa.findByPatientIdAndDate(patientId.value().toString(), startOfDay, startOfNextDay)
            .stream().map(this::toDomain).toList();
    }

    @Override
    public List<MedicationLog> findPendingOlderThan(LocalDateTime threshold) {
        return jpa.findPendingOlderThan(threshold).stream().map(this::toDomain).toList();
    }

    @Override
    public boolean existsByMedicationIdAndScheduledAt(MedicationId medicationId, LocalDateTime scheduledAt) {
        return jpa.existsByMedicationIdAndScheduledAt(medicationId.value().toString(), scheduledAt);
    }

    @Override
    public List<MedicationLog> findByPatientAndDateRange(PatientId patientId, LocalDate from, LocalDate to) {
        return jpa.findByPatientIdAndDateRange(
            patientId.value().toString(),
            from.atStartOfDay(),
            to.plusDays(1).atStartOfDay()
        ).stream().map(this::toDomain).toList();
    }

    // ---- Mappers ----

    private MedicationLogJpaEntity toJpa(MedicationLog l) {
        var e = new MedicationLogJpaEntity();
        e.setId(l.getId().value().toString());
        e.setMedicationId(l.getMedicationId().value().toString());
        e.setPatientId(l.getPatientId() != null ? l.getPatientId().value().toString() : null);
        e.setScheduledAt(l.getScheduledAt());
        e.setStatus(l.getStatus().name());
        e.setAdministeredById(l.getAdministeredBy() != null
            ? l.getAdministeredBy().value().toString() : null);
        e.setConfirmedAt(l.getConfirmedAt());
        return e;
    }

    private MedicationLog toDomain(MedicationLogJpaEntity e) {
        UserId administeredBy = e.getAdministeredById() != null
            ? new UserId(UUID.fromString(e.getAdministeredById())) : null;
        PatientId patientId = e.getPatientId() != null
            ? new PatientId(UUID.fromString(e.getPatientId())) : null;
        return new MedicationLog(
            new MedicationLogId(UUID.fromString(e.getId())),
            new MedicationId(UUID.fromString(e.getMedicationId())),
            patientId,
            e.getScheduledAt(),
            LogStatus.valueOf(e.getStatus()),
            administeredBy,
            e.getConfirmedAt()
        );
    }
}
