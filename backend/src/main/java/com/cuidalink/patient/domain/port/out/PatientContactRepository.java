package com.cuidalink.patient.domain.port.out;

import com.cuidalink.patient.domain.model.PatientContact;
import com.cuidalink.patient.domain.model.PatientContactId;
import com.cuidalink.patient.domain.model.PatientId;

import java.util.List;
import java.util.Optional;

public interface PatientContactRepository {
    PatientContact save(PatientContact contact);
    Optional<PatientContact> findById(PatientContactId id);
    List<PatientContact> findByPatientId(PatientId patientId);
}
