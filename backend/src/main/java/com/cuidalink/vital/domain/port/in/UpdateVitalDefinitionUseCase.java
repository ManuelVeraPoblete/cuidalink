package com.cuidalink.vital.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.vital.domain.model.VitalSignDefinition;
import com.cuidalink.vital.domain.model.VitalSignDefinitionId;

public interface UpdateVitalDefinitionUseCase {

    record UpdateVitalDefinitionCommand(
        PatientId patientId,
        VitalSignDefinitionId definitionId,
        String name,
        String unit,
        Double normalRangeMin,
        Double normalRangeMax,
        UserId requesterId
    ) {}

    VitalSignDefinition execute(UpdateVitalDefinitionCommand command);
}
