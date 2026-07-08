package com.cuidalink.caretask.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringCareTaskRepository extends JpaRepository<CareTaskJpaEntity, String> {
    List<CareTaskJpaEntity> findByPatientId(String patientId);
    List<CareTaskJpaEntity> findByActiveTrue();
}
