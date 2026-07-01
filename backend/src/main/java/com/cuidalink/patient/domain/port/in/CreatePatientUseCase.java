package com.cuidalink.patient.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.EmergencyContact;
import com.cuidalink.patient.domain.model.Gender;
import com.cuidalink.patient.domain.model.Patient;

import java.time.LocalDate;

public interface CreatePatientUseCase {
    record CreatePatientCommand(
        String fullName,
        LocalDate birthDate,
        Gender gender,
        String identificationNumber,
        String address,
        String healthInsurance,
        String bloodType,
        String healthCondition,
        String allergies,
        EmergencyContact emergencyContact,
        UserId primaryCaregiver
    ) {}

    Patient execute(CreatePatientCommand command);
}
