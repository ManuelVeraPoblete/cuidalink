package com.cuidalink.patient.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientId;

public interface ArchivePatientUseCase {
    void archivePatient(PatientId patientId, UserId requesterId);
}
