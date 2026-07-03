package com.cuidalink.auth.adapter.in.rest.dto;

public record AuthResponse(String id, String name, String email, String role, String phone,
                            String address, String specialty, String experience) {}
