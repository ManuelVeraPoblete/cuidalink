package com.cuidalink.caretask.domain.model;

import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CareTaskScheduleTest {

    @Test
    void rejectsNullTime() {
        assertThatThrownBy(() -> new CareTaskSchedule(
            null, CareTaskScheduleType.DAYS_OF_WEEK, List.of(DayOfWeek.MONDAY), LocalDate.now(), null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void daysOfWeek_rejectsEmptyDays() {
        assertThatThrownBy(() -> new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK, List.of(), LocalDate.now(), null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void dateRange_rejectsMissingEndDate() {
        assertThatThrownBy(() -> new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DATE_RANGE, List.of(), LocalDate.now(), null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void dateRange_rejectsEndBeforeStart() {
        assertThatThrownBy(() -> new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DATE_RANGE, List.of(),
            LocalDate.of(2026, 7, 10), LocalDate.of(2026, 7, 1)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldRunOn_daysOfWeek_matchesSelectedDayOnOrAfterStart() {
        var schedule = new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(DayOfWeek.MONDAY, DayOfWeek.FRIDAY), LocalDate.of(2026, 7, 6), null);

        assertThat(schedule.shouldRunOn(LocalDate.of(2026, 7, 6))).isTrue();   // Monday
        assertThat(schedule.shouldRunOn(LocalDate.of(2026, 7, 10))).isTrue();  // Friday
        assertThat(schedule.shouldRunOn(LocalDate.of(2026, 7, 7))).isFalse();  // Tuesday
    }

    @Test
    void shouldRunOn_daysOfWeek_falseBeforeStartDate() {
        var schedule = new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DAYS_OF_WEEK,
            List.of(DayOfWeek.MONDAY), LocalDate.of(2026, 7, 13), null);

        assertThat(schedule.shouldRunOn(LocalDate.of(2026, 7, 6))).isFalse();  // Monday, but before start
    }

    @Test
    void shouldRunOn_dateRange_trueOnlyWithinBounds() {
        var schedule = new CareTaskSchedule(
            LocalTime.of(9, 0), CareTaskScheduleType.DATE_RANGE, List.of(),
            LocalDate.of(2026, 7, 5), LocalDate.of(2026, 7, 10));

        assertThat(schedule.shouldRunOn(LocalDate.of(2026, 7, 4))).isFalse();
        assertThat(schedule.shouldRunOn(LocalDate.of(2026, 7, 5))).isTrue();
        assertThat(schedule.shouldRunOn(LocalDate.of(2026, 7, 10))).isTrue();
        assertThat(schedule.shouldRunOn(LocalDate.of(2026, 7, 11))).isFalse();
    }
}
