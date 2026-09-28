package com.cuidalink.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDate;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class GlobalExceptionHandlerTest {

    static final String SENSITIVE = "Failing row contains (Diabetes tipo 2, alergia a penicilina)";

    @RestController
    static class ThrowingController {
        @GetMapping("/bad-arg") void badArg() { throw new IllegalArgumentException("Sin acceso al paciente"); }
        @GetMapping("/conflict") void conflict() { throw new IllegalStateException("Ya es colaborador"); }
        @GetMapping("/integrity") void integrity() { throw new DataIntegrityViolationException(SENSITIVE); }
        @GetMapping("/boom") void boom() { throw new RuntimeException(SENSITIVE); }
        @GetMapping("/missing") void missing() throws NoResourceFoundException {
            throw new NoResourceFoundException(HttpMethod.GET, "missing");
        }
        @GetMapping("/typed") void typed(@RequestParam LocalDate from) {}
        @PostMapping(value = "/body", consumes = MediaType.APPLICATION_JSON_VALUE) void body(@RequestBody Payload p) {}
        record Payload(String name) {}
    }

    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new ThrowingController())
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test
    void illegalArgument_returns400WithDomainMessage() throws Exception {
        mvc.perform(get("/bad-arg"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Sin acceso al paciente"));
    }

    @Test
    void illegalState_returns409WithDomainMessage() throws Exception {
        mvc.perform(get("/conflict"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message").value("Ya es colaborador"));
    }

    @Test
    void dataIntegrityViolation_returns409WithoutLeakingRowData() throws Exception {
        mvc.perform(get("/integrity"))
            .andExpect(status().isConflict())
            .andExpect(content().string(not(containsString("Diabetes"))))
            .andExpect(jsonPath("$.message").value("Los datos entran en conflicto con registros existentes"));
    }

    @Test
    void unexpectedException_returns500GenericWithErrorId() throws Exception {
        mvc.perform(get("/boom"))
            .andExpect(status().isInternalServerError())
            .andExpect(content().string(not(containsString("Diabetes"))))
            .andExpect(content().string(not(containsString("RuntimeException"))))
            .andExpect(jsonPath("$.message").value("Error interno del servidor"))
            .andExpect(jsonPath("$.errorId", matchesPattern("[0-9a-f-]{36}")));
    }

    @Test
    void unknownResource_returns404() throws Exception {
        mvc.perform(get("/missing"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("Recurso no encontrado"));
    }

    @Test
    void unsupportedMethod_returns405() throws Exception {
        mvc.perform(delete("/bad-arg"))
            .andExpect(status().isMethodNotAllowed())
            .andExpect(jsonPath("$.message").value("Método no permitido"));
    }

    @Test
    void malformedJson_returns400() throws Exception {
        mvc.perform(post("/body").contentType(MediaType.APPLICATION_JSON).content("{not json"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Solicitud inválida"));
    }

    @Test
    void wrongParamType_returns400() throws Exception {
        mvc.perform(get("/typed").param("from", "ayer"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Solicitud inválida"));
    }

    @Test
    void missingParam_returns400() throws Exception {
        mvc.perform(get("/typed"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Solicitud inválida"));
    }
}
