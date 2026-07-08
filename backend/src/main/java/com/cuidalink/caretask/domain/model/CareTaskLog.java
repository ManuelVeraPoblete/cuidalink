package com.cuidalink.caretask.domain.model;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDateTime;

public class CareTaskLog {

    private final CareTaskLogId id;
    private final CareTaskId careTaskId;
    private final PatientId patientId;
    private final LocalDateTime scheduledAt;
    private CareTaskLogStatus status;
    private UserId completedBy;
    private LocalDateTime completedAt;
    private LocalDateTime reminderSentAt;

    public CareTaskLog(CareTaskLogId id, CareTaskId careTaskId, PatientId patientId,
                       LocalDateTime scheduledAt, CareTaskLogStatus status,
                       UserId completedBy, LocalDateTime completedAt, LocalDateTime reminderSentAt) {
        this.id = id;
        this.careTaskId = careTaskId;
        this.patientId = patientId;
        this.scheduledAt = scheduledAt;
        this.status = status;
        this.completedBy = completedBy;
        this.completedAt = completedAt;
        this.reminderSentAt = reminderSentAt;
    }

    /** Convenience constructor for callers that don't track reminder state — defaults to not-yet-reminded. */
    public CareTaskLog(CareTaskLogId id, CareTaskId careTaskId, PatientId patientId,
                       LocalDateTime scheduledAt, CareTaskLogStatus status,
                       UserId completedBy, LocalDateTime completedAt) {
        this(id, careTaskId, patientId, scheduledAt, status, completedBy, completedAt, null);
    }

    public void complete(UserId completedBy) {
        if (status != CareTaskLogStatus.PENDING)
            throw new IllegalStateException("Solo se puede completar una tarea PENDING");
        this.status = CareTaskLogStatus.DONE;
        this.completedBy = completedBy;
        this.completedAt = LocalDateTime.now();
    }

    public void markReminderSent() { this.reminderSentAt = LocalDateTime.now(); }

    public CareTaskLogId getId() { return id; }
    public CareTaskId getCareTaskId() { return careTaskId; }
    public PatientId getPatientId() { return patientId; }
    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public CareTaskLogStatus getStatus() { return status; }
    public UserId getCompletedBy() { return completedBy; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public LocalDateTime getReminderSentAt() { return reminderSentAt; }
}
