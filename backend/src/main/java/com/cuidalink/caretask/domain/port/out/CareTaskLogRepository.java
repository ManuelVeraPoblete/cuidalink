package com.cuidalink.caretask.domain.port.out;

import com.cuidalink.caretask.domain.model.CareTaskId;
import com.cuidalink.caretask.domain.model.CareTaskLog;
import com.cuidalink.caretask.domain.model.CareTaskLogId;
import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CareTaskLogRepository {
    CareTaskLog save(CareTaskLog log);
    Optional<CareTaskLog> findById(CareTaskLogId id);
    List<CareTaskLog> findByPatientIdAndDate(PatientId patientId, LocalDate date);
    boolean existsByCareTaskIdAndScheduledAt(CareTaskId careTaskId, LocalDateTime scheduledAt);
    List<CareTaskLog> findDueForReminder(LocalDateTime windowStart, LocalDateTime windowEnd);
}
