package com.cuidalink.vital.domain.service;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.patient.domain.model.Patient;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import com.cuidalink.vital.domain.model.*;
import com.cuidalink.vital.domain.port.in.*;
import com.cuidalink.vital.domain.port.out.VitalDefinitionRepository;
import com.cuidalink.vital.domain.port.out.VitalRecordRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class VitalService implements
    CreateVitalDefinitionUseCase,
    UpdateVitalDefinitionUseCase,
    DeleteVitalDefinitionUseCase,
    ListVitalDefinitionsUseCase,
    RecordVitalsUseCase,
    ListVitalRecordsUseCase,
    GetVitalRecordUseCase {

    private final VitalDefinitionRepository definitionRepository;
    private final VitalRecordRepository vitalRecordRepository;
    private final PatientRepository patientRepository;

    public VitalService(VitalDefinitionRepository definitionRepository,
                        VitalRecordRepository vitalRecordRepository,
                        PatientRepository patientRepository) {
        this.definitionRepository = definitionRepository;
        this.vitalRecordRepository = vitalRecordRepository;
        this.patientRepository = patientRepository;
    }

    @Override
    public VitalSignDefinition execute(CreateVitalDefinitionCommand cmd) {
        var patient = getPatientOrThrow(cmd.patientId());
        if (!patient.isOwner(cmd.requesterId()))
            throw new IllegalArgumentException("Solo el cuidador principal puede definir signos vitales");
        var def = new VitalSignDefinition(VitalSignDefinitionId.generate(), cmd.patientId(),
            cmd.name(), cmd.unit(), cmd.normalRangeMin(), cmd.normalRangeMax());
        return definitionRepository.save(def);
    }

    @Override
    public VitalSignDefinition execute(UpdateVitalDefinitionCommand cmd) {
        var def = definitionRepository.findById(cmd.definitionId())
            .orElseThrow(() -> new IllegalArgumentException("Definición no encontrada"));
        if (!def.getPatientId().equals(cmd.patientId()))
            throw new IllegalArgumentException("Definición no pertenece al paciente indicado");
        var patient = getPatientOrThrow(def.getPatientId());
        if (!patient.isOwner(cmd.requesterId()))
            throw new IllegalArgumentException("Solo el cuidador principal puede actualizar definiciones");
        def.update(cmd.name(), cmd.unit(), cmd.normalRangeMin(), cmd.normalRangeMax());
        return definitionRepository.save(def);
    }

    @Override
    public void delete(VitalSignDefinitionId definitionId, PatientId patientId, UserId requesterId) {
        var def = definitionRepository.findById(definitionId)
            .orElseThrow(() -> new IllegalArgumentException("Definición no encontrada"));
        if (!def.getPatientId().equals(patientId))
            throw new IllegalArgumentException("Definición no pertenece al paciente indicado");
        var patient = getPatientOrThrow(def.getPatientId());
        if (!patient.isOwner(requesterId))
            throw new IllegalArgumentException("Solo el cuidador principal puede eliminar definiciones");
        definitionRepository.deleteById(definitionId);
    }

    @Override
    public List<VitalSignDefinition> list(PatientId patientId, UserId requesterId) {
        var patient = getPatientOrThrow(patientId);
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Acceso denegado");
        return definitionRepository.findByPatientId(patientId);
    }

    @Override
    public VitalRecord record(RecordVitalsCommand cmd) {
        var patient = getPatientOrThrow(cmd.patientId());
        if (!patient.hasAccess(cmd.recordedBy()))
            throw new IllegalArgumentException("Sin acceso al paciente");
        var measurements = cmd.measurements().stream()
            .map(m -> new VitalMeasurement(m.definitionId(), m.value())).toList();
        var record = new VitalRecord(VitalRecordId.generate(), cmd.patientId(),
            cmd.recordedBy(), LocalDateTime.now(), measurements);
        return vitalRecordRepository.save(record);
    }

    @Override
    public List<VitalRecord> list(PatientId patientId, LocalDate from, LocalDate to, UserId requesterId) {
        var patient = getPatientOrThrow(patientId);
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Acceso denegado");
        return vitalRecordRepository.findByPatientIdBetween(
            patientId, from.atStartOfDay(), to.plusDays(1).atStartOfDay());
    }

    @Override
    public VitalRecord getById(PatientId patientId, VitalRecordId recordId, UserId requesterId) {
        var record = vitalRecordRepository.findById(recordId)
            .orElseThrow(() -> new IllegalArgumentException("Registro no encontrado"));
        if (!record.getPatientId().equals(patientId))
            throw new IllegalArgumentException("Registro no pertenece al paciente indicado");
        var patient = getPatientOrThrow(record.getPatientId());
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Acceso denegado");
        return record;
    }

    private Patient getPatientOrThrow(PatientId patientId) {
        return patientRepository.findById(patientId)
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
    }
}
