package com.cuidalink.patient.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientContact;
import com.cuidalink.patient.domain.model.PatientContactCategory;
import com.cuidalink.patient.domain.model.PatientId;

public interface CreatePatientContactUseCase {

    record CreatePatientContactCommand(
        PatientId patientId,
        String name,
        PatientContactCategory category,
        String relationship,
        String phone,
        String email,
        String note,
        boolean priority,
        UserId requesterId
    ) {}

    PatientContact execute(CreatePatientContactCommand command);
}
