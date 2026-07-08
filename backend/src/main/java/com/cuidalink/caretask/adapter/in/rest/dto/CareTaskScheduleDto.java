package com.cuidalink.caretask.adapter.in.rest.dto;

import com.cuidalink.caretask.domain.model.CareTaskScheduleType;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record CareTaskScheduleDto(
    LocalTime time,
    CareTaskScheduleType scheduleType,
    List<DayOfWeek> daysOfWeek,
    LocalDate startDate,
    LocalDate endDate
) {}
