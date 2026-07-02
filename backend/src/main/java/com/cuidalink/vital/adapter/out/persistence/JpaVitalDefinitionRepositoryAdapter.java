package com.cuidalink.vital.adapter.out.persistence;

import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.vital.domain.model.VitalSignDefinition;
import com.cuidalink.vital.domain.model.VitalSignDefinitionId;
import com.cuidalink.vital.domain.port.out.VitalDefinitionRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class JpaVitalDefinitionRepositoryAdapter implements VitalDefinitionRepository {

    private final SpringVitalDefinitionRepository jpa;

    public JpaVitalDefinitionRepositoryAdapter(SpringVitalDefinitionRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public VitalSignDefinition save(VitalSignDefinition def) {
        jpa.save(toJpa(def));
        return def;
    }

    @Override
    public Optional<VitalSignDefinition> findById(VitalSignDefinitionId id) {
        return jpa.findById(id.value().toString()).map(this::toDomain);
    }

    @Override
    public List<VitalSignDefinition> findByPatientId(PatientId patientId) {
        return jpa.findByPatientId(patientId.value().toString())
            .stream().map(this::toDomain).toList();
    }

    @Override
    public void deleteById(VitalSignDefinitionId id) {
        jpa.deleteById(id.value().toString());
    }

    // ---- Mappers ----

    private VitalDefinitionJpaEntity toJpa(VitalSignDefinition def) {
        var e = new VitalDefinitionJpaEntity();
        e.setId(def.getId().value().toString());
        e.setPatientId(def.getPatientId().value().toString());
        e.setName(def.getName());
        e.setUnit(def.getUnit());
        e.setNormalRangeMin(def.getNormalRangeMin());
        e.setNormalRangeMax(def.getNormalRangeMax());
        return e;
    }

    private VitalSignDefinition toDomain(VitalDefinitionJpaEntity e) {
        return new VitalSignDefinition(
            new VitalSignDefinitionId(UUID.fromString(e.getId())),
            new PatientId(UUID.fromString(e.getPatientId())),
            e.getName(),
            e.getUnit(),
            e.getNormalRangeMin(),
            e.getNormalRangeMax()
        );
    }
}
