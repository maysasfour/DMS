/**
 * DashboardController.java
 *
 * REST controller for the DMS admin dashboard analytics API.
 * Exposes aggregated statistics and trend data about incidents, resources,
 * and users to power real-time situational awareness views in the frontend.
 *
 * All endpoints are mounted under /api/v1/dashboard and are intended for
 * use by administrators and dispatchers monitoring ongoing disaster events.
 */
package com.dms.dashboard;

// Standard DMS shared API wrapper for uniform response envelopes
import com.dms.common.ApiResponse;
// Repository for querying incident records (counts, filters, severities)
import com.dms.incident.IncidentRepository;
// Repository for querying deployable resources (vehicles, personnel, equipment)
import com.dms.resource.ResourceRepository;
// Repository for querying registered system users (citizens, officers, admins)
import com.dms.user.UserRepository;
// Swagger/OpenAPI annotation to describe individual endpoint operations in generated docs
import io.swagger.v3.oas.annotations.Operation;
// Swagger/OpenAPI annotation to group related endpoints under a named tag in the API docs
import io.swagger.v3.oas.annotations.tags.Tag;
// Lombok annotation that generates a constructor injecting all final fields (replaces @Autowired boilerplate)
import lombok.RequiredArgsConstructor;
// Spring cache annotation to memoize expensive aggregation results and reduce DB load
import org.springframework.cache.annotation.Cacheable;
// Spring HTTP response wrapper used to return structured HTTP responses with status codes
import org.springframework.http.ResponseEntity;
// Spring MVC annotations for defining REST endpoints, request mappings, and parameter binding
import org.springframework.web.bind.annotation.*;

// Date/time types for computing rolling time windows (e.g., last N days of incidents)
import java.time.LocalDate;
import java.time.LocalDateTime;
// Collection utilities for building ordered result maps and lists
import java.util.*;
// Stream Collectors for grouping incident records by date or type
import java.util.stream.Collectors;

// Marks this class as a REST controller; Spring will serialize return values to JSON automatically
@RestController
// All handler methods in this controller are accessible under the /api/v1/dashboard path prefix
@RequestMapping("/api/v1/dashboard")
// Lombok: generates a constructor with one parameter for each final field, enabling dependency injection
@RequiredArgsConstructor
// Swagger: groups all endpoints in this controller under the "Dashboard" tag in the OpenAPI documentation
@Tag(name = "Dashboard", description = "Dashboard analytics")
public class DashboardController {

    // JPA repository for incident data — used to count incidents by status and severity
    private final IncidentRepository incidentRepository;
    // JPA repository for resource data — used to count resources by availability status
    private final ResourceRepository resourceRepository;
    // JPA repository for user data — used to report total registered user count
    private final UserRepository userRepository;

    // Swagger: documents this endpoint as returning high-level system statistics
    @Operation(summary = "Get system statistics")
    // Handles HTTP GET requests to /api/v1/dashboard/stats
    @GetMapping("/stats")
    // Caches the result under the key "dashboardStats" to avoid repeated DB aggregation on every poll
    @Cacheable("dashboardStats")
    public ResponseEntity<ApiResponse<DashboardDTO>> getStats() {
        // Build a summary DTO aggregating all key operational metrics from the database
        DashboardDTO stats = DashboardDTO.builder()
            // Total number of incidents ever reported in the system
            .totalIncidents(incidentRepository.count())
            // Incidents currently being handled by response teams
            .activeIncidents(incidentRepository.countByStatus("IN_PROGRESS"))
            // Incidents that have been closed/resolved
            .resolvedIncidents(incidentRepository.countByStatus("RESOLVED"))
            // Incidents awaiting assignment — combines REPORTED and OPEN statuses
            .openIncidents(incidentRepository.countByStatus("REPORTED") + incidentRepository.countByStatus("OPEN"))
            // High-priority incidents requiring immediate escalation
            .criticalIncidents(incidentRepository.countBySeverity("CRITICAL"))
            // Resources not yet assigned to any active incident
            .availableResources(resourceRepository.countByStatus("AVAILABLE"))
            // Resources currently deployed to an incident
            .assignedResources(resourceRepository.countByStatus("ASSIGNED"))
            // Total users registered in the DMS (citizens, officers, admins)
            .totalUsers(userRepository.count())
            .build();
        // Wrap the DTO in a standard ApiResponse envelope and return HTTP 200
        return ResponseEntity.ok(ApiResponse.success("Stats retrieved", stats));
    }

    // Swagger: documents this endpoint as returning time-series incident trend data
    @Operation(summary = "Get incident trends")
    // Handles HTTP GET requests to /api/v1/dashboard/trends
    @GetMapping("/trends")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTrends(
            // Number of days to look back; defaults to 14 if not specified by the caller
            @RequestParam(defaultValue = "14") int days) {

        // Calculate the start of the time window relative to now
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        // Fetch per-type incident counts after the cutoff (used for the type breakdown section)
        var recent = incidentRepository.countByTypeAfter(since);

        // Fetch up to 500 recent incidents with no filters to build per-day aggregation
        // Build per-day counts from all incidents
        var allRecent = incidentRepository.findWithFilters(null, null, null,
            org.springframework.data.domain.PageRequest.of(0, 500)).getContent();

        // Group incidents by their reported date, counting how many occurred on each day
        Map<LocalDate, Long> byDate = allRecent.stream()
            // Exclude incidents with no timestamp or those older than the requested window
            .filter(i -> i.getReportedAt() != null && i.getReportedAt().isAfter(since))
            // Group by calendar date (drops time component) and count incidents per date
            .collect(Collectors.groupingBy(
                i -> i.getReportedAt().toLocalDate(),
                Collectors.counting()
            ));

        // Build an ordered list of daily data points covering each day in the requested window
        List<Map<String, Object>> trends = new ArrayList<>();
        // Iterate from the oldest date to today so the chart renders left-to-right chronologically
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            // Use LinkedHashMap to preserve insertion order for predictable JSON field ordering
            Map<String, Object> point = new LinkedHashMap<>();
            // Store the ISO date string (YYYY-MM-DD) as the x-axis label
            point.put("date", date.toString());
            // Default to 0 if no incidents were reported on this date
            point.put("count", byDate.getOrDefault(date, 0L));
            trends.add(point);
        }

        // Also include type breakdown — aggregate incident counts per disaster/incident type
        // Also include type breakdown
        Map<String, Long> byType = new LinkedHashMap<>();
        // Each row from the repository query contains [type, count]; map them into a typed structure
        recent.forEach(row -> byType.put(row[0].toString(), (Long) row[1]));

        // Combine both the daily time-series and the type breakdown into a single result map
        Map<String, Object> result = new LinkedHashMap<>();
        // Daily array: used by line/bar charts on the dashboard to show incident volume over time
        result.put("daily", trends);
        // Type map: used by pie/donut charts to show distribution of incident categories
        result.put("byType", byType);

        // Wrap in a single-element list to conform to the generic List response type contract
        return ResponseEntity.ok(ApiResponse.success("Trends retrieved", List.of(result)));
    }
}