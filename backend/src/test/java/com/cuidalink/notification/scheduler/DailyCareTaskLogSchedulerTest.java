package com.cuidalink.notification.scheduler;

import com.cuidalink.caretask.domain.model.*;
import com.cuidalink.caretask.domain.port.out.CareTaskLogRepository;
import com.cuidalink.caretask.domain.port.out.CareTaskRepository;
import com.cuidalink.patient.domain.model.PatientId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DailyCareTaskLogSchedulerTest {

    @Mock CareTaskRepository taskRepository;
    @Mock CareTaskLogRepository logRepository;
    DailyCareTaskLogScheduler sut;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        sut = new DailyCareTaskLogScheduler(taskRepository, logRepository);
    }

    @Test
    void generateDailyLogs_createsLogForTaskScheduledToday() {
        var today = LocalDate.now();
        var schedule = new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(today.getDayOfWeek()), today.minusDays(1), null);
        var task = new CareTask(CareTaskId.generate(), PatientId.generate(),
            "Tomar presión", "", schedule, CareTaskPriority.MEDIUM, true, true);

        when(taskRepository.findAllActive()).thenReturn(List.of(task));
        when(logRepository.existsByCareTaskIdAndScheduledAt(any(), any())).thenReturn(false);

        sut.generateDailyLogs();

        verify(logRepository).save(argThat(log ->
            log.getCareTaskId().equals(task.getId())
            && log.getStatus() == CareTaskLogStatus.PENDING
            && log.getScheduledAt().equals(today.atTime(LocalTime.of(9, 0)))));
    }

    @Test
    void generateDailyLogs_skipsTaskNotScheduledToday() {
        var today = LocalDate.now();
        var otherDay = today.getDayOfWeek() == DayOfWeek.MONDAY ? DayOfWeek.TUESDAY : DayOfWeek.MONDAY;
        var schedule = new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(otherDay), today.minusDays(1), null);
        var task = new CareTask(CareTaskId.generate(), PatientId.generate(),
            "Tomar presión", "", schedule, CareTaskPriority.MEDIUM, true, true);

        when(taskRepository.findAllActive()).thenReturn(List.of(task));

        sut.generateDailyLogs();

        verify(logRepository, never()).save(any());
    }

    @Test
    void generateDailyLogs_doesNotDuplicateExistingLog() {
        var today = LocalDate.now();
        var schedule = new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(today.getDayOfWeek()), today.minusDays(1), null);
        var task = new CareTask(CareTaskId.generate(), PatientId.generate(),
            "Tomar presión", "", schedule, CareTaskPriority.MEDIUM, true, true);

        when(taskRepository.findAllActive()).thenReturn(List.of(task));
        when(logRepository.existsByCareTaskIdAndScheduledAt(any(), any())).thenReturn(true);

        sut.generateDailyLogs();

        verify(logRepository, never()).save(any());
    }
}
