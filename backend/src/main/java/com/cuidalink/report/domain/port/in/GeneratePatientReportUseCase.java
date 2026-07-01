package com.cuidalink.report.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.report.domain.model.DateRange;

public interface GeneratePatientReportUseCase {
    byte[] generate(PatientId patientId, UserId requesterId, DateRange period);
}
