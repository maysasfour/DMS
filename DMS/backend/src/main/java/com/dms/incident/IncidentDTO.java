package com.dms.incident;

import com.dms.media.MediaDTO;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class IncidentDTO {

    private Long id;          // maps to incidentId
    private String title;
    private String description;
    private String type;      // incidentType
    private String category;  // alias
    private String severity;
    private String status;
    private String gpsLocation;
    private String locationName;
    private String location;
    private Double latitude;
    private Double longitude;

    // Extra fields accepted on create/update (stored in location / description)
    private String address;
    private String city;
    private String contactName;
    private String contactPhone;

    private Long reportedById;
    private String reportedByName;
    private String reporterName;

    private Long assignedTeamId;
    private String assignedTeamName;
    private String assignedResponderName;

    private Long shelterId;
    private String shelterName;

    private LocalDateTime reportedAt;
    private LocalDateTime createdAt;   // alias for reportedAt — used by frontend
    private LocalDateTime updatedAt;

    private List<MediaDTO> media;

    public static IncidentDTO fromEntity(Incident incident) {
        String reporter = incident.getReportedBy() != null ? incident.getReportedBy().getName() : null;
        String teamName = incident.getAssignedTeam() != null ? incident.getAssignedTeam().getName() : null;
        String shelterName = incident.getShelter() != null ? incident.getShelter().getName() : null;

        return IncidentDTO.builder()
            .id(incident.getIncidentId())
            .title(incident.getTitle())
            .description(incident.getDescription())
            .type(incident.getIncidentType())
            .category(incident.getIncidentType())
            .severity(incident.getSeverity())
            .status(incident.getStatus())
            .gpsLocation(incident.getGpsLocation())
            .locationName(incident.getLocation())
            .location(incident.getLocation())
            .latitude(incident.getLatitude())
            .longitude(incident.getLongitude())
            .reportedById(incident.getReportedBy() != null ? incident.getReportedBy().getCitizenId() : null)
            .reportedByName(reporter)
            .reporterName(reporter)
            .assignedTeamId(incident.getAssignedTeam() != null ? incident.getAssignedTeam().getTeamId() : null)
            .assignedTeamName(teamName)
            .assignedResponderName(teamName)
            .shelterId(incident.getShelter() != null ? incident.getShelter().getShelterId() : null)
            .shelterName(shelterName)
            .reportedAt(incident.getReportedAt())
            .createdAt(incident.getReportedAt())
            .updatedAt(incident.getUpdatedAt())
            .build();
    }
}
