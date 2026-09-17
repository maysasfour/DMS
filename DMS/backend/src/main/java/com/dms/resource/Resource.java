/**
 * Resource.java — JPA entity representing a physical or logistical resource
 * that can be tracked and assigned to disaster incidents in the DMS system.
 *
 * Resources include assets such as ambulances, fire trucks, rescue teams,
 * medical supplies, or any deployable unit managed during emergency response.
 *
 * NOTE: This is a legacy entity that maps to the "resource_assignments" table.
 * For new feature development, prefer using the ResourceAssignment entity instead.
 *
 * Relationships:
 *   - Many resources can be assigned to a single Incident (ManyToOne)
 *
 * Lifecycle timestamps are auto-managed by Hibernate.
 */
package com.dms.resource;

// Import the Incident entity to support the ManyToOne relationship for resource assignment
import com.dms.incident.Incident;
// Prevents assignedIncident from being serialized to JSON, avoiding circular references
import com.fasterxml.jackson.annotation.JsonIgnore;
// Jakarta Persistence API annotations for ORM mapping
import jakarta.persistence.*;
// Lombok annotations to auto-generate boilerplate: getters, setters, builder, constructors
import lombok.*;
// Hibernate-specific annotation to auto-set the creation timestamp on insert
import org.hibernate.annotations.CreationTimestamp;
// Hibernate-specific annotation to auto-update the timestamp on every update
import org.hibernate.annotations.UpdateTimestamp;

// Java time API for audit timestamp fields
import java.time.LocalDateTime;

/**
 * Legacy Resource entity — now maps to resource_assignments table.
 * Use ResourceAssignment for new code.
 */
// Marks this class as a JPA-managed entity, enabling persistence to the database
@Entity
// Maps this entity to the "resource_assignments" table rather than the default "resource" table
@Table(name = "resource_assignments")
// Lombok: generates getters, setters, equals, hashCode, and toString
@Data
// Lombok: enables the builder pattern for constructing Resource instances
@Builder
// Lombok: generates a no-argument constructor required by JPA
@NoArgsConstructor
// Lombok: generates an all-argument constructor for use with the builder
@AllArgsConstructor
public class Resource {

    // Primary key for the resource record in the database
    @Id
    // Auto-increments the resource_id using the database identity strategy
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    // Maps this field to the "resource_id" column in resource_assignments table
    @Column(name = "resource_id")
    private Long id;

    // Human-readable name of the resource (e.g., "Ambulance Unit 7", "Rescue Team Alpha")
    @Column(nullable = false)
    private String name;

    // Category/type of the resource (e.g., "VEHICLE", "MEDICAL", "PERSONNEL", "EQUIPMENT")
    @Column(name = "resource_type", nullable = false)
    private String type;

    // Current operational status of the resource; defaults to "AVAILABLE" when created
    // Common values: "AVAILABLE", "DEPLOYED", "MAINTENANCE", "OUT_OF_SERVICE"
    @Column(nullable = false)
    // Lombok Builder default ensures "AVAILABLE" is used even when other fields are set via builder
    @Builder.Default
    private String status = "AVAILABLE";

    // Human-readable name of the resource's physical location (e.g., "Central Fire Station")
    @Column(name = "location_name")
    private String locationName;

    // Geographic latitude coordinate for map-based resource tracking
    private Double latitude;

    // Geographic longitude coordinate for map-based resource tracking
    private Double longitude;

    // The incident this resource is currently assigned to; null if the resource is unassigned
    // @JsonIgnore prevents infinite recursion when serializing Incident which contains Resources
    @JsonIgnore
    // Many resources can be assigned to one incident (e.g., multiple units at one disaster site)
    @ManyToOne(fetch = FetchType.LAZY) // LAZY loading avoids unnecessary incident data fetching
    // Foreign key column linking this resource to an incident in the incidents table
    @JoinColumn(name = "incident_id")
    private Incident assignedIncident;

    // Audit field: automatically set to the current timestamp when the resource record is created
    @CreationTimestamp
    // Not updatable ensures the original creation time is preserved throughout the record's life
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Audit field: automatically updated to the current timestamp whenever the resource is modified
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}