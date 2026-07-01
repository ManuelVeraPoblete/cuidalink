package com.cuidalink.patient.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.EmergencyContact;
import com.cuidalink.patient.domain.model.Gender;
import com.cuidalink.patient.domain.model.Patient;
import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDate;

public interface UpdatePatientUseCase {
    record UpdatePatientCommand(
        PatientId patientId,
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
        UserId requesterId
    ) {}

    Patient updatePatient(UpdatePatientCommand command);
}
