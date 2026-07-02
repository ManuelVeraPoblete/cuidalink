package com.cuidalink.notification.adapter.out.firebase;

import com.cuidalink.notification.domain.port.out.NotificationSender;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.springframework.stereotype.Component;

@Component
public class FcmNotificationSenderAdapter implements NotificationSender {

    @Override
    public void send(String fcmToken, String title, String body) {
        try {
            var message = Message.builder()
                .setToken(fcmToken)
                .setNotification(Notification.builder().setTitle(title).setBody(body).build())
                .build();
            FirebaseMessaging.getInstance().send(message);
        } catch (Exception e) {
            // log error pero no propagar — la notificación no debe romper el flujo
            org.slf4j.LoggerFactory.getLogger(getClass())
                .error("Error enviando FCM a token {}: {}", fcmToken.substring(0, 6), e.getMessage());
        }
    }
}
