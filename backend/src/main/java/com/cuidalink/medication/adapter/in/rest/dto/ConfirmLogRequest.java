package com.cuidalink.medication.adapter.in.rest.dto;

import com.cuidalink.medication.domain.model.LogStatus;
import jakarta.validation.constraints.NotNull;

public record ConfirmLogRequest(
    @NotNull LogStatus status
) {}
