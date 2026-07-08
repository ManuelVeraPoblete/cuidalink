package com.cuidalink.patient.adapter.in.rest.dto;

public record PatientContactResponse(
    String id,
    String patientId,
    String name,
    String category,
    String relationship,
    String phone,
    String email,
    String note,
    boolean priority
) {}
