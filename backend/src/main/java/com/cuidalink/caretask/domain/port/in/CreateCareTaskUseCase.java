package com.cuidalink.caretask.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.CareTask;
import com.cuidalink.caretask.domain.model.CareTaskPriority;
import com.cuidalink.caretask.domain.model.CareTaskSchedule;
import com.cuidalink.patient.domain.model.PatientId;

public interface CreateCareTaskUseCase {

    record CreateCareTaskCommand(
        PatientId patientId,
        String name,
        String instructions,
        CareTaskSchedule schedule,
        CareTaskPriority priority,
        boolean reminderActive,
        UserId requesterId
    ) {}

    CareTask execute(CreateCareTaskCommand command);
}
