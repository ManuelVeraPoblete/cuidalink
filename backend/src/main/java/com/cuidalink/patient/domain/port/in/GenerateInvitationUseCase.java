package com.cuidalink.patient.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.InvitationCode;
import com.cuidalink.patient.domain.model.PatientId;

public interface GenerateInvitationUseCase {
    InvitationCode generate(PatientId patientId, UserId requesterId);
}
