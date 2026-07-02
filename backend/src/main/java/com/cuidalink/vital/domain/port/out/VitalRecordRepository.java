package com.cuidalink.vital.domain.port.out;

import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.vital.domain.model.VitalRecord;
import com.cuidalink.vital.domain.model.VitalRecordId;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface VitalRecordRepository {
    VitalRecord save(VitalRecord record);
    Optional<VitalRecord> findById(VitalRecordId id);
    List<VitalRecord> findByPatientIdBetween(PatientId patientId, LocalDateTime from, LocalDateTime to);
    List<VitalRecord> findByPatientAndDateRange(PatientId patientId, LocalDate from, LocalDate to);
}
