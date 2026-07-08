package com.cuidalink.patient.domain.service;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.Patient;
import com.cuidalink.patient.domain.model.PatientContact;
import com.cuidalink.patient.domain.model.PatientContactId;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.patient.domain.port.in.CreatePatientContactUseCase;
import com.cuidalink.patient.domain.port.in.ListPatientContactsUseCase;
import com.cuidalink.patient.domain.port.in.UpdatePatientContactUseCase;
import com.cuidalink.patient.domain.port.out.PatientContactRepository;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PatientContactService implements
    CreatePatientContactUseCase,
    UpdatePatientContactUseCase,
    ListPatientContactsUseCase {

    private final PatientContactRepository contactRepository;
    private final PatientRepository patientRepository;

    public PatientContactService(PatientContactRepository contactRepository,
                                PatientRepository patientRepository) {
        this.contactRepository = contactRepository;
        this.patientRepository = patientRepository;
    }

    @Override
    public PatientContact execute(CreatePatientContactCommand cmd) {
        var patient = getPatientOrThrow(cmd.patientId());
        if (!patient.isOwner(cmd.requesterId()))
            throw new IllegalArgumentException("Solo el cuidador principal puede crear contactos");
        var contact = new PatientContact(PatientContactId.generate(), cmd.patientId(), cmd.name(),
            cmd.category(), cmd.relationship(), cmd.phone(), cmd.email(), cmd.note(), cmd.priority());
        return contactRepository.save(contact);
    }

    @Override
    public PatientContact execute(UpdatePatientContactCommand cmd) {
        var contact = contactRepository.findById(cmd.contactId())
            .orElseThrow(() -> new IllegalArgumentException("Contacto no encontrado"));
        if (!contact.getPatientId().equals(cmd.patientId()))
            throw new IllegalArgumentException("Contacto no pertenece al paciente indicado");
        var patient = getPatientOrThrow(cmd.patientId());
        if (!patient.isOwner(cmd.requesterId()))
            throw new IllegalArgumentException("Solo el cuidador principal puede editar contactos");
        contact.update(cmd.name(), cmd.category(), cmd.relationship(), cmd.phone(), cmd.email(),
            cmd.note(), cmd.priority());
        return contactRepository.save(contact);
    }

    @Override
    public List<PatientContact> list(PatientId patientId, UserId requesterId) {
        var patient = getPatientOrThrow(patientId);
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Acceso denegado");
        return contactRepository.findByPatientId(patientId);
    }

    private Patient getPatientOrThrow(PatientId patientId) {
        return patientRepository.findById(patientId)
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
    }
}
