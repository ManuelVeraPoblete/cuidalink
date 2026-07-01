package com.cuidalink.patient.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.Patient;
import com.cuidalink.patient.domain.model.PatientId;

public interface FindPatientUseCase {
    Patient findPatient(PatientId patientId, UserId requesterId);
}
