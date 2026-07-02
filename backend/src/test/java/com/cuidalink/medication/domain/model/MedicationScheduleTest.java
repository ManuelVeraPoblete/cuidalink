package com.cuidalink.medication.domain.model;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MedicationScheduleTest {

    @Test
    void fromDailyInterval_computesTimesEvery8Hours() {
        var schedule = MedicationSchedule.fromDailyInterval(
            LocalTime.of(8, 0), 8, LocalDate.of(2026, 7, 1), null);

        assertThat(schedule.times()).containsExactly(
            LocalTime.of(8, 0), LocalTime.of(16, 0), LocalTime.of(0, 0));
        assertThat(schedule.frequency()).isEqualTo(Frequency.DAILY);
        assertThat(schedule.startTime()).isEqualTo(LocalTime.of(8, 0));
        assertThat(schedule.frequencyHours()).isEqualTo(8);
    }

    @Test
    void fromDailyInterval_computesTimesEvery6Hours() {
        var schedule = MedicationSchedule.fromDailyInterval(
            LocalTime.of(6, 0), 6, LocalDate.of(2026, 7, 1), null);

        assertThat(schedule.times()).containsExactly(
            LocalTime.of(6, 0), LocalTime.of(12, 0), LocalTime.of(18, 0), LocalTime.of(0, 0));
    }

    @Test
    void fromDailyInterval_computesTimesEveryHour() {
        var schedule = MedicationSchedule.fromDailyInterval(
            LocalTime.of(0, 0), 1, LocalDate.of(2026, 7, 1), null);

        assertThat(schedule.times()).hasSize(24);
    }

    @Test
    void fromDailyInterval_rejectsFrequencyHoursOutOfRange() {
        assertThatThrownBy(() -> MedicationSchedule.fromDailyInterval(
            LocalTime.of(8, 0), 0, LocalDate.of(2026, 7, 1), null))
            .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> MedicationSchedule.fromDailyInterval(
            LocalTime.of(8, 0), 25, LocalDate.of(2026, 7, 1), null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void fromDailyInterval_rejectsNullStartDate() {
        assertThatThrownBy(() -> MedicationSchedule.fromDailyInterval(
            LocalTime.of(8, 0), 8, null, null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void fromDailyInterval_rejectsEndDateBeforeStartDate() {
        assertThatThrownBy(() -> MedicationSchedule.fromDailyInterval(
            LocalTime.of(8, 0), 8, LocalDate.of(2026, 7, 10), LocalDate.of(2026, 7, 1)))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
