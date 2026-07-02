package com.cuidalink.patient.adapter.out.persistence;

import jakarta.persistence.Embeddable;

import java.time.LocalDateTime;

@Embeddable
public class CollaboratorEmbeddable {
    private String userId;
    private LocalDateTime joinedAt;

    public CollaboratorEmbeddable() {}

    public CollaboratorEmbeddable(String userId, LocalDateTime joinedAt) {
        this.userId = userId;
        this.joinedAt = joinedAt;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public LocalDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(LocalDateTime joinedAt) { this.joinedAt = joinedAt; }
}
