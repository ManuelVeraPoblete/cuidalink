package com.cuidalink.caretask.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.caretask.adapter.in.rest.dto.CareTaskLogResponse;
import com.cuidalink.caretask.domain.model.CareTask;
import com.cuidalink.caretask.domain.model.CareTaskId;
import com.cuidalink.caretask.domain.model.CareTaskLog;
import com.cuidalink.caretask.domain.model.CareTaskLogId;
import com.cuidalink.caretask.domain.port.in.CompleteCareTaskLogUseCase;
import com.cuidalink.caretask.domain.port.in.GetDailyCareTaskLogsUseCase;
import com.cuidalink.caretask.domain.port.in.ListCareTasksUseCase;
import com.cuidalink.patient.domain.model.PatientId;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
public class CareTaskLogController {

    private final GetDailyCareTaskLogsUseCase logsUseCase;
    private final CompleteCareTaskLogUseCase completeUseCase;
    private final ListCareTasksUseCase listTasksUseCase;

    public CareTaskLogController(GetDailyCareTaskLogsUseCase logsUseCase,
                                 CompleteCareTaskLogUseCase completeUseCase,
                                 ListCareTasksUseCase listTasksUseCase) {
        this.logsUseCase = logsUseCase;
        this.completeUseCase = completeUseCase;
        this.listTasksUseCase = listTasksUseCase;
    }

    @GetMapping("/patients/{patientId}/task-logs")
    public ResponseEntity<List<CareTaskLogResponse>> getDailyLogs(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        var patId = new PatientId(UUID.fromString(patientId));
        var logs = logsUseCase.getLogs(patId, date, user.getId());
        var tasksById = listTasksUseCase.listTasks(patId, user.getId())
            .stream().collect(Collectors.toMap(CareTask::getId, Function.identity()));
        return ResponseEntity.ok(logs.stream().map(log -> toResponse(log, tasksById)).toList());
    }

    @PatchMapping("/task-logs/{logId}/complete")
    public ResponseEntity<CareTaskLogResponse> complete(
            @AuthenticationPrincipal User user,
            @PathVariable String logId) {
        var log = completeUseCase.complete(new CareTaskLogId(UUID.fromString(logId)), user.getId());
        var task = listTasksUseCase.listTasks(log.getPatientId(), user.getId())
            .stream().filter(t -> t.getId().equals(log.getCareTaskId())).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada"));
        return ResponseEntity.ok(toResponse(log, Map.of(task.getId(), task)));
    }

    private CareTaskLogResponse toResponse(CareTaskLog log, Map<CareTaskId, CareTask> tasksById) {
        var task = tasksById.get(log.getCareTaskId());
        return new CareTaskLogResponse(
            log.getId().value().toString(),
            log.getCareTaskId().value().toString(),
            task.getName(),
            task.getInstructions(),
            task.getPriority().name(),
            log.getScheduledAt().toString(),
            log.getStatus().name()
        );
    }
}
