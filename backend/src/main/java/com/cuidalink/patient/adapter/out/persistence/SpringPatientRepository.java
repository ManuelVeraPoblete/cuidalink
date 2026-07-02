package com.cuidalink.patient.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SpringPatientRepository extends JpaRepository<PatientJpaEntity, String> {

    @Query("SELECT DISTINCT p FROM PatientJpaEntity p LEFT JOIN p.collaborators c WHERE p.primaryCaregiverId = :uid OR c.userId = :uid")
    List<PatientJpaEntity> findAllForUser(@Param("uid") String uid);

    Optional<PatientJpaEntity> findByInvitationCodesCode(String code);

    @Query("SELECT p FROM PatientJpaEntity p WHERE p.id = (SELECT m.patientId FROM MedicationJpaEntity m WHERE m.id = :medicationId)")
    Optional<PatientJpaEntity> findByMedicationId(@Param("medicationId") String medicationId);
}
