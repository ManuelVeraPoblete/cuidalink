package com.cuidalink.caretask.domain.service;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.caretask.domain.model.*;
import com.cuidalink.caretask.domain.port.in.*;
import com.cuidalink.caretask.domain.port.out.CareTaskLogRepository;
import com.cuidalink.caretask.domain.port.out.CareTaskRepository;
import com.cuidalink.patient.domain.model.PatientId;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class CareTaskService implements
    CreateCareTaskUseCase,
    ListCareTasksUseCase,
    GetCareTaskUseCase,
    UpdateCareTaskUseCase,
    DeactivateCareTaskUseCase,
    GetDailyCareTaskLogsUseCase,
    CompleteCareTaskLogUseCase {

    private final CareTaskRepository taskRepository;
    private final CareTaskLogRepository logRepository;
    private final PatientRepository patientRepository;

    public CareTaskService(CareTaskRepository taskRepository,
                           CareTaskLogRepository logRepository,
                           PatientRepository patientRepository) {
        this.taskRepository = taskRepository;
        this.logRepository = logRepository;
        this.patientRepository = patientRepository;
    }

    @Override
    public CareTask execute(CreateCareTaskCommand cmd) {
        var patient = patientRepository.findById(cmd.patientId())
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.isOwner(cmd.requesterId()))
            throw new IllegalArgumentException("Solo el cuidador principal puede agregar tareas");
        var task = new CareTask(
            CareTaskId.generate(), cmd.patientId(), cmd.name(), cmd.instructions(),
            cmd.schedule(), cmd.priority(), cmd.reminderActive(), true
        );
        return taskRepository.save(task);
    }

    @Override
    public List<CareTask> listTasks(PatientId patientId, UserId requesterId) {
        var patient = patientRepository.findById(patientId)
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Acceso denegado");
        return taskRepository.findByPatientId(patientId);
    }

    @Override
    public CareTask getTask(PatientId patientId, CareTaskId taskId, UserId requesterId) {
        var task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada"));
        if (!task.getPatientId().equals(patientId))
            throw new IllegalArgumentException("La tarea no pertenece al paciente indicado");
        var patient = patientRepository.findById(task.getPatientId())
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Acceso denegado");
        return task;
    }

    @Override
    public CareTask updateTask(UpdateCareTaskCommand cmd) {
        var task = taskRepository.findById(cmd.taskId())
            .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada"));
        if (!task.getPatientId().equals(cmd.patientId()))
            throw new IllegalArgumentException("La tarea no pertenece al paciente indicado");
        var patient = patientRepository.findById(task.getPatientId())
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.isOwner(cmd.requesterId()))
            throw new IllegalArgumentException("Solo el cuidador principal puede actualizar tareas");
        task.update(cmd.name(), cmd.instructions(), cmd.schedule(), cmd.priority(), cmd.reminderActive());
        return taskRepository.save(task);
    }

    @Override
    public void deactivate(CareTaskId taskId, UserId requesterId) {
        var task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada"));
        var patient = patientRepository.findById(task.getPatientId())
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.isOwner(requesterId))
            throw new IllegalArgumentException("Solo el cuidador principal puede desactivar tareas");
        task.deactivate();
        taskRepository.save(task);
    }

    @Override
    public List<CareTaskLog> getLogs(PatientId patientId, LocalDate date, UserId requesterId) {
        var patient = patientRepository.findById(patientId)
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Acceso denegado");
        return logRepository.findByPatientIdAndDate(patientId, date);
    }

    @Override
    public CareTaskLog complete(CareTaskLogId logId, UserId requesterId) {
        var log = logRepository.findById(logId)
            .orElseThrow(() -> new IllegalArgumentException("Registro no encontrado"));
        var patient = patientRepository.findById(log.getPatientId())
            .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado"));
        if (!patient.hasAccess(requesterId))
            throw new IllegalArgumentException("Sin acceso al paciente");
        log.complete(requesterId);
        return logRepository.save(log);
    }
}
