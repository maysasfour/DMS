package com.dms.incident;

import com.dms.citizen.CitizenRepository;
import com.dms.exception.BadRequestException;
import com.dms.exception.ResourceNotFoundException;
import com.dms.media.MediaDTO;
import com.dms.media.MediaRepository;
import com.dms.notification.NotificationService;
import com.dms.team.RescueTeamRepository;
import com.dms.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final CitizenRepository citizenRepository;
    private final RescueTeamRepository teamRepository;
    private final UserRepository userRepository;
    private final MediaRepository mediaRepository;
    private final NotificationService notificationService;
    private final IncidentValidator incidentValidator;

    @Transactional(readOnly = true)
    public Page<IncidentDTO> getAllIncidents(int page, int size, String status, String severity, String type, String q) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "reportedAt"));
        return incidentRepository
            .findWithFilters(
                (status != null && !status.isBlank()) ? status.toUpperCase() : null,
                (type   != null && !type.isBlank())   ? type.toUpperCase()   : null,
                (severity != null && !severity.isBlank()) ? severity.toUpperCase() : null,
                pageable)
            .map(IncidentDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<IncidentDTO> getMyIncidents(String email, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "reportedAt"));
        return incidentRepository.findByReportedBy_Email(email, pageable).map(IncidentDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public IncidentDTO getIncidentById(Long id) {
        IncidentDTO dto = IncidentDTO.fromEntity(findOrThrow(id));
        dto.setMedia(mediaRepository.findByIncident_IncidentId(id).stream()
                .map(MediaDTO::fromEntity).toList());
        return dto;
    }

    @Transactional
    public IncidentDTO createIncident(IncidentDTO req, String userEmail) {
        incidentValidator.validateCreate(req);
        // Build a human-readable location string from available fields
        String locationStr = req.getLocation() != null ? req.getLocation()
                : req.getLocationName() != null ? req.getLocationName()
                : req.getCity() != null && req.getAddress() != null ? req.getAddress() + ", " + req.getCity()
                : req.getCity() != null ? req.getCity()
                : req.getAddress();

        Incident incident = Incident.builder()
            .incidentType(resolve(req.getType() != null ? req.getType() : req.getCategory(), "OTHER"))
            .title(req.getTitle())
            .description(req.getDescription() != null ? req.getDescription() : "")
            .gpsLocation(req.getGpsLocation())
            .latitude(req.getLatitude())
            .longitude(req.getLongitude())
            .location(locationStr)
            .severity(resolve(req.getSeverity(), "MEDIUM"))
            .status("REPORTED")
            .build();

        // Link reporter: try citizens table first (legacy data), ignore if not found
        citizenRepository.findByEmail(userEmail).ifPresent(incident::setReportedBy);

        Incident saved = incidentRepository.save(incident);

        // FR4 / UC4: notify all admins about the new incident
        String notifTitle = "New Incident Reported: " + saved.getTitle();
        String notifMsg   = "[" + saved.getSeverity() + "] " + saved.getIncidentType()
                          + " at " + (saved.getLocation() != null ? saved.getLocation() : "unknown location");
        userRepository.findByRole("ADMIN").forEach(admin ->
            notificationService.createNotification(admin.getId(), notifTitle, notifMsg, "INCIDENT")
        );
        // Also notify RESCUE_TEAM members for high/critical incidents
        if ("HIGH".equals(saved.getSeverity()) || "CRITICAL".equals(saved.getSeverity())) {
            userRepository.findByRole("RESCUE_TEAM").forEach(responder ->
                notificationService.createNotification(responder.getId(), notifTitle, notifMsg, "INCIDENT")
            );
        }

        return IncidentDTO.fromEntity(saved);
    }

    @Transactional
    public IncidentDTO updateIncident(Long id, IncidentDTO req) {
        Incident incident = findOrThrow(id);

        if (req.getTitle()       != null) incident.setTitle(req.getTitle());
        if (req.getDescription() != null) incident.setDescription(req.getDescription());
        if (req.getLatitude()    != null) incident.setLatitude(req.getLatitude());
        if (req.getLongitude()   != null) incident.setLongitude(req.getLongitude());
        if (req.getLocation() != null)    incident.setLocation(req.getLocation());
        if (req.getLocationName() != null) incident.setLocation(req.getLocationName());
        if (req.getSeverity()    != null) incident.setSeverity(req.getSeverity().toUpperCase());
        String typeStr = req.getType() != null ? req.getType() : req.getCategory();
        if (typeStr != null) incident.setIncidentType(typeStr.toUpperCase());

        return IncidentDTO.fromEntity(incidentRepository.save(incident));
    }

    @Transactional
    public IncidentDTO updateIncidentStatus(Long id, String status) {
        incidentValidator.validateStatusUpdate(status);
        Incident incident = findOrThrow(id);
        incident.setStatus(status.toUpperCase());
        if ("CLOSED".equals(status.toUpperCase()) || "RESOLVED".equals(status.toUpperCase())) {
            incident.closeIncident();
        }
        return IncidentDTO.fromEntity(incidentRepository.save(incident));
    }

    @Transactional
    public IncidentDTO assignResponder(Long id, Long teamId) {
        Incident incident = findOrThrow(id);
        incident.setAssignedTeam(teamRepository.findById(teamId)
            .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId)));
        incident.setStatus("IN_PROGRESS");
        return IncidentDTO.fromEntity(incidentRepository.save(incident));
    }

    @Transactional
    public void deleteIncident(Long id) {
        if (!incidentRepository.existsById(id))
            throw new ResourceNotFoundException("Incident not found: " + id);
        incidentRepository.deleteById(id);
    }

    private Incident findOrThrow(Long id) {
        return incidentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Incident not found: " + id));
    }

    private String resolve(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value.toUpperCase() : fallback;
    }
}
