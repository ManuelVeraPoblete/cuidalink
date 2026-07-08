package com.cuidalink.notification.scheduler;

import com.cuidalink.auth.domain.port.out.UserRepository;
import com.cuidalink.caretask.domain.port.out.CareTaskLogRepository;
import com.cuidalink.caretask.domain.port.out.CareTaskRepository;
import com.cuidalink.notification.domain.port.out.NotificationSender;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class CareTaskReminderScheduler {

    private final CareTaskLogRepository logRepository;
    private final CareTaskRepository taskRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final NotificationSender notificationSender;

    public CareTaskReminderScheduler(CareTaskLogRepository logRepository,
                                     CareTaskRepository taskRepository,
                                     PatientRepository patientRepository,
                                     UserRepository userRepository,
                                     NotificationSender notificationSender) {
        this.logRepository = logRepository;
        this.taskRepository = taskRepository;
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
        this.notificationSender = notificationSender;
    }

    @Scheduled(fixedDelay = 60_000)  // every minute
    public void sendReminders() {
        var now = LocalDateTime.now().withSecond(0).withNano(0);
        var dueLogs = logRepository.findPendingAt(now);
        for (var log : dueLogs) {
            taskRepository.findById(log.getCareTaskId()).ifPresent(task -> {
                if (!task.isReminderActive()) return;
                patientRepository.findById(log.getPatientId()).ifPresent(patient -> {
                    userRepository.findById(patient.getPrimaryCaregiver()).ifPresent(owner -> {
                        if (owner.getFcmToken() != null) {
                            notificationSender.send(owner.getFcmToken().value(),
                                "Tarea pendiente",
                                task.getName() + " — " + now.toLocalTime().toString());
                        }
                    });
                });
            });
        }
    }
}
