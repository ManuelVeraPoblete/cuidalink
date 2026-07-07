package com.cuidalink.caretask.domain.port.out;

import com.cuidalink.caretask.domain.model.CareTask;
import com.cuidalink.caretask.domain.model.CareTaskId;
import com.cuidalink.patient.domain.model.PatientId;

import java.util.List;
import java.util.Optional;

public interface CareTaskRepository {
    CareTask save(CareTask task);
    Optional<CareTask> findById(CareTaskId id);
    List<CareTask> findByPatientId(PatientId patientId);
    List<CareTask> findAllActive();
}
