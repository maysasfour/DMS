package com.dms.resource;

import com.dms.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/resources")
@RequiredArgsConstructor
@Tag(name = "Resources", description = "Emergency resource management")
public class ResourceController {

    private final ResourceService resourceService;

    @GetMapping
    @Operation(summary = "Get all resources (paginated)")
    public ResponseEntity<ApiResponse<?>> getAllResources(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status) {
        if (page == 0 && size == 20 && type == null && status == null) {
            // Legacy: return flat list for map components
            List<ResourceDTO> all = resourceService.getAllResources();
            return ResponseEntity.ok(ApiResponse.ok(all));
        }
        Page<ResourceDTO> result = resourceService.getResourcesPage(page, size, type, status);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get resource by ID")
    public ResponseEntity<ApiResponse<ResourceDTO>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(resourceService.getAllResources().stream()
            .filter(r -> r.getId().equals(id)).findFirst()
            .orElseThrow(() -> new com.dms.exception.ResourceNotFoundException("Resource not found: " + id))));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('RESCUE_TEAM','ADMIN')")
    @Operation(summary = "Create resource")
    public ResponseEntity<ApiResponse<ResourceDTO>> createResource(@RequestBody ResourceDTO request) {
        return ResponseEntity.status(201).body(ApiResponse.created(resourceService.createResource(request), "Resource created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('RESCUE_TEAM','ADMIN')")
    @Operation(summary = "Update resource")
    public ResponseEntity<ApiResponse<ResourceDTO>> updateResource(@PathVariable Long id, @RequestBody ResourceDTO request) {
        return ResponseEntity.ok(ApiResponse.ok(resourceService.updateResource(id, request), "Resource updated"));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('RESCUE_TEAM','ADMIN')")
    @Operation(summary = "Update resource status")
    public ResponseEntity<ApiResponse<ResourceDTO>> updateStatus(@PathVariable Long id, @RequestParam String status) {
        return ResponseEntity.ok(ApiResponse.ok(resourceService.updateStatus(id, status), "Status updated"));
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('RESCUE_TEAM','ADMIN')")
    @Operation(summary = "Assign resource to incident")
    public ResponseEntity<ApiResponse<ResourceDTO>> assignToIncident(@PathVariable Long id, @RequestParam Long incidentId) {
        return ResponseEntity.ok(ApiResponse.ok(resourceService.assignResourceToIncident(id, incidentId), "Resource assigned"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete resource")
    public ResponseEntity<ApiResponse<Void>> deleteResource(@PathVariable Long id) {
        resourceService.deleteResource(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Resource deleted"));
    }
}
