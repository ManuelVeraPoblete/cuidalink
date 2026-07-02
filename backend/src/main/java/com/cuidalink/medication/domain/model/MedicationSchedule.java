package com.cuidalink.medication.domain.model;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public record MedicationSchedule(
    List<LocalTime> times,
    Frequency frequency,
    List<DayOfWeek> daysOfWeek,
    LocalDate startDate,
    LocalDate endDate,
    Integer intervalDays,
    LocalTime startTime,
    Integer frequencyHours
) {

    public MedicationSchedule(List<LocalTime> times, Frequency frequency, List<DayOfWeek> daysOfWeek,
                              LocalDate startDate, LocalDate endDate, Integer intervalDays) {
        this(times, frequency, daysOfWeek, startDate, endDate, intervalDays, null, null);
    }

    public static MedicationSchedule fromDailyInterval(LocalTime startTime, int frequencyHours,
                                                        LocalDate startDate, LocalDate endDate) {
        if (startTime == null)
            throw new IllegalArgumentException("La hora de inicio es obligatoria");
        if (frequencyHours < 1 || frequencyHours > 24)
            throw new IllegalArgumentException("La frecuencia debe estar entre 1 y 24 horas");
        if (startDate == null)
            throw new IllegalArgumentException("La fecha de inicio es obligatoria");
        if (endDate != null && endDate.isBefore(startDate))
            throw new IllegalArgumentException("La fecha de término no puede ser anterior a la fecha de inicio");

        List<LocalTime> times = new ArrayList<>();
        for (int hours = 0; hours < 24; hours += frequencyHours) {
            times.add(startTime.plusHours(hours));
        }

        return new MedicationSchedule(times, Frequency.DAILY, List.of(), startDate, endDate,
            null, startTime, frequencyHours);
    }
}
