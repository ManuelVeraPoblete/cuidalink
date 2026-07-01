package com.cuidalink.medication.adapter.in.rest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateMedicationRequest(
    @NotBlank String name,
    @NotBlank String dosage,
    String instructions,
    @NotNull MedicationScheduleDto schedule
) {}
