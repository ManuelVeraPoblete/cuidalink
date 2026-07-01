package com.cuidalink.auth.domain.model;

public record FcmToken(String value) {
    public FcmToken { if (value == null || value.isBlank()) throw new IllegalArgumentException("FCM token vacío"); }
}
