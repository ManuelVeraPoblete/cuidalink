package com.cuidalink.report.domain.model;

import java.time.LocalDateTime;

public record MedicationLogEntry(
        String medicationName,
        LocalDateTime scheduledAt,
        String status,
        String administeredBy) {}
