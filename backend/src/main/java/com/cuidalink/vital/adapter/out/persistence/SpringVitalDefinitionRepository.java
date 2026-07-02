package com.cuidalink.vital.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringVitalDefinitionRepository extends JpaRepository<VitalDefinitionJpaEntity, String> {
    List<VitalDefinitionJpaEntity> findByPatientId(String patientId);
}
