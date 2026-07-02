package com.cuidalink.patient.adapter.out.persistence;

import jakarta.persistence.Embeddable;

import java.time.LocalDateTime;

@Embeddable
public class InvitationCodeEmbeddable {
    private String code;
    private LocalDateTime expiresAt;
    private boolean used;

    public InvitationCodeEmbeddable() {}

    public InvitationCodeEmbeddable(String code, LocalDateTime expiresAt, boolean used) {
        this.code = code;
        this.expiresAt = expiresAt;
        this.used = used;
    }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public boolean isUsed() { return used; }
    public void setUsed(boolean used) { this.used = used; }
}
