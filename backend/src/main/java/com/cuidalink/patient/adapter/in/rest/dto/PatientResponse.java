package com.cuidalink.patient.adapter.in.rest.dto;

public record PatientResponse(
    String id,
    String fullName,
    String birthDate,
    String gender,
    String identificationNumber,
    String address,
    String healthInsurance,
    String bloodType,
    EmergencyContactDto emergencyContact,
    boolean isOwner,
    boolean active
) {}
