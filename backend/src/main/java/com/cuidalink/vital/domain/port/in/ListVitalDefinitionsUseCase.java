package com.cuidalink.vital.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.vital.domain.model.VitalSignDefinition;

import java.util.List;

public interface ListVitalDefinitionsUseCase {
    List<VitalSignDefinition> list(PatientId patientId, UserId requesterId);
}
