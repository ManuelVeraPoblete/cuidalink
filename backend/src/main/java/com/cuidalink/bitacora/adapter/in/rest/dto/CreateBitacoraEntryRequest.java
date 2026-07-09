package com.cuidalink.bitacora.adapter.in.rest.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateBitacoraEntryRequest(@NotBlank String note) {}
