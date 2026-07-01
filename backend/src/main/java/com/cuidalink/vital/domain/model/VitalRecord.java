package com.cuidalink.vital.domain.model;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDateTime;
import java.util.List;

public class VitalRecord {

    private final VitalRecordId id;
    private final PatientId patientId;
    private final UserId recordedBy;
    private final LocalDateTime recordedAt;
    private final List<VitalMeasurement> measurements;

    public VitalRecord(VitalRecordId id, PatientId patientId, UserId recordedBy,
                       LocalDateTime recordedAt, List<VitalMeasurement> measurements) {
        this.id = id;
        this.patientId = patientId;
        this.recordedBy = recordedBy;
        this.recordedAt = recordedAt;
        this.measurements = List.copyOf(measurements);
    }

    public VitalRecordId getId() { return id; }
    public PatientId getPatientId() { return patientId; }
    public UserId getRecordedBy() { return recordedBy; }
    public LocalDateTime getRecordedAt() { return recordedAt; }
    public List<VitalMeasurement> getMeasurements() { return measurements; }
}
