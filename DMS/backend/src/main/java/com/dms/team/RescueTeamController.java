// =============================================================================
// RescueTeamController.java
// -----------------------------------------------------------------------------
// REST controller for managing rescue teams in the Disaster Management System.
// Handles CRUD operations and availability toggling for rescue teams that are
// dispatched to disaster incidents. Admin users can create, update, and delete
// teams, while rescue team members can update their own availability status.
// All endpoints are served under /api/v1/teams.
// =============================================================================

package com.dms.team;

// DMS shared API envelope used for uniform JSON responses across all endpoints
import com.dms.common.ApiResponse;
// Custom exception thrown when a requested rescue team record cannot be found
import com.dms.exception.ResourceNotFoundException;
// Swagger/OpenAPI annotation to describe this endpoint's operation in API docs
import io.swagger.v3.oas.annotations.Operation;
// Swagger annotation to group this controller under the "Rescue Teams" API tag
import io.swagger.v3.oas.annotations.tags.Tag;
// Lombok annotation that auto-generates a constructor injecting all final fields
import lombok.RequiredArgsConstructor;
// Spring Data pagination and sorting utilities for paginated team listings
import org.springframework.data.domain.*;
// Spring HTTP response wrapper allowing status codes and body to be set
import org.springframework.http.ResponseEntity;
// Enables method-level role-based security using Spring Security expressions
import org.springframework.security.access.prepost.PreAuthorize;
// Spring MVC annotations for defining REST endpoints and extracting request data
import org.springframework.web.bind.annotation.*;

// Standard Java list used to hold intermediate query results before pagination
import java.util.List;

// Marks this class as a Spring REST controller — combines @Controller and @ResponseBody,
// so every method return value is serialized directly to JSON in the HTTP response body
@RestController
// Maps all endpoints in this controller to the /api/v1/teams URL prefix
@RequestMapping("/api/v1/teams")
// Lombok: generates a constructor for the final teamRepository field, enabling
// Spring to inject the dependency without an explicit @Autowired annotation
@RequiredArgsConstructor
// Swagger/OpenAPI: groups all endpoints here under the "Rescue Teams" tag in the API docs UI
@Tag(name = "Rescue Teams", description = "Rescue team management")
public class RescueTeamController {

    // JPA repository providing database access for RescueTeam entities;
    // injected via constructor by Spring's dependency injection mechanism
    private final RescueTeamRepository teamRepository;

    // Maps HTTP GET requests to /api/v1/teams for paginated team listings
    @GetMapping
    // Swagger: documents this endpoint as a paginated rescue team listing operation
    @Operation(summary = "List rescue teams with pagination")
    public ResponseEntity<ApiResponse<Page<RescueTeam>>> list(
            // Page index (0-based) for pagination; defaults to the first page
            @RequestParam(defaultValue = "0") int page,
            // Number of teams per page; defaults to 20 to limit payload size
            @RequestParam(defaultValue = "20") int size,
            // Optional filter: only return teams of a specific type (e.g., "FIRE", "MEDICAL")
            @RequestParam(required = false) String type,
            // Optional filter: when true, only return teams that are active and available for dispatch
            @RequestParam(required = false) Boolean available) {

        // Build a pageable descriptor ordering teams alphabetically by name
        Pageable pageable = PageRequest.of(page, size, Sort.by("name"));
        // Holds the query result before wrapping in the API response
        Page<RescueTeam> result;
        if (type != null) {
            // Filter by team type (e.g., search all FIRE rescue teams) when type param is provided
            List<RescueTeam> byType = teamRepository.findByType(type);
            // Wrap the flat list in a PageImpl so the response format stays consistent with paginated results
            result = new PageImpl<>(byType, pageable, byType.size());
        } else if (Boolean.TRUE.equals(available)) {
            // Fetch only teams that are both active (not disbanded) and currently available for incident dispatch
            List<RescueTeam> avail = teamRepository.findByIsActiveTrueAndAvailableTrue();
            // Wrap available teams list in a PageImpl for consistent paginated response envelope
            result = new PageImpl<>(avail, pageable, avail.size());
        } else {
            // No filters applied — return all teams from the database with standard pagination
            result = teamRepository.findAll(pageable);
        }
        // Return HTTP 200 with the paginated team list wrapped in the standard DMS API envelope
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // Maps HTTP GET requests to /api/v1/teams/available
    // Provides a quick lookup of teams ready to be assigned to active disaster incidents
    @GetMapping("/available")
    // Swagger: documents this as the endpoint for retrieving dispatchable rescue teams
    @Operation(summary = "Get available rescue teams")
    public ResponseEntity<ApiResponse<List<RescueTeam>>> available() {
        // Query for teams that are both active (not disbanded) and not currently assigned to an incident
        return ResponseEntity.ok(ApiResponse.ok(teamRepository.findByIsActiveTrueAndAvailableTrue()));
    }

    // Maps HTTP GET requests to /api/v1/teams/{id} for fetching a single team by its primary key
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RescueTeam>> getById(
            // Extracts the team's numeric ID from the URL path segment
            @PathVariable Long id) {
        // Attempt to load the team; throw 404-triggering exception if it doesn't exist in the database
        RescueTeam team = teamRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + id));
        // Return HTTP 200 with the found rescue team entity wrapped in the API envelope
        return ResponseEntity.ok(ApiResponse.ok(team));
    }

    // Maps HTTP POST requests to /api/v1/teams for creating a new rescue team record
    @PostMapping
    // Restricts team creation to ADMIN users only — prevents unauthorized team provisioning
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RescueTeam>> create(
            // Deserializes the JSON request body into a RescueTeam entity for persistence
            @RequestBody RescueTeam team) {
        // Persist the new team to the database and return HTTP 201 Created with the saved entity
        return ResponseEntity.status(201).body(ApiResponse.created(teamRepository.save(team), "Team created"));
    }

    // Maps HTTP PUT requests to /api/v1/teams/{id} for full replacement of an existing team record
    @PutMapping("/{id}")
    // Restricts team updates to ADMIN users — prevents unauthorized modification of team records
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RescueTeam>> update(
            // ID of the rescue team to update, extracted from the URL path
            @PathVariable Long id,
            // Full updated rescue team payload from the request body
            @RequestBody RescueTeam updated) {
        // Verify the team exists before updating; throws ResourceNotFoundException (404) if not found
        teamRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Team not found: " + id));
        // Ensure the updated entity carries the correct ID so JPA performs an UPDATE rather than an INSERT
        updated.setTeamId(id);
        // Save and return the updated team with HTTP 200 and a success message
        return ResponseEntity.ok(ApiResponse.ok(teamRepository.save(updated), "Team updated"));
    }

    // Maps HTTP PATCH requests to /api/v1/teams/{id}/availability for toggling dispatch readiness
    // A partial update (PATCH) is used here since only the availability flag is being changed
    @PatchMapping("/{id}/availability")
    // Both ADMINs and RESCUE_TEAM members can update availability —
    // allows field teams to self-report when they finish handling an incident
    @PreAuthorize("hasAnyRole('ADMIN','RESCUE_TEAM')")
    public ResponseEntity<ApiResponse<RescueTeam>> setAvailability(
            // ID of the rescue team whose availability is being updated
            @PathVariable Long id,
            // New availability status: true = ready for dispatch, false = currently engaged
            @RequestParam boolean available) {
        // Load the team or throw a 404 error if the team ID is not found
        RescueTeam team = teamRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + id));
        // Update the team's availability flag to reflect its current dispatch readiness
        team.setAvailable(available);
        // Persist the updated availability and return the updated team entity with HTTP 200
        return ResponseEntity.ok(ApiResponse.ok(teamRepository.save(team), "Availability updated"));
    }

    // Maps HTTP DELETE requests to /api/v1/teams/{id} for removing a rescue team record
    @DeleteMapping("/{id}")
    // Only ADMINs can delete rescue teams — prevents accidental or unauthorized removal of field units
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(
            // ID of the rescue team to delete, extracted from the URL path
            @PathVariable Long id) {
        // Guard clause: verify the team exists before attempting deletion to return a meaningful 404 error
        if (!teamRepository.existsById(id)) throw new ResourceNotFoundException("Team not found: " + id);
        // Permanently remove the rescue team record from the database
        teamRepository.deleteById(id);
        // Return HTTP 200 with a null body and a success message confirming deletion
        return ResponseEntity.ok(ApiResponse.ok(null, "Team deleted"));
    }
}