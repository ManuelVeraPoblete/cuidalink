package com.cuidalink.caretask.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.CareTask;
import com.cuidalink.caretask.domain.model.CareTaskId;
import com.cuidalink.caretask.domain.model.CareTaskPriority;
import com.cuidalink.caretask.domain.model.CareTaskSchedule;
import com.cuidalink.patient.domain.model.PatientId;

public interface UpdateCareTaskUseCase {

    record UpdateCareTaskCommand(
        PatientId patientId,
        CareTaskId taskId,
        String name,
        String instructions,
        CareTaskSchedule schedule,
        CareTaskPriority priority,
        boolean reminderActive,
        UserId requesterId
    ) {}

    CareTask updateTask(UpdateCareTaskCommand command);
}
