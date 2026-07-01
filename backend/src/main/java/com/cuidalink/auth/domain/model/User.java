package com.cuidalink.auth.domain.model;

public class User {
    private final UserId id;
    private String name;
    private final Email email;
    private String passwordHash;
    private FcmToken fcmToken;
    private final UserRole role;

    public User(UserId id, String name, Email email, String passwordHash) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = UserRole.CAREGIVER;
    }

    public User(UserId id, String name, Email email, String passwordHash, UserRole role) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
    }

    public void updateFcmToken(FcmToken token) { this.fcmToken = token; }

    public UserId getId() { return id; }
    public String getName() { return name; }
    public Email getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public FcmToken getFcmToken() { return fcmToken; }
    public UserRole getRole() { return role; }
}
