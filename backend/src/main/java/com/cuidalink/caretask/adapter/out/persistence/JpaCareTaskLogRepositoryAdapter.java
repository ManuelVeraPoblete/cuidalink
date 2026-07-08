// backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/JpaCareTaskLogRepositoryAdapter.java
package com.cuidalink.caretask.adapter.out.persistence;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.CareTaskId;
import com.cuidalink.caretask.domain.model.CareTaskLog;
import com.cuidalink.caretask.domain.model.CareTaskLogId;
import com.cuidalink.caretask.domain.model.CareTaskLogStatus;
import com.cuidalink.caretask.domain.port.out.CareTaskLogRepository;
import com.cuidalink.patient.domain.model.PatientId;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class JpaCareTaskLogRepositoryAdapter implements CareTaskLogRepository {

    private final SpringCareTaskLogRepository jpa;

    public JpaCareTaskLogRepositoryAdapter(SpringCareTaskLogRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public CareTaskLog save(CareTaskLog log) {
        jpa.save(toJpa(log));
        return log;
    }

    @Override
    public Optional<CareTaskLog> findById(CareTaskLogId id) {
        return jpa.findById(id.value().toString()).map(this::toDomain);
    }

    @Override
    public List<CareTaskLog> findByPatientIdAndDate(PatientId patientId, LocalDate date) {
        var startOfDay = date.atStartOfDay();
        var startOfNextDay = date.plusDays(1).atStartOfDay();
        return jpa.findByPatientIdAndDate(patientId.value().toString(), startOfDay, startOfNextDay)
            .stream().map(this::toDomain).toList();
    }

    @Override
    public boolean existsByCareTaskIdAndScheduledAt(CareTaskId careTaskId, LocalDateTime scheduledAt) {
        return jpa.existsByCareTaskIdAndScheduledAt(careTaskId.value().toString(), scheduledAt);
    }

    @Override
    public List<CareTaskLog> findPendingAt(LocalDateTime scheduledAt) {
        return jpa.findByStatusAndScheduledAt(CareTaskLogStatus.PENDING.name(), scheduledAt)
            .stream().map(this::toDomain).toList();
    }

    private CareTaskLogJpaEntity toJpa(CareTaskLog l) {
        var e = new CareTaskLogJpaEntity();
        e.setId(l.getId().value().toString());
        e.setCareTaskId(l.getCareTaskId().value().toString());
        e.setPatientId(l.getPatientId().value().toString());
        e.setScheduledAt(l.getScheduledAt());
        e.setStatus(l.getStatus().name());
        e.setCompletedById(l.getCompletedBy() != null ? l.getCompletedBy().value().toString() : null);
        e.setCompletedAt(l.getCompletedAt());
        return e;
    }

    private CareTaskLog toDomain(CareTaskLogJpaEntity e) {
        UserId completedBy = e.getCompletedById() != null
            ? new UserId(UUID.fromString(e.getCompletedById())) : null;
        return new CareTaskLog(
            new CareTaskLogId(UUID.fromString(e.getId())),
            new CareTaskId(UUID.fromString(e.getCareTaskId())),
            new PatientId(UUID.fromString(e.getPatientId())),
            e.getScheduledAt(),
            CareTaskLogStatus.valueOf(e.getStatus()),
            completedBy,
            e.getCompletedAt()
        );
    }
}
