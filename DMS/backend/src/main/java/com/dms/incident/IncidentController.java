package com.dms.incident;

import com.dms.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/incidents")
@RequiredArgsConstructor
@Tag(name = "Incidents", description = "Incident management endpoints")
public class IncidentController {

    private final IncidentService incidentService;

    @Operation(summary = "Get all incidents with pagination and filters")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<IncidentDTO>>> getAllIncidents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String q) {
        Page<IncidentDTO> incidents = incidentService.getAllIncidents(page, size, status, severity, type, q);
        return ResponseEntity.ok(ApiResponse.success("Incidents retrieved successfully", incidents));
    }

    @Operation(summary = "Get incidents reported by the current user")
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<IncidentDTO>>> getMyIncidents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("My incidents retrieved",
                incidentService.getMyIncidents(authentication.getName(), page, size)));
    }

    @Operation(summary = "Get incident by ID")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<IncidentDTO>> getIncidentById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Incident retrieved successfully", incidentService.getIncidentById(id)));
    }

    @Operation(summary = "Create an incident")
    @PostMapping
    public ResponseEntity<ApiResponse<IncidentDTO>> createIncident(
            @RequestBody IncidentDTO request,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Incident created successfully",
                incidentService.createIncident(request, authentication.getName())));
    }

    @Operation(summary = "Update an incident")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<IncidentDTO>> updateIncident(
            @PathVariable Long id,
            @RequestBody IncidentDTO request) {
        return ResponseEntity.ok(ApiResponse.success("Incident updated successfully",
                incidentService.updateIncident(id, request)));
    }

    @Operation(summary = "Update incident status")
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<IncidentDTO>> updateIncidentStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        return ResponseEntity.ok(ApiResponse.success("Incident status updated",
                incidentService.updateIncidentStatus(id, status)));
    }

    @Operation(summary = "Assign responder to incident")
    @PatchMapping("/{id}/assign")
    public ResponseEntity<ApiResponse<IncidentDTO>> assignResponder(
            @PathVariable Long id,
            @RequestParam Long responderId) {
        return ResponseEntity.ok(ApiResponse.success("Responder assigned",
                incidentService.assignResponder(id, responderId)));
    }

    @Operation(summary = "Delete an incident")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteIncident(@PathVariable Long id) {
        incidentService.deleteIncident(id);
        return ResponseEntity.ok(ApiResponse.success("Incident deleted successfully", null));
    }
}
