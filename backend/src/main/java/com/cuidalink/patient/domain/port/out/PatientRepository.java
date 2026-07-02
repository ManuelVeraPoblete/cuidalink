package com.cuidalink.patient.domain.port.out;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.medication.domain.model.MedicationId;
import com.cuidalink.patient.domain.model.Patient;
import com.cuidalink.patient.domain.model.PatientId;

import java.util.List;
import java.util.Optional;

public interface PatientRepository {
    Patient save(Patient patient);
    Optional<Patient> findById(PatientId id);
    List<Patient> findByOwnerOrCollaborator(UserId userId);
    Optional<Patient> findByInvitationCode(String code);
    Optional<Patient> findByMedicationId(MedicationId medicationId);
}
