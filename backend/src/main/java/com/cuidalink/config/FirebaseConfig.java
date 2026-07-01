package com.cuidalink.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import jakarta.annotation.PostConstruct;

@Configuration
public class FirebaseConfig {
    @Value("${firebase.service-account-path}")
    private Resource serviceAccount;

    @PostConstruct
    public void initialize() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                var options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount.getInputStream()))
                    .build();
                FirebaseApp.initializeApp(options);
            }
        } catch (Exception e) {
            // In test environments, mock credentials are used — Firebase may not initialize.
            // FirebaseVerifier is mocked via @MockBean; FCM calls are handled defensively.
            LoggerFactory.getLogger(FirebaseConfig.class)
                .warn("Firebase initialization skipped (likely test environment): {}", e.getMessage());
        }
    }
}
