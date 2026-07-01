package com.cuidalink.report.domain.model;

public record VitalMeasurementEntry(
        String vitalName,
        String value,
        String unit,
        boolean outOfRange) {}
