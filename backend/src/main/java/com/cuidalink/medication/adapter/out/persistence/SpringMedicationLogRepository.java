package com.cuidalink.medication.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SpringMedicationLogRepository extends JpaRepository<MedicationLogJpaEntity, String> {

    @Query("SELECT l FROM MedicationLogJpaEntity l WHERE l.patientId = :patientId AND l.scheduledAt >= :startOfDay AND l.scheduledAt < :startOfNextDay")
    List<MedicationLogJpaEntity> findByPatientIdAndDate(
        @Param("patientId") String patientId,
        @Param("startOfDay") LocalDateTime startOfDay,
        @Param("startOfNextDay") LocalDateTime startOfNextDay
    );

    @Query("SELECT l FROM MedicationLogJpaEntity l WHERE l.status = 'PENDING' AND l.scheduledAt < :threshold")
    List<MedicationLogJpaEntity> findPendingOlderThan(@Param("threshold") LocalDateTime threshold);

    boolean existsByMedicationIdAndScheduledAt(String medicationId, LocalDateTime scheduledAt);

    @Query("SELECT l FROM MedicationLogJpaEntity l WHERE l.patientId = :patientId AND l.scheduledAt >= :from AND l.scheduledAt < :to")
    List<MedicationLogJpaEntity> findByPatientIdAndDateRange(
        @Param("patientId") String patientId,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );
}
