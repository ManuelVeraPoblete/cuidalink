package com.cuidalink.caretask.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.CareTask;
import com.cuidalink.caretask.domain.model.CareTaskId;
import com.cuidalink.patient.domain.model.PatientId;

public interface GetCareTaskUseCase {
    CareTask getTask(PatientId patientId, CareTaskId taskId, UserId requesterId);
}
