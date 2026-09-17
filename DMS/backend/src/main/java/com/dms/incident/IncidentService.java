/**
 * IncidentService.java
 *
 * Core business logic layer for the Disaster Management System's incident lifecycle.
 * Handles creation, retrieval, filtering, status transitions, responder assignment,
 * and deletion of disaster incidents. Coordinates with the notification system to
 * alert administrators and rescue teams when new or high-severity incidents are reported.
 *
 * This service is invoked by IncidentController and enforces domain rules via
 * IncidentValidator before persisting changes through Spring Data JPA repositories.
 */
package com.dms.incident;

// Repository for looking up citizens (incident reporters) by email
import com.dms.citizen.CitizenRepository;
// Custom exception for invalid input (e.g. missing required fields on incident creation)
import com.dms.exception.BadRequestException;
// Custom exception thrown when a requested incident, team, or user does not exist
import com.dms.exception.ResourceNotFoundException;
// DTO for attaching media (photos/videos) to an incident response payload
import com.dms.media.MediaDTO;
// Repository for fetching media files linked to a specific incident
import com.dms.media.MediaRepository;
// Service for dispatching in-app notifications to admins and rescue teams
import com.dms.notification.NotificationService;
// Repository for looking up rescue teams by ID when assigning a responder
import com.dms.team.RescueTeamRepository;
// Repository for querying system users by role (e.g. ADMIN, RESCUE_TEAM)
import com.dms.user.UserRepository;
// Lombok: generates a constructor that injects all final fields (dependency injection)
import lombok.RequiredArgsConstructor;
// Lombok: injects an SLF4J logger named `log` into this class for structured logging
import lombok.extern.slf4j.Slf4j;
// Spring Data pagination and sorting utilities
import org.springframework.data.domain.*;
// Marks methods to run asynchronously on a separate thread (currently imported for potential use)
import org.springframework.scheduling.annotation.Async;
// Marks this class as a Spring-managed service bean (business logic layer)
import org.springframework.stereotype.Service;
// Ensures database operations within a method are wrapped in a single transaction
import org.springframework.transaction.annotation.Transactional;

// Enables SLF4J logging via the `log` field injected by Lombok
@Slf4j
// Registers this class as a Spring service component, making it eligible for auto-wiring
@Service
// Generates a constructor for all final fields, satisfying Spring's constructor-based injection
@RequiredArgsConstructor
public class IncidentService {

    // JPA repository for CRUD and custom filter queries on Incident entities
    private final IncidentRepository incidentRepository;
    // Repository used to look up the citizen who reported an incident by their email
    private final CitizenRepository citizenRepository;
    // Repository used to validate and fetch rescue teams when assigning a responder
    private final RescueTeamRepository teamRepository;
    // Repository used to find all users with a specific role (e.g. ADMIN, RESCUE_TEAM) for notifications
    private final UserRepository userRepository;
    // Repository for fetching media attachments (images/videos) associated with incidents
    private final MediaRepository mediaRepository;
    // Service responsible for creating and dispatching in-app notifications to system users
    private final NotificationService notificationService;
    // Validator that enforces domain rules on incident creation and status transitions
    private final IncidentValidator incidentValidator;

    // readOnly = true tells the JPA provider to skip dirty-checking, improving read performance
    @Transactional(readOnly = true)
    /**
     * Retrieves a paginated, filtered list of all incidents in the system.
     * Supports filtering by status (e.g. REPORTED, IN_PROGRESS, RESOLVED),
     * severity (LOW, MEDIUM, HIGH, CRITICAL), and incident type (e.g. FIRE, FLOOD).
     * Results are sorted by reportedAt descending so the newest incidents appear first.
     *
     * @param page     zero-based page index for pagination
     * @param size     number of incidents per page
     * @param status   optional status filter; null or blank means no filter applied
     * @param severity optional severity filter; null or blank means no filter applied
     * @param type     optional incident type filter; null or blank means no filter applied
     * @param q        optional free-text search query (reserved for future use)
     * @return a Page of IncidentDTOs matching the given filters
     */
    public Page<IncidentDTO> getAllIncidents(int page, int size, String status, String severity, String type, String q) {
        // Build a pageable request sorted by reportedAt DESC so the most recent incidents appear first
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "reportedAt"));
        return incidentRepository
            .findWithFilters(
                // Normalize status to uppercase; pass null if blank to omit the filter in the query
                (status != null && !status.isBlank()) ? status.toUpperCase() : null,
                // Normalize type to uppercase; pass null if blank to omit the filter in the query
                (type   != null && !type.isBlank())   ? type.toUpperCase()   : null,
                // Normalize severity to uppercase; pass null if blank to omit the filter in the query
                (severity != null && !severity.isBlank()) ? severity.toUpperCase() : null,
                pageable)
            // Convert each Incident JPA entity to a lightweight DTO for the API response
            .map(IncidentDTO::fromEntity);
    }

    // readOnly = true optimises the transaction since no data is being modified
    @Transactional(readOnly = true)
    /**
     * Retrieves a paginated list of incidents reported by a specific citizen,
     * identified by their email address. Used by the citizen portal to show
     * a user their own incident history.
     *
     * @param email email address of the reporting citizen
     * @param page  zero-based page index
     * @param size  number of records per page
     * @return a Page of IncidentDTOs belonging to the given reporter
     */
    public Page<IncidentDTO> getMyIncidents(String email, int page, int size) {
        // Sort by reportedAt DESC so the citizen's most recent reports appear at the top
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "reportedAt"));
        // Query by the reporter's email and map each entity to a DTO
        return incidentRepository.findByReportedBy_Email(email, pageable).map(IncidentDTO::fromEntity);
    }

    // readOnly = true because this method only reads incident and media data
    @Transactional(readOnly = true)
    /**
     * Fetches a single incident by its unique ID, including any media attachments
     * (photos or videos) that were uploaded with the report.
     *
     * @param id the primary key of the incident
     * @return an IncidentDTO populated with incident details and associated media
     * @throws ResourceNotFoundException if no incident exists with the given ID
     */
    public IncidentDTO getIncidentById(Long id) {
        // Convert entity to DTO; throws ResourceNotFoundException if id is invalid
        IncidentDTO dto = IncidentDTO.fromEntity(findOrThrow(id));
        // Fetch and attach all media files linked to this incident (images, videos)
        dto.setMedia(mediaRepository.findByIncident_IncidentId(id).stream()
                .map(MediaDTO::fromEntity).toList());
        return dto;
    }

    // Wraps the entire creation flow in a single transaction so partial failures are rolled back
    @Transactional
    /**
     * Creates a new disaster incident record in the system.
     * Validates the incoming request, builds a human-readable location string,
     * links the reporting citizen, persists the incident, and then notifies all
     * admins (and rescue teams for high/critical severity) of the new report.
     *
     * @param req       DTO containing incident details submitted by the citizen
     * @param userEmail email of the authenticated citizen creating the report
     * @return the persisted incident as an IncidentDTO
     * @throws BadRequestException if required fields are missing or invalid
     */
    public IncidentDTO createIncident(IncidentDTO req, String userEmail) {
        // Enforce mandatory field rules (e.g. title, type, GPS coordinates) before proceeding
        incidentValidator.validateCreate(req);
        // Build a human-readable location string from available fields
        // Priority: explicit location string > locationName > address+city combo > city > address
        String locationStr = req.getLocation() != null ? req.getLocation()
                : req.getLocationName() != null ? req.getLocationName()
                : req.getCity() != null && req.getAddress() != null ? req.getAddress() + ", " + req.getCity()
                : req.getCity() != null ? req.getCity()
                : req.getAddress();

        // Construct the Incident entity using the builder pattern
        Incident incident = Incident.builder()
            // Resolve incident type from either 'type' or legacy 'category' field; default to "OTHER"
            .incidentType(resolve(req.getType() != null ? req.getType() : req.getCategory(), "OTHER"))
            .title(req.getTitle())
            // Default empty string if no description provided to avoid null in the database
            .description(req.getDescription() != null ? req.getDescription() : "")
            // Raw GPS string (e.g. "POINT(lat lon)") for spatial queries
            .gpsLocation(req.getGpsLocation())
            // Separate latitude and longitude fields for map rendering and proximity searches
            .latitude(req.getLatitude())
            .longitude(req.getLongitude())
            // Human-readable location derived above
            .location(locationStr)
            // Default to MEDIUM severity if not specified by the citizen
            .severity(resolve(req.getSeverity(), "MEDIUM"))
            // All new incidents start in REPORTED state, awaiting admin review
            .status("REPORTED")
            .build();

        // Link reporter: try citizens table first (legacy data), ignore if not found
        // Uses Optional.ifPresent to silently skip linking if the citizen record is missing
        citizenRepository.findByEmail(userEmail).ifPresent(incident::setReportedBy);

        // Persist the incident to the database
        Incident saved = incidentRepository.save(incident);

        // FR4 / UC4: notify all admins about the new incident
        // Compose a concise notification title that includes the incident title
        String notifTitle = "New Incident Reported: " + saved.getTitle();
        // Compose a message body showing severity, type, and location for quick triage
        String notifMsg   = "[" + saved.getSeverity() + "] " + saved.getIncidentType()
                          + " at " + (saved.getLocation() != null ? saved.getLocation() : "unknown location");
        // Send an in-app notification to every ADMIN user so they can review and respond
        userRepository.findByRole("ADMIN").forEach(admin ->
            notificationService.createNotification(admin.getId(), notifTitle, notifMsg, "INCIDENT")
        );
        // Also notify RESCUE_TEAM members for high/critical incidents so they can prepare to respond immediately
        if ("HIGH".equals(saved.getSeverity()) || "CRITICAL".equals(saved.getSeverity())) {
            userRepository.findByRole("RESCUE_TEAM").forEach(responder ->
                notificationService.createNotification(responder.getId(), notifTitle, notifMsg, "INCIDENT")
            );
        }

        // Return the saved entity as a DTO, including the generated incident ID
        return IncidentDTO.fromEntity(saved);
    }

    // Wraps the update in a transaction so any failure rolls back all field changes atomically
    @Transactional
    /**
     * Partially updates an existing incident's details (title, description, location,
     * severity, and type). Only non-null fields in the request are applied, allowing
     * partial patch-style updates without overwriting unchanged data.
     *
     * @param id  the primary key of the incident to update
     * @param req DTO containing the fields to update (null fields are ignored)
     * @return the updated incident as an IncidentDTO
     * @throws ResourceNotFoundException if no incident exists with the given ID
     */
    public IncidentDTO updateIncident(Long id, IncidentDTO req) {
        // Load the existing incident or throw if it doesn't exist
        Incident incident = findOrThrow(id);

        // Apply only the fields that were explicitly provided in the request (partial update pattern)
        if (req.getTitle()       != null) incident.setTitle(req.getTitle());
        if (req.getDescription() != null) incident.setDescription(req.getDescription());
        // Update GPS coordinates if new values are provided
        if (req.getLatitude()    != null) incident.setLatitude(req.getLatitude());
        if (req.getLongitude()   != null) incident.setLongitude(req.getLongitude());
        // Prefer 'location' string over 'locationName' if both are sent
        if (req.getLocation() != null)    incident.setLocation(req.getLocation());
        if (req.getLocationName() != null) incident.setLocation(req.getLocationName());
        // Normalize severity to uppercase to match enum-like string values in the database
        if (req.getSeverity()    != null) incident.setSeverity(req.getSeverity().toUpperCase());
        // Support both 'type' and legacy 'category' field names from older API clients
        String typeStr = req.getType() != null ? req.getType() : req.getCategory();
        if (typeStr != null) incident.setIncidentType(typeStr.toUpperCase());

        // Persist the updated entity and return it as a DTO
        return IncidentDTO.fromEntity(incidentRepository.save(incident));
    }

    // Transaction ensures the status change and any triggered side-effects (e.g. closeIncident) are atomic
    @Transactional
    /**
     * Updates the workflow status of an incident (e.g. REPORTED -> IN_PROGRESS -> RESOLVED).
     * When an incident is closed or resolved, the entity's closeIncident() method is called
     * to stamp the resolution timestamp and perform any required cleanup.
     *
     * @param id     the primary key of the incident to update
     * @param status the new status string (must pass IncidentValidator rules)
     * @return the updated incident as an IncidentDTO
     * @throws BadRequestException       if the status value is not a recognised workflow state
     * @throws ResourceNotFoundException if no incident exists with the given ID
     */
    public IncidentDTO updateIncidentStatus(Long id, String status) {
        // Validate that the status is a recognised workflow value (e.g. REPORTED, IN_PROGRESS, RESOLVED, CLOSED)
        incidentValidator.validateStatusUpdate(status);
        // Load the existing incident or throw a 404-style exception
        Incident incident = findOrThrow(id);
        // Normalise to uppercase before persisting to match database conventions
        incident.setStatus(status.toUpperCase());
        // If the incident is being closed or resolved, delegate to the entity's close logic
        // which stamps resolvedAt timestamp and may perform other lifecycle actions
        if ("CLOSED".equals(status.toUpperCase()) || "RESOLVED".equals(status.toUpperCase())) {
            incident.closeIncident();
        }
        // Persist the status change and return the updated DTO
        return IncidentDTO.fromEntity(incidentRepository.save(incident));
    }

    // Transaction ensures the team assignment and status change are committed together
    @Transactional
    /**
     * Assigns a rescue team to an incident and automatically advances the incident
     * status to IN_PROGRESS, signalling that active response has begun.
     *
     * @param id     the primary key of the incident
     * @param teamId the primary key of the rescue team to assign
     * @return the updated incident as an IncidentDTO with the assigned team populated
     * @throws ResourceNotFoundException if either the incident or the team does not exist
     */
    public IncidentDTO assignResponder(Long id, Long teamId) {
        // Load the incident to assign a team to; throws if not found
        Incident incident = findOrThrow(id);
        // Look up the rescue team and assign it; throw a descriptive error if the team ID is invalid
        incident.setAssignedTeam(teamRepository.findById(teamId)
            .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId)));
        // Automatically transition status to IN_PROGRESS when a responder is assigned
        incident.setStatus("IN_PROGRESS");
        // Persist the assignment and return the updated DTO
        return IncidentDTO.fromEntity(incidentRepository.save(incident));
    }

    // Transaction ensures the existence check and delete are atomic, preventing a race condition
    @Transactional
    /**
     * Permanently deletes an incident record from the system.
     * Used by administrators to remove duplicate, test, or erroneous reports.
     *
     * @param id the primary key of the incident to delete
     * @throws ResourceNotFoundException if no incident exists with the given ID
     */
    public void deleteIncident(Long id) {
        // Guard against deleting a non-existent incident; provides a meaningful error to the caller
        if (!incidentRepository.existsById(id))
            throw new ResourceNotFoundException("Incident not found: " + id);
        // Permanently remove the incident and any cascaded child records from the database
        incidentRepository.deleteById(id);
    }

    /**
     * Internal helper that loads an Incident entity by ID or throws ResourceNotFoundException.
     * Centralises the "find or 404" pattern used across multiple service methods.
     *
     * @param id the primary key of the incident
     * @return the Incident JPA entity
     * @throws ResourceNotFoundException if no incident exists with the given ID
     */
    private Incident findOrThrow(Long id) {
        // Attempt to find the incident; wrap the missing-case in a descriptive domain exception
        return incidentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Incident not found: " + id));
    }

    /**
     * Utility method to normalise a nullable string value to uppercase,
     * falling back to a default if the value is null or blank.
     * Used to standardise incident type and severity values before persistence.
     *
     * @param value    the input string (may be null or blank)
     * @param fallback the default value to use when input is absent
     * @return the uppercased value, or the fallback string
     */
    private String resolve(String value, String fallback) {
        // Return the uppercased value if present, otherwise use the provided fallback (e.g. "OTHER", "MEDIUM")
        return (value != null && !value.isBlank()) ? value.toUpperCase() : fallback;
    }
}