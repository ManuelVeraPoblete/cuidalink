package com.cuidalink.caretask.adapter.in.rest.dto;

public record CareTaskLogResponse(
    String id,
    String careTaskId,
    String taskName,
    String instructions,
    String priority,
    String scheduledAt,
    String status
) {}
