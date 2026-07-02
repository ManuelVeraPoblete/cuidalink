package com.cuidalink.notification.domain.port.out;

public interface NotificationSender {
    void send(String fcmToken, String title, String body);
}
