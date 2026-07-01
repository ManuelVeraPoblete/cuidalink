package com.cuidalink.vital.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.vital.domain.model.VitalRecord;

import java.time.LocalDate;
import java.util.List;

public interface ListVitalRecordsUseCase {
    List<VitalRecord> list(PatientId patientId, LocalDate from, LocalDate to, UserId requesterId);
}
