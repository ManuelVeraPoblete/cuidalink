package com.cuidalink.patient.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.Patient;

public interface JoinWithCodeUseCase {
    Patient join(String code, UserId newCollaborator);
}
