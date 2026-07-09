package com.cuidalink.bitacora.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface SpringBitacoraEntryRepository extends JpaRepository<BitacoraEntryJpaEntity, String> {
    List<BitacoraEntryJpaEntity> findByPatientIdAndRecordedAtBetween(
        String patientId, LocalDateTime from, LocalDateTime to);
}
