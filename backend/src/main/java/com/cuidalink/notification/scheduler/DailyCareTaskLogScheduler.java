package com.cuidalink.notification.scheduler;

import com.cuidalink.caretask.domain.model.CareTaskLog;
import com.cuidalink.caretask.domain.model.CareTaskLogId;
import com.cuidalink.caretask.domain.model.CareTaskLogStatus;
import com.cuidalink.caretask.domain.port.out.CareTaskLogRepository;
import com.cuidalink.caretask.domain.port.out.CareTaskRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class DailyCareTaskLogScheduler {

    private final CareTaskRepository taskRepository;
    private final CareTaskLogRepository logRepository;

    public DailyCareTaskLogScheduler(CareTaskRepository taskRepository,
                                     CareTaskLogRepository logRepository) {
        this.taskRepository = taskRepository;
        this.logRepository = logRepository;
    }

    @Scheduled(cron = "0 1 0 * * *")  // cada día a las 00:01
    public void generateDailyLogs() {
        var today = LocalDate.now();
        var activeTasks = taskRepository.findAllActive();
        for (var task : activeTasks) {
            if (!task.getSchedule().shouldRunOn(today)) continue;
            var scheduledAt = today.atTime(task.getSchedule().time());
            if (logRepository.existsByCareTaskIdAndScheduledAt(task.getId(), scheduledAt)) continue;
            var log = new CareTaskLog(CareTaskLogId.generate(), task.getId(), task.getPatientId(),
                scheduledAt, CareTaskLogStatus.PENDING, null, null);
            logRepository.save(log);
        }
    }
}
