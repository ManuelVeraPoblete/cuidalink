package com.cuidalink.patient.adapter.out.persistence;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.medication.domain.model.MedicationId;
import com.cuidalink.patient.domain.model.*;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class JpaPatientRepositoryAdapter implements PatientRepository {

    private final SpringPatientRepository jpa;

    public JpaPatientRepositoryAdapter(SpringPatientRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public Patient save(Patient p) {
        jpa.save(toJpa(p));
        return p;
    }

    @Override
    public Optional<Patient> findById(PatientId id) {
        return jpa.findById(id.value().toString()).map(this::toDomain);
    }

    @Override
    public List<Patient> findByOwnerOrCollaborator(UserId userId) {
        String uid = userId.value().toString();
        return jpa.findAllForUser(uid)
            .stream().map(this::toDomain).toList();
    }

    @Override
    public Optional<Patient> findByInvitationCode(String code) {
        return jpa.findByInvitationCodesCode(code).map(this::toDomain);
    }

    @Override
    public Optional<Patient> findByMedicationId(MedicationId medicationId) {
        return jpa.findByMedicationId(medicationId.value().toString()).map(this::toDomain);
    }

    // ---- Mappers ----

    private PatientJpaEntity toJpa(Patient p) {
        var e = new PatientJpaEntity();
        e.setId(p.getId().value().toString());
        e.setFullName(p.getFullName());
        e.setBirthDate(p.getBirthDate());
        e.setGender(p.getGender().name());
        e.setIdentificationNumber(p.getIdentificationNumber());
        e.setAddress(p.getAddress());
        e.setHealthInsurance(p.getHealthInsurance());
        e.setBloodType(p.getBloodType());
        e.setHealthCondition(p.getHealthCondition());
        e.setAllergies(p.getAllergies());
        e.setEmergencyContactName(p.getEmergencyContact().name());
        e.setEmergencyContactPhone(p.getEmergencyContact().phone());
        e.setPrimaryCaregiverId(p.getPrimaryCaregiver().value().toString());
        e.setActive(p.isActive());

        e.setCollaborators(p.getCollaborators().stream()
            .map(c -> new CollaboratorEmbeddable(
                c.userId().value().toString(), c.joinedAt()))
            .toList());

        e.setInvitationCodes(p.getInvitationCodes().stream()
            .map(ic -> new InvitationCodeEmbeddable(ic.code(), ic.expiresAt(), ic.used()))
            .toList());

        return e;
    }

    private Patient toDomain(PatientJpaEntity e) {
        List<Collaborator> collaborators = e.getCollaborators().stream()
            .map(c -> new Collaborator(
                new UserId(UUID.fromString(c.getUserId())), c.getJoinedAt()))
            .toList();

        List<InvitationCode> invitationCodes = e.getInvitationCodes().stream()
            .map(ic -> new InvitationCode(ic.getCode(), ic.getExpiresAt(), ic.isUsed()))
            .toList();

        return new Patient(
            new PatientId(UUID.fromString(e.getId())),
            e.getFullName(),
            e.getBirthDate(),
            Gender.valueOf(e.getGender()),
            e.getIdentificationNumber(),
            e.getAddress(),
            e.getHealthInsurance(),
            e.getBloodType(),
            e.getHealthCondition(),
            e.getAllergies(),
            new EmergencyContact(e.getEmergencyContactName(), e.getEmergencyContactPhone()),
            new UserId(UUID.fromString(e.getPrimaryCaregiverId())),
            collaborators,
            invitationCodes,
            e.isActive()
        );
    }
}
