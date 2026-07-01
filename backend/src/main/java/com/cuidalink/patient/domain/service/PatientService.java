package com.cuidalink.patient.domain.service;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.*;
import com.cuidalink.patient.domain.port.in.*;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PatientService implements
    CreatePatientUseCase,
    GenerateInvitationUseCase,
    JoinWithCodeUseCase,
    RevokeCollaboratorUseCase,
    ListCollaboratorsUseCase,
    FindPatientUseCase,
    ListPatientsUseCase,
    UpdatePatientUseCase,
    ArchivePatientUseCase {

    private final PatientRepository patientRepository;

    public PatientService(PatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    @Override
    public Patient execute(CreatePatientCommand cmd) {
        var patient = new Patient(
            PatientId.generate(),
            cmd.fullName(),
            cmd.birthDate(),
            cmd.gender(),
            cmd.identificationNumber(),
            cmd.address(),
            cmd.healthInsurance(),
            cmd.bloodType(),
            cmd.healthCondition(),
            cmd.allergies(),
            cmd.emergencyContact(),
            cmd.primaryCaregiver()
        );
        return patientRepository.save(patient);
    }

    @Override
    public InvitationCode generate(PatientId patientId, UserId requesterId) {
        var patient = findOrThrow(patientId);
        if (!patient.isOwner(requesterId))
            throw new IllegalArgumentException("Esta acción es solo el cuidador principal quien puede realizarla");
        var code = patient.generateInvitationCode();
        patientRepository.save(patient);
        return code;
    }

    @Override
    public Patient join(String code, UserId newCollaborator) {
        var patient = patientRepository.findByInvitationCode(code)
            .orElseThrow(() -> new IllegalArgumentException("Código inválido o expirado"));
        patient.getInvitationCodes().stream()
            .filter(c -> c.code().equals(code) && c.isValid())
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Código inválido o expirado"));
        patient.markCodeUsed(code);
        patient.addCollaborator(newCollaborator);
        return patientRepository.save(patient);
    }

    @Override
    public void revoke(PatientId patientId, UserId collaboratorId, UserId requesterId) {
        var patient = findOrThrow(patientId);
        if (!patient.isOwner(requesterId))
            throw new IllegalArgumentException("Esta acción es solo el cuidador principal quien puede realizarla");
        patient.removeCollaborator(collaboratorId);
        patientRepository.save(patient);
    }

    @Override
    public List<Collaborator> listCollaborators(PatientId patientId, UserId requesterId) {
        var patient = findOrThrow(patientId);
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Acceso denegado");
        return patient.getCollaborators();
    }

    @Override
    public Patient findPatient(PatientId patientId, UserId requesterId) {
        var patient = findOrThrow(patientId);
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Acceso denegado");
        return patient;
    }

    @Override
    public List<Patient> listPatients(UserId requesterId) {
        return patientRepository.findByOwnerOrCollaborator(requesterId);
    }

    @Override
    public Patient updatePatient(UpdatePatientCommand cmd) {
        var patient = findOrThrow(cmd.patientId());
        if (!patient.isOwner(cmd.requesterId()))
            throw new IllegalArgumentException("Esta acción es solo el cuidador principal quien puede realizarla");
        patient.setFullName(cmd.fullName());
        patient.setBirthDate(cmd.birthDate());
        patient.setGender(cmd.gender());
        patient.setIdentificationNumber(cmd.identificationNumber());
        patient.setAddress(cmd.address());
        patient.setHealthInsurance(cmd.healthInsurance());
        patient.setBloodType(cmd.bloodType());
        patient.setHealthCondition(cmd.healthCondition());
        patient.setAllergies(cmd.allergies());
        patient.setEmergencyContact(cmd.emergencyContact());
        return patientRepository.save(patient);
    }

    @Override
    public void archivePatient(PatientId patientId, UserId requesterId) {
        var patient = findOrThrow(patientId);
        if (!patient.isOwner(requesterId))
            throw new IllegalArgumentException("Esta acción es solo el cuidador principal quien puede realizarla");
        patient.archive();
        patientRepository.save(patient);
    }

    private Patient findOrThrow(PatientId id) {
        return patientRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
    }
}
