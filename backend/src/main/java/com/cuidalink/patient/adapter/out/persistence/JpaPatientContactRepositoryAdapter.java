package com.cuidalink.patient.adapter.out.persistence;

import com.cuidalink.patient.domain.model.*;
import com.cuidalink.patient.domain.port.out.PatientContactRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class JpaPatientContactRepositoryAdapter implements PatientContactRepository {

    private final SpringPatientContactRepository jpa;

    public JpaPatientContactRepositoryAdapter(SpringPatientContactRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public PatientContact save(PatientContact contact) {
        jpa.save(toJpa(contact));
        return contact;
    }

    @Override
    public Optional<PatientContact> findById(PatientContactId id) {
        return jpa.findById(id.value().toString()).map(this::toDomain);
    }

    @Override
    public List<PatientContact> findByPatientId(PatientId patientId) {
        return jpa.findByPatientId(patientId.value().toString())
            .stream().map(this::toDomain).toList();
    }

    private PatientContactJpaEntity toJpa(PatientContact c) {
        var e = new PatientContactJpaEntity();
        e.setId(c.getId().value().toString());
        e.setPatientId(c.getPatientId().value().toString());
        e.setName(c.getName());
        e.setCategory(c.getCategory().name());
        e.setRelationship(c.getRelationship());
        e.setPhone(c.getPhone());
        e.setEmail(c.getEmail());
        e.setNote(c.getNote());
        e.setPriority(c.isPriority());
        return e;
    }

    private PatientContact toDomain(PatientContactJpaEntity e) {
        return new PatientContact(
            new PatientContactId(UUID.fromString(e.getId())),
            new PatientId(UUID.fromString(e.getPatientId())),
            e.getName(),
            PatientContactCategory.valueOf(e.getCategory()),
            e.getRelationship(),
            e.getPhone(),
            e.getEmail(),
            e.getNote(),
            e.isPriority()
        );
    }
}
