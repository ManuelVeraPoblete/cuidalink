package com.cuidalink.caretask.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.CareTaskLog;
import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDate;
import java.util.List;

public interface GetDailyCareTaskLogsUseCase {
    List<CareTaskLog> getLogs(PatientId patientId, LocalDate date, UserId requesterId);
}
