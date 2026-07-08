package com.cuidalink.caretask.adapter.out.persistence;

import com.cuidalink.caretask.domain.model.*;
import com.cuidalink.caretask.domain.port.out.CareTaskRepository;
import com.cuidalink.patient.domain.model.PatientId;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class JpaCareTaskRepositoryAdapter implements CareTaskRepository {

    private final SpringCareTaskRepository jpa;

    public JpaCareTaskRepositoryAdapter(SpringCareTaskRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public CareTask save(CareTask task) {
        jpa.save(toJpa(task));
        return task;
    }

    @Override
    public Optional<CareTask> findById(CareTaskId id) {
        return jpa.findById(id.value().toString()).map(this::toDomain);
    }

    @Override
    public List<CareTask> findByPatientId(PatientId patientId) {
        return jpa.findByPatientId(patientId.value().toString())
            .stream().map(this::toDomain).toList();
    }

    @Override
    public List<CareTask> findAllActive() {
        return jpa.findByActiveTrue().stream().map(this::toDomain).toList();
    }

    private CareTaskJpaEntity toJpa(CareTask t) {
        var e = new CareTaskJpaEntity();
        e.setId(t.getId().value().toString());
        e.setPatientId(t.getPatientId().value().toString());
        e.setName(t.getName());
        e.setInstructions(t.getInstructions());
        e.setPriority(t.getPriority().name());
        e.setReminderActive(t.isReminderActive());
        e.setActive(t.isActive());

        CareTaskSchedule s = t.getSchedule();
        e.setScheduleTime(s.time().toString());
        e.setScheduleType(s.scheduleType().name());
        e.setScheduleDaysOfWeek(daysToString(s.daysOfWeek()));
        e.setScheduleStartDate(s.startDate());
        e.setScheduleEndDate(s.endDate());
        return e;
    }

    private CareTask toDomain(CareTaskJpaEntity e) {
        var schedule = new CareTaskSchedule(
            LocalTime.parse(e.getScheduleTime()),
            CareTaskScheduleType.valueOf(e.getScheduleType()),
            daysFromString(e.getScheduleDaysOfWeek()),
            e.getScheduleStartDate(),
            e.getScheduleEndDate()
        );
        return new CareTask(
            new CareTaskId(UUID.fromString(e.getId())),
            new PatientId(UUID.fromString(e.getPatientId())),
            e.getName(),
            e.getInstructions(),
            schedule,
            CareTaskPriority.valueOf(e.getPriority()),
            e.isReminderActive(),
            e.isActive()
        );
    }

    private String daysToString(List<DayOfWeek> days) {
        if (days == null || days.isEmpty()) return "";
        return days.stream().map(DayOfWeek::name).collect(Collectors.joining(","));
    }

    private List<DayOfWeek> daysFromString(String s) {
        if (s == null || s.isBlank()) return List.of();
        return Arrays.stream(s.split(",")).map(DayOfWeek::valueOf).toList();
    }
}
