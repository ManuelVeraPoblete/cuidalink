package com.cuidalink.medication.domain.port.out;

import com.cuidalink.medication.domain.model.MedicationLog;
import com.cuidalink.medication.domain.model.MedicationLogId;
import com.cuidalink.medication.domain.model.MedicationId;
import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MedicationLogRepository {
    MedicationLog save(MedicationLog log);
    Optional<MedicationLog> findById(MedicationLogId id);
    List<MedicationLog> findByPatientIdAndDate(PatientId patientId, LocalDate date);
    List<MedicationLog> findPendingOlderThan(LocalDateTime threshold);
    boolean existsByMedicationIdAndScheduledAt(MedicationId medicationId, LocalDateTime scheduledAt);
    List<MedicationLog> findByPatientAndDateRange(PatientId patientId, LocalDate from, LocalDate to);
}
