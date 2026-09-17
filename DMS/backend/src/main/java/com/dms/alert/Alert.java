/*
 * Alert.java
 *
 * Represents a public safety alert issued within the Disaster Management System (DMS).
 * Alerts can be broadcast to citizens or specific users to notify them of active incidents,
 * emerging hazards, evacuation orders, or system-level notifications.
 *
 * Each alert captures the delivery channel (e.g., SMS, EMAIL, SYSTEM), the severity level
 * (e.g., LOW, MEDIUM, HIGH, CRITICAL), an optional geographic location, and tracks which
 * Admin issued the alert or which Citizen triggered it. Alerts have a lifecycle managed
 * via the 'status' field (ACTIVE, EXPIRED, CANCELLED) and an optional expiry timestamp.
 *
 * This entity maps to the 'alerts' table in the DMS database.
 */
package com.dms.alert;

// Import Admin entity to associate the alert with the admin who created/issued it
import com.dms.admin.Admin;
// Import Citizen entity to optionally link the alert to a specific citizen (e.g., targeted alerts)
import com.dms.citizen.Citizen;
// Prevents circular JSON serialization when citizen/admin relationships are serialized
import com.fasterxml.jackson.annotation.JsonIgnore;
// JPA annotations for ORM mapping, relationships, and column constraints
import jakarta.persistence.*;
// Lombok annotations to auto-generate boilerplate: getters, setters, builder, constructors
import lombok.*;
// Hibernate hook to auto-populate the createdAt timestamp on first persist
import org.hibernate.annotations.CreationTimestamp;
// Hibernate hook to auto-populate the updatedAt timestamp on every update
import org.hibernate.annotations.UpdateTimestamp;

// Standard Java date-time type used for alert timestamps and expiry
import java.time.LocalDateTime;

// Marks this class as a JPA-managed database entity persisted to the 'alerts' table
@Entity
// Maps this entity to the 'alerts' table in the database
@Table(name = "alerts")
// @Data generates getters, setters, equals, hashCode, and toString at compile time
// @Builder enables the builder pattern for constructing Alert instances fluently
// @NoArgsConstructor generates a no-args constructor required by JPA
// @AllArgsConstructor generates a constructor with all fields for use with @Builder
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Alert {

    // Primary key for the alert record, auto-incremented by the database
    @Id
    // Delegates ID generation to the database identity/auto-increment column
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    // Maps this field to the 'alert_id' column in the alerts table
    @Column(name = "alert_id")
    private Long alertId;

    // Short descriptive title of the alert (e.g., "Flood Warning - Downtown Area")
    @Column(nullable = false)
    private String title;

    // Full alert message body; TEXT type allows longer content such as evacuation instructions
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    // Delivery channel for this alert (e.g., "SYSTEM", "SMS", "EMAIL", "PUSH")
    // Defaults to "SYSTEM" for internal platform notifications
    @Column(nullable = false)
    @Builder.Default // Ensures the default value is respected when using the builder pattern
    private String channel = "SYSTEM";

    // Category/type of alert to help classify its nature (e.g., "INFO", "WARNING", "EMERGENCY")
    // Defaults to "INFO" for non-critical informational alerts
    @Column(name = "alert_type", nullable = false)
    @Builder.Default // Ensures the default value is respected when using the builder pattern
    private String alertType = "INFO";

    // Urgency level of the alert to prioritize response (e.g., "LOW", "MEDIUM", "HIGH", "CRITICAL")
    // Defaults to "LOW" so that high-severity alerts must be explicitly set by the issuing admin
    @Column(nullable = false)
    @Builder.Default // Ensures the default value is respected when using the builder pattern
    private String severity = "LOW";

    // Geographic latitude coordinate of the incident or affected area (nullable for non-location alerts)
    private Double latitude;
    // Geographic longitude coordinate of the incident or affected area (nullable for non-location alerts)
    private Double longitude;
    // Human-readable location description (e.g., "City Center", "District 5") for display in the UI
    private String location;

    // Lifecycle status of the alert: ACTIVE means currently visible/relevant to users
    // Other values may include "EXPIRED" or "CANCELLED" once the alert is no longer in effect
    @Column(nullable = false)
    @Builder.Default // Ensures the default "ACTIVE" status is applied via the builder
    private String status = "ACTIVE";

    // Optional expiry datetime after which this alert should no longer be displayed or acted on
    // Null means the alert remains active indefinitely until manually deactivated
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    // The citizen who may have triggered or is targeted by this alert
    // @JsonIgnore prevents this relationship from being serialized in API responses (avoids circular refs)
    // LAZY fetch avoids loading the full Citizen object unless explicitly accessed
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    // Foreign key column in the alerts table referencing the citizens table
    @JoinColumn(name = "citizen_id")
    private Citizen citizen;

    // The admin who issued or is responsible for this alert
    // @JsonIgnore prevents this relationship from being included in API responses (avoids circular refs)
    // LAZY fetch avoids loading the full Admin object unless explicitly accessed
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    // Foreign key column in the alerts table referencing the admins table
    @JoinColumn(name = "admin_id")
    private Admin admin;

    // Automatically set to the current timestamp when the alert is first saved to the database
    // updatable = false ensures this value is never overwritten on subsequent updates
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Automatically updated to the current timestamp whenever the alert record is modified
    // Useful for auditing changes to alert status, severity, or message content
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}