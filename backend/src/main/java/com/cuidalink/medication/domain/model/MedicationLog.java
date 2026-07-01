package com.cuidalink.medication.domain.model;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDateTime;

public class MedicationLog {

    private final MedicationLogId id;
    private final MedicationId medicationId;
    private final PatientId patientId;
    private final LocalDateTime scheduledAt;
    private LogStatus status;
    private UserId administeredBy;
    private LocalDateTime confirmedAt;

    public MedicationLog(MedicationLogId id, MedicationId medicationId, PatientId patientId,
                         LocalDateTime scheduledAt, LogStatus status,
                         UserId administeredBy, LocalDateTime confirmedAt) {
        this.id = id;
        this.medicationId = medicationId;
        this.patientId = patientId;
        this.scheduledAt = scheduledAt;
        this.status = status;
        this.administeredBy = administeredBy;
        this.confirmedAt = confirmedAt;
    }

    /** Convenience constructor for tests that don't need patientId. */
    public MedicationLog(MedicationLogId id, MedicationId medicationId,
                         LocalDateTime scheduledAt, LogStatus status,
                         UserId administeredBy, LocalDateTime confirmedAt) {
        this(id, medicationId, null, scheduledAt, status, administeredBy, confirmedAt);
    }

    public void confirm(UserId confirmedBy, LogStatus newStatus) {
        if (newStatus != LogStatus.CONFIRMED && newStatus != LogStatus.MISSED)
            throw new IllegalArgumentException("Estado inválido: solo se permite CONFIRMED o MISSED");
        if (status != LogStatus.PENDING && status != LogStatus.ESCALATED)
            throw new IllegalStateException("Solo se puede confirmar un log PENDING o ESCALATED");
        this.status = newStatus;
        this.administeredBy = confirmedBy;
        this.confirmedAt = LocalDateTime.now();
    }

    public void escalate() {
        if (status == LogStatus.PENDING)
            this.status = LogStatus.ESCALATED;
    }

    public MedicationLogId getId() { return id; }
    public MedicationId getMedicationId() { return medicationId; }
    public PatientId getPatientId() { return patientId; }
    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public LogStatus getStatus() { return status; }
    public UserId getAdministeredBy() { return administeredBy; }
    public LocalDateTime getConfirmedAt() { return confirmedAt; }
}
