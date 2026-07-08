package com.cuidalink.patient.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpringPatientContactRepository extends JpaRepository<PatientContactJpaEntity, String> {
    List<PatientContactJpaEntity> findByPatientId(String patientId);
}
