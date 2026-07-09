package com.cuidalink.bitacora.domain.port.in;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.bitacora.domain.model.BitacoraEntry;
import com.cuidalink.bitacora.domain.model.BitacoraEntryType;
import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDate;
import java.util.List;

public interface ListBitacoraEntriesUseCase {
    List<BitacoraEntry> list(PatientId patientId, LocalDate from, LocalDate to,
                              BitacoraEntryType type, UserId requesterId);
}
