package com.cuidalink.medication.adapter.out.persistence;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "medications")
public class MedicationJpaEntity {

    @Id
    private String id;
    private String patientId;
    private String name;
    private String dosage;
    private String instructions;
    private boolean active;
    private String type;

    // Schedule fields — stored as primitives/strings for simplicity
    private String frequency;
    private String scheduleTimes;       // comma-separated HH:mm, e.g. "08:00,14:00"
    private String scheduleDaysOfWeek;  // comma-separated DayOfWeek names, e.g. "MONDAY,FRIDAY"
    private LocalDate scheduleStartDate;
    private LocalDate scheduleEndDate;
    private Integer scheduleIntervalDays;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDosage() { return dosage; }
    public void setDosage(String dosage) { this.dosage = dosage; }

    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }

    public String getScheduleTimes() { return scheduleTimes; }
    public void setScheduleTimes(String scheduleTimes) { this.scheduleTimes = scheduleTimes; }

    public String getScheduleDaysOfWeek() { return scheduleDaysOfWeek; }
    public void setScheduleDaysOfWeek(String scheduleDaysOfWeek) { this.scheduleDaysOfWeek = scheduleDaysOfWeek; }

    public LocalDate getScheduleStartDate() { return scheduleStartDate; }
    public void setScheduleStartDate(LocalDate scheduleStartDate) { this.scheduleStartDate = scheduleStartDate; }

    public LocalDate getScheduleEndDate() { return scheduleEndDate; }
    public void setScheduleEndDate(LocalDate scheduleEndDate) { this.scheduleEndDate = scheduleEndDate; }

    public Integer getScheduleIntervalDays() { return scheduleIntervalDays; }
    public void setScheduleIntervalDays(Integer scheduleIntervalDays) { this.scheduleIntervalDays = scheduleIntervalDays; }
}
