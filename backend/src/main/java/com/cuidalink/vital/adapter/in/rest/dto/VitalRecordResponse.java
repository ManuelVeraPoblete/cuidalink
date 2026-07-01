package com.cuidalink.vital.adapter.in.rest.dto;

import java.util.List;

public record VitalRecordResponse(
    String id,
    String patientId,
    String recordedById,
    String recordedAt,
    List<VitalMeasurementResponse> measurements
) {}
