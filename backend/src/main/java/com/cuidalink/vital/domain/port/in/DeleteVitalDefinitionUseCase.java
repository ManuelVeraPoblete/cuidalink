package com.cuidalink.vital.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.vital.domain.model.VitalSignDefinitionId;

public interface DeleteVitalDefinitionUseCase {
    void delete(VitalSignDefinitionId definitionId, PatientId patientId, UserId requesterId);
}
