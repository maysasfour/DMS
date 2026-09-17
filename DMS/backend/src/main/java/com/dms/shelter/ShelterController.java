/**
 * ShelterController.java
 *
 * REST API controller for managing emergency shelters in the Disaster Management System (DMS).
 * Shelters are physical locations (schools, halls, camps, etc.) used to house displaced civilians
 * during active disaster incidents. This controller exposes CRUD endpoints and capacity management
 * operations consumed by both the admin dashboard and field rescue teams.
 *
 * Base path: /api/v1/shelters
 * Access control: Public listing is unrestricted; create/update/delete requires ADMIN role;
 * capacity adjustments are permitted to ADMIN and RESCUE_TEAM roles.
 */
package com.dms.shelter;

// Shared API envelope used across all DMS endpoints to provide consistent response structure
import com.dms.common.ApiResponse;

// Swagger/OpenAPI annotations for auto-generating interactive API documentation
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

// Jakarta Bean Validation — triggers constraint checks on @RequestBody fields (e.g. @NotNull, @Size)
import jakarta.validation.Valid;

// Lombok annotation that auto-generates a constructor injecting all final fields (avoids boilerplate @Autowired)
import lombok.RequiredArgsConstructor;

// Spring Cache annotations — shelterList cache prevents repeated DB queries for frequently read shelter listings
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

// Spring Data pagination and sorting support for large shelter datasets
import org.springframework.data.domain.*;

// Standard Spring HTTP response wrapper
import org.springframework.http.ResponseEntity;

// Method-level security expression to restrict endpoint access by role
import org.springframework.security.access.prepost.PreAuthorize;

// Spring MVC annotations for defining REST controller, routes, and HTTP method mappings
import org.springframework.web.bind.annotation.*;

// Used for the /available endpoint which returns a flat list rather than a paginated result
import java.util.List;

// @RestController combines @Controller + @ResponseBody: all methods return JSON automatically
@RestController
// All endpoints in this controller are rooted at /api/v1/shelters
@RequestMapping("/api/v1/shelters")
// Lombok: generates constructor that injects shelterRepository — no manual @Autowired needed
@RequiredArgsConstructor
// Swagger grouping tag: groups all shelter endpoints under "Shelters" in the API docs UI
@Tag(name = "Shelters", description = "Emergency shelter management")
public class ShelterController {

    // JPA repository providing DB access for Shelter entities; injected via constructor by Lombok
    private final ShelterRepository shelterRepository;

    // Maps HTTP GET /api/v1/shelters — retrieves a paginated, optionally filtered list of shelters
    @GetMapping
    // Swagger description shown in the API documentation for this endpoint
    @Operation(summary = "List shelters with pagination and filtering")
    // Cache the paginated result under "shelterList" to avoid redundant DB queries on repeated calls
    @Cacheable("shelterList")
    public ResponseEntity<ApiResponse<Page<Shelter>>> list(
            // Zero-based page index; defaults to first page if not provided
            @RequestParam(defaultValue = "0") int page,
            // Number of shelter records per page; default 20 suits typical dashboard loads
            @RequestParam(defaultValue = "20") int size,
            // Field used to sort results; defaults to shelter name for alphabetical display
            @RequestParam(defaultValue = "name") String sortBy,
            // Optional filter: if provided, restricts results to active (true) or inactive (false) shelters
            @RequestParam(required = false) Boolean active) {

        // Build a Pageable descriptor combining page index, size, and sort direction
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortBy));

        // If an active filter was supplied, use the filtered query; otherwise return all shelters
        Page<Shelter> result = (active != null)
            ? shelterRepository.findByIsActive(active, pageable)  // Filter by operational status
            : shelterRepository.findAll(pageable);                 // No filter — return all shelters

        // Wrap the page result in the standard DMS ApiResponse envelope
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // Maps HTTP GET /api/v1/shelters/available — returns shelters that still have remaining capacity
    @GetMapping("/available")
    // Swagger summary: clarifies intent of the /available sub-route for API consumers
    @Operation(summary = "Get shelters with available capacity")
    public ResponseEntity<ApiResponse<List<Shelter>>> available() {
        // Delegate to a custom repository query that checks currentOccupancy < maxCapacity
        return ResponseEntity.ok(ApiResponse.ok(shelterRepository.findAvailableShelters()));
    }

    // Maps HTTP GET /api/v1/shelters/{id} — fetches a single shelter record by its primary key
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Shelter>> getById(
            // Binds the {id} path variable to the method parameter
            @PathVariable Long id) {

        // Attempt to load the shelter; throw a 404-mapped exception if not found in the database
        Shelter shelter = shelterRepository.findById(id)
            .orElseThrow(() -> new com.dms.exception.ResourceNotFoundException("Shelter not found: " + id));

        // Return the found shelter wrapped in the standard ApiResponse envelope
        return ResponseEntity.ok(ApiResponse.ok(shelter));
    }

    // Maps HTTP POST /api/v1/shelters — creates a new shelter record in the system
    @PostMapping
    // Only system administrators may register new shelter locations
    @PreAuthorize("hasRole('ADMIN')")
    // Invalidate the entire shelterList cache so the new shelter appears in subsequent list calls
    @CacheEvict(value = "shelterList", allEntries = true)
    public ResponseEntity<ApiResponse<Shelter>> create(
            // @Valid triggers Bean Validation on the incoming Shelter JSON body before processing
            @Valid @RequestBody Shelter shelter) {

        // Persist the new shelter entity; JPA generates the primary key on insert
        Shelter saved = shelterRepository.save(shelter);

        // Return HTTP 201 Created with the persisted entity including its generated ID
        return ResponseEntity.status(201).body(ApiResponse.created(saved, "Shelter created"));
    }

    // Maps HTTP PUT /api/v1/shelters/{id} — replaces all fields of an existing shelter record
    @PutMapping("/{id}")
    // Full update is an administrative action; rescue teams use the PATCH /capacity endpoint instead
    @PreAuthorize("hasRole('ADMIN')")
    // Bust the shelterList cache so updated shelter data is reflected in subsequent list responses
    @CacheEvict(value = "shelterList", allEntries = true)
    public ResponseEntity<ApiResponse<Shelter>> update(
            // ID of the shelter to update, extracted from the URL path
            @PathVariable Long id,
            // Validated replacement shelter data from the request body
            @Valid @RequestBody Shelter updated) {

        // Load the existing record to verify it exists and to preserve immutable audit fields
        Shelter shelter = shelterRepository.findById(id)
            .orElseThrow(() -> new com.dms.exception.ResourceNotFoundException("Shelter not found: " + id));

        // Ensure the updated entity carries the same primary key so JPA performs an UPDATE, not INSERT
        updated.setShelterId(id);

        // Preserve the original creation timestamp — it must not be overwritten during updates
        updated.setCreatedAt(shelter.getCreatedAt());

        // Persist and return the fully updated shelter entity
        return ResponseEntity.ok(ApiResponse.ok(shelterRepository.save(updated), "Shelter updated"));
    }

    // Maps HTTP PATCH /api/v1/shelters/{id}/capacity — adjusts occupancy by a signed delta value
    // Used by rescue teams in the field to check in (+) or check out (-) displaced civilians
    @PatchMapping("/{id}/capacity")
    // Both admins and rescue team members can update occupancy counts during active disaster response
    @PreAuthorize("hasAnyRole('ADMIN','RESCUE_TEAM')")
    // Invalidate shelter list cache so updated capacity figures are visible in real-time dashboards
    @CacheEvict(value = "shelterList", allEntries = true)
    public ResponseEntity<ApiResponse<Shelter>> updateCapacity(
            // Path variable identifying which shelter's occupancy to adjust
            @PathVariable Long id,
            // Signed integer: positive to add occupants, negative to reduce (e.g., when evacuees leave)
            @RequestParam int delta) {

        // Load the shelter or throw 404 if the ID does not match any registered shelter
        Shelter shelter = shelterRepository.findById(id)
            .orElseThrow(() -> new com.dms.exception.ResourceNotFoundException("Shelter not found: " + id));

        // Delegate the occupancy arithmetic and boundary checks to the domain model method
        shelter.updateCapacity(delta);

        // Save the updated occupancy count and return the refreshed shelter entity
        return ResponseEntity.ok(ApiResponse.ok(shelterRepository.save(shelter), "Capacity updated"));
    }

    // Maps HTTP DELETE /api/v1/shelters/{id} — permanently removes a shelter record from the system
    @DeleteMapping("/{id}")
    // Deletion is restricted to administrators to prevent accidental removal of active shelter sites
    @PreAuthorize("hasRole('ADMIN')")
    // Clear the cache after deletion so stale entries are not served to subsequent list requests
    @CacheEvict(value = "shelterList", allEntries = true)
    public ResponseEntity<ApiResponse<Void>> delete(
            // Path variable for the shelter ID to be deleted
            @PathVariable Long id) {

        // Verify the shelter exists before attempting deletion; avoids silent no-ops on bad IDs
        if (!shelterRepository.existsById(id)) throw new com.dms.exception.ResourceNotFoundException("Shelter not found: " + id);

        // Permanently remove the shelter record from the database
        shelterRepository.deleteById(id);

        // Return 200 OK with a null body — no entity to return after deletion
        return ResponseEntity.ok(ApiResponse.ok(null, "Shelter deleted"));
    }
}