package com.cuidalink.bitacora.domain.service;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.bitacora.domain.model.BitacoraEntry;
import com.cuidalink.bitacora.domain.model.BitacoraEntryId;
import com.cuidalink.bitacora.domain.model.BitacoraEntryType;
import com.cuidalink.bitacora.domain.port.in.CreateBitacoraEntryUseCase;
import com.cuidalink.bitacora.domain.port.in.ListBitacoraEntriesUseCase;
import com.cuidalink.bitacora.domain.port.out.BitacoraEntryRepository;
import com.cuidalink.patient.domain.model.Patient;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class BitacoraService implements CreateBitacoraEntryUseCase, ListBitacoraEntriesUseCase {

    private final BitacoraEntryRepository repository;
    private final PatientRepository patientRepository;

    public BitacoraService(BitacoraEntryRepository repository, PatientRepository patientRepository) {
        this.repository = repository;
        this.patientRepository = patientRepository;
    }

    @Override
    public BitacoraEntry create(CreateBitacoraEntryCommand command) {
        var patient = getPatientOrThrow(command.patientId());
        if (!patient.hasAccess(command.authorId()))
            throw new IllegalArgumentException("Sin acceso al paciente");
        var type = patient.isOwner(command.authorId()) ? BitacoraEntryType.ENTRY : BitacoraEntryType.OBSERVATION;
        var entry = new BitacoraEntry(BitacoraEntryId.generate(), command.patientId(),
            command.authorId(), type, command.note(), LocalDateTime.now());
        return repository.save(entry);
    }

    @Override
    public List<BitacoraEntry> list(PatientId patientId, LocalDate from, LocalDate to,
                                     BitacoraEntryType type, UserId requesterId) {
        var patient = getPatientOrThrow(patientId);
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Sin acceso al paciente");
        var entries = repository.findByPatientIdAndRecordedAtBetween(
            patientId, from.atStartOfDay(), to.plusDays(1).atStartOfDay());
        if (type == null) return entries;
        return entries.stream().filter(e -> e.getType() == type).toList();
    }

    private Patient getPatientOrThrow(PatientId patientId) {
        return patientRepository.findById(patientId)
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
    }
}
