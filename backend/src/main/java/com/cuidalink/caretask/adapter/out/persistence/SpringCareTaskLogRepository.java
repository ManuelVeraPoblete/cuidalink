// backend/src/main/java/com/cuidalink/caretask/adapter/out/persistence/SpringCareTaskLogRepository.java
package com.cuidalink.caretask.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SpringCareTaskLogRepository extends JpaRepository<CareTaskLogJpaEntity, String> {

    @Query("SELECT l FROM CareTaskLogJpaEntity l WHERE l.patientId = :patientId AND l.scheduledAt >= :startOfDay AND l.scheduledAt < :startOfNextDay")
    List<CareTaskLogJpaEntity> findByPatientIdAndDate(
        @Param("patientId") String patientId,
        @Param("startOfDay") LocalDateTime startOfDay,
        @Param("startOfNextDay") LocalDateTime startOfNextDay
    );

    boolean existsByCareTaskIdAndScheduledAt(String careTaskId, LocalDateTime scheduledAt);

    List<CareTaskLogJpaEntity> findByStatusAndScheduledAt(String status, LocalDateTime scheduledAt);
}
