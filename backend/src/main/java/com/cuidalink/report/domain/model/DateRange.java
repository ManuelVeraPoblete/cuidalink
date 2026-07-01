package com.cuidalink.report.domain.model;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public record DateRange(LocalDate from, LocalDate to) {
    public DateRange {
        if (from.isAfter(to)) throw new IllegalArgumentException("from debe ser anterior a to");
        if (ChronoUnit.DAYS.between(from, to) > 90)
            throw new IllegalArgumentException("El rango no puede superar 90 días");
    }
}
