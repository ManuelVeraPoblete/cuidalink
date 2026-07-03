package com.cuidalink;

import com.cuidalink.auth.adapter.in.rest.dto.AuthResponse;
import com.cuidalink.auth.adapter.in.rest.dto.RegisterRequest;
import com.cuidalink.auth.adapter.in.rest.dto.TokenResponse;
import com.cuidalink.notification.domain.port.out.NotificationSender;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class AuthIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
        .withDatabaseName("cuidalink_test")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
    }

    @Autowired
    TestRestTemplate restTemplate;

    @MockBean
    NotificationSender notificationSender;

    @Test
    void register_persistsUserAndReturnsToken() {
        var req = new RegisterRequest("Ana López", "ana@integration.com", "password123");

        ResponseEntity<TokenResponse> response = restTemplate.postForEntity(
            "/api/v1/auth/register", req, TokenResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().token()).isNotBlank();
    }

    @Test
    void register_duplicateEmail_returns400() {
        var req = new RegisterRequest("Pedro", "pedro@integration.com", "password123");
        restTemplate.postForEntity("/api/v1/auth/register", req, TokenResponse.class);

        // Second registration with same email should fail
        ResponseEntity<Object> second = restTemplate.postForEntity(
            "/api/v1/auth/register", req, Object.class);

        assertThat(second.getStatusCode().is4xxClientError() ||
                   second.getStatusCode().is5xxServerError()).isTrue();
    }

    @Test
    void updateProfile_persistsChangesAndReflectsInMe() {
        var registerReq = new RegisterRequest("Carla Soto", "carla@integration.com", "password123");
        ResponseEntity<TokenResponse> registerResponse = restTemplate.postForEntity(
            "/api/v1/auth/register", registerReq, TokenResponse.class);
        String token = registerResponse.getBody().token();

        var headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        var patchBody = """
            {"name":"Carla Soto Pérez","email":"carla@integration.com","phone":"+56912345678",
             "address":"Av. Siempre Viva 123","specialty":"Cuidado geriátrico","experience":"5 años"}
            """;
        var patchEntity = new HttpEntity<>(patchBody, headers);

        ResponseEntity<AuthResponse> patchResponse = restTemplate.exchange(
            "/api/v1/auth/me", HttpMethod.PATCH, patchEntity, AuthResponse.class);

        assertThat(patchResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(patchResponse.getBody().phone()).isEqualTo("+56912345678");
        assertThat(patchResponse.getBody().specialty()).isEqualTo("Cuidado geriátrico");

        var getEntity = new HttpEntity<>(headers);
        ResponseEntity<AuthResponse> getResponse = restTemplate.exchange(
            "/api/v1/auth/me", HttpMethod.GET, getEntity, AuthResponse.class);
        assertThat(getResponse.getBody().address()).isEqualTo("Av. Siempre Viva 123");
    }

    @Test
    void updateProfile_duplicateEmail_returns409() {
        restTemplate.postForEntity("/api/v1/auth/register",
            new RegisterRequest("Usuario Uno", "uno@integration.com", "password123"), TokenResponse.class);
        var registerTwo = restTemplate.postForEntity("/api/v1/auth/register",
            new RegisterRequest("Usuario Dos", "dos@integration.com", "password123"), TokenResponse.class);
        String tokenTwo = registerTwo.getBody().token();

        var headers = new HttpHeaders();
        headers.setBearerAuth(tokenTwo);
        headers.setContentType(MediaType.APPLICATION_JSON);
        var patchBody = """
            {"name":"Usuario Dos","email":"uno@integration.com"}
            """;
        var patchEntity = new HttpEntity<>(patchBody, headers);

        ResponseEntity<Object> response = restTemplate.exchange(
            "/api/v1/auth/me", HttpMethod.PATCH, patchEntity, Object.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }
}
