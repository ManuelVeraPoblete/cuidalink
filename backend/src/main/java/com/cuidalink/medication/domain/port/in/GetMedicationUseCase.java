package com.cuidalink.medication.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.medication.domain.model.Medication;
import com.cuidalink.medication.domain.model.MedicationId;
import com.cuidalink.patient.domain.model.PatientId;

public interface GetMedicationUseCase {
    Medication getMedication(PatientId patientId, MedicationId medicationId, UserId requesterId);
}
