package com.cuidalink.auth.adapter.in.rest.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UpdateProfileRequest(
    @NotBlank String name,
    @Email @NotBlank String email,
    String phone,
    String address,
    String specialty,
    String experience
) {}
