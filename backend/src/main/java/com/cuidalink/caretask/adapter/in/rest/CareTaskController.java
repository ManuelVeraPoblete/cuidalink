package com.cuidalink.caretask.adapter.in.rest;

import com.cuidalink.auth.domain.model.User;
import com.cuidalink.caretask.adapter.in.rest.dto.*;
import com.cuidalink.caretask.domain.model.*;
import com.cuidalink.caretask.domain.port.in.*;
import com.cuidalink.patient.domain.model.PatientId;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/patients/{patientId}/tasks")
public class CareTaskController {

    private final CreateCareTaskUseCase createUseCase;
    private final ListCareTasksUseCase listUseCase;
    private final GetCareTaskUseCase getUseCase;
    private final UpdateCareTaskUseCase updateUseCase;
    private final DeactivateCareTaskUseCase deactivateUseCase;

    public CareTaskController(CreateCareTaskUseCase createUseCase,
                              ListCareTasksUseCase listUseCase,
                              GetCareTaskUseCase getUseCase,
                              UpdateCareTaskUseCase updateUseCase,
                              DeactivateCareTaskUseCase deactivateUseCase) {
        this.createUseCase = createUseCase;
        this.listUseCase = listUseCase;
        this.getUseCase = getUseCase;
        this.updateUseCase = updateUseCase;
        this.deactivateUseCase = deactivateUseCase;
    }

    @PostMapping
    public ResponseEntity<CareTaskResponse> create(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @Validated @RequestBody CreateCareTaskRequest req) {
        System.out.println(">>> IN  POST /patients/" + patientId + "/tasks");
        var patId = new PatientId(UUID.fromString(patientId));
        var task = createUseCase.execute(new CreateCareTaskUseCase.CreateCareTaskCommand(
            patId, req.name(), req.instructions() != null ? req.instructions() : "",
            toScheduleDomain(req.schedule()), req.priority(), req.reminderActive(), user.getId()
        ));
        System.out.println(">>> OUT POST /patients/" + patientId + "/tasks -> 201 id=" + task.getId().value());
        return ResponseEntity.status(201).body(toResponse(task));
    }

    @GetMapping
    public ResponseEntity<List<CareTaskResponse>> list(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId) {
        System.out.println(">>> IN  GET /patients/" + patientId + "/tasks");
        var patId = new PatientId(UUID.fromString(patientId));
        var tasks = listUseCase.listTasks(patId, user.getId());
        System.out.println(">>> OUT GET /patients/" + patientId + "/tasks -> 200 count=" + tasks.size());
        return ResponseEntity.ok(tasks.stream().map(this::toResponse).toList());
    }

    @GetMapping("/{taskId}")
    public ResponseEntity<CareTaskResponse> get(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @PathVariable String taskId) {
        System.out.println(">>> IN  GET /patients/" + patientId + "/tasks/" + taskId);
        var patId = new PatientId(UUID.fromString(patientId));
        var task = getUseCase.getTask(patId, new CareTaskId(UUID.fromString(taskId)), user.getId());
        System.out.println(">>> OUT GET /patients/" + patientId + "/tasks/" + taskId + " -> 200");
        return ResponseEntity.ok(toResponse(task));
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<CareTaskResponse> update(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @PathVariable String taskId,
            @Validated @RequestBody UpdateCareTaskRequest req) {
        System.out.println(">>> IN  PUT /patients/" + patientId + "/tasks/" + taskId);
        var patId = new PatientId(UUID.fromString(patientId));
        var task = updateUseCase.updateTask(new UpdateCareTaskUseCase.UpdateCareTaskCommand(
            patId, new CareTaskId(UUID.fromString(taskId)), req.name(),
            req.instructions() != null ? req.instructions() : "",
            toScheduleDomain(req.schedule()), req.priority(), req.reminderActive(), user.getId()
        ));
        System.out.println(">>> OUT PUT /patients/" + patientId + "/tasks/" + taskId + " -> 200");
        return ResponseEntity.ok(toResponse(task));
    }

    @PatchMapping("/{taskId}/deactivate")
    public ResponseEntity<Void> deactivate(
            @AuthenticationPrincipal User user,
            @PathVariable String patientId,
            @PathVariable String taskId) {
        System.out.println(">>> IN  PATCH /patients/" + patientId + "/tasks/" + taskId + "/deactivate");
        deactivateUseCase.deactivate(new CareTaskId(UUID.fromString(taskId)), user.getId());
        System.out.println(">>> OUT PATCH /patients/" + patientId + "/tasks/" + taskId + "/deactivate -> 204");
        return ResponseEntity.noContent().build();
    }

    private CareTaskSchedule toScheduleDomain(CareTaskScheduleDto dto) {
        var startDate = dto.startDate();
        if (dto.scheduleType() == CareTaskScheduleType.DAYS_OF_WEEK && startDate == null) {
            startDate = LocalDate.now();
        }
        return new CareTaskSchedule(
            dto.time(), dto.scheduleType(),
            dto.daysOfWeek() != null ? dto.daysOfWeek() : List.of(),
            startDate, dto.endDate()
        );
    }

    private CareTaskResponse toResponse(CareTask t) {
        var s = t.getSchedule();
        var schedDto = new CareTaskScheduleDto(s.time(), s.scheduleType(), s.daysOfWeek(), s.startDate(), s.endDate());
        return new CareTaskResponse(
            t.getId().value().toString(),
            t.getPatientId().value().toString(),
            t.getName(),
            t.getInstructions(),
            t.getPriority().name(),
            t.isReminderActive(),
            schedDto,
            t.isActive()
        );
    }
}
