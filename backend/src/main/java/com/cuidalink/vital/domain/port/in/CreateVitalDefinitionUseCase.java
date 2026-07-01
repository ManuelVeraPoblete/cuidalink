package com.cuidalink.vital.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.vital.domain.model.VitalSignDefinition;

public interface CreateVitalDefinitionUseCase {

    record CreateVitalDefinitionCommand(
        PatientId patientId,
        String name,
        String unit,
        Double normalRangeMin,
        Double normalRangeMax,
        UserId requesterId
    ) {}

    VitalSignDefinition execute(CreateVitalDefinitionCommand command);
}
