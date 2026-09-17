/**
 * AuditLogRepository.java
 *
 * Repository interface for accessing and querying AuditLog records in the DMS database.
 * Provides data access methods for retrieving audit trails of user actions and
 * entity-level changes — such as incident updates, resource modifications, and
 * user management operations — supporting accountability and traceability within
 * the Disaster Management System.
 *
 * Extends JpaRepository to inherit standard CRUD operations, while adding
 * DMS-specific queries for filtering audit logs by user or by a specific entity.
 */
package com.dms.audit;

// Spring Data pagination support — used to return large audit log result sets in pages
import org.springframework.data.domain.Page;
// Pageable carries page number, size, and sort parameters for paginated queries
import org.springframework.data.domain.Pageable;
// JpaRepository provides built-in CRUD and JPA operations for AuditLog entities
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data JPA repository for AuditLog entities.
 * Parameterized with AuditLog as the entity type and Long as the primary key type.
 * Spring automatically generates the implementation at runtime — no manual SQL needed.
 */
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * Retrieves a paginated list of audit log entries associated with a specific user.
     * Useful for reviewing all actions performed by a given DMS user — e.g., which
     * incidents they created, resources they updated, or alerts they triggered.
     *
     * @param userId   the ID of the DMS user whose audit trail is being queried
     * @param pageable pagination and sorting parameters (page index, page size, sort order)
     * @return a Page of AuditLog entries belonging to the specified user
     */
    Page<AuditLog> findByUserId(Long userId, Pageable pageable);

    /**
     * Retrieves a paginated list of audit log entries for a specific entity instance.
     * Allows tracking the full change history of any DMS domain object — for example,
     * all modifications made to a particular incident (entityType="Incident", entityId=42)
     * or a resource record, enabling detailed forensic and compliance reviews.
     *
     * @param entityType the class/type name of the audited entity (e.g., "Incident", "Resource", "User")
     * @param entityId   the primary key of the specific entity instance being audited
     * @param pageable   pagination and sorting parameters for the result set
     * @return a Page of AuditLog entries matching the given entity type and ID
     */
    Page<AuditLog> findByEntityTypeAndEntityId(String entityType, Long entityId, Pageable pageable);
}