package com.cuidalink.auth.adapter.out.jwt;

import com.cuidalink.auth.domain.model.UserId;
import com.cuidalink.auth.domain.port.out.JwtProvider;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtProviderAdapter implements JwtProvider {

    private final String secret;
    private final long expirationMs;

    public JwtProviderAdapter(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms}") long expirationMs) {
        this.secret = secret;
        this.expirationMs = expirationMs;
    }

    @Override
    public String generate(UserId userId, String email) {
        var key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .subject(userId.value().toString())
                .claim("email", email)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    @Override
    public UserId validate(String token) {
        try {
            var key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
            var claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return new UserId(UUID.fromString(claims.getSubject()));
        } catch (Exception e) {
            throw new IllegalArgumentException("Token JWT inválido", e);
        }
    }
}
