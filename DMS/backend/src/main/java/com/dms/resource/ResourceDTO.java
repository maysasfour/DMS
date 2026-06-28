package com.dms.resource;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ResourceDTO {
    private Long id;
    private String name;
    private String type;
    private String status;
    private String locationName;
    private Double latitude;
    private Double longitude;
    private Long assignedIncidentId;
    private LocalDateTime createdAt;

    public static ResourceDTO fromEntity(Resource resource) {
        return ResourceDTO.builder()
            .id(resource.getId())
            .name(resource.getName())
            .type(resource.getType())
            .status(resource.getStatus())
            .locationName(resource.getLocationName())
            .latitude(resource.getLatitude())
            .longitude(resource.getLongitude())
            .assignedIncidentId(resource.getAssignedIncident() != null
                ? resource.getAssignedIncident().getIncidentId() : null)
            .createdAt(resource.getCreatedAt())
            .build();
    }
}
