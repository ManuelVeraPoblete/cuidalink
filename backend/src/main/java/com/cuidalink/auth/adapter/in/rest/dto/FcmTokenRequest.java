package com.cuidalink.auth.adapter.in.rest.dto;

import jakarta.validation.constraints.NotBlank;

public record FcmTokenRequest(@NotBlank String token) {}
