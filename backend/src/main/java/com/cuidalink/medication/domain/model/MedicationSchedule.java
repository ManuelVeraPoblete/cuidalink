package com.cuidalink.medication.domain.model;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record MedicationSchedule(
    List<LocalTime> times,
    Frequency frequency,
    List<DayOfWeek> daysOfWeek,
    LocalDate startDate,
    LocalDate endDate,
    Integer intervalDays
) {}
