package com.cuidalink.patient.domain.model;

public record EmergencyContact(String name, String phone) {
    public EmergencyContact {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("nombre contacto vacío");
        if (phone == null || phone.isBlank()) throw new IllegalArgumentException("teléfono contacto vacío");
    }
}
