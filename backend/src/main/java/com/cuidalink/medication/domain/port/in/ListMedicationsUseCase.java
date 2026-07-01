package com.cuidalink.medication.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.medication.domain.model.Medication;
import com.cuidalink.patient.domain.model.PatientId;

import java.util.List;

public interface ListMedicationsUseCase {
    List<Medication> listMedications(PatientId patientId, UserId requesterId);
}
