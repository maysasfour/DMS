/**
 * NotificationService.java
 *
 * Service layer for managing in-app notifications within the Disaster Management System (DMS).
 * Handles the full lifecycle of notifications sent to users (citizens, officers, team members,
 * and admins), including creation, retrieval, and marking notifications as read.
 *
 * Notifications are triggered by DMS events such as incident status changes, resource
 * assignments, alert broadcasts, and system messages. Each notification is scoped
 * to a specific user identified by their email address.
 */
package com.dms.notification;

// Custom exception thrown when a requested resource (user or notification) does not exist in the DB
import com.dms.exception.ResourceNotFoundException;
// Repository for looking up DMS users by email to resolve notification ownership
import com.dms.user.UserRepository;
// Lombok annotation to auto-generate a constructor for all final fields (dependency injection)
import lombok.RequiredArgsConstructor;
// Marks this class as a Spring-managed service bean (business logic layer)
import org.springframework.stereotype.Service;

// Standard Java list type used for returning collections of notifications
import java.util.List;
// Used to transform a stream of Notification entities into a collected List
import java.util.stream.Collectors;

/**
 * Spring service bean providing business logic for DMS notification operations.
 * All methods validate ownership by resolving the caller's email to their user ID,
 * ensuring users can only access or modify their own notifications.
 */
@Service // Registers this class as a Spring service; eligible for auto-wiring into controllers
@RequiredArgsConstructor // Lombok: generates constructor injecting notificationRepository and userRepository
public class NotificationService {

    // Repository for CRUD operations on Notification entities stored in the database
    private final NotificationRepository notificationRepository;

    // Repository for user lookups; used to map an authenticated email to a numeric user ID
    private final UserRepository userRepository;

    /**
     * Resolves a user's email address to their internal numeric user ID.
     * Used as a security utility to ensure all notification queries are
     * anchored to a verified, existing DMS user account.
     *
     * @param email the authenticated user's email address (from JWT/session)
     * @return the user's database-assigned Long ID
     * @throws ResourceNotFoundException if no user with the given email exists
     */
    private Long resolveUserId(String email) {
        return userRepository.findByEmail(email) // Look up user record by email in the DMS user table
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email)) // Fail fast if the email doesn't match any registered user
            .getId(); // Extract and return only the numeric ID needed for notification queries
    }

    /**
     * Retrieves all notifications for the authenticated user, ordered from newest to oldest.
     * Used by the frontend notification bell/panel to display recent DMS alerts and messages.
     *
     * @param email the authenticated user's email address
     * @return list of NotificationDTOs (safe transfer objects without internal entity details)
     */
    public List<NotificationDTO> getUserNotifications(String email) {
        Long userId = resolveUserId(email); // Resolve email to user ID to scope the DB query
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream() // Fetch all notifications for this user, newest first
            .map(NotificationDTO::fromEntity) // Convert each Notification entity to a DTO for API response safety
            .collect(Collectors.toList()); // Collect the mapped stream back into a List for the controller
    }

    /**
     * Marks a single notification as read, identified by its ID.
     * Validates that the notification belongs to the requesting user before updating,
     * preventing users from marking other users' DMS alerts as read.
     *
     * @param id    the unique database ID of the notification to mark as read
     * @param email the authenticated user's email, used to verify ownership
     * @throws ResourceNotFoundException if the notification ID does not exist
     * @throws com.dms.exception.UnauthorizedException if the notification belongs to a different user
     */
    public void markAsRead(Long id, String email) {
        Long userId = resolveUserId(email); // Resolve email to numeric user ID for ownership check
        Notification notification = notificationRepository.findById(id) // Fetch the target notification by its primary key
            .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + id)); // Fail if no notification with this ID exists
        if (!notification.getUserId().equals(userId)) {
            // Security guard: reject the request if this notification belongs to a different DMS user
            throw new com.dms.exception.UnauthorizedException("Not your notification");
        }
        notification.markAsRead(); // Delegate the read-flag update to the entity's own method (sets isRead=true, records timestamp)
        notificationRepository.save(notification); // Persist the updated read status back to the database
    }

    /**
     * Returns the count of unread notifications for the authenticated user.
     * Used by the frontend to display the notification badge count on the UI toolbar.
     *
     * @param email the authenticated user's email address
     * @return number of notifications where isRead is false
     */
    public long getUnreadCount(String email) {
        // Resolve email to user ID and query the DB for notifications with isRead=false in one call
        return notificationRepository.countByUserIdAndIsReadFalse(resolveUserId(email));
    }

    /**
     * Marks all unread notifications as read for the authenticated user in a single batch.
     * Useful when a DMS user opens the notification panel and wants to clear all pending alerts at once.
     *
     * @param email the authenticated user's email address
     */
    public void markAllAsRead(String email) {
        Long userId = resolveUserId(email); // Resolve email to user ID to scope the update to this user only
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalse(userId); // Retrieve all notifications for this user that are still unread
        unread.forEach(Notification::markAsRead); // Apply markAsRead() to each unread notification entity in the list
        notificationRepository.saveAll(unread); // Persist all updated notifications to the database in a single batch save
    }

    /**
     * Creates and persists a new notification for a specific DMS user.
     * Called internally by other services (e.g., IncidentService, ResourceService) when
     * events occur that require user awareness — such as incident assignment, status updates,
     * or emergency alerts broadcast to officers and team members.
     *
     * @param userId  the numeric ID of the recipient DMS user
     * @param title   short heading displayed in the notification panel (e.g., "Incident Assigned")
     * @param message detailed body text describing the DMS event (e.g., "You have been assigned to Incident #42")
     * @param type    category string to allow frontend filtering/styling (e.g., "INCIDENT", "ALERT", "RESOURCE")
     * @return the saved Notification entity with its generated database ID and timestamps
     */
    public Notification createNotification(Long userId, String title, String message, String type) {
        return notificationRepository.save(Notification.builder() // Use Lombok builder pattern to construct the Notification entity
            .userId(userId)    // Bind the notification to its intended recipient user
            .title(title)      // Set the notification headline shown in the UI notification list
            .message(message)  // Set the full descriptive message body for the DMS event
            .type(type)        // Set the category type for client-side filtering and icon selection
            .build()); // Build the entity and immediately persist it to the notifications table
    }
}