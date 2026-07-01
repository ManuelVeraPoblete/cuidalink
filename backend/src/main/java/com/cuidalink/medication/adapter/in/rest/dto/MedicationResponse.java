package com.cuidalink.medication.adapter.in.rest.dto;

public record MedicationResponse(
    String id,
    String patientId,
    String name,
    String dosage,
    String instructions,
    MedicationScheduleDto schedule,
    boolean active
) {}
