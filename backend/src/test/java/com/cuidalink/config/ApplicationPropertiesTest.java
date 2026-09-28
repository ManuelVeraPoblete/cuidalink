package com.cuidalink.config;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockHttpServletRequest;

import java.io.InputStream;
import java.util.List;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/** Evita que secretos o configuración insegura vuelvan a quedar escritos en application.properties. */
class ApplicationPropertiesTest {

    static Properties props = new Properties();

    @BeforeAll
    static void load() throws Exception {
        try (InputStream in = new ClassPathResource("application.properties").getInputStream()) {
            props.load(in);
        }
    }

    @Test
    void secretsComeFromEnvironmentWithoutDefaults() {
        assertThat(props.getProperty("jwt.secret")).isEqualTo("${JWT_SECRET}");
        assertThat(props.getProperty("spring.datasource.password")).isEqualTo("${DB_PASSWORD}");
    }

    @Test
    void schemaIsValidatedByDefault() {
        assertThat(props.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("${JPA_DDL_AUTO:validate}");
    }

    @Test
    void corsHasNoOriginsByDefault() {
        assertThat(props.getProperty("cors.allowed-origins")).isEqualTo("${CORS_ALLOWED_ORIGINS:}");
    }

    @Test
    void corsAllowsOnlyConfiguredOrigins() {
        var config = new SecurityConfig(mock(com.cuidalink.auth.adapter.out.jwt.JwtAuthFilter.class), List.of("https://panel.cuidalink.cl"))
            .corsConfigurationSource()
            .getCorsConfiguration(new MockHttpServletRequest("GET", "/patients"));

        assertThat(config.checkOrigin("https://panel.cuidalink.cl")).isEqualTo("https://panel.cuidalink.cl");
        assertThat(config.checkOrigin("https://evil.example")).isNull();
    }

    @Test
    void corsRejectsEverythingWhenNoOriginsConfigured() {
        var config = new SecurityConfig(mock(com.cuidalink.auth.adapter.out.jwt.JwtAuthFilter.class), List.of())
            .corsConfigurationSource()
            .getCorsConfiguration(new MockHttpServletRequest("GET", "/patients"));

        assertThat(config.checkOrigin("https://evil.example")).isNull();
    }
}
