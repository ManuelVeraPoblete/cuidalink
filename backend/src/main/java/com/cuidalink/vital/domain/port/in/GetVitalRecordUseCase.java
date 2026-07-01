package com.cuidalink.vital.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.vital.domain.model.VitalRecord;
import com.cuidalink.vital.domain.model.VitalRecordId;

public interface GetVitalRecordUseCase {
    VitalRecord getById(PatientId patientId, VitalRecordId recordId, UserId requesterId);
}
