package com.cuidalink.notification.scheduler;

import com.cuidalink.auth.domain.port.out.UserRepository;
import com.cuidalink.medication.domain.port.out.MedicationLogRepository;
import com.cuidalink.notification.domain.port.out.NotificationSender;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class EscalationScheduler {

    private final MedicationLogRepository logRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final NotificationSender notificationSender;

    public EscalationScheduler(MedicationLogRepository logRepository,
                               PatientRepository patientRepository,
                               UserRepository userRepository,
                               NotificationSender notificationSender) {
        this.logRepository = logRepository;
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
        this.notificationSender = notificationSender;
    }

    @Scheduled(fixedDelay = 300_000)  // cada 5 minutos
    public void escalate() {
        var threshold = LocalDateTime.now().minusMinutes(30);
        var pendingLogs = logRepository.findPendingOlderThan(threshold);
        for (var log : pendingLogs) {
            patientRepository.findByMedicationId(log.getMedicationId()).ifPresent(patient -> {
                userRepository.findById(patient.getPrimaryCaregiver()).ifPresent(owner -> {
                    if (owner.getFcmToken() != null) {
                        notificationSender.send(owner.getFcmToken().value(),
                            "⚠️ Medicamento sin confirmar",
                            "Un medicamento no fue confirmado a las " +
                            log.getScheduledAt().toLocalTime().toString());
                    }
                });
                log.escalate();
                logRepository.save(log);
            });
        }
    }
}
