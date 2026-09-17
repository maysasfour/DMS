/**
 * User.java — Core domain entity representing a registered user in the Disaster Management System (DMS).
 *
 * A User can hold one or more roles (e.g. CITIZEN, OFFICER, ADMIN, TEAM_MEMBER) that
 * determine access to incident reporting, resource management, and emergency response
 * features throughout the system. User accounts are persisted in the "users" table and
 * referenced by incidents, assignments, and audit logs.
 *
 * Security note: The password field is excluded from all JSON serialization to prevent
 * accidental exposure through REST API responses.
 */
package com.dms.user;

// Jackson annotation used to exclude sensitive fields from JSON API responses
import com.fasterxml.jackson.annotation.JsonIgnore;
// JPA annotations for ORM mapping to the relational database
import jakarta.persistence.*;
// Lombok: generates constructor with all fields — used by the Builder and tests
import lombok.AllArgsConstructor;
// Lombok: enables the fluent builder pattern (User.builder().email(...).build())
import lombok.Builder;
// Lombok: generates getters, setters, equals, hashCode, and toString automatically
import lombok.Data;
// Lombok: generates a no-argument constructor required by JPA and reflection frameworks
import lombok.NoArgsConstructor;
// Hibernate extension: automatically sets the field value to NOW() on INSERT
import org.hibernate.annotations.CreationTimestamp;
// Hibernate extension: automatically updates the field value to NOW() on each UPDATE
import org.hibernate.annotations.UpdateTimestamp;

// Java date/time type used for audit timestamp fields (created_at, updated_at)
import java.time.LocalDateTime;
// Used for the roles collection; Set ensures each role string appears only once per user
import java.util.HashSet;
import java.util.Set;

// @Entity marks this class as a JPA-managed persistent entity backed by a database table
@Entity
// Maps this entity to the "users" table in the DMS database schema
@Table(name = "users")
// @Data (Lombok) auto-generates boilerplate: getters, setters, equals, hashCode, toString
@Data
// @Builder (Lombok) provides a fluent builder API for constructing User instances safely
@Builder
// Required by JPA — a no-arg constructor must exist for entity instantiation via reflection
@NoArgsConstructor
// Generates a constructor accepting every field, used alongside @Builder internals
@AllArgsConstructor
public class User {

    // Primary key: auto-incremented by the database (IDENTITY strategy)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // User's email address — must be unique across the system and cannot be null;
    // used as the login credential and notification target during incident alerts
    @Column(nullable = false, unique = true)
    private String email;

    // Hashed password (BCrypt) — @JsonIgnore prevents it from appearing in any API response,
    // protecting credentials even if the serializer inadvertently includes the User object
    @JsonIgnore
    @Column(nullable = false)
    private String password;

    // User's given name; stored in a dedicated column and used in notification messages
    @Column(name = "first_name", nullable = false)
    private String firstName;

    // User's family name; combined with firstName to identify responders and reporters
    @Column(name = "last_name", nullable = false)
    private String lastName;

    // Optional contact phone number; used by the AI agent for phone-based verification
    // during incident reporting and emergency coordination workflows
    @Column(name = "phone_number")
    private String phoneNumber;

    // URL pointing to the user's profile avatar image (may be null if not set);
    // displayed in the portal UI and team dashboards
    @Column(name = "avatar_url")
    private String avatarUrl;

    // A set of role strings (e.g. "ROLE_ADMIN", "ROLE_OFFICER", "ROLE_CITIZEN") stored in
    // a separate join table "user_roles" to support multi-role access control in the DMS
    @ElementCollection(fetch = FetchType.EAGER) // roles are always loaded with the user (needed for Spring Security)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id")) // join to user_roles.user_id
    @Column(name = "role") // each row in user_roles stores one role string
    @Builder.Default // ensures the HashSet is initialised even when using the Lombok builder
    private Set<String> roles = new HashSet<>();

    // Soft-delete / account status flag; false means the account is disabled and cannot
    // log in, allowing admins to revoke access without permanently deleting user data
    @Builder.Default // default to active=true so new accounts are enabled immediately
    @Column(nullable = false)
    private Boolean active = true;

    // Timestamp automatically set by Hibernate on first INSERT; never updated thereafter;
    // used for audit trails and reporting on when a user registered in the DMS
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Timestamp automatically refreshed by Hibernate on every UPDATE; tracks the most
    // recent profile or role change, supporting security audit and compliance requirements
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}