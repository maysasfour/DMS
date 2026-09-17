/**
 * AlertController.java
 *
 * REST controller for managing emergency alerts within the Disaster Management System (DMS).
 * Alerts represent urgent public safety notifications tied to disaster incidents — such as
 * evacuation orders, hazard warnings, or critical resource shortages.
 *
 * Exposes CRUD endpoints under /api/v1/alerts. Read operations (listing, filtering, fetching
 * by ID) are publicly accessible; write operations (create, update, deactivate, delete) are
 * restricted to users holding the ADMIN role.
 *
 * Active alerts are cached to reduce database load during high-traffic disaster events, and
 * the cache is evicted whenever alert state is mutated to keep public-facing data fresh.
 */
package com.dms.alert;

// Shared API response wrapper used across the DMS to enforce a uniform JSON response envelope
import com.dms.common.ApiResponse;
// Custom exception thrown when an alert record cannot be located by its ID
import com.dms.exception.ResourceNotFoundException;
// Swagger/OpenAPI annotation for documenting individual endpoint operations
import io.swagger.v3.oas.annotations.Operation;
// Swagger/OpenAPI annotation for grouping this controller under the "Alerts" tag in API docs
import io.swagger.v3.oas.annotations.tags.Tag;
// Lombok annotation that generates a constructor injecting all final fields (replaces @Autowired boilerplate)
import lombok.RequiredArgsConstructor;
// Spring Cache annotation that removes entries from the cache when an alert is mutated
import org.springframework.cache.annotation.CacheEvict;
// Spring Cache annotation that stores method return values so repeated reads skip the database
import org.springframework.cache.annotation.Cacheable;
// Spring Data pagination and sorting utilities
import org.springframework.data.domain.*;
// Spring HTTP response wrapper, used to set status codes on all endpoint returns
import org.springframework.http.ResponseEntity;
// Spring Security annotation for method-level role-based authorization checks
import org.springframework.security.access.prepost.PreAuthorize;
// Spring MVC annotations for routing, request/response binding, and path/query parameter extraction
import org.springframework.web.bind.annotation.*;

// Standard Java list type used for returning the active-alerts collection
import java.util.List;

// @RestController combines @Controller + @ResponseBody: every method return value is serialized
// directly to JSON rather than resolving a view template
@RestController
// All endpoints in this controller are prefixed with /api/v1/alerts, following DMS versioned API conventions
@RequestMapping("/api/v1/alerts")
// Lombok: generates a constructor for the single final field (alertRepository), enabling constructor injection
@RequiredArgsConstructor
// OpenAPI grouping tag: surfaces all alert endpoints together in the Swagger UI under "Emergency alert management"
@Tag(name = "Alerts", description = "Emergency alert management")
public class AlertController {

    // JPA repository providing CRUD and custom query methods for Alert entities; injected via constructor
    private final AlertRepository alertRepository;

    // --- LIST / FILTER ENDPOINT ---

    // Maps HTTP GET /api/v1/alerts; supports pagination, sort direction, and optional filter params
    @GetMapping
    // Swagger documentation: describes what this endpoint does in the generated API docs
    @Operation(summary = "List alerts with pagination and filtering")
    public ResponseEntity<ApiResponse<Page<Alert>>> list(
            // Zero-based page index; defaults to first page if not supplied by the caller
            @RequestParam(defaultValue = "0") int page,
            // Maximum number of alert records per page; 20 is a reasonable default for dashboard views
            @RequestParam(defaultValue = "20") int size,
            // Field name to sort by; defaults to createdAt so newest alerts appear first
            @RequestParam(defaultValue = "createdAt") String sortBy,
            // Sort direction ("asc" or "desc"); descending default surfaces the most recent alerts
            @RequestParam(defaultValue = "desc") String dir,
            // Optional filter by alert lifecycle status (e.g., "ACTIVE", "INACTIVE", "RESOLVED")
            @RequestParam(required = false) String status,
            // Optional filter by severity level (e.g., "LOW", "MEDIUM", "HIGH", "CRITICAL")
            @RequestParam(required = false) String severity) {

        // Build the Sort object based on the requested direction — ascending for chronological, descending for latest-first
        Sort sort = dir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        // Combine page index, page size, and sort order into a single Pageable specification for the repository
        Pageable pageable = PageRequest.of(page, size, sort);

        // Holds the filtered or unfiltered page of Alert records returned from the repository
        Page<Alert> result;
        if (status != null) {
            // When a status filter is present, fetch only alerts matching that lifecycle state (e.g., only ACTIVE alerts)
            result = alertRepository.findByStatus(status, pageable);
        } else if (severity != null) {
            // When a severity filter is present, fetch only alerts at that urgency level (e.g., only CRITICAL alerts)
            result = alertRepository.findBySeverity(severity, pageable);
        } else {
            // No filter applied — return all alerts paged; used for admin overviews of every alert in the system
            result = alertRepository.findAll(pageable);
        }
        // Wrap the page result in the standard DMS ApiResponse envelope and return HTTP 200
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // --- ACTIVE ALERTS ENDPOINT (PUBLIC, CACHED) ---

    // Maps HTTP GET /api/v1/alerts/active; publicly accessible so citizens and field teams can check live alerts
    @GetMapping("/active")
    // Swagger documentation for the active-alerts endpoint
    @Operation(summary = "Get all active alerts (public)")
    // Cache the result under the "activeAlerts" key; avoids repeated DB queries during high-traffic disaster events
    @Cacheable("activeAlerts")
    public ResponseEntity<ApiResponse<List<Alert>>> active() {
        // Fetch all alerts with status "ACTIVE", ordered newest-first so the most urgent recent alerts appear at the top
        return ResponseEntity.ok(ApiResponse.ok(alertRepository.findByStatusOrderByCreatedAtDesc("ACTIVE")));
    }

    // --- GET BY ID ENDPOINT ---

    // Maps HTTP GET /api/v1/alerts/{id}; retrieves a single alert record by its database primary key
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Alert>> getById(
            // Extracts the alert's numeric ID from the URL path segment
            @PathVariable Long id) {
        // Attempt to load the alert; throw a 404-mapping exception if no record exists with the given ID
        Alert alert = alertRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + id));
        // Return the found alert wrapped in the standard DMS success response envelope
        return ResponseEntity.ok(ApiResponse.ok(alert));
    }

    // --- CREATE ENDPOINT (ADMIN ONLY) ---

    // Maps HTTP POST /api/v1/alerts; used by admins to broadcast a new emergency alert to the system
    @PostMapping
    // Enforces that only authenticated users with the ADMIN role can create alerts — prevents unauthorized broadcasting
    @PreAuthorize("hasRole('ADMIN')")
    // Invalidate the "activeAlerts" cache after creation so new alerts are immediately visible to the public endpoint
    @CacheEvict(value = "activeAlerts", allEntries = true)
    public ResponseEntity<ApiResponse<Alert>> create(
            // Deserializes the JSON request body into an Alert entity; the caller supplies all alert fields
            @RequestBody Alert alert) {
        // Persist the new alert to the database; JPA assigns the generated primary key
        Alert saved = alertRepository.save(alert);
        // Return HTTP 201 Created with the persisted alert (including its new ID) in the response body
        return ResponseEntity.status(201).body(ApiResponse.created(saved, "Alert created"));
    }

    // --- UPDATE ENDPOINT (ADMIN ONLY) ---

    // Maps HTTP PUT /api/v1/alerts/{id}; allows admins to fully replace an existing alert's data
    @PutMapping("/{id}")
    // Only ADMIN users may modify alert content (e.g., correcting severity or updating alert messaging)
    @PreAuthorize("hasRole('ADMIN')")
    // Evict cached active alerts so any status/content changes are reflected immediately to the public
    @CacheEvict(value = "activeAlerts", allEntries = true)
    public ResponseEntity<ApiResponse<Alert>> update(
            // Alert ID extracted from the URL path — identifies which alert record to overwrite
            @PathVariable Long id,
            // Full updated Alert payload from the request body; replaces the existing entity fields
            @RequestBody Alert updated) {
        // Verify the alert exists before updating; throws 404 if not found, avoiding silent no-op saves
        alertRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + id));
        // Inject the path ID into the updated entity to ensure the correct record is targeted on save
        updated.setAlertId(id);
        // Persist the fully updated alert and return it with an HTTP 200 success response
        return ResponseEntity.ok(ApiResponse.ok(alertRepository.save(updated), "Alert updated"));
    }

    // --- DEACTIVATE ENDPOINT (ADMIN ONLY) ---

    // Maps HTTP PATCH /api/v1/alerts/{id}/deactivate; soft-disables an alert without deleting it
    // Using PATCH (partial update) rather than PUT is appropriate since only the status field changes
    @PatchMapping("/{id}/deactivate")
    // Deactivation is an admin action — prevents field officers or citizens from silencing active alerts
    @PreAuthorize("hasRole('ADMIN')")
    // Evict the active-alerts cache so deactivated alerts no longer appear in the public active list
    @CacheEvict(value = "activeAlerts", allEntries = true)
    public ResponseEntity<ApiResponse<Alert>> deactivate(
            // Alert ID from the URL path identifies which alert to deactivate
            @PathVariable Long id) {
        // Load the existing alert; throws 404 if the ID is not found in the database
        Alert alert = alertRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + id));
        // Set status to "INACTIVE" — this is a soft deactivation, preserving the alert record for audit history
        alert.setStatus("INACTIVE");
        // Save the status change and return the updated alert entity in the response
        return ResponseEntity.ok(ApiResponse.ok(alertRepository.save(alert), "Alert deactivated"));
    }

    // --- DELETE ENDPOINT (ADMIN ONLY) ---

    // Maps HTTP DELETE /api/v1/alerts/{id}; permanently removes an alert record from the database
    @DeleteMapping("/{id}")
    // Hard deletion is restricted to ADMIN role — irreversible operation requiring elevated privileges
    @PreAuthorize("hasRole('ADMIN')")
    // Evict the active-alerts cache so a deleted alert cannot persist in cached responses
    @CacheEvict(value = "activeAlerts", allEntries = true)
    public ResponseEntity<ApiResponse<Void>> delete(
            // Alert ID from the URL path; identifies the record to permanently remove
            @PathVariable Long id) {
        // Check existence before deletion to provide a meaningful 404 error rather than a silent no-op
        if (!alertRepository.existsById(id)) throw new ResourceNotFoundException("Alert not found: " + id);
        // Permanently delete the alert from the database — this action cannot be undone
        alertRepository.deleteById(id);
        // Return HTTP 200 with a null data body confirming the alert was successfully removed
        return ResponseEntity.ok(ApiResponse.ok(null, "Alert deleted"));
    }
}