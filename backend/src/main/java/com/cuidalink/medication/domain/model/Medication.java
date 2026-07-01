package com.cuidalink.medication.domain.model;

import com.cuidalink.patient.domain.model.PatientId;

public class Medication {

    private final MedicationId id;
    private final PatientId patientId;
    private String name;
    private String dosage;
    private String instructions;
    private MedicationSchedule schedule;
    private boolean active;

    public Medication(MedicationId id, PatientId patientId, String name, String dosage,
                      String instructions, MedicationSchedule schedule, boolean active) {
        this.id = id;
        this.patientId = patientId;
        this.name = name;
        this.dosage = dosage;
        this.instructions = instructions;
        this.schedule = schedule;
        this.active = active;
    }

    public void update(String name, String dosage, String instructions, MedicationSchedule schedule) {
        this.name = name;
        this.dosage = dosage;
        this.instructions = instructions;
        this.schedule = schedule;
    }

    public void deactivate() { this.active = false; }

    public MedicationId getId() { return id; }
    public PatientId getPatientId() { return patientId; }
    public String getName() { return name; }
    public String getDosage() { return dosage; }
    public String getInstructions() { return instructions; }
    public MedicationSchedule getSchedule() { return schedule; }
    public boolean isActive() { return active; }
}
