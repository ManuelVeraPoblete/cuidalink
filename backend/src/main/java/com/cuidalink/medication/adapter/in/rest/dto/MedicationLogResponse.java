package com.cuidalink.medication.adapter.in.rest.dto;

public record MedicationLogResponse(
    String id,
    String medicationId,
    String medicationName,
    String dosage,
    String instructions,
    String type,
    String scheduledAt,
    String status,
    String administeredById,
    String confirmedAt
) {}
