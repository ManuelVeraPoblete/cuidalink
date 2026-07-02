package com.cuidalink.vital.domain.port.out;

import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.vital.domain.model.VitalSignDefinition;
import com.cuidalink.vital.domain.model.VitalSignDefinitionId;

import java.util.List;
import java.util.Optional;

public interface VitalDefinitionRepository {
    VitalSignDefinition save(VitalSignDefinition definition);
    Optional<VitalSignDefinition> findById(VitalSignDefinitionId id);
    List<VitalSignDefinition> findByPatientId(PatientId patientId);
    void deleteById(VitalSignDefinitionId id);
}
