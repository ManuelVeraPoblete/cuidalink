package com.cuidalink.auth.adapter.out.firebase;

import com.cuidalink.auth.domain.port.out.FirebaseVerifier;
import com.google.firebase.auth.FirebaseAuth;
import org.springframework.stereotype.Component;

@Component
public class FirebaseVerifierAdapter implements FirebaseVerifier {
    @Override
    public String verifyAndGetUid(String idToken) {
        try {
            return FirebaseAuth.getInstance().verifyIdToken(idToken).getUid();
        } catch (Exception e) {
            throw new IllegalArgumentException("Token Firebase inválido", e);
        }
    }
}
