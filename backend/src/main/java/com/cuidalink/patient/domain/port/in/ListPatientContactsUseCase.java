package com.cuidalink.patient.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientContact;
import com.cuidalink.patient.domain.model.PatientId;

import java.util.List;

public interface ListPatientContactsUseCase {
    List<PatientContact> list(PatientId patientId, UserId requesterId);
}
