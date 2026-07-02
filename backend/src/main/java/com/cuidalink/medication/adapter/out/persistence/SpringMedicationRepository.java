package com.cuidalink.medication.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringMedicationRepository extends JpaRepository<MedicationJpaEntity, String> {
    List<MedicationJpaEntity> findByPatientId(String patientId);
    List<MedicationJpaEntity> findByActiveTrue();
}
