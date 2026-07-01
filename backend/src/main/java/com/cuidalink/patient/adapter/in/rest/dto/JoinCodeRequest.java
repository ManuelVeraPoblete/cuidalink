package com.cuidalink.patient.adapter.in.rest.dto;

import jakarta.validation.constraints.NotBlank;

public record JoinCodeRequest(
    @NotBlank String code
) {}
