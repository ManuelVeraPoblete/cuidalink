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
    private final MedicationType type;

    public Medication(MedicationId id, PatientId patientId, String name, String dosage,
                      String instructions, MedicationSchedule schedule, boolean active,
                      MedicationType type) {
        this.id = id;
        this.patientId = patientId;
        this.name = name;
        this.dosage = dosage;
        this.instructions = instructions;
        this.schedule = schedule;
        this.active = active;
        this.type = type;
    }

    /** Convenience constructor for callers that don't set a type yet — defaults to TABLET. */
    public Medication(MedicationId id, PatientId patientId, String name, String dosage,
                      String instructions, MedicationSchedule schedule, boolean active) {
        this(id, patientId, name, dosage, instructions, schedule, active, MedicationType.TABLET);
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
    public MedicationType getType() { return type; }
}
