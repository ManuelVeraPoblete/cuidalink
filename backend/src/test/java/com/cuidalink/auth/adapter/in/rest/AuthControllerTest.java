package com.cuidalink.auth.adapter.in.rest;

import com.cuidalink.auth.domain.port.in.*;
import com.cuidalink.auth.domain.port.out.JwtProvider;
import com.cuidalink.auth.domain.port.out.UserRepository;
import com.cuidalink.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
class AuthControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockBean
    RegisterUserUseCase registerUseCase;

    @MockBean
    LoginUserUseCase loginUseCase;

    @MockBean
    UpdateFcmTokenUseCase fcmTokenUseCase;

    @MockBean
    UpdateProfileUseCase updateProfileUseCase;

    // JwtAuthFilter dependencies — mocked so the filter can instantiate
    @MockBean
    JwtProvider jwtProvider;

    @MockBean
    UserRepository userRepository;

    @Test
    void register_returns200_withValidBody() throws Exception {
        when(registerUseCase.execute(any())).thenReturn("jwt-token-abc");

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name":"Ana","email":"ana@test.com","password":"secret123"}
                """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").value("jwt-token-abc"));
    }

    @Test
    void login_returns200_withValidBody() throws Exception {
        when(loginUseCase.login("ana@test.com", "secret123")).thenReturn("jwt-token-xyz");

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"ana@test.com","password":"secret123"}
                """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").value("jwt-token-xyz"));
    }
}
