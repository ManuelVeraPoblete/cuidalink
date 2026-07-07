package com.cuidalink.caretask.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.CareTask;
import com.cuidalink.patient.domain.model.PatientId;

import java.util.List;

public interface ListCareTasksUseCase {
    List<CareTask> listTasks(PatientId patientId, UserId requesterId);
}
