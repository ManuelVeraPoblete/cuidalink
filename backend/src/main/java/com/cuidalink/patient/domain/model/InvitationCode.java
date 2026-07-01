package com.cuidalink.patient.domain.model;

import java.time.LocalDateTime;

public record InvitationCode(String code, LocalDateTime expiresAt, boolean used) {
    public boolean isExpired() { return LocalDateTime.now().isAfter(expiresAt); }
    public boolean isValid() { return !used && !isExpired(); }

    public static InvitationCode generate() {
        String code = java.util.UUID.randomUUID().toString()
            .replace("-", "").substring(0, 8).toUpperCase();
        return new InvitationCode(code, LocalDateTime.now().plusHours(24), false);
    }
}
