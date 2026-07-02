package com.cuidalink.medication.domain.port.out;

import com.cuidalink.medication.domain.model.Medication;
import com.cuidalink.medication.domain.model.MedicationId;
import com.cuidalink.patient.domain.model.PatientId;

import java.util.List;
import java.util.Optional;

public interface MedicationRepository {
    Medication save(Medication medication);
    Optional<Medication> findById(MedicationId id);
    List<Medication> findByPatientId(PatientId patientId);
    List<Medication> findAllActive();
}
