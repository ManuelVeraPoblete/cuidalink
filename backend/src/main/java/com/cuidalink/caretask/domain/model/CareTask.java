package com.cuidalink.caretask.domain.model;

import com.cuidalink.patient.domain.model.PatientId;

public class CareTask {

    private final CareTaskId id;
    private final PatientId patientId;
    private String name;
    private String instructions;
    private CareTaskSchedule schedule;
    private CareTaskPriority priority;
    private boolean reminderActive;
    private boolean active;

    public CareTask(CareTaskId id, PatientId patientId, String name, String instructions,
                    CareTaskSchedule schedule, CareTaskPriority priority,
                    boolean reminderActive, boolean active) {
        this.id = id;
        this.patientId = patientId;
        this.name = name;
        this.instructions = instructions;
        this.schedule = schedule;
        this.priority = priority;
        this.reminderActive = reminderActive;
        this.active = active;
    }

    public void update(String name, String instructions, CareTaskSchedule schedule,
                       CareTaskPriority priority, boolean reminderActive) {
        this.name = name;
        this.instructions = instructions;
        this.schedule = schedule;
        this.priority = priority;
        this.reminderActive = reminderActive;
    }

    public void deactivate() { this.active = false; }

    public CareTaskId getId() { return id; }
    public PatientId getPatientId() { return patientId; }
    public String getName() { return name; }
    public String getInstructions() { return instructions; }
    public CareTaskSchedule getSchedule() { return schedule; }
    public CareTaskPriority getPriority() { return priority; }
    public boolean isReminderActive() { return reminderActive; }
    public boolean isActive() { return active; }
}
