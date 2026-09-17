/**
 * ReportController.java
 *
 * REST controller for the DMS reporting module.
 * Exposes HTTP endpoints under /api/v1/reports that allow clients (admin dashboard,
 * field officers, team portals) to query historical incident reports and analytics data.
 *
 * This controller acts as the thin HTTP layer — all business logic is delegated
 * to ReportService, keeping the controller focused on request/response handling.
 *
 * Part of the Disaster Management System (DMS) backend, built with Spring Boot.
 */
package com.dms.report;

// DMS shared API wrapper — standardises success/error response envelope across all endpoints
import com.dms.common.ApiResponse;
// Repository for direct incident data access if needed by the reporting layer
import com.dms.incident.IncidentRepository;
// Service layer for incident-related business logic (used transitively by ReportService)
import com.dms.incident.IncidentService;
// OpenAPI/Swagger annotation to document individual endpoint operations in the API explorer
import io.swagger.v3.oas.annotations.Operation;
// OpenAPI/Swagger annotation to group related endpoints under a named tag in the API docs
import io.swagger.v3.oas.annotations.tags.Tag;
// Lombok annotation — auto-generates a constructor injecting all final fields (avoids @Autowired boilerplate)
import lombok.RequiredArgsConstructor;
// Spring wrapper for HTTP responses — allows setting status codes and headers alongside the body
import org.springframework.http.ResponseEntity;
// Spring MVC annotations: @RestController, @RequestMapping, @GetMapping, @RequestParam
import org.springframework.web.bind.annotation.*;

// Used for returning a typed list of ReportDTO objects from the endpoint
import java.util.List;

// @RestController combines @Controller + @ResponseBody — every method return value is serialised to JSON automatically
@RestController
// Maps all handler methods in this class to the /api/v1/reports URL prefix
@RequestMapping("/api/v1/reports")
// Lombok: generates a constructor with one argument per final field, enabling Spring constructor-based DI
@RequiredArgsConstructor
// Swagger/OpenAPI: groups this controller's endpoints under the "Reports" section in the API documentation UI
@Tag(name = "Reports", description = "Historical reports and analytics")
public class ReportController {

    // The service layer responsible for assembling, filtering, and returning report data for DMS incidents
    private final ReportService reportService;

    // Swagger: describes this operation in the API docs so consumers know what the endpoint returns
    @Operation(summary = "Get available reports")
    // Maps HTTP GET requests to /api/v1/reports — the primary entry point for fetching DMS reports
    @GetMapping
    public ResponseEntity<ApiResponse<List<ReportDTO>>> getReports(
            // Optional query parameter ?type= — defaults to "INCIDENT" if omitted; supports filtering by report category (e.g. INCIDENT, RESOURCE, ALERT)
            @RequestParam(required = false, defaultValue = "INCIDENT") String type) {
        // Delegate to ReportService to fetch the appropriate reports, then wrap the result in the standard ApiResponse envelope and return HTTP 200
        return ResponseEntity.ok(ApiResponse.success("Reports retrieved", reportService.getReports(type)));
    }
}