/**
 * Shelter.java
 *
 * Represents a disaster shelter entity in the DMS (Disaster Management System).
 * Shelters are physical locations where displaced persons can be housed during
 * or after a disaster event. This entity tracks capacity, availability, location,
 * contact information, and operational status of each shelter registered in the system.
 *
 * Persisted to the "shelters" table in the database and managed via JPA/Hibernate.
 */
package com.dms.shelter;

// JPA annotations for ORM mapping (entity, table, column, primary key, generation strategy)
import jakarta.persistence.*;
// Lombok annotations for boilerplate reduction (getters, setters, builder, constructors)
import lombok.*;
// Hibernate-specific annotation to auto-set the creation timestamp on INSERT
import org.hibernate.annotations.CreationTimestamp;
// Hibernate-specific annotation to auto-update the timestamp on each UPDATE
import org.hibernate.annotations.UpdateTimestamp;

// Used to store precise timestamps for record creation and last modification
import java.time.LocalDateTime;

/** Marks this class as a JPA-managed entity that maps to a database table */
@Entity
/** Maps this entity to the "shelters" table in the DMS database */
@Table(name = "shelters")
/** Lombok: generates getters, setters, equals, hashCode, and toString automatically */
@Data
/** Lombok: enables the builder pattern for constructing Shelter instances fluently */
@Builder
/** Lombok: generates a no-argument constructor required by JPA for entity instantiation */
@NoArgsConstructor
/** Lombok: generates an all-argument constructor used by the builder and tests */
@AllArgsConstructor
public class Shelter {

    /** Marks this field as the primary key of the shelters table */
    @Id
    /** Auto-increments the shelter ID using the database identity strategy */
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    /** Maps to the "shelter_id" column in the shelters table */
    @Column(name = "shelter_id")
    // Unique identifier for each shelter record in the system
    private Long shelterId;

    /** shelter name must always be present — cannot be null in the database */
    @Column(nullable = false)
    // Human-readable name for the shelter (e.g., "City High School Gymnasium")
    private String name;

    // Physical street address of the shelter for navigation and logistics
    private String address;

    /** Maps to a dedicated "gps_location" column for raw GPS string (e.g., "lat,lng") */
    @Column(name = "gps_location")
    // Optional raw GPS string representation of the shelter's position
    private String gpsLocation;

    // Decimal latitude coordinate used for map rendering and distance calculations
    private Double latitude;
    // Decimal longitude coordinate used for map rendering and distance calculations
    private Double longitude;

    /** Total capacity must always be stored — not nullable */
    @Column(nullable = false)
    /** Lombok Builder default: initializes capacity to 0 if not explicitly set */
    @Builder.Default
    // Maximum number of disaster-affected persons this shelter can accommodate
    private Integer capacity = 0;

    /** Maps to "available_capacity" column; must not be null to ensure safe arithmetic */
    @Column(name = "available_capacity", nullable = false)
    /** Lombok Builder default: initializes available capacity to 0 until updated */
    @Builder.Default
    // Current number of open spots remaining; decremented as evacuees are assigned
    private Integer availableCapacity = 0;

    /** Maps to "is_active" column; not nullable since we always need an active/inactive state */
    @Column(name = "is_active", nullable = false)
    /** Lombok Builder default: shelters are active by default upon registration */
    @Builder.Default
    // Soft-delete flag — inactive shelters are hidden from dispatch but not removed
    private Boolean isActive = true;

    /** Maps to "contact_number" column for storing the shelter's phone contact */
    @Column(name = "contact_number")
    // Phone number of the shelter coordinator for emergency communications
    private String contactNumber;

    // Comma-separated or descriptive list of available amenities (e.g., "food, medical, WiFi")
    private String amenities;

    /** Status is required and cannot be null; defaults prevent constraint violations */
    @Column(nullable = false)
    /** Lombok Builder default: shelters start as OPEN unless overridden at creation */
    @Builder.Default
    // Operational status of the shelter: "OPEN", "FULL", or "CLOSED"
    private String status = "OPEN";

    /** Stored as JSONB in PostgreSQL for flexible, queryable offline data caching */
    @Column(name = "offline_cache", columnDefinition = "jsonb")
    // Cached JSON snapshot of shelter data for offline/mobile use in disaster field scenarios
    private String offlineCache;

    /** Hibernate auto-populates this field with the current timestamp on first INSERT */
    @CreationTimestamp
    /** Maps to "created_at"; not updatable ensures the original creation time is preserved */
    @Column(name = "created_at", nullable = false, updatable = false)
    // Timestamp recording when this shelter was first registered in the DMS
    private LocalDateTime createdAt;

    /** Hibernate auto-updates this field with the current timestamp on every UPDATE */
    @UpdateTimestamp
    /** Maps to "updated_at"; tracks the most recent modification to shelter data */
    @Column(name = "updated_at", nullable = false)
    // Timestamp of the last change to this shelter's record (capacity, status, etc.)
    private LocalDateTime updatedAt;

    /**
     * Returns the current available capacity of the shelter.
     * Falls back to total capacity if availableCapacity has not been set,
     * preventing null-pointer issues during initial setup or data migration.
     *
     * @return number of available spots, or total capacity as a safe fallback
     */
    public Integer getAvailableCapacity() {
        // Return availableCapacity if set, otherwise fall back to total capacity
        return availableCapacity != null ? availableCapacity : capacity;
    }

    /**
     * Adjusts the shelter's available capacity by a given delta value.
     * Called when evacuees are assigned (negative delta) or released (positive delta).
     * Ensures available capacity never goes below zero, preventing data inconsistency.
     *
     * @param delta positive to free capacity, negative to consume capacity
     */
    public void updateCapacity(int delta) {
        // Clamp the result to 0 to avoid negative available capacity in edge cases
        this.availableCapacity = Math.max(0, this.availableCapacity + delta);
    }
}