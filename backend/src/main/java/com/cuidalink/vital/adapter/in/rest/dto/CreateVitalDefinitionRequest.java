package com.cuidalink.vital.adapter.in.rest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateVitalDefinitionRequest(
    @NotBlank String name,
    @NotBlank String unit,
    @NotNull Double normalRangeMin,
    @NotNull Double normalRangeMax
) {}
