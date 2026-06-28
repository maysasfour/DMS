package com.dms.notification;

import com.dms.exception.ResourceNotFoundException;
import com.dms.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    private Long resolveUserId(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email))
            .getId();
    }

    public List<NotificationDTO> getUserNotifications(String email) {
        Long userId = resolveUserId(email);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
            .map(NotificationDTO::fromEntity)
            .collect(Collectors.toList());
    }

    public void markAsRead(Long id, String email) {
        Long userId = resolveUserId(email);
        Notification notification = notificationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + id));
        if (!notification.getUserId().equals(userId)) {
            throw new com.dms.exception.UnauthorizedException("Not your notification");
        }
        notification.markAsRead();
        notificationRepository.save(notification);
    }

    public long getUnreadCount(String email) {
        return notificationRepository.countByUserIdAndIsReadFalse(resolveUserId(email));
    }

    public void markAllAsRead(String email) {
        Long userId = resolveUserId(email);
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalse(userId);
        unread.forEach(Notification::markAsRead);
        notificationRepository.saveAll(unread);
    }

    public Notification createNotification(Long userId, String title, String message, String type) {
        return notificationRepository.save(Notification.builder()
            .userId(userId)
            .title(title)
            .message(message)
            .type(type)
            .build());
    }
}
