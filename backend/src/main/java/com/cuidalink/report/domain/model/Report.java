package com.cuidalink.report.domain.model;

import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDateTime;
import java.util.List;

public class Report {

    private final PatientId patientId;
    private final String patientName;
    private final String generatedByName;
    private final LocalDateTime generatedAt;
    private final DateRange period;
    private final List<MedicationLogEntry> medicationSummary;
    private final List<VitalRecordEntry> vitalSummary;

    public Report(PatientId patientId, String patientName, String generatedByName,
                  LocalDateTime generatedAt, DateRange period,
                  List<MedicationLogEntry> medicationSummary,
                  List<VitalRecordEntry> vitalSummary) {
        this.patientId = patientId;
        this.patientName = patientName;
        this.generatedByName = generatedByName;
        this.generatedAt = generatedAt;
        this.period = period;
        this.medicationSummary = List.copyOf(medicationSummary);
        this.vitalSummary = List.copyOf(vitalSummary);
    }

    public PatientId getPatientId() { return patientId; }
    public String getPatientName() { return patientName; }
    public String getGeneratedByName() { return generatedByName; }
    public LocalDateTime getGeneratedAt() { return generatedAt; }
    public DateRange getPeriod() { return period; }
    public List<MedicationLogEntry> getMedicationSummary() { return medicationSummary; }
    public List<VitalRecordEntry> getVitalSummary() { return vitalSummary; }
}
