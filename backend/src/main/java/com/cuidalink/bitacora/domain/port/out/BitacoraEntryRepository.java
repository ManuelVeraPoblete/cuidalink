package com.cuidalink.bitacora.domain.port.out;

import com.cuidalink.bitacora.domain.model.BitacoraEntry;
import com.cuidalink.patient.domain.model.PatientId;

import java.time.LocalDateTime;
import java.util.List;

public interface BitacoraEntryRepository {
    BitacoraEntry save(BitacoraEntry entry);
    List<BitacoraEntry> findByPatientIdAndRecordedAtBetween(PatientId patientId, LocalDateTime from, LocalDateTime to);
}
