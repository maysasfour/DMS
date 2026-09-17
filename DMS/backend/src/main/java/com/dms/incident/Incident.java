/**
 * Incident.java
 *
 * JPA entity representing a disaster incident reported within the Disaster Management System (DMS).
 * Each incident captures the full lifecycle of an emergency event — from initial citizen report
 * through assignment to a rescue team and eventual resolution or closure.
 *
 * Incidents are the central domain object in the DMS: they link citizens (reporters),
 * rescue teams (responders), and shelters (resources), and carry geolocation data
 * for map-based tracking and heatmap visualization.
 */
package com.dms.incident;

// DMS domain imports: links incidents to citizens who report them,
// shelters used as evacuation resources, and rescue teams assigned to respond
import com.dms.citizen.Citizen;
import com.dms.shelter.Shelter;
import com.dms.team.RescueTeam;

// Jakarta Persistence API annotations for ORM mapping to the database
import jakarta.persistence.*;

// Lombok annotations to auto-generate boilerplate: getters, setters, builder, constructors
import lombok.*;

// Hibernate-specific annotations for automatic timestamp management
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

// Java time API for recording when incidents are reported, updated, and resolved
import java.time.LocalDateTime;

// Used for collections; currently reserved for potential future list-type relationships
import java.util.ArrayList;
import java.util.List;

// @Entity marks this class as a JPA-managed persistent entity mapped to a database table
@Entity
// Maps this entity to the "incidents" table in the database
@Table(name = "incidents")
// @Data generates getters, setters, equals, hashCode, and toString via Lombok
// @Builder enables the builder pattern for clean object construction
// @NoArgsConstructor and @AllArgsConstructor provide required JPA and builder constructors
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Incident {

    // Primary key for the incidents table; auto-incremented by the database
    @Id
    // Uses the database's identity/auto-increment strategy for ID generation
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    // Maps this field to the "incident_id" column explicitly
    @Column(name = "incident_id")
    private Long incidentId;

    // The category of disaster (e.g., FLOOD, FIRE, EARTHQUAKE); must not be null
    @Column(name = "incident_type", nullable = false)
    private String incidentType;

    // Short human-readable title summarizing the incident (e.g., "Building fire in downtown")
    private String title;

    // Detailed narrative description of the incident; stored as TEXT to allow long content
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    // Raw GPS coordinate string as reported by the citizen's device (e.g., "lat,lng" format)
    @Column(name = "gps_location")
    private String gpsLocation;

    // Decimal latitude coordinate for map rendering and geospatial queries
    private Double latitude;

    // Decimal longitude coordinate for map rendering and geospatial queries
    private Double longitude;

    // Human-readable location label (e.g., city name or address) for display purposes
    private String location;

    // Urgency level of the incident; defaults to "MEDIUM" if not explicitly set
    // Valid values expected: LOW, MEDIUM, HIGH, CRITICAL
    @Column(nullable = false)
    // @Builder.Default ensures the default value is applied even when using the Lombok builder
    @Builder.Default
    private String severity = "MEDIUM";

    // Current lifecycle state of the incident; defaults to "REPORTED" on creation
    // Typical progression: REPORTED → IN_PROGRESS → RESOLVED → CLOSED
    @Column(nullable = false)
    // @Builder.Default ensures the default is preserved when the builder omits this field
    @Builder.Default
    private String status = "REPORTED";

    // The citizen who reported this incident; many incidents can be reported by the same citizen
    // FetchType.LAZY avoids loading the full Citizen record unless explicitly accessed
    @ManyToOne(fetch = FetchType.LAZY)
    // Foreign key column linking to the citizens table
    @JoinColumn(name = "reported_by")
    private Citizen reportedBy;

    // Timestamp of when the incident was first reported; set via @PrePersist if not provided
    @Column(name = "reported_at", nullable = false)
    private LocalDateTime reportedAt;

    // The rescue team currently assigned to respond to this incident; nullable until dispatched
    // FetchType.LAZY avoids loading team data on every incident fetch
    @ManyToOne(fetch = FetchType.LAZY)
    // Foreign key column linking to the rescue_teams table
    @JoinColumn(name = "assigned_team_id")
    private RescueTeam assignedTeam;

    // The shelter associated with this incident for evacuation or refuge purposes; may be null
    // FetchType.LAZY defers loading shelter data until it is needed
    @ManyToOne(fetch = FetchType.LAZY)
    // Foreign key column linking to the shelters table
    @JoinColumn(name = "shelter_id")
    private Shelter shelter;

    // Timestamp of when the incident was marked resolved or closed; null while still active
    @Column(name = "resolved_local_date_time")
    private LocalDateTime resolvedAt;

    // Automatically updated by Hibernate whenever the incident record is modified in the database
    @UpdateTimestamp
    // Maps to the "updated_at" column; must always have a value
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // JPA lifecycle callback executed before the entity is first persisted to the database
    @PrePersist
    protected void onCreate() {
        // Ensures reportedAt is stamped with the current time if not set by the caller
        if (reportedAt == null) reportedAt = LocalDateTime.now();
    }

    // Placeholder method for team assignment logic; actual assignment is delegated to the service layer
    // The teamId parameter is accepted for interface compatibility but not applied directly here
    public void assignTeam(Long teamId) { /* handled via service */ }

    // Updates the incident's status field to the given value (e.g., "IN_PROGRESS", "RESOLVED")
    // Called by the service layer during incident lifecycle transitions
    public void updateStatus(String status) { this.status = status; }

    // Marks the incident as fully closed and records the exact resolution timestamp
    // Typically called after a rescue team confirms the emergency has been handled
    public void closeIncident() { this.status = "CLOSED"; this.resolvedAt = LocalDateTime.now(); }
}