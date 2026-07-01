package com.cuidalink.vital.adapter.in.rest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VitalMeasurementRequest(
    @NotBlank String definitionId,
    @NotBlank @Pattern(regexp = "^[^|]+$", message = "El valor no puede contener '|'") String value
) {}
