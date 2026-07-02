package com.cuidalink.vital.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface SpringVitalRecordRepository extends JpaRepository<VitalRecordJpaEntity, String> {
    List<VitalRecordJpaEntity> findByPatientIdAndRecordedAtBetween(
        String patientId, LocalDateTime from, LocalDateTime to);

    List<VitalRecordJpaEntity> findByPatientIdAndRecordedAtGreaterThanEqualAndRecordedAtLessThan(
        String patientId, LocalDateTime from, LocalDateTime to);
}
