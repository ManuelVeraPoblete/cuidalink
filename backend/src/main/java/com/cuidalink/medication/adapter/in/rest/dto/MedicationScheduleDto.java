package com.cuidalink.medication.adapter.in.rest.dto;

import com.cuidalink.medication.domain.model.Frequency;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record MedicationScheduleDto(
    List<LocalTime> times,
    Frequency frequency,
    List<DayOfWeek> daysOfWeek,
    LocalDate startDate,
    LocalDate endDate,
    Integer intervalDays
) {}
