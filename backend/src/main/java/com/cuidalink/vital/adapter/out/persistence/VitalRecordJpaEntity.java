package com.cuidalink.vital.adapter.out.persistence;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "vital_records")
public class VitalRecordJpaEntity {

    @Id
    private String id;
    private String patientId;
    private String recordedById;
    private LocalDateTime recordedAt;

    // Serialized as "definitionId1:value1|definitionId2:value2"
    @Column(columnDefinition = "TEXT")
    private String measurements;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getRecordedById() { return recordedById; }
    public void setRecordedById(String recordedById) { this.recordedById = recordedById; }

    public LocalDateTime getRecordedAt() { return recordedAt; }
    public void setRecordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; }

    public String getMeasurements() { return measurements; }
    public void setMeasurements(String measurements) { this.measurements = measurements; }
}
