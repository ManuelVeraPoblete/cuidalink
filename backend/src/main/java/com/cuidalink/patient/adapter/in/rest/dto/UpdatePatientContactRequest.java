package com.cuidalink.patient.adapter.in.rest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdatePatientContactRequest(
    @NotBlank String name,
    @NotNull String category,
    String relationship,
    @NotBlank String phone,
    String email,
    String note,
    boolean priority
) {}
