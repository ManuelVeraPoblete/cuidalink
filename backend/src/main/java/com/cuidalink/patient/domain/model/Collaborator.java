package com.cuidalink.patient.domain.model;

import com.cuidalink.auth.domain.model.UserId;

import java.time.LocalDateTime;

public record Collaborator(UserId userId, LocalDateTime joinedAt) {}
