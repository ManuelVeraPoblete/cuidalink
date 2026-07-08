package com.cuidalink.caretask.adapter.in.rest.dto;

public record CareTaskResponse(
    String id,
    String patientId,
    String name,
    String instructions,
    String priority,
    boolean reminderActive,
    CareTaskScheduleDto schedule,
    boolean active
) {}
