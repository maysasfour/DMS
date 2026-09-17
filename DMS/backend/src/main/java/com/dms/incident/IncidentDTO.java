/**
 * IncidentDTO.java
 *
 * Data Transfer Object (DTO) for the Incident domain in the Disaster Management System (DMS).
 * This class serves as the API contract between the backend and frontend, carrying all
 * relevant incident information (type, severity, location, reporter, assigned team, shelter)
 * without exposing internal JPA entity relationships or sensitive database internals.
 *
 * Used in REST responses for incident creation, retrieval, updates, and list views.
 * Null fields are omitted from JSON output to keep API payloads lean.
 */
package com.dms.incident;

// Import the MediaDTO to embed associated media files (photos, videos) attached to an incident
import com.dms.media.MediaDTO;
// Jackson annotation to suppress null fields in JSON serialization
import com.fasterxml.jackson.annotation.JsonInclude;
// Lombok annotations to auto-generate boilerplate code at compile time
import lombok.*;

// For timestamping when incidents were reported, created, or last updated
import java.time.LocalDateTime;
// For holding a collection of media attachments linked to an incident
import java.util.List;

// @Data generates getters, setters, equals, hashCode, and toString for all fields
@Data
// @Builder enables the fluent builder pattern used in fromEntity() below
@Builder
// @NoArgsConstructor generates a no-args constructor required by frameworks like Jackson and JPA proxies
@NoArgsConstructor
// @AllArgsConstructor generates a constructor accepting all fields, used alongside @Builder
@AllArgsConstructor
// Omit any field that is null from the JSON response, reducing payload size for partial incident data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class IncidentDTO {

    // Unique identifier for the incident; maps to the incidentId primary key in the Incident entity
    private Long id;          // maps to incidentId

    // Short, human-readable title describing the incident (e.g., "Building Fire in District 4")
    private String title;

    // Detailed narrative of the incident, including context and on-ground observations
    private String description;

    // Categorical type of the incident (e.g., FIRE, FLOOD, EARTHQUAKE); mapped from incidentType in the entity
    private String type;      // incidentType

    // Alias for 'type' — provided for frontend compatibility where 'category' is expected instead of 'type'
    private String category;  // alias

    // Severity level of the incident (e.g., LOW, MEDIUM, HIGH, CRITICAL) for triage prioritization
    private String severity;

    // Current lifecycle status of the incident (e.g., REPORTED, IN_PROGRESS, RESOLVED, CLOSED)
    private String status;

    // Raw GPS coordinate string (e.g., "lat,lng") as received from mobile reporters or IoT sensors
    private String gpsLocation;

    // Human-readable name of the incident location (e.g., neighborhood or landmark name)
    private String locationName;

    // General location label — alias for locationName, provided for frontend compatibility
    private String location;

    // Precise latitude coordinate for map rendering and geospatial queries
    private Double latitude;

    // Precise longitude coordinate for map rendering and geospatial queries
    private Double longitude;

    // Extra fields accepted on create/update (stored in location / description)

    // Street address of the incident site; merged into location or description on persistence
    private String address;

    // City where the incident occurred; used for regional filtering and reporting
    private String city;

    // Name of the person who reported the incident via phone or web form (may differ from registered user)
    private String contactName;

    // Phone number of the reporting contact; used by response teams to coordinate on-site
    private String contactPhone;

    // ID of the registered citizen or user who submitted this incident report
    private Long reportedById;

    // Display name of the reporting user; resolved from the User entity for response convenience
    private String reportedByName;

    // Alias for reportedByName — used by certain frontend components expecting 'reporterName'
    private String reporterName;

    // ID of the response team assigned to handle this incident
    private Long assignedTeamId;

    // Display name of the assigned response team (e.g., "Fire & Rescue Team Alpha")
    private String assignedTeamName;

    // Alias for assignedTeamName — used where a responder-level label is expected by the frontend
    private String assignedResponderName;

    // ID of the shelter associated with this incident (for evacuation or disaster relief scenarios)
    private Long shelterId;

    // Display name of the linked shelter (e.g., "Central Community Shelter")
    private String shelterName;

    // Timestamp when the incident was officially reported by the citizen or officer
    private LocalDateTime reportedAt;

    // Alias for reportedAt — used by frontend components that expect a 'createdAt' field
    private LocalDateTime createdAt;   // alias for reportedAt — used by frontend

    // Timestamp of the most recent update to the incident record (status change, reassignment, etc.)
    private LocalDateTime updatedAt;

    // List of media attachments (images, videos) submitted alongside the incident report for verification
    private List<MediaDTO> media;

    /**
     * Converts a persistent Incident JPA entity into a flat IncidentDTO for API responses.
     * Resolves lazy-loaded relationships (reporter, team, shelter) into scalar fields
     * so that the frontend receives a self-contained JSON object without needing extra calls.
     *
     * Null-safe checks prevent NullPointerExceptions when optional relationships are absent
     * (e.g., an incident not yet assigned to a team or shelter).
     *
     * @param incident the Incident entity fetched from the database
     * @return a fully populated IncidentDTO ready for serialization
     */
    public static IncidentDTO fromEntity(Incident incident) {
        // Resolve the reporter's display name; null if no registered user is linked (anonymous report)
        String reporter = incident.getReportedBy() != null ? incident.getReportedBy().getName() : null;

        // Resolve the assigned team's name; null if the incident has not yet been dispatched
        String teamName = incident.getAssignedTeam() != null ? incident.getAssignedTeam().getName() : null;

        // Resolve the shelter's name; null if no evacuation shelter is linked to this incident
        String shelterName = incident.getShelter() != null ? incident.getShelter().getName() : null;

        // Build and return the DTO using Lombok's builder, mapping each entity field to its DTO counterpart
        return IncidentDTO.builder()
            // Map the database primary key to the DTO's id field
            .id(incident.getIncidentId())
            // Carry over the incident title directly from the entity
            .title(incident.getTitle())
            // Carry over the detailed incident description
            .description(incident.getDescription())
            // Map incidentType to both 'type' and 'category' for dual-field frontend support
            .type(incident.getIncidentType())
            .category(incident.getIncidentType())  // duplicate to satisfy frontend 'category' expectation
            // Map the severity classification (LOW / MEDIUM / HIGH / CRITICAL)
            .severity(incident.getSeverity())
            // Map the current workflow status of the incident
            .status(incident.getStatus())
            // Map the raw GPS string for map pin rendering
            .gpsLocation(incident.getGpsLocation())
            // Map location text to both locationName and location aliases
            .locationName(incident.getLocation())
            .location(incident.getLocation())       // duplicate to satisfy frontend 'location' expectation
            // Map precise coordinates for heatmap and geospatial features
            .latitude(incident.getLatitude())
            .longitude(incident.getLongitude())
            // Safely extract the reporter's citizen ID; null if report was submitted anonymously
            .reportedById(incident.getReportedBy() != null ? incident.getReportedBy().getCitizenId() : null)
            // Map reporter name to both field aliases consumed by different frontend views
            .reportedByName(reporter)
            .reporterName(reporter)                 // alias used by incident detail and list components
            // Safely extract the assigned team's ID; null if not yet dispatched
            .assignedTeamId(incident.getAssignedTeam() != null ? incident.getAssignedTeam().getTeamId() : null)
            // Map team name to both field aliases for admin and officer views
            .assignedTeamName(teamName)
            .assignedResponderName(teamName)        // alias used where an individual responder label is shown
            // Safely extract shelter ID; null if no shelter has been linked to this incident
            .shelterId(incident.getShelter() != null ? incident.getShelter().getShelterId() : null)
            // Map shelter display name for evacuation and resource coordination views
            .shelterName(shelterName)
            // Map the original report timestamp; also aliased as createdAt for frontend compatibility
            .reportedAt(incident.getReportedAt())
            .createdAt(incident.getReportedAt())    // alias so frontend 'createdAt' consumers receive a value
            // Map the last-modified timestamp used to show update history in the admin panel
            .updatedAt(incident.getUpdatedAt())
            .build();
    }
}