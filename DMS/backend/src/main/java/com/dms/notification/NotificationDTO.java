package com.dms.notification;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {
    private Long id;
    private Long userId;
    private String title;
    private String message;
    private String type;
    private Boolean isRead;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;

    public static NotificationDTO fromEntity(Notification notification) {
        return NotificationDTO.builder()
            .id(notification.getNotificationId())
            .userId(notification.getUserId())
            .title(notification.getTitle())
            .message(notification.getMessage())
            .type(notification.getType())
            .isRead(notification.getIsRead())
            .readAt(notification.getReadAt())
            .createdAt(notification.getCreatedAt())
            .build();
    }
}
