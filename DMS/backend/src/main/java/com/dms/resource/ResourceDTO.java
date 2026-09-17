/**
 * ResourceDTO.java
 *
 * Data Transfer Object (DTO) for the Resource entity in the Disaster Management System.
 * This class is used to safely transfer resource data between the backend service layer
 * and the API consumers (e.g., frontend dashboard, mobile clients) without exposing
 * internal JPA entity relationships or sensitive persistence details.
 *
 * Resources in the DMS represent physical or human assets (e.g., ambulances, fire trucks,
 * rescue teams) that can be deployed to disaster incidents. This DTO carries the key
 * fields needed for display, assignment tracking, and geolocation on maps.
 */
package com.dms.resource;

// Jackson annotation to control JSON serialization behavior
import com.fasterxml.jackson.annotation.JsonInclude;

// Lombok annotations to auto-generate boilerplate: getters, setters, builder, constructors
import lombok.*;

// Used for the createdAt timestamp field, representing when the resource was registered
import java.time.LocalDateTime;

// @Data generates getters, setters, equals, hashCode, and toString for all fields
@Data
// @Builder enables the fluent builder pattern used in fromEntity() to construct instances
@Builder
// @NoArgsConstructor generates a no-argument constructor required by frameworks and deserialization
@NoArgsConstructor
// @AllArgsConstructor generates a constructor with all fields, used alongside @Builder
@AllArgsConstructor
// Omits null fields from JSON responses — keeps API payloads clean when optional fields are absent
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ResourceDTO {

    // Unique database identifier for the resource record
    private Long id;

    // Human-readable name of the resource (e.g., "Ambulance Unit 3", "Search & Rescue Team Alpha")
    private String name;

    // Category/type of the resource (e.g., "VEHICLE", "PERSONNEL", "EQUIPMENT")
    private String type;

    // Current operational status of the resource (e.g., "AVAILABLE", "DEPLOYED", "MAINTENANCE")
    private String status;

    // Descriptive name of the resource's current or base location (e.g., "Central Fire Station")
    private String locationName;

    // Geographic latitude coordinate for plotting the resource on the DMS incident map
    private Double latitude;

    // Geographic longitude coordinate for plotting the resource on the DMS incident map
    private Double longitude;

    // ID of the incident this resource is currently assigned to; null if unassigned
    private Long assignedIncidentId;

    // Timestamp recording when this resource was first registered in the DMS
    private LocalDateTime createdAt;

    /**
     * Static factory method that converts a Resource JPA entity into a ResourceDTO.
     * This decouples the persistence model from the API contract, preventing
     * accidental exposure of lazy-loaded associations or internal entity state.
     *
     * @param resource the Resource entity retrieved from the database
     * @return a ResourceDTO populated with the entity's field values
     */
    public static ResourceDTO fromEntity(Resource resource) {
        return ResourceDTO.builder()
            // Copy the database-generated primary key
            .id(resource.getId())
            // Copy the resource's display name
            .name(resource.getName())
            // Copy the resource category/type classification
            .type(resource.getType())
            // Copy the current deployment or availability status
            .status(resource.getStatus())
            // Copy the human-readable location label
            .locationName(resource.getLocationName())
            // Copy the latitude for map rendering
            .latitude(resource.getLatitude())
            // Copy the longitude for map rendering
            .longitude(resource.getLongitude())
            // Safely extract the incident ID only if the resource is currently assigned to an incident;
            // avoids NullPointerException when the resource is unassigned
            .assignedIncidentId(resource.getAssignedIncident() != null
                ? resource.getAssignedIncident().getIncidentId() : null)
            // Copy the registration timestamp for audit and display purposes
            .createdAt(resource.getCreatedAt())
            // Finalize and construct the DTO instance via Lombok's builder
            .build();
    }
}