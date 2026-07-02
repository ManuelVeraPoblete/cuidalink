package com.cuidalink.medication.adapter.out.persistence;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "medication_logs")
public class MedicationLogJpaEntity {

    @Id
    private String id;
    private String medicationId;
    private String patientId;  // denormalized for efficient daily-log queries
    private LocalDateTime scheduledAt;
    private String status;
    private String administeredById;  // nullable
    private LocalDateTime confirmedAt;  // nullable

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getMedicationId() { return medicationId; }
    public void setMedicationId(String medicationId) { this.medicationId = medicationId; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(LocalDateTime scheduledAt) { this.scheduledAt = scheduledAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAdministeredById() { return administeredById; }
    public void setAdministeredById(String administeredById) { this.administeredById = administeredById; }

    public LocalDateTime getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(LocalDateTime confirmedAt) { this.confirmedAt = confirmedAt; }
}
