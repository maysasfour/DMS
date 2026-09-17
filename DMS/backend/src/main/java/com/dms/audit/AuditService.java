/**
 * AuditService.java
 *
 * Service layer responsible for recording and retrieving audit log entries
 * within the Disaster Management System (DMS). Audit logs capture all
 * significant actions performed by users (responders, admins, team leaders)
 * on system entities such as incidents, resources, alerts, and user accounts.
 *
 * This service enables accountability and traceability — critical requirements
 * in emergency management contexts where every decision and action must be
 * documented for review, compliance, and post-incident analysis.
 */
package com.dms.audit;

// Lombok import: generates a constructor that injects all final fields automatically
import lombok.RequiredArgsConstructor;
// Spring Data: Page wraps a slice of results for paginated audit log queries
import org.springframework.data.domain.Page;
// Spring Data: Pageable carries page number, size, and sort parameters from the caller
import org.springframework.data.domain.Pageable;
// Spring: marks the log() method to run on a separate thread, avoiding latency in request processing
import org.springframework.scheduling.annotation.Async;
// Spring: registers this class as a managed service bean available for dependency injection
import org.springframework.stereotype.Service;

/**
 * AuditService provides methods to persist and query audit log records.
 * It is used by controllers and other services throughout the DMS to record
 * who did what, on which entity, from which IP address, and when.
 */
@Service // Marks this as a Spring-managed service component; makes it injectable across the application
@RequiredArgsConstructor // Lombok: auto-generates a constructor injecting auditLogRepository via final field
public class AuditService {

    // Repository for persisting and querying AuditLog entities in the database
    private final AuditLogRepository auditLogRepository;

    /**
     * Asynchronously persists a single audit log entry to the database.
     *
     * Running this method asynchronously (on a background thread) ensures that
     * audit logging does not add latency to time-sensitive DMS operations such
     * as incident creation, resource dispatch, or alert acknowledgment.
     *
     * @param userId      ID of the DMS user who performed the action (admin, officer, team member)
     * @param action      Verb describing the operation, e.g. "CREATE", "UPDATE", "DELETE", "LOGIN"
     * @param entityType  Domain entity affected, e.g. "INCIDENT", "RESOURCE", "USER", "ALERT"
     * @param entityId    Primary key of the affected entity for direct traceability
     * @param description Human-readable summary of what changed or why the action was taken
     * @param ipAddress   Network address of the client that initiated the request, for security tracing
     */
    @Async // Executes this method on Spring's task executor thread pool, non-blocking for the caller
    public void log(Long userId, String action, String entityType, Long entityId, String description, String ipAddress) {
        // Build an immutable AuditLog record using the builder pattern provided by the AuditLog entity
        AuditLog log = AuditLog.builder()
            .userId(userId)       // Who performed the action — links to the DMS users table
            .action(action)       // What was done — e.g. "ASSIGN_RESOURCE", "CLOSE_INCIDENT"
            .entityType(entityType) // Which domain object was affected — e.g. "INCIDENT"
            .entityId(entityId)   // The specific record affected — e.g. incident ID 42
            .description(description) // Narrative detail for human reviewers post-incident
            .ipAddress(ipAddress) // Source IP for detecting unauthorized or suspicious activity
            .build();

        // Persist the completed audit log entry to the database via JPA repository
        auditLogRepository.save(log);
    }

    /**
     * Retrieves a paginated list of all audit log entries associated with a specific DMS user.
     *
     * Useful for administrators reviewing the activity history of a particular officer,
     * team leader, or system user — for example, during a post-disaster accountability audit.
     *
     * @param userId   The DMS user whose audit history is being queried
     * @param pageable Pagination and sorting parameters (page index, page size, sort field)
     * @return A Page of AuditLog entries belonging to the specified user
     */
    public Page<AuditLog> getLogsByUser(Long userId, Pageable pageable) {
        // Delegate to the repository which queries audit_logs filtered by userId
        return auditLogRepository.findByUserId(userId, pageable);
    }

    /**
     * Retrieves a paginated list of audit log entries for a specific domain entity.
     *
     * Allows administrators and supervisors to see the full change history of a given
     * entity — for example, every status update, resource assignment, or comment made
     * on a particular incident throughout its lifecycle.
     *
     * @param entityType  The category of entity to filter by, e.g. "INCIDENT", "RESOURCE"
     * @param entityId    The primary key of the specific entity instance to inspect
     * @param pageable    Pagination and sorting parameters for the result set
     * @return A Page of AuditLog entries matching the given entity type and ID
     */
    public Page<AuditLog> getLogsByEntity(String entityType, Long entityId, Pageable pageable) {
        // Delegate to the repository which queries audit_logs filtered by entityType AND entityId
        return auditLogRepository.findByEntityTypeAndEntityId(entityType, entityId, pageable);
    }
}