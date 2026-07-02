package com.cuidalink.auth.domain.port.out;

public interface FirebaseVerifier {
    String verifyAndGetUid(String idToken); // retorna firebaseUid o lanza excepción
}
