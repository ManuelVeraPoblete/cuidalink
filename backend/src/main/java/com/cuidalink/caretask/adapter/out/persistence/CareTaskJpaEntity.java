package com.cuidalink.caretask.adapter.out.persistence;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "care_tasks")
public class CareTaskJpaEntity {

    @Id
    private String id;
    private String patientId;
    private String name;
    private String instructions;
    private String priority;
    private boolean reminderActive;
    private boolean active;

    private String scheduleTime;         // "HH:mm"
    private String scheduleType;         // DAYS_OF_WEEK | DATE_RANGE
    private String scheduleDaysOfWeek;   // "MONDAY,FRIDAY"
    private LocalDate scheduleStartDate;
    private LocalDate scheduleEndDate;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public boolean isReminderActive() { return reminderActive; }
    public void setReminderActive(boolean reminderActive) { this.reminderActive = reminderActive; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public String getScheduleTime() { return scheduleTime; }
    public void setScheduleTime(String scheduleTime) { this.scheduleTime = scheduleTime; }

    public String getScheduleType() { return scheduleType; }
    public void setScheduleType(String scheduleType) { this.scheduleType = scheduleType; }

    public String getScheduleDaysOfWeek() { return scheduleDaysOfWeek; }
    public void setScheduleDaysOfWeek(String scheduleDaysOfWeek) { this.scheduleDaysOfWeek = scheduleDaysOfWeek; }

    public LocalDate getScheduleStartDate() { return scheduleStartDate; }
    public void setScheduleStartDate(LocalDate scheduleStartDate) { this.scheduleStartDate = scheduleStartDate; }

    public LocalDate getScheduleEndDate() { return scheduleEndDate; }
    public void setScheduleEndDate(LocalDate scheduleEndDate) { this.scheduleEndDate = scheduleEndDate; }
}
