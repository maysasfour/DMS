/**
 * ResourceAssignment.java
 *
 * Represents a physical or logistical resource (e.g., ambulances, water supplies, rescue kits)
 * that can be tracked, allocated, and assigned to incidents or rescue teams in the DMS.
 *
 * Each resource assignment record captures the resource's type, quantity, current status,
 * geographic location, and its associations to a specific disaster incident, rescue team,
 * and the admin who manages it. This entity is central to the DMS resource coordination
 * workflow — ensuring that the right assets reach the right location during emergencies.
 */
package com.dms.resource;

// Import for the Admin entity — the system administrator who manages or owns the resource
import com.dms.admin.Admin;

// Import for the Incident entity — the disaster event this resource may be assigned to
import com.dms.incident.Incident;

// Import for the RescueTeam entity — the team that will utilize this resource on the ground
import com.dms.team.RescueTeam;

// Jakarta Persistence API annotations for ORM mapping to the database
import jakarta.persistence.*;

// Lombok annotations to auto-generate boilerplate: getters, setters, builder, and constructors
import lombok.*;

// Hibernate-specific annotation to automatically populate the createdAt timestamp on insert
import org.hibernate.annotations.CreationTimestamp;

// Hibernate-specific annotation to automatically populate the updatedAt timestamp on update
import org.hibernate.annotations.UpdateTimestamp;

// Java time API for storing assignment and audit timestamps
import java.time.LocalDateTime;

// @Entity marks this class as a JPA-managed persistent entity mapped to a database table
@Entity
// @Table specifies the exact table name in the database that stores resource assignment records
@Table(name = "resource_assignments")
// @Data generates getters, setters, equals, hashCode, and toString at compile time via Lombok
// @Builder enables the builder pattern for clean object construction in services/tests
// @NoArgsConstructor generates a no-argument constructor required by JPA
// @AllArgsConstructor generates a constructor with all fields, used by @Builder internally
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ResourceAssignment {

    // @Id marks this field as the primary key of the resource_assignments table
    @Id
    // @GeneratedValue with IDENTITY strategy lets the database auto-increment the primary key
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    // Maps this field to the "resource_id" column explicitly to avoid naming ambiguity
    @Column(name = "resource_id")
    private Long resourceId; // Unique identifier for each resource assignment record

    // The category of resource (e.g., "VEHICLE", "MEDICAL", "FOOD", "SHELTER") — required for filtering and dispatch
    @Column(name = "resource_type", nullable = false)
    private String resourceType;

    // Human-readable name of the resource (e.g., "Ambulance Unit 3", "Water Tanker") — required for display in the UI
    @Column(nullable = false)
    private String name;

    // How many units of this resource exist; defaults to 1 if not specified during creation
    @Column(nullable = false)
    // @Builder.Default ensures the Lombok builder uses this default value instead of null
    @Builder.Default
    private Integer quantity = 1;

    // Measurement unit for the resource quantity (e.g., "liters", "boxes", "units") — optional descriptive field
    private String unit;

    // Human-readable name of the physical location where the resource is stationed or deployed
    @Column(name = "location_name")
    private String locationName;

    // Geographic latitude coordinate of the resource's current or staging location
    private Double latitude;

    // Geographic longitude coordinate of the resource's current or staging location
    private Double longitude;

    // Timestamp recording when this resource was formally assigned to a team or incident
    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    // Lifecycle status of the resource in the DMS workflow; defaults to "AVAILABLE" until dispatched
    // Possible values: "AVAILABLE", "ASSIGNED", "IN_USE", "RETURNED", "DAMAGED"
    @Column(nullable = false)
    // @Builder.Default ensures new resources start as AVAILABLE when built via the builder
    @Builder.Default
    private String status = "AVAILABLE";

    // Free-text field for operational notes — e.g., special handling instructions or condition remarks
    // columnDefinition = "TEXT" supports longer strings beyond the default VARCHAR limit
    @Column(columnDefinition = "TEXT")
    private String notes;

    // Many resource assignments can relate to one disaster incident — lazy-loaded to avoid N+1 queries
    // The foreign key column "incident_id" links this resource to its associated DMS incident
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id")
    private Incident incident; // The disaster incident this resource has been deployed or reserved for

    // Many resource assignments can be linked to one rescue team — lazy-loaded for performance
    // The foreign key column "team_id" identifies which rescue team is holding or using this resource
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private RescueTeam team; // The rescue team responsible for using or managing this resource in the field

    // Many resource assignments can be managed by one admin — lazy-loaded to avoid unnecessary joins
    // The foreign key column "admin_id" tracks which system admin created or owns this resource record
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id")
    private Admin admin; // The DMS admin responsible for registering or overseeing this resource

    // @CreationTimestamp automatically sets this field to the current time when the record is first persisted
    // updatable = false ensures the creation time is never overwritten on subsequent updates
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt; // Audit timestamp: when this resource entry was added to the system

    // @UpdateTimestamp automatically refreshes this field to the current time on every database update
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt; // Audit timestamp: last time this resource record was modified

    /**
     * Marks this resource as assigned to a rescue team during an active disaster response.
     * Sets the status to "ASSIGNED" and records the exact time of assignment for audit and
     * dispatch tracking purposes. The teamId parameter is accepted for context but the
     * team association itself is managed via the {@code team} field by the service layer.
     *
     * @param teamId the ID of the rescue team receiving this resource (used contextually)
     */
    public void assignToTeam(Long teamId) {
        this.status = "ASSIGNED"; // Update lifecycle status to reflect the resource is no longer freely available
        this.assignedAt = LocalDateTime.now(); // Record the exact moment of team assignment for dispatch audit trail
    }

    /**
     * Placeholder method for resource update operations.
     * Actual update logic (e.g., changing quantity, status, or location) is delegated
     * to the ResourceService layer to maintain separation of concerns and transactional integrity.
     */
    public void updateResource() { /* handled via service */ }
}