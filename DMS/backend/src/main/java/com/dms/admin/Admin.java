/**
 * Admin.java
 *
 * Represents a system administrator in the Disaster Management System (DMS).
 * Admins are privileged users responsible for overseeing the platform — managing
 * incidents, users, resources, alerts, and overall system configuration.
 * This entity maps to the "admins" table in the database.
 */
package com.dms.admin;

// Jakarta Persistence API imports — used to map this class to a relational database table
import jakarta.persistence.*;
// Lombok imports — auto-generates boilerplate: getters, setters, builder, constructors
import lombok.*;
// Hibernate annotation to automatically set the timestamp when the record is first created
import org.hibernate.annotations.CreationTimestamp;
// Hibernate annotation to automatically update the timestamp whenever the record is modified
import org.hibernate.annotations.UpdateTimestamp;

// Java time API — used for audit timestamp fields (when admin was created/updated)
import java.time.LocalDateTime;

// Marks this class as a JPA entity, meaning it will be persisted to the database
@Entity
// Maps this entity to the "admins" table in the DMS database schema
@Table(name = "admins")
// Lombok: generates getters, setters, equals, hashCode, and toString methods
@Data
// Lombok: enables the builder pattern for constructing Admin instances (e.g., Admin.builder().name(...).build())
@Builder
// Lombok: generates a no-argument constructor required by JPA for entity instantiation
@NoArgsConstructor
// Lombok: generates a constructor with all fields, used alongside @Builder
@AllArgsConstructor
public class Admin {

    // Marks adminId as the primary key of the admins table
    @Id
    // Auto-increments the admin ID using the database's identity/sequence strategy
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    // Maps this field to the "admin_id" column in the admins table
    @Column(name = "admin_id")
    // Unique numeric identifier for each admin in the DMS system
    private Long adminId;

    // Ensures the admin's full name is always stored — cannot be null in the DB
    @Column(nullable = false)
    // Full display name of the admin (e.g., used in audit logs and UI headers)
    private String name;

    // Ensures email is required and unique — prevents duplicate admin accounts
    @Column(nullable = false, unique = true)
    // Email address used for admin login and system notifications
    private String email;

    // Enforces that a hashed password is always present — admins must authenticate
    @Column(nullable = false)
    // Bcrypt-hashed password for securing admin portal access
    private String password;

    // Optional contact number — may be used for emergency escalation or 2FA
    private String phone;

    // Ensures every admin has an assigned role — drives permission checks in the DMS
    @Column(nullable = false)
    // Role of the admin (e.g., "SUPER_ADMIN", "MODERATOR") — controls access level
    private String role;

    // Enforces that status is always set — admins can be deactivated without deletion
    @Column(nullable = false)
    // Provides a default value of "ACTIVE" at the builder level when not explicitly set
    @Builder.Default
    // Current account status — "ACTIVE" allows login; "INACTIVE"/"SUSPENDED" blocks access
    private String status = "ACTIVE";

    // Hibernate automatically populates this field with the current timestamp on record creation
    @CreationTimestamp
    // Maps to "created_at" column; not updatable — preserves the original registration time
    @Column(name = "created_at", nullable = false, updatable = false)
    // Timestamp recording when this admin account was first created in the DMS
    private LocalDateTime createdAt;

    // Hibernate automatically updates this field with the current timestamp on every save
    @UpdateTimestamp
    // Maps to "updated_at" column — reflects the last time admin details were modified
    @Column(name = "updated_at", nullable = false)
    // Timestamp of the most recent update to this admin record (e.g., role change, password reset)
    private LocalDateTime updatedAt;
}