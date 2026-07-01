package com.cuidalink.medication.adapter.in.rest.dto;

public record MedicationLogResponse(
    String id,
    String medicationId,
    String scheduledAt,
    String status,
    String administeredById,
    String confirmedAt
) {}
