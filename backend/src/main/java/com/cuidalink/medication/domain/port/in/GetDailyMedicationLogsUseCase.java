package com.cuidalink.medication.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.medication.domain.model.MedicationLog;
import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDate;
import java.util.List;

public interface GetDailyMedicationLogsUseCase {
    List<MedicationLog> getLogs(PatientId patientId, LocalDate date, UserId requesterId);
}
