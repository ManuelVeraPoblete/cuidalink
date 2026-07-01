package com.cuidalink.patient.adapter.in.rest.dto;

import jakarta.validation.constraints.NotBlank;

public record EmergencyContactDto(
    @NotBlank String name,
    @NotBlank String phone
) {}
