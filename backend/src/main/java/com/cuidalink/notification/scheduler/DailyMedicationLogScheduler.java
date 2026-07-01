package com.cuidalink.notification.scheduler;

import com.cuidalink.medication.domain.model.*;
import com.cuidalink.medication.domain.port.out.MedicationLogRepository;
import com.cuidalink.medication.domain.port.out.MedicationRepository;
import com.cuidalink.notification.domain.port.out.NotificationSender;
import com.cuidalink.auth.domain.port.out.UserRepository;
import com.cuidalink.patient.domain.port.out.PatientRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

@Component
public class DailyMedicationLogScheduler {

    private final MedicationRepository medicationRepository;
    private final MedicationLogRepository logRepository;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final NotificationSender notificationSender;

    public DailyMedicationLogScheduler(MedicationRepository medicationRepository,
                                       MedicationLogRepository logRepository,
                                       UserRepository userRepository,
                                       PatientRepository patientRepository,
                                       NotificationSender notificationSender) {
        this.medicationRepository = medicationRepository;
        this.logRepository = logRepository;
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.notificationSender = notificationSender;
    }

    @Scheduled(cron = "0 1 0 * * *")  // cada día a las 00:01
    public void generateDailyLogs() {
        var today = LocalDate.now();
        var activeMedications = medicationRepository.findAllActive();
        for (var med : activeMedications) {
            if (!shouldRunToday(med.getSchedule(), today)) continue;
            for (var time : med.getSchedule().times()) {
                var scheduledAt = today.atTime(time);
                if (logRepository.existsByMedicationIdAndScheduledAt(med.getId(), scheduledAt)) continue;
                var log = new MedicationLog(MedicationLogId.generate(), med.getId(), med.getPatientId(),
                    scheduledAt, LogStatus.PENDING, null, null);
                logRepository.save(log);
                notifyCareteam(med, time);
            }
        }
    }

    private boolean shouldRunToday(MedicationSchedule schedule, LocalDate today) {
        return switch (schedule.frequency()) {
            case DAILY -> true;
            case WEEKLY -> schedule.daysOfWeek().contains(today.getDayOfWeek());
            case EVERY_X_DAYS -> {
                Integer intervalDays = schedule.intervalDays();
                LocalDate startDate = schedule.startDate();
                if (intervalDays == null || intervalDays <= 0 || startDate == null) yield false;
                yield ChronoUnit.DAYS.between(startDate, today) % intervalDays == 0;
            }
        };
    }

    private void notifyCareteam(Medication med, LocalTime time) {
        patientRepository.findById(med.getPatientId()).ifPresent(patient -> {
            userRepository.findById(patient.getPrimaryCaregiver()).ifPresent(owner -> {
                if (owner.getFcmToken() != null)
                    notificationSender.send(owner.getFcmToken().value(),
                        "Medicamento programado",
                        med.getName() + " — " + time.toString());
            });
        });
    }
}
