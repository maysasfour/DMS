// =============================================================================
// File: AuditLog.java
// Package: com.dms.audit
//
// Purpose: Defines the AuditLog entity for the Disaster Management System (DMS).
// This class represents a single audit trail entry that records every significant
// action performed by users (admins, officers, team members) within the system.
// Audit logs capture who did what, on which entity (e.g., incident, resource,
// user account), and when — enabling accountability, forensic analysis, and
// compliance tracking across all DMS operations.
// =============================================================================
package com.dms.audit;

// Jakarta Persistence API imports for ORM mapping — maps this class to the database table
import jakarta.persistence.*;
// Lombok annotations to auto-generate boilerplate: getters, setters, builder, constructors
import lombok.*;
// Hibernate-specific annotation to auto-populate the creation timestamp on insert
import org.hibernate.annotations.CreationTimestamp;

// Used for the createdAt timestamp field — stores date and time without timezone
import java.time.LocalDateTime;

// @Entity tells JPA that this class is a persistent domain object mapped to a database table
@Entity
// @Table specifies the exact database table name "audit_logs" where records are stored
@Table(name = "audit_logs")
// @Data generates getters, setters, equals, hashCode, and toString via Lombok
// @Builder enables the builder pattern for convenient object construction in services
// @NoArgsConstructor generates a no-arg constructor required by JPA
// @AllArgsConstructor generates a constructor with all fields, used by @Builder internally
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuditLog {

    // @Id marks this field as the primary key of the audit_logs table
    @Id
    // @GeneratedValue with IDENTITY strategy lets the database auto-increment the log ID
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    // Maps this field to the "log_id" column in the database
    @Column(name = "log_id")
    // Unique identifier for each audit log entry
    private Long logId;

    // Maps to the "user_id" column — identifies which DMS user performed the action
    // Nullable: system-generated actions (e.g., scheduled tasks) may have no associated user
    @Column(name = "user_id")
    // Foreign reference to the users table; links the log entry to an admin, officer, or team member
    private Long userId;

    // nullable = false enforces that every log entry must describe an action — never blank
    @Column(nullable = false)
    // Human-readable action label, e.g., "CREATE_INCIDENT", "UPDATE_RESOURCE", "DELETE_USER"
    private String action;

    // Maps to "entity_type" column — identifies the domain object category affected by the action
    @Column(name = "entity_type")
    // The type of DMS entity involved, e.g., "Incident", "Resource", "User", "Alert"
    private String entityType;

    // Maps to "entity_id" column — the specific ID of the entity that was acted upon
    @Column(name = "entity_id")
    // e.g., the incident ID if an incident was updated, or the resource ID if a resource was assigned
    private Long entityId;

    // columnDefinition = "TEXT" allows storing long, freeform text beyond VARCHAR limits
    @Column(columnDefinition = "TEXT")
    // Detailed narrative of the action — may include before/after values, reasons, or context
    // e.g., "Incident #42 status changed from OPEN to RESOLVED by admin user #7"
    private String description;

    // Maps to "ip_address" column — captures the network origin of the request for security auditing
    @Column(name = "ip_address")
    // The IP address from which the action was performed; useful for detecting unauthorized access
    private String ipAddress;

    // @CreationTimestamp instructs Hibernate to automatically set this field to the current
    // date/time when the record is first inserted — no manual assignment needed
    @CreationTimestamp
    // nullable = false ensures every log has a timestamp; updatable = false prevents accidental changes
    @Column(name = "created_at", nullable = false, updatable = false)
    // The exact moment the audited action occurred — critical for timeline reconstruction during incidents
    private LocalDateTime createdAt;
}