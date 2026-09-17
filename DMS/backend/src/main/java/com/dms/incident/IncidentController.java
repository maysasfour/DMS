/**
 * IncidentController.java
 *
 * REST controller responsible for handling all HTTP requests related to disaster incidents
 * in the Disaster Management System (DMS). This controller exposes a versioned REST API
 * under /api/v1/incidents and delegates all business logic to IncidentService.
 *
 * Supported operations include:
 *  - Listing all incidents with pagination and multi-criteria filtering (status, severity, type, keyword)
 *  - Retrieving incidents reported by the currently authenticated user (citizen/officer)
 *  - Fetching a single incident by its unique ID
 *  - Creating new incident reports submitted by authenticated users
 *  - Updating full incident details (e.g., location, description, severity)
 *  - Patching only the status of an incident (e.g., REPORTED -> IN_PROGRESS -> RESOLVED)
 *  - Assigning a responder (officer or team) to an active incident
 *  - Deleting an incident record (admin-level operation)
 *
 * All responses are wrapped in the standard ApiResponse envelope for consistent
 * API contract across the DMS backend.
 */
package com.dms.incident;

// Imports the standard API response wrapper used across all DMS endpoints
import com.dms.common.ApiResponse;
// Swagger/OpenAPI annotations for auto-generating interactive API documentation
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
// Lombok annotation to auto-generate a constructor injecting all final fields (avoids @Autowired boilerplate)
import lombok.RequiredArgsConstructor;
// Spring Data pagination support — used to return paginated lists of incidents
import org.springframework.data.domain.Page;
// Spring HTTP response type that allows setting status codes and headers
import org.springframework.http.ResponseEntity;
// Provides access to the currently authenticated principal (logged-in user's identity)
import org.springframework.security.core.Authentication;
// Spring Web MVC annotations for REST controllers, request mapping, and parameter binding
import org.springframework.web.bind.annotation.*;

// Marks this class as a Spring REST controller — combines @Controller and @ResponseBody,
// so all method return values are serialized directly to JSON in the HTTP response body
@RestController
// Maps all methods in this controller to the base path /api/v1/incidents,
// versioned under "v1" to support future API evolution without breaking existing clients
@RequestMapping("/api/v1/incidents")
// Lombok: generates a constructor with one parameter per final field,
// enabling Spring to inject IncidentService without explicit @Autowired
@RequiredArgsConstructor
// Swagger/OpenAPI: groups all endpoints under the "Incidents" tag in the generated API docs,
// with a human-readable description for the API explorer UI
@Tag(name = "Incidents", description = "Incident management endpoints")
public class IncidentController {

    // Injected service layer that contains all business logic for incident operations;
    // declared final so Lombok's @RequiredArgsConstructor generates the constructor injection
    private final IncidentService incidentService;

    // Swagger: documents this endpoint's summary in the OpenAPI spec for developers/testers
    @Operation(summary = "Get all incidents with pagination and filters")
    // HTTP GET /api/v1/incidents — retrieves a paginated, filterable list of all incidents
    // used by admin dashboards and officer views to monitor all reported disasters
    @GetMapping
    public ResponseEntity<ApiResponse<Page<IncidentDTO>>> getAllIncidents(
            // Page index (zero-based); defaults to 0 so first-time callers get the first page
            @RequestParam(defaultValue = "0") int page,
            // Number of incidents per page; defaults to 10 for manageable payload sizes
            @RequestParam(defaultValue = "10") int size,
            // Optional filter by incident lifecycle status (e.g., REPORTED, IN_PROGRESS, RESOLVED)
            @RequestParam(required = false) String status,
            // Optional filter by severity level (e.g., LOW, MEDIUM, HIGH, CRITICAL)
            @RequestParam(required = false) String severity,
            // Optional filter by incident type (e.g., FLOOD, FIRE, EARTHQUAKE, MEDICAL)
            @RequestParam(required = false) String type,
            // Optional free-text search query to match incident title or description keywords
            @RequestParam(required = false) String q) {
        // Delegates filtering, pagination, and mapping to the service layer
        Page<IncidentDTO> incidents = incidentService.getAllIncidents(page, size, status, severity, type, q);
        // Wraps the paginated result in the standard ApiResponse envelope with a success message
        return ResponseEntity.ok(ApiResponse.success("Incidents retrieved successfully", incidents));
    }

    // Swagger: documents the summary for the "my incidents" endpoint
    @Operation(summary = "Get incidents reported by the current user")
    // HTTP GET /api/v1/incidents/my — returns only incidents submitted by the logged-in user;
    // used in the citizen portal so users can track their own disaster reports
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<IncidentDTO>>> getMyIncidents(
            // Zero-based page index for paginating the user's own incident history
            @RequestParam(defaultValue = "0") int page,
            // Page size limiting how many personal incidents are returned at once
            @RequestParam(defaultValue = "10") int size,
            // Spring Security injects the current user's authentication token;
            // used to extract the username/email to scope the query to this user only
            Authentication authentication) {
        // Uses authentication.getName() to get the logged-in user's identifier (email or username),
        // then delegates to the service to fetch only that user's incidents
        return ResponseEntity.ok(ApiResponse.success("My incidents retrieved",
                incidentService.getMyIncidents(authentication.getName(), page, size)));
    }

    // Swagger: documents the single-incident retrieval endpoint
    @Operation(summary = "Get incident by ID")
    // HTTP GET /api/v1/incidents/{id} — fetches the full details of a specific incident by its database ID;
    // used by detail views in both the citizen portal and officer dashboard
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<IncidentDTO>> getIncidentById(
            // Extracts the incident's unique numeric ID from the URL path segment
            @PathVariable Long id) {
        // Delegates to service which loads the incident or throws a not-found exception
        return ResponseEntity.ok(ApiResponse.success("Incident retrieved successfully", incidentService.getIncidentById(id)));
    }

    // Swagger: documents the incident creation endpoint
    @Operation(summary = "Create an incident")
    // HTTP POST /api/v1/incidents — creates a new disaster incident report;
    // called when citizens or officers submit a new incident through the DMS portal or mobile app
    @PostMapping
    public ResponseEntity<ApiResponse<IncidentDTO>> createIncident(
            // Deserializes the JSON request body into an IncidentDTO containing title, type,
            // severity, location coordinates, description, and optional media references
            @RequestBody IncidentDTO request,
            // Injects the current user's authentication so the service can record who reported the incident
            Authentication authentication) {
        // Associates the new incident with the authenticated reporter's identity before persisting
        return ResponseEntity.ok(ApiResponse.success("Incident created successfully",
                incidentService.createIncident(request, authentication.getName())));
    }

    // Swagger: documents the full incident update endpoint
    @Operation(summary = "Update an incident")
    // HTTP PUT /api/v1/incidents/{id} — replaces all updatable fields of an existing incident;
    // used by officers or admins to correct or enrich incident information after initial reporting
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<IncidentDTO>> updateIncident(
            // Identifies which incident to update via its unique ID in the URL
            @PathVariable Long id,
            // Full IncidentDTO payload containing the updated field values to apply
            @RequestBody IncidentDTO request) {
        // Delegates full field replacement to the service, which also validates ownership/role
        return ResponseEntity.ok(ApiResponse.success("Incident updated successfully",
                incidentService.updateIncident(id, request)));
    }

    // Swagger: documents the status-only patch endpoint
    @Operation(summary = "Update incident status")
    // HTTP PATCH /api/v1/incidents/{id}/status — performs a targeted update of only the
    // incident's lifecycle status (e.g., moving from REPORTED to IN_PROGRESS or RESOLVED);
    // used by dispatchers and officers as they act on incidents without changing other data
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<IncidentDTO>> updateIncidentStatus(
            // The unique ID of the incident whose status should change
            @PathVariable Long id,
            // The new status value to apply (must match a valid IncidentStatus enum value)
            @RequestParam String status) {
        // Delegates status transition logic to the service, which may trigger alerts or notifications
        return ResponseEntity.ok(ApiResponse.success("Incident status updated",
                incidentService.updateIncidentStatus(id, status)));
    }

    // Swagger: documents the responder assignment endpoint
    @Operation(summary = "Assign responder to incident")
    // HTTP PATCH /api/v1/incidents/{id}/assign — links a specific responder (officer or team member)
    // to an active incident so they become responsible for managing the on-ground response
    @PatchMapping("/{id}/assign")
    public ResponseEntity<ApiResponse<IncidentDTO>> assignResponder(
            // The unique ID of the incident to which a responder will be assigned
            @PathVariable Long id,
            // The user ID of the responder (officer) being assigned to this incident
            @RequestParam Long responderId) {
        // Service validates that the responderId corresponds to a user with the OFFICER or ADMIN role
        return ResponseEntity.ok(ApiResponse.success("Responder assigned",
                incidentService.assignResponder(id, responderId)));
    }

    // Swagger: documents the incident deletion endpoint
    @Operation(summary = "Delete an incident")
    // HTTP DELETE /api/v1/incidents/{id} — permanently removes an incident from the system;
    // typically restricted to admin users to prevent accidental loss of disaster records
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteIncident(
            // The unique ID of the incident to be permanently deleted
            @PathVariable Long id) {
        // Delegates deletion to the service; may also cascade-delete related resources or alerts
        incidentService.deleteIncident(id);
        // Returns a success envelope with a null data payload since no entity is returned after deletion
        return ResponseEntity.ok(ApiResponse.success("Incident deleted successfully", null));
    }
}