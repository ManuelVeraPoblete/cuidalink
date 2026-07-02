package com.cuidalink.medication.adapter.out.persistence;

import com.cuidalink.medication.domain.model.*;
import com.cuidalink.medication.domain.port.out.MedicationRepository;
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
public class JpaMedicationRepositoryAdapter implements MedicationRepository {

    private final SpringMedicationRepository jpa;

    public JpaMedicationRepositoryAdapter(SpringMedicationRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public Medication save(Medication m) {
        jpa.save(toJpa(m));
        return m;
    }

    @Override
    public Optional<Medication> findById(MedicationId id) {
        return jpa.findById(id.value().toString()).map(this::toDomain);
    }

    @Override
    public List<Medication> findByPatientId(PatientId patientId) {
        return jpa.findByPatientId(patientId.value().toString())
            .stream().map(this::toDomain).toList();
    }

    @Override
    public List<Medication> findAllActive() {
        return jpa.findByActiveTrue().stream().map(this::toDomain).toList();
    }

    // ---- Mappers ----

    private MedicationJpaEntity toJpa(Medication m) {
        var e = new MedicationJpaEntity();
        e.setId(m.getId().value().toString());
        e.setPatientId(m.getPatientId().value().toString());
        e.setName(m.getName());
        e.setDosage(m.getDosage());
        e.setInstructions(m.getInstructions());
        e.setActive(m.isActive());
        e.setType(m.getType().name());

        MedicationSchedule s = m.getSchedule();
        if (s != null) {
            e.setFrequency(s.frequency().name());
            e.setScheduleTimes(timesToString(s.times()));
            e.setScheduleDaysOfWeek(daysToString(s.daysOfWeek()));
            e.setScheduleStartDate(s.startDate());
            e.setScheduleEndDate(s.endDate());
            e.setScheduleIntervalDays(s.intervalDays());
        }
        return e;
    }

    private Medication toDomain(MedicationJpaEntity e) {
        var schedule = new MedicationSchedule(
            timesFromString(e.getScheduleTimes()),
            Frequency.valueOf(e.getFrequency()),
            daysFromString(e.getScheduleDaysOfWeek()),
            e.getScheduleStartDate(),
            e.getScheduleEndDate(),
            e.getScheduleIntervalDays()
        );
        var type = e.getType() != null ? MedicationType.valueOf(e.getType()) : MedicationType.TABLET;
        return new Medication(
            new MedicationId(UUID.fromString(e.getId())),
            new PatientId(UUID.fromString(e.getPatientId())),
            e.getName(),
            e.getDosage(),
            e.getInstructions(),
            schedule,
            e.isActive(),
            type
        );
    }

    private String timesToString(List<LocalTime> times) {
        if (times == null || times.isEmpty()) return "";
        return times.stream().map(LocalTime::toString).collect(Collectors.joining(","));
    }

    private List<LocalTime> timesFromString(String s) {
        if (s == null || s.isBlank()) return List.of();
        return Arrays.stream(s.split(",")).map(LocalTime::parse).toList();
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
