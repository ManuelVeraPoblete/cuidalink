package com.cuidalink.report.domain.model;

import java.time.LocalDateTime;
import java.util.List;

public record VitalRecordEntry(
        LocalDateTime recordedAt,
        String recordedBy,
        List<VitalMeasurementEntry> measurements) {}
