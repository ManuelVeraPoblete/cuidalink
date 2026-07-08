// backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/CareTaskLogJpaEntity.java
package com.cuidalink.caretask.adapter.out.persistence;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "care_task_logs")
public class CareTaskLogJpaEntity {

    @Id
    private String id;
    private String careTaskId;
    private String patientId;
    private LocalDateTime scheduledAt;
    private String status;
    private String completedById;
    private LocalDateTime completedAt;
    private LocalDateTime reminderSentAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCareTaskId() { return careTaskId; }
    public void setCareTaskId(String careTaskId) { this.careTaskId = careTaskId; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(LocalDateTime scheduledAt) { this.scheduledAt = scheduledAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCompletedById() { return completedById; }
    public void setCompletedById(String completedById) { this.completedById = completedById; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public LocalDateTime getReminderSentAt() { return reminderSentAt; }
    public void setReminderSentAt(LocalDateTime reminderSentAt) { this.reminderSentAt = reminderSentAt; }
}
