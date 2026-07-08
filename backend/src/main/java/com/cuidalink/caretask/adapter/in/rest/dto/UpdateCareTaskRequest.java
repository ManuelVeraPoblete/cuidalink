package com.cuidalink.caretask.adapter.in.rest.dto;

import com.cuidalink.caretask.domain.model.CareTaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateCareTaskRequest(
    @NotBlank String name,
    String instructions,
    @NotNull CareTaskScheduleDto schedule,
    @NotNull CareTaskPriority priority,
    boolean reminderActive
) {}
