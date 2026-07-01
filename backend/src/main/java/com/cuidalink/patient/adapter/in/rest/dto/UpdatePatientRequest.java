package com.cuidalink.patient.adapter.in.rest.dto;

import com.cuidalink.patient.domain.model.Gender;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record UpdatePatientRequest(
    @NotBlank String fullName,
    @NotNull LocalDate birthDate,
    @NotNull Gender gender,
    @NotBlank String identificationNumber,
    @NotBlank String address,
    @NotBlank String healthInsurance,
    @NotBlank String bloodType,
    String healthCondition,
    String allergies,
    @NotNull @Valid EmergencyContactDto emergencyContact
) {}
