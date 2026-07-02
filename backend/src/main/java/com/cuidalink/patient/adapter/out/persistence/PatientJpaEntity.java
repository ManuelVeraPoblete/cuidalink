package com.cuidalink.patient.adapter.out.persistence;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "patients")
public class PatientJpaEntity {

    @Id
    private String id;
    private String fullName;
    private LocalDate birthDate;
    private String gender;
    private String identificationNumber;
    private String healthCondition;
    private String address;
    private String healthInsurance;
    private String bloodType;
    private String allergies;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String primaryCaregiverId;
    private boolean active = true;

    @ElementCollection
    @CollectionTable(name = "patient_collaborators", joinColumns = @JoinColumn(name = "patient_id"))
    private List<CollaboratorEmbeddable> collaborators = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "patient_invitation_codes", joinColumns = @JoinColumn(name = "patient_id"))
    private List<InvitationCodeEmbeddable> invitationCodes = new ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getIdentificationNumber() { return identificationNumber; }
    public void setIdentificationNumber(String identificationNumber) { this.identificationNumber = identificationNumber; }
    public String getHealthCondition() { return healthCondition; }
    public void setHealthCondition(String healthCondition) { this.healthCondition = healthCondition; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getHealthInsurance() { return healthInsurance; }
    public void setHealthInsurance(String healthInsurance) { this.healthInsurance = healthInsurance; }
    public String getBloodType() { return bloodType; }
    public void setBloodType(String bloodType) { this.bloodType = bloodType; }
    public String getAllergies() { return allergies; }
    public void setAllergies(String allergies) { this.allergies = allergies; }
    public String getEmergencyContactName() { return emergencyContactName; }
    public void setEmergencyContactName(String emergencyContactName) { this.emergencyContactName = emergencyContactName; }
    public String getEmergencyContactPhone() { return emergencyContactPhone; }
    public void setEmergencyContactPhone(String emergencyContactPhone) { this.emergencyContactPhone = emergencyContactPhone; }
    public String getPrimaryCaregiverId() { return primaryCaregiverId; }
    public void setPrimaryCaregiverId(String primaryCaregiverId) { this.primaryCaregiverId = primaryCaregiverId; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public List<CollaboratorEmbeddable> getCollaborators() { return collaborators; }
    public void setCollaborators(List<CollaboratorEmbeddable> collaborators) { this.collaborators = collaborators; }
    public List<InvitationCodeEmbeddable> getInvitationCodes() { return invitationCodes; }
    public void setInvitationCodes(List<InvitationCodeEmbeddable> invitationCodes) { this.invitationCodes = invitationCodes; }
}
