package com.cuidalink.patient.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.Collaborator;
import com.cuidalink.patient.domain.model.PatientId;

import java.util.List;

public interface ListCollaboratorsUseCase {
    List<Collaborator> listCollaborators(PatientId patientId, UserId requesterId);
}
