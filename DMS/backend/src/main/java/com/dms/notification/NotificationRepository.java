/**
 * NotificationRepository.java
 *
 * Data access layer for the Notification entity in the Disaster Management System (DMS).
 * This repository provides database operations for querying, persisting, and managing
 * notifications sent to users — including alerts about new incidents, resource updates,
 * team assignments, and system-level messages.
 *
 * Extends Spring Data JPA's JpaRepository to inherit standard CRUD operations,
 * and declares custom query methods derived from method naming conventions to support
 * per-user notification retrieval and unread-count tracking.
 */
package com.dms.notification;

// Spring Data JPA base repository interface providing standard CRUD and pagination operations
import org.springframework.data.jpa.repository.JpaRepository;

// Marks this interface as a Spring-managed repository bean, enabling exception translation
import org.springframework.stereotype.Repository;

// Used as the return type for methods that return multiple notification records
import java.util.List;

/**
 * Repository interface for performing database operations on {@link Notification} entities.
 *
 * Spring Data JPA automatically generates the implementation at runtime based on
 * method name conventions — no manual SQL or JPQL is required for these queries.
 *
 * Generics: Notification = the entity type, Long = the primary key type.
 */
@Repository // Registers this interface as a Spring Data repository bean; enables DAO exception translation
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Retrieves all notifications belonging to a specific DMS user, ordered from newest to oldest.
     * Used to populate a user's notification feed in the UI (e.g., incident alerts, resource updates).
     *
     * Spring Data JPA derives the query: SELECT * FROM notification WHERE user_id = ? ORDER BY created_at DESC
     *
     * @param userId the unique identifier of the user whose notifications are being fetched
     * @return a list of notifications for the user, sorted by creation time descending
     */
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Counts how many unread notifications a specific user has.
     * Used to display the notification badge count in the DMS dashboard header or navigation bar.
     *
     * Spring Data JPA derives the query: SELECT COUNT(*) FROM notification WHERE user_id = ? AND is_read = false
     *
     * @param userId the unique identifier of the user
     * @return the number of unread notifications for the given user
     */
    long countByUserIdAndIsReadFalse(Long userId);

    /**
     * Retrieves only the unread notifications for a specific user.
     * Useful for fetching notifications that need to be highlighted or actioned,
     * such as unacknowledged disaster alerts or pending team assignment requests.
     *
     * Spring Data JPA derives the query: SELECT * FROM notification WHERE user_id = ? AND is_read = false
     *
     * @param userId the unique identifier of the user
     * @return a list of unread notifications for the given user
     */
    List<Notification> findByUserIdAndIsReadFalse(Long userId);
}