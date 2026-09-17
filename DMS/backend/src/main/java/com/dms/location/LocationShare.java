/**
 * LocationShare.java
 *
 * JPA entity representing a real-time location sharing session between a citizen
 * and a rescue team within the Disaster Management System (DMS).
 *
 * During an active disaster or emergency, a citizen can consent to share their
 * GPS coordinates with an assigned rescue team so responders can locate and
 * reach them efficiently. This entity persists each such sharing session,
 * including the coordinates, the parties involved, and the session lifecycle
 * (active/inactive, start time, expiry time).
 *
 * Table: location_shares
 */
package com.dms.location;

// Import the Citizen entity — represents the affected person sharing their location
import com.dms.citizen.Citizen;
// Import the RescueTeam entity — represents the emergency response team receiving the location
import com.dms.team.RescueTeam;
// Jakarta Persistence API annotations for ORM mapping to the database
import jakarta.persistence.*;
// Lombok annotations to auto-generate boilerplate: getters, setters, builder, constructors
import lombok.*;

// Used for timestamping when sharing started and when it expires
import java.time.LocalDateTime;

// @Entity marks this class as a JPA-managed database entity (mapped to a DB table)
@Entity
// @Table specifies the exact database table name that stores location sharing sessions
@Table(name = "location_shares")
// @Data generates getters, setters, equals, hashCode, and toString via Lombok
// @Builder enables the fluent builder pattern for constructing LocationShare instances
// @NoArgsConstructor generates a no-argument constructor required by JPA
// @AllArgsConstructor generates a constructor with all fields for programmatic use
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class LocationShare {

    // --- Primary Key ---

    // @Id designates this field as the primary key of the entity
    @Id
    // @GeneratedValue with IDENTITY strategy lets the database auto-increment the ID
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    // Maps this field to the "location_share_id" column in the database
    @Column(name = "location_share_id")
    // Unique identifier for each location sharing session record
    private Long locationShareId;

    // --- Relationships ---

    // @ManyToOne: many sharing sessions can belong to one citizen (a citizen may share multiple times)
    // FetchType.LAZY defers loading the Citizen object until explicitly accessed — improves performance
    @ManyToOne(fetch = FetchType.LAZY)
    // @JoinColumn defines the foreign key column; nullable=false means a citizen is always required
    @JoinColumn(name = "citizen_id", nullable = false)
    // The citizen who is sharing their location — the person in need of rescue
    private Citizen citizen;

    // @ManyToOne: many sharing sessions can be directed to one rescue team
    // FetchType.LAZY defers loading the RescueTeam object until explicitly accessed
    @ManyToOne(fetch = FetchType.LAZY)
    // The team_id foreign key is nullable — a session may exist before a team is assigned
    @JoinColumn(name = "team_id")
    // The rescue team receiving the citizen's live location; may be null if not yet assigned
    private RescueTeam team;

    // --- Location Data ---

    // Maps to the "gps_location" column; stores a combined "lat,lng" string for quick display or legacy use
    @Column(name = "gps_location")
    // Composite GPS location string in "latitude,longitude" format (e.g., "24.7136,46.6753")
    private String gpsLocation;

    // Latitude coordinate of the citizen's current position (decimal degrees, e.g., 24.7136)
    private Double latitude;

    // Longitude coordinate of the citizen's current position (decimal degrees, e.g., 46.6753)
    private Double longitude;

    // GPS accuracy in meters — lower values mean a more precise fix; helps responders judge reliability
    private Double accuracy;

    // --- Sharing Metadata ---

    // Maps to "shared_with" column; may store a description or identifier of who can view the location
    @Column(name = "shared_with")
    // Free-text or identifier indicating the recipient(s) of this location share (e.g., team name or role)
    private String sharedWith;

    // Maps to "is_active" column; must not be null — defaults to true when a session is created
    @Column(name = "is_active", nullable = false)
    // @Builder.Default ensures the Lombok builder initializes isActive to true instead of null
    @Builder.Default
    // Flag indicating whether this location sharing session is currently active;
    // set to false when the citizen stops sharing or the session expires
    private Boolean isActive = true;

    // Maps to "shared_at" column; records when the sharing session began; must not be null
    @Column(name = "shared_at", nullable = false)
    // @Builder.Default initializes the timestamp to the current moment when a new session is built
    @Builder.Default
    // Timestamp of when the citizen started sharing their location with the rescue team
    private LocalDateTime sharedAt = LocalDateTime.now();

    // Maps to "expires_at" column; nullable — a session may have no expiry (indefinite sharing)
    @Column(name = "expires_at")
    // Optional expiry timestamp; after this time the sharing session should be considered invalid
    private LocalDateTime expiresAt;

    // --- Lifecycle Methods ---

    /**
     * Activates this location sharing session and records the current time as the start.
     * Call this when a citizen consents to share their location during an emergency.
     */
    public void startSharing() { this.isActive = true; this.sharedAt = LocalDateTime.now(); }

    /**
     * Deactivates this location sharing session.
     * Call this when the citizen withdraws consent, the incident is resolved,
     * or the rescue team no longer needs live tracking.
     */
    public void stopSharing() { this.isActive = false; }

    /**
     * Updates the citizen's current GPS coordinates and refreshes the composite gpsLocation string.
     * Should be called whenever a new location ping is received from the citizen's device,
     * allowing rescue teams to track movement in real time during a disaster response.
     *
     * @param lat the new latitude value from the citizen's device
     * @param lng the new longitude value from the citizen's device
     */
    public void updateLocation(Double lat, Double lng) { this.latitude = lat; this.longitude = lng; this.gpsLocation = lat + "," + lng; }
}