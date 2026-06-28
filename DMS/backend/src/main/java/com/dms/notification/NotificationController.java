package com.dms.notification;

import com.dms.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Notification management")
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "Get user notifications")
    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getNotifications(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success("Notifications retrieved", notificationService.getUserNotifications(auth.getName())));
    }

    @Operation(summary = "Mark notification as read")
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long id, Authentication auth) {
        notificationService.markAsRead(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read", null));
    }

    @Operation(summary = "Get unread count")
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success("Unread count retrieved", notificationService.getUnreadCount(auth.getName())));
    }

    @Operation(summary = "Mark all as read")
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(Authentication auth) {
        notificationService.markAllAsRead(auth.getName());
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read", null));
    }
}
