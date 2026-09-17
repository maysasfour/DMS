// =============================================================================
// RescueTeam.java
// Purpose: JPA entity representing a rescue team registered in the DMS.
// Rescue teams are dispatched to disaster incidents and tracked by location,
// availability, and capacity. This entity maps to the "rescue_teams" database
// table and is central to resource allocation and emergency response workflows.
// =============================================================================

package com.dms.team;

// Jakarta Persistence API imports — used to map this class to a relational DB table
import jakarta.persistence.*;
// Lombok imports — auto-generates boilerplate: getters, setters, builder, constructors
import lombok.*;
// Hibernate-specific timestamp annotations for automatic audit field management
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

// Java time API — used for tracking when a team record was created and last updated
import java.time.LocalDateTime;

// @Entity marks this class as a JPA-managed persistent entity backed by a DB table
@Entity
// @Table specifies the exact database table name this entity maps to
@Table(name = "rescue_teams")
// @Data generates getters, setters, equals, hashCode, and toString via Lombok
// @Builder enables the builder pattern for constructing RescueTeam instances
// @NoArgsConstructor generates a no-arg constructor required by JPA
// @AllArgsConstructor generates a full constructor for all fields
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RescueTeam {

    // Primary key for the rescue team record; auto-incremented by the database
    @Id
    // AUTO_INCREMENT strategy — DB generates the ID value on insert
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    // Maps this field to the "team_id" column in the rescue_teams table
    @Column(name = "team_id")
    private Long teamId;

    // Human-readable name of the rescue team (e.g., "Alpha Medical Unit"); cannot be null
    @Column(nullable = false)
    private String name;

    // Category or specialization of the team (e.g., "medical", "fire", "search & rescue")
    private String type;

    // Primary phone number used to contact the team during an active incident
    @Column(name = "contact_number")
    private String contactNumber;

    // Email address for the team, used for non-urgent communications and notifications
    private String email;

    // Maximum number of personnel or casualties this team can handle at once;
    // defaults to 0 until explicitly set during team registration
    @Builder.Default
    private Integer capacity = 0;

    // GPS latitude coordinate of the team's current or base location for map dispatch
    private Double latitude;
    // GPS longitude coordinate of the team's current or base location for map dispatch
    private Double longitude;
    // Human-readable location description (e.g., "Central Station, Beirut") for display
    private String location;

    // Soft-delete flag — when false, the team is deactivated rather than deleted from the DB;
    // inactive teams are excluded from dispatch and availability queries
    @Column(name = "is_active", nullable = false)
    // Defaults to true so newly created teams are immediately active
    @Builder.Default
    private Boolean isActive = true;

    // Indicates whether the team is currently free to respond to a new incident;
    // set to false when the team is already assigned to an ongoing emergency
    // Defaults to true so newly registered teams appear as available for dispatch
    @Builder.Default
    private Boolean available = true;

    // Automatically populated by Hibernate with the timestamp when this record is first inserted;
    // used for auditing team registration history
    @CreationTimestamp
    // Maps to "created_at"; not updatable to preserve the original creation time
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Automatically updated by Hibernate each time this team record is modified;
    // useful for tracking recent changes to availability, location, or status
    @UpdateTimestamp
    // Maps to "updated_at"; refreshed on every update operation
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}