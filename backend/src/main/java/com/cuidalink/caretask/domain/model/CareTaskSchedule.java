package com.cuidalink.caretask.domain.model;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record CareTaskSchedule(
    LocalTime time,
    CareTaskScheduleType scheduleType,
    List<DayOfWeek> daysOfWeek,
    LocalDate startDate,
    LocalDate endDate
) {
    public CareTaskSchedule {
        if (time == null)
            throw new IllegalArgumentException("La hora es obligatoria");
        if (scheduleType == null)
            throw new IllegalArgumentException("El tipo de programación es obligatorio");
        daysOfWeek = daysOfWeek != null ? List.copyOf(daysOfWeek) : List.of();
        if (scheduleType == CareTaskScheduleType.DAYS_OF_WEEK && daysOfWeek.isEmpty())
            throw new IllegalArgumentException("Selecciona al menos un día de la semana");
        if (scheduleType == CareTaskScheduleType.DATE_RANGE) {
            if (startDate == null || endDate == null)
                throw new IllegalArgumentException("El rango de fechas requiere fecha de inicio y término");
            if (endDate.isBefore(startDate))
                throw new IllegalArgumentException("La fecha de término no puede ser anterior a la fecha de inicio");
        }
        if (startDate == null)
            throw new IllegalArgumentException("La fecha de inicio es obligatoria");
    }

    public boolean shouldRunOn(LocalDate date) {
        return switch (scheduleType) {
            case DAYS_OF_WEEK -> daysOfWeek.contains(date.getDayOfWeek()) && !date.isBefore(startDate);
            case DATE_RANGE -> !date.isBefore(startDate) && !date.isAfter(endDate);
        };
    }
}
