package com.cuidalink.bitacora.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.bitacora.domain.model.BitacoraEntry;
import com.cuidalink.patient.domain.model.PatientId;

public interface CreateBitacoraEntryUseCase {

    record CreateBitacoraEntryCommand(PatientId patientId, UserId authorId, String note) {}

    BitacoraEntry create(CreateBitacoraEntryCommand command);
}
