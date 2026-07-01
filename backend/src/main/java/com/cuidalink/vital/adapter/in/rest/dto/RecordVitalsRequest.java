package com.cuidalink.vital.adapter.in.rest.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record RecordVitalsRequest(
    @NotEmpty @Valid List<VitalMeasurementRequest> measurements
) {}
