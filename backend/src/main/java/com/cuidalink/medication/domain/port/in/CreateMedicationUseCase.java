package com.cuidalink.medication.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.medication.domain.model.Medication;
import com.cuidalink.medication.domain.model.MedicationSchedule;
import com.cuidalink.patient.domain.model.PatientId;

public interface CreateMedicationUseCase {

    record CreateMedicationCommand(
        PatientId patientId,
        String name,
        String dosage,
        String instructions,
        MedicationSchedule schedule,
        UserId requesterId
    ) {}

    Medication execute(CreateMedicationCommand command);
}
