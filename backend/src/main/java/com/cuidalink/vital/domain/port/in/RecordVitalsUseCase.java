package com.cuidalink.vital.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.vital.domain.model.VitalRecord;
import com.cuidalink.vital.domain.model.VitalSignDefinitionId;

import java.util.List;

public interface RecordVitalsUseCase {

    record VitalMeasurementDto(VitalSignDefinitionId definitionId, String value) {}

    record RecordVitalsCommand(
        PatientId patientId,
        UserId recordedBy,
        List<VitalMeasurementDto> measurements
    ) {}

    VitalRecord record(RecordVitalsCommand command);
}
