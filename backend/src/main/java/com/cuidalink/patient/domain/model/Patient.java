package com.cuidalink.patient.domain.model;

import com.cuidalink.auth.domain.model.UserId;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class Patient {
    private final PatientId id;
    private String fullName;
    private LocalDate birthDate;
    private Gender gender;
    private String identificationNumber;
    private String address;
    private String healthInsurance;
    private String bloodType;
    private String healthCondition;
    private String allergies;
    private EmergencyContact emergencyContact;
    private final UserId primaryCaregiver;
    private final List<Collaborator> collaborators = new ArrayList<>();
    private final List<InvitationCode> invitationCodes = new ArrayList<>();
    private boolean active = true;

    public Patient(PatientId id, String fullName, LocalDate birthDate, Gender gender,
                   String identificationNumber, String address, String healthInsurance,
                   String bloodType, String healthCondition, String allergies,
                   EmergencyContact emergencyContact, UserId primaryCaregiver) {
        this.id = id;
        this.fullName = fullName;
        this.birthDate = birthDate;
        this.gender = gender;
        this.identificationNumber = identificationNumber;
        this.address = address;
        this.healthInsurance = healthInsurance;
        this.bloodType = bloodType;
        this.healthCondition = healthCondition;
        this.allergies = allergies;
        this.emergencyContact = emergencyContact;
        this.primaryCaregiver = primaryCaregiver;
    }

    /** Reconstruction constructor — for use by persistence adapters only. */
    public Patient(PatientId id, String fullName, LocalDate birthDate, Gender gender,
                   String identificationNumber, String address, String healthInsurance,
                   String bloodType, String healthCondition, String allergies,
                   EmergencyContact emergencyContact, UserId primaryCaregiver,
                   List<Collaborator> existingCollaborators,
                   List<InvitationCode> existingInvitationCodes,
                   boolean active) {
        this(id, fullName, birthDate, gender, identificationNumber, address, healthInsurance,
             bloodType, healthCondition, allergies, emergencyContact, primaryCaregiver);
        this.collaborators.addAll(existingCollaborators);
        this.invitationCodes.addAll(existingInvitationCodes);
        this.active = active;
    }

    public boolean isOwner(UserId userId) { return primaryCaregiver.equals(userId); }

    public boolean isCollaborator(UserId userId) {
        return collaborators.stream().anyMatch(c -> c.userId().equals(userId));
    }

    public boolean hasAccess(UserId userId) { return isOwner(userId) || isCollaborator(userId); }

    public InvitationCode generateInvitationCode() {
        var code = InvitationCode.generate();
        invitationCodes.add(code);
        return code;
    }

    public void addCollaborator(UserId userId) {
        if (isOwner(userId)) throw new IllegalArgumentException("El owner no puede ser colaborador");
        if (isCollaborator(userId)) throw new IllegalStateException("Ya es colaborador");
        collaborators.add(new Collaborator(userId, LocalDateTime.now()));
    }

    public void removeCollaborator(UserId userId) {
        collaborators.removeIf(c -> c.userId().equals(userId));
    }

    public void markCodeUsed(String code) {
        invitationCodes.stream()
            .filter(c -> c.code().equals(code))
            .findFirst()
            .ifPresent(c -> {
                invitationCodes.remove(c);
                invitationCodes.add(new InvitationCode(c.code(), c.expiresAt(), true));
            });
    }

    public void archive() { this.active = false; }

    public PatientId getId() { return id; }
    public String getFullName() { return fullName; }
    public LocalDate getBirthDate() { return birthDate; }
    public Gender getGender() { return gender; }
    public String getIdentificationNumber() { return identificationNumber; }
    public String getAddress() { return address; }
    public String getHealthInsurance() { return healthInsurance; }
    public String getBloodType() { return bloodType; }
    public String getHealthCondition() { return healthCondition; }
    public String getAllergies() { return allergies; }
    public EmergencyContact getEmergencyContact() { return emergencyContact; }
    public UserId getPrimaryCaregiver() { return primaryCaregiver; }
    public List<Collaborator> getCollaborators() { return List.copyOf(collaborators); }
    public List<InvitationCode> getInvitationCodes() { return List.copyOf(invitationCodes); }
    public boolean isActive() { return active; }

    public void setFullName(String fullName) { this.fullName = fullName; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }
    public void setGender(Gender gender) { this.gender = gender; }
    public void setIdentificationNumber(String v) { this.identificationNumber = v; }
    public void setAddress(String address) { this.address = address; }
    public void setHealthInsurance(String healthInsurance) { this.healthInsurance = healthInsurance; }
    public void setBloodType(String bloodType) { this.bloodType = bloodType; }
    public void setHealthCondition(String healthCondition) { this.healthCondition = healthCondition; }
    public void setAllergies(String allergies) { this.allergies = allergies; }
    public void setEmergencyContact(EmergencyContact emergencyContact) { this.emergencyContact = emergencyContact; }
}
